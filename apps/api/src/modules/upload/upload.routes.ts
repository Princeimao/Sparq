import { Router, Request, Response } from "express";
import { gcsService } from "../../services/gcs.service";
import { ApiResponse } from "../../middleware/responseHandler";

const router = Router();

/**
 * POST /api/upload/signed-url
 * Generates a Google Cloud Storage signed upload URL for direct catalog image uploads.
 */
router.post("/signed-url", async (req: Request, res: Response) => {
  try {
    const { fileName, contentType } = req.body;

    if (!fileName) {
      return res.status(400).json({ error: "fileName is required" });
    }

    const uploadData = await gcsService.generateSignedUploadUrl(
      fileName,
      contentType || "image/jpeg"
    );

    return res.status(200).json(
      new ApiResponse(uploadData, "Signed upload URL generated successfully", true)
    );
  } catch (error: any) {
    console.error("Error generating upload signed URL:", error);
    return res.status(500).json({ error: "Failed to generate signed upload URL" });
  }
});

/**
 * PUT /api/upload/dev-direct-upload
 * Development fallback endpoint when GCS bucket is not configured in local environment.
 */
router.put("/dev-direct-upload", (_req: Request, res: Response) => {
  return res.status(200).send("Uploaded successfully");
});

export default router;
