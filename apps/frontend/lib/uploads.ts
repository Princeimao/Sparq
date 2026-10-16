"use client";

import { api } from "./api";

export type UploadPurpose = "avatars" | "products" | "flows" | "misc";

export interface UploadSlot {
  key: string;
  uploadUrl: string;
  publicUrl: string;
  expiresInSec: number;
}

const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export function isSupportedImage(file: File): boolean {
  return IMAGE_TYPES.has(file.type.toLowerCase());
}

// ─── Read resolution (private-bucket support) ────────────────────────────────
// Stored URLs may point at a private bucket that serves nothing publicly.
// resolveReadableUrl() probes the stored URL and, when it doesn't load,
// swaps in a short-lived signed read URL from POST /upload/read — zero
// console configuration needed on any S3-compatible store.

const readUrlCache = new Map<string, { url: string; at: number }>();
const READ_CACHE_MS = 45 * 60 * 1000;

/** Extract our `u/<userId>/…` key from a stored URL, or null. */
export function extractUploadKey(storedUrl: string): string | null {
  try {
    const u = new URL(storedUrl);
    const idx = u.pathname.indexOf("/u/");
    if (idx === -1) return null;
    return decodeURIComponent(u.pathname.slice(idx + 1).split("?")[0] ?? "");
  } catch {
    return null;
  }
}

function probeLoads(url: string, timeoutMs = 9000): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof Image === "undefined") return resolve(true);
    const timer = setTimeout(() => resolve(false), timeoutMs);
    const img = new Image();
    img.onload = () => {
      clearTimeout(timer);
      resolve(true);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };
    img.src = url;
  });
}

async function fetchSignedReadUrl(key: string): Promise<string | null> {
  const cached = readUrlCache.get(key);
  if (cached && Date.now() - cached.at < READ_CACHE_MS) return cached.url;
  try {
    const res = await api.post<{ data?: { url?: string } }>("/upload/read", { key });
    const url = res.data?.data?.url ?? null;
    if (url) readUrlCache.set(key, { url, at: Date.now() });
    return url;
  } catch {
    return null;
  }
}

/** URL guaranteed (best-effort) to render in an `<img>` — or null. */
export async function resolveReadableUrl(storedUrl: string): Promise<string | null> {
  if (!storedUrl) return null;
  if (await probeLoads(storedUrl)) return storedUrl;
  const key = extractUploadKey(storedUrl);
  if (!key) return null;
  return fetchSignedReadUrl(key);
}

/** Ask the API for a direct-to-bucket slot. Bytes never touch the backend. */
export async function requestUploadSlot(
  purpose: UploadPurpose,
  file: File,
): Promise<UploadSlot> {
  const res = await api.post<{ data: UploadSlot }>("/upload/presign", {
    purpose,
    contentType: file.type,
    sizeBytes: file.size,
  });
  return res.data.data;
}

/**
 * PUT the file straight to the bucket. XHR (not fetch) so callers get
 * real upload progress for animated progress rings/bars.
 *
 * A bucket without a browser CORS policy fails here with a network-level
 * error (status 0) — callers should fall back to putFileDirect().
 */
export function putFileToBucket(
  slot: UploadSlot,
  file: File,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", slot.uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);

    if (signal) {
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error(`Upload failed (HTTP ${xhr.status})`));
      }
    };
    // status 0 + onerror = network/CORS failure, NOT a server rejection.
    xhr.onerror = () => {
      const err = new Error(
        "Bucket unreachable — likely a bucket CORS policy blocking browser uploads",
      ) as Error & { corsHint?: boolean };
      err.corsHint = true;
      reject(err);
    };
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    xhr.send(file);
  });
}

/**
 * Proxied upload through the API (multipart POST /upload/direct).
 * Slower than presigned, but immune to bucket CORS policies the owner
 * can't change in the console.
 */
export function putFileDirect(
  purpose: UploadPurpose,
  file: File,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file, file.name);
    form.append("purpose", purpose);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${process.env.NEXT_PUBLIC_BACKEND_URL}/upload/direct`);
    xhr.withCredentials = true;

    if (signal) {
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText) as {
          data?: { publicUrl?: string };
          error?: string;
        };
        if (xhr.status >= 200 && xhr.status < 300 && body.data?.publicUrl) {
          onProgress?.(100);
          resolve(body.data.publicUrl);
        } else {
          reject(new Error(body.error ?? `Upload failed (HTTP ${xhr.status})`));
        }
      } catch {
        reject(new Error(`Upload failed (HTTP ${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    xhr.send(form);
  });
}

/** One call: slot + PUT, with automatic proxied fallback. Resolves with the public URL to store. */
export async function uploadImage(
  purpose: UploadPurpose,
  file: File,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  const slot = await requestUploadSlot(purpose, file);
  try {
    await putFileToBucket(slot, file, onProgress, signal);
    return slot.publicUrl;
  } catch (err) {
    // Bucket CORS blocked the browser PUT — retry through the API instead
    // of surfacing a cryptic CORS error.
    if ((err as Error & { corsHint?: boolean })?.corsHint) {
      onProgress?.(0);
      return putFileDirect(purpose, file, onProgress, signal);
    }
    throw err;
  }
}
