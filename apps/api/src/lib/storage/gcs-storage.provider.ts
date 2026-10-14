import { gcsService } from "../../services/gcs.service";
import type { PresignedUpload, PresignInput, StorageProvider } from "./types";

export class GcsStorageProvider implements StorageProvider {
  readonly name = "gcs";

  publicUrlFor(key: string): string {
    const bucket = process.env.GCS_BUCKET_NAME || "sparq-catalog-assets";
    return `https://storage.googleapis.com/${bucket}/${key}`;
  }

  async presignUpload(input: PresignInput): Promise<PresignedUpload> {
    const data = await gcsService.generateSignedUploadUrlWithKey(
      input.key,
      input.contentType,
      input.expiresSec,
    );
    return {
      uploadUrl: data.signedUrl,
      publicUrl: data.publicUrl,
      expiresInSec: input.expiresSec,
    };
  }

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    await gcsService.saveFile(key, body, contentType).catch((error: unknown) => {
      console.warn(`[GcsStorageProvider] put failed for ${key}:`, error);
      throw error;
    });
  }

  async deleteObject(key: string): Promise<void> {
    await gcsService.deleteFile(key).catch((error: unknown) => {
      console.warn(`[GcsStorageProvider] delete failed for ${key}:`, error);
    });
  }
}
