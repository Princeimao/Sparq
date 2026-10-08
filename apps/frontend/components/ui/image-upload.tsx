"use client";

import { useState, useCallback, useRef } from "react";
import { UploadCloud, X, Loader2, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
}

export function ImageUpload({
  value,
  onChange,
  onRemove,
  disabled = false,
  className = "",
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file (PNG, JPG, WebP)");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image file size must be less than 10MB");
        return;
      }

      setUploading(true);
      setProgress(10);

      try {
        // 1. Get GCS signed URL from backend
        const signedRes = await api.post("/upload/signed-url", {
          fileName: file.name,
          contentType: file.type,
        });

        const { signedUrl, publicUrl } = signedRes.data.data;
        setProgress(40);

        // 2. Upload file directly to Cloud Storage (GCS or fallback endpoint)
        if (signedUrl.startsWith("http")) {
          const uploadRes = await fetch(signedUrl, {
            method: "PUT",
            headers: {
              "Content-Type": file.type,
            },
            body: file,
          });

          if (!uploadRes.ok) {
            throw new Error("Direct cloud storage upload failed");
          }
        } else {
          // Dev fallback endpoint
          await api.put(signedUrl, file, {
            headers: { "Content-Type": file.type },
          });
        }

        setProgress(100);
        onChange(publicUrl);
        toast.success("Image uploaded successfully!");
      } catch (err: any) {
        console.error("Upload error:", err);
        toast.error(err.message || "Failed to upload image");
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled || uploading) return;

      const files = e.dataTransfer.files;
      if (files && files[0]) {
        handleUpload(files[0]);
      }
    },
    [disabled, uploading, handleUpload]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!disabled && !uploading) {
        setIsDragging(true);
      }
    },
    [disabled, uploading]
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleUpload(files[0]);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
      />

      {value ? (
        <div className="relative group rounded-xl border overflow-hidden bg-muted/20 h-44 flex items-center justify-center">
          <img
            src={value}
            alt="Uploaded preview"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
              className="rounded-lg bg-white/90 text-black hover:bg-white"
            >
              Change Image
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={() => {
                onChange("");
                if (onRemove) onRemove();
              }}
              disabled={disabled || uploading}
              className="rounded-lg size-8"
            >
              <X className="size-4" />
            </Button>
          </div>
          <div className="absolute bottom-2 left-2 bg-emerald-500/90 text-white text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 font-medium backdrop-blur-sm">
            <CheckCircle2 className="size-3" /> Uploaded to Cloud
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-6 transition-all duration-200 text-center flex flex-col items-center justify-center gap-2 cursor-pointer relative min-h-[160px]
            ${
              isDragging
                ? "border-primary bg-primary/10 scale-[0.99]"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
            }
            ${disabled || uploading ? "opacity-60 cursor-not-allowed" : ""}
          `}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Uploading to Google Cloud Storage...</p>
              <p className="text-xs text-muted-foreground">{progress}% completed</p>
            </div>
          ) : (
            <>
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                <UploadCloud className="size-6" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  <span className="text-primary font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  PNG, JPG, WebP up to 10MB
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
