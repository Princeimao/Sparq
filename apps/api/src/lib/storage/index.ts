import { env } from "../../config/env";
import { GcsStorageProvider } from "./gcs-storage.provider";
import { S3StorageProvider } from "./s3-storage.provider";
import type { StorageProvider } from "./types";

export * from "./types";

let cached: StorageProvider | null = null;

/**
 * Singleton factory — STORAGE_PROVIDER=s3 (default) or gcs.
 * Lazy so importing this module never throws when creds are missing;
 * the error surfaces on first actual use with a clear message.
 */
export function getStorageProvider(): StorageProvider {
  if (cached) return cached;
  const kind = (env.STORAGE_PROVIDER ?? "s3").toLowerCase();
  cached =
    kind === "gcs" ? new GcsStorageProvider() : new S3StorageProvider();
  return cached;
}

/** Test-only escape hatch. */
export function __resetStorageProvider(): void {
  cached = null;
}
