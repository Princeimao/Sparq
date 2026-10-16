import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../../config/env";
import type { PresignedDownload, PresignedUpload, PresignInput, StorageProvider } from "./types";

export class S3StorageProvider implements StorageProvider {
  readonly name = "s3";
  private client: S3Client;
  private bucket: string;

  constructor() {
    if (!env.S3_BUCKET) {
      throw new Error("S3_BUCKET is required when STORAGE_PROVIDER=s3");
    }
    this.bucket = env.S3_BUCKET;
    this.client = new S3Client({
      region: env.S3_REGION,
      ...(env.S3_ENDPOINT
        ? {
            endpoint: env.S3_ENDPOINT,
            forcePathStyle: env.S3_FORCE_PATH_STYLE ?? false,
          }
        : {}),
      // Absent keys fall through to the SDK default credential chain
      // (instance role / ECS / SSO) — handy on AWS hosting.
      ...(env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
        ? {
            credentials: {
              accessKeyId: env.S3_ACCESS_KEY_ID,
              secretAccessKey: env.S3_SECRET_ACCESS_KEY,
            },
          }
        : {}),
    });
  }

  publicUrlFor(key: string): string {
    if (env.S3_ENDPOINT && !env.S3_PUBLIC_BASE_URL) {
      // S3-compatible store (R2/MinIO) with no public base configured:
      // the AWS-style URL below will NOT resolve. Set S3_PUBLIC_BASE_URL
      // to the bucket's public hostname (custom domain or r2.dev URL).
      console.warn(
        "[S3StorageProvider] S3_ENDPOINT is set but S3_PUBLIC_BASE_URL is not — generated public URLs will point at AWS and won't load.",
      );
    }
    const base =
      env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "") ??
      `https://${this.bucket}.s3.${env.S3_REGION}.amazonaws.com`;
    return `${base}/${key}`;
  }

  async presignUpload(input: PresignInput): Promise<PresignedUpload> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
      ContentType: input.contentType,
      ContentLength: input.sizeBytes,
      // Keys-only buckets with no console: this is the only SDK-side way
      // to make objects publicly readable. Only enable when the bucket
      // allows ACLs — buckets with ownership-enforced settings reject it.
      ...(env.S3_OBJECT_ACL === "public-read" ? { ACL: "public-read" as const } : {}),
    });
    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: input.expiresSec,
    });
    return {
      uploadUrl,
      publicUrl: this.publicUrlFor(input.key),
      expiresInSec: input.expiresSec,
    };
  }

  async presignDownload(key: string, expiresSec: number): Promise<PresignedDownload> {
    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresSec },
    );
    return { url, expiresInSec: expiresSec };
  }

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (error) {
      // Deleting a missing key is not an error for our callers.
      console.warn(`[S3StorageProvider] delete failed for ${key}:`, error);
    }
  }
}
