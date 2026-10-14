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
): Promise<{ url: string; readable: boolean }> {
  const slot = await requestUploadSlot(purpose, file);
  try {
    await putFileToBucket(slot, file, onProgress, signal);
  } catch (err) {
    // Bucket CORS blocked the browser PUT — retry through the API instead
    // of surfacing a cryptic CORS error.
    if ((err as Error & { corsHint?: boolean })?.corsHint) {
      onProgress?.(0);
      const directUrl = await putFileDirect(purpose, file, onProgress, signal);
      return { url: directUrl, readable: await probeImageReadable(directUrl) };
    }
    throw err;
  }
  return { url: slot.publicUrl, readable: await probeImageReadable(slot.publicUrl) };
}

/**
 * Did the bucket actually serve the file back? An `<img>` probe needs no
 * CORS, so a failure here means the object isn't publicly readable
 * (bucket policy) or the public URL host is wrong — not a CORS problem.
 */
export function probeImageReadable(url: string, timeoutMs = 12000): Promise<boolean> {
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
