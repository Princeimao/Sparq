/**
 * Storage abstraction — the rest of the API only ever talks to this
 * interface, so swapping providers (S3 ↔ GCS ↔ local) is a one-line env
 * change plus a new provider class. No bucket logic leaks into routes.
 */

export type UploadPurpose = "avatars" | "products" | "flows" | "misc";

export interface PresignInput {
  /** Full object key, already namespaced (e.g. `u/<userId>/products/…`). */
  key: string;
  /** Exact Content-Type the client must PUT with. */
  contentType: string;
  /** Declared byte size — providers may enforce it on the signed URL. */
  sizeBytes: number;
  /** Seconds the URL stays valid. */
  expiresSec: number;
}

export interface PresignedUpload {
  uploadUrl: string;
  publicUrl: string;
  expiresInSec: number;
}

export interface PresignedDownload {
  url: string;
  expiresInSec: number;
}

export interface StorageProvider {
  readonly name: string;
  /** Public read URL for an already-stored key (CDN-aware). */
  publicUrlFor(key: string): string;
  /** Direct-to-bucket upload URL — bytes never touch the API. */
  presignUpload(input: PresignInput): Promise<PresignedUpload>;
  /**
   * Short-lived signed READ url — how private buckets serve images with
   * zero console configuration. No public policy, no ACLs needed.
   */
  presignDownload(key: string, expiresSec: number): Promise<PresignedDownload>;
  /**
   * Server-side write — the fallback when the bucket's CORS policy blocks
   * browser-direct PUTs and the owner can't change it in the console.
   * Slower (bytes pass through the API); presigned stays the default path.
   */
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
  /** Best-effort delete; resolves even when the object is already gone. */
  deleteObject(key: string): Promise<void>;
}
