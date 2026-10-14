import { Router, Request, Response } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { env } from "../../config/env";
import { authenticate } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { ApiResponse } from "../../middleware/responseHandler";
import {
  getStorageProvider,
  type UploadPurpose,
} from "../../lib/storage";

const router = Router();

// In-memory only — files stream straight on to the bucket, never to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.UPLOAD_MAX_IMAGE_MB * 1024 * 1024, files: 1 },
});

const PURPOSE_FOLDERS: Record<UploadPurpose, string> = {
  avatars: "avatars",
  products: "products",
  flows: "flows",
  misc: "misc",
};

const IMAGE_EXTS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

const presignSchema = z.object({
  purpose: z.enum(["avatars", "products", "flows", "misc"]),
  contentType: z.string().min(1),
  sizeBytes: z.coerce.number().int().positive(),
});

function userFolderKey(
  userId: string,
  purpose: UploadPurpose,
  ext: string,
): string {
  // u/<userId>/<purpose>/<yyyy>/<mm>/<uuid>.<ext> — per-user folders keep
  // the bucket browsable and make cost/usage attribution trivial.
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `u/${userId}/${PURPOSE_FOLDERS[purpose]}/${yyyy}/${mm}/${uuidv4()}.${ext}`;
}

/**
 * POST /api/upload/presign — mint a direct-to-bucket upload slot.
 * Authenticated. The browser then PUTs bytes straight to `uploadUrl`;
 * the API never sees the file. Responds with the public read URL to store
 * on the product / avatar / flow record.
 */
router.post(
  "/presign",
  authenticate,
  validateBody(presignSchema),
  async (req: Request, res: Response) => {
    const userId = req.user?.userId as string;
    const { purpose, contentType, sizeBytes } = req.body as {
      purpose: UploadPurpose;
      contentType: string;
      sizeBytes: number;
    };

    const ext = IMAGE_EXTS[contentType.toLowerCase()];
    if (!ext) {
      res.status(400).json({
        error: `Unsupported file type. Allowed: ${Object.keys(IMAGE_EXTS).join(", ")}`,
      });
      return;
    }

    const maxBytes = env.UPLOAD_MAX_IMAGE_MB * 1024 * 1024;
    if (sizeBytes > maxBytes) {
      res.status(400).json({
        error: `File too large. Max ${env.UPLOAD_MAX_IMAGE_MB} MB.`,
      });
      return;
    }

    try {
      const key = userFolderKey(userId, purpose, ext);
      const slot = await getStorageProvider().presignUpload({
        key,
        contentType,
        sizeBytes,
        expiresSec: env.UPLOAD_URL_TTL_SEC,
      });
      res.json(
        new ApiResponse(
          { key, ...slot },
          "Upload slot created. PUT the file to uploadUrl.",
          true,
        ),
      );
    } catch (error) {
      console.error("[upload/presign]", error);
      res.status(500).json({ error: "Could not create upload slot" });
    }
  },
);

/**
 * POST /api/upload/direct — proxied upload fallback (multipart `file`).
 * Used automatically by the frontend when the bucket's CORS policy blocks
 * browser-direct PUTs and can't be changed in the console. Slower than
 * presigned (bytes pass through the API) but works with any bucket.
 */
router.post(
  "/direct",
  authenticate,
  (req: Request, res: Response, next: () => void) => {
    upload.single("file")(req, res, (err: unknown) => {
      if (err) {
        res.status(400).json({
          error:
            err instanceof Error && err.message.includes("File too large")
              ? `File too large. Max ${env.UPLOAD_MAX_IMAGE_MB} MB.`
              : "Could not read upload",
        });
        return;
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    const userId = req.user?.userId as string;
    const file = (req as Request & { file?: Express.Multer.File }).file;
    const purpose = (req.body?.purpose as UploadPurpose) ?? "misc";

    if (!file) {
      res.status(400).json({ error: "No file attached (field name: file)" });
      return;
    }
    if (!PURPOSE_FOLDERS[purpose]) {
      res.status(400).json({ error: "Invalid purpose" });
      return;
    }
    const contentType = (file.mimetype || "").toLowerCase();
    const ext = IMAGE_EXTS[contentType];
    if (!ext) {
      res.status(400).json({ error: "Only PNG, JPG, WebP, GIF, AVIF images" });
      return;
    }

    try {
      const key = userFolderKey(userId, purpose, ext);
      await getStorageProvider().putObject(key, file.buffer, file.mimetype);
      const publicUrl = getStorageProvider().publicUrlFor(key);
      res.status(201).json(
        new ApiResponse({ key, publicUrl }, "Upload stored.", true),
      );
    } catch (error) {
      console.error("[upload/direct]", error);
      res.status(500).json({ error: "Could not store upload" });
    }
  },
);

/**
 * DELETE /api/upload — remove an object the caller owns.
 * The key must live under the caller's own folder; anything else is 403.
 */
router.delete(
  "/",
  authenticate,
  async (req: Request, res: Response) => {
    const userId = req.user?.userId as string;
    const { key } = req.body as { key?: string };
    if (typeof key !== "string" || !key.startsWith(`u/${userId}/`)) {
      res.status(403).json({ error: "You can only delete your own uploads" });
      return;
    }
    await getStorageProvider().deleteObject(key);
    res.json(new ApiResponse({ key }, "Upload deleted.", true));
  },
);

/**
 * POST /api/upload/signed-url — legacy GCS-shaped endpoint.
 * Now served by the storage abstraction (same {signedUrl, publicUrl,
 * fileKey} shape), so existing clients keep working unchanged.
 */
router.post("/signed-url", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId as string;
    const { fileName, contentType } = req.body as {
      fileName?: string;
      contentType?: string;
    };

    if (!fileName) {
      return res.status(400).json({ error: "fileName is required" });
    }

    const type = contentType || "image/jpeg";
    const ext = IMAGE_EXTS[type.toLowerCase()] ?? "jpg";
    const key = userFolderKey(userId, "misc", ext);
    const slot = await getStorageProvider().presignUpload({
      key,
      contentType: type,
      // Legacy callers don't declare a size — sign a 1-byte length; S3
      // accepts larger bodies on presigned PUTs unless bucket policy
      // says otherwise. Prefer /presign for strict size enforcement.
      sizeBytes: 1,
      expiresSec: env.UPLOAD_URL_TTL_SEC,
    });

    return res.status(200).json(
      new ApiResponse(
        { signedUrl: slot.uploadUrl, publicUrl: slot.publicUrl, fileKey: key },
        "Signed upload URL generated successfully",
        true,
      ),
    );
  } catch (error) {
    console.error("Error generating upload signed URL:", error);
    return res.status(500).json({ error: "Failed to generate signed upload URL" });
  }
});

/**
 * PUT /api/upload/dev-direct-upload
 * Development fallback endpoint when no bucket is configured locally.
 */
router.put("/dev-direct-upload", (_req: Request, res: Response) => {
  return res.status(200).send("Uploaded successfully");
});

export default router;
