import axios from "axios";
import { env } from "../config/env";
import { getStorageProvider } from "./storage";

const ALLOWED_AVATAR_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Copy the Google profile photo into our own bucket so avatars serve
 * from our storage instead of Google's CDN (which can 403/expire).
 * Strictly best-effort: returns null on any failure and NEVER throws,
 * so login can never break because of it. The avatar lives at a fixed
 * per-user key, so repeat logins just overwrite it — no accumulation.
 */
export async function mirrorAvatarToBucket(
  userId: string,
  pictureUrl: string | null | undefined,
): Promise<string | null> {
  if (!env.AVATAR_MIRROR_ENABLED) return null;
  if (!pictureUrl || !pictureUrl.startsWith("http")) return null;
  try {
    const res = await axios.get<ArrayBuffer>(pictureUrl, {
      responseType: "arraybuffer",
      timeout: 8000,
      maxContentLength: 2 * 1024 * 1024,
    });
    const contentType = String(res.headers["content-type"] ?? "")
      .split(";")[0]
      ?.trim()
      .toLowerCase();
    const ext = (contentType && ALLOWED_AVATAR_TYPES[contentType]) || null;
    if (!ext || !contentType) return null;

    const key = `u/${userId}/avatars/google.${ext}`;
    const provider = getStorageProvider();
    await provider.putObject(key, Buffer.from(res.data), contentType);
    return provider.publicUrlFor(key);
  } catch (error) {
    console.warn("[avatar-mirror] skipped:", (error as Error)?.message ?? error);
    return null;
  }
}
