import { Storage } from "@google-cloud/storage";
import { v4 as uuidv4 } from "uuid";
import { env } from "../config/env";

export interface SignedUrlResponse {
  signedUrl: string;
  publicUrl: string;
  fileKey: string;
}

export class GcsService {
  private storage: Storage | null = null;
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.GCS_BUCKET_NAME || "sparq-catalog-assets";

    const projectId = process.env.GCS_PROJECT_ID;
    const clientEmail = process.env.GCS_CLIENT_EMAIL;
    const privateKey = process.env.GCS_PRIVATE_KEY
      ? process.env.GCS_PRIVATE_KEY.replace(/\\n/g, "\n")
      : undefined;

    if (projectId && clientEmail && privateKey) {
      this.storage = new Storage({
        projectId,
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
      });
    } else {
      // Fallback to default application credentials if available
      try {
        this.storage = new Storage({ projectId });
      } catch {
        console.warn("[GcsService] GCS credentials not provided; falling back to direct URL mode.");
      }
    }
  }

  /**
   * Generates a GCS V4 Signed URL for direct client-side upload.
   * @param fileName Original file name or extension (e.g., 'image.jpg')
   * @param contentType MIME type (e.g., 'image/jpeg')
   */
  async generateSignedUploadUrl(
    fileName: string,
    contentType: string = "image/jpeg"
  ): Promise<SignedUrlResponse> {
    const ext = fileName.includes(".") ? fileName.split(".").pop() : "jpg";
    const fileKey = `catalog/${Date.now()}-${uuidv4().slice(0, 8)}.${ext}`;

    const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${fileKey}`;

    if (this.storage) {
      try {
        const file = this.storage.bucket(this.bucketName).file(fileKey);

        const [signedUrl] = await file.getSignedUrl({
          version: "v4",
          action: "write",
          expires: Date.now() + 15 * 60 * 1000, // 15 minutes
          contentType,
        });

        return {
          signedUrl,
          publicUrl,
          fileKey,
        };
      } catch (err) {
        console.warn("[GcsService] Error generating GCS signed URL:", err);
      }
    }

    // Fallback URL if GCS bucket credentials are not live in local dev environment
    return {
      signedUrl: `/api/upload/dev-direct-upload?fileKey=${encodeURIComponent(fileKey)}`,
      publicUrl: `https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80`,
      fileKey,
    };
  }
}

export const gcsService = new GcsService();
