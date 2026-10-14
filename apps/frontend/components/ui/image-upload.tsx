"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { UploadCloud, X, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { isSupportedImage, uploadImage } from "@/lib/uploads";
import { cn } from "@/lib/utils";

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
  const abortRef = useRef<AbortController | null>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!file || disabled || uploading) return;

      if (!isSupportedImage(file)) {
        toast.error("PNG, JPG, WebP, GIF or AVIF only");
        return;
      }

      if (file.size > 8 * 1024 * 1024) {
        toast.error("Image must be under 8 MB");
        return;
      }

      setUploading(true);
      setProgress(0);
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        // Slot from the API, bytes straight to the bucket.
        const { url, readable } = await uploadImage("avatars", file, setProgress, ctrl.signal);
        onChange(url);
        if (readable) {
          toast.success("Image uploaded!");
        } else {
          toast.warning(
            "Uploaded, but the bucket isn't serving it publicly — allow public read on the bucket and it will appear.",
            { duration: 9000 },
          );
        }
      } catch (err) {
        if ((err as Error)?.message !== "Upload cancelled") {
          toast.error((err as Error)?.message || "Failed to upload image");
        }
      } finally {
        setUploading(false);
        setProgress(0);
        abortRef.current = null;
      }
    },
    [disabled, uploading, onChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled || uploading) return;
      const files = e.dataTransfer.files;
      if (files?.[0]) void handleUpload(files[0]);
    },
    [disabled, uploading, handleUpload],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.[0]) void handleUpload(files[0]);
    e.target.value = "";
  };

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
      />

      {value ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative group rounded-[1.2rem] overflow-hidden bg-ink/[0.05] h-44 flex items-center justify-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Uploaded preview"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-ink/40 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
              className="h-9 px-4 rounded-full bg-white/90 text-ink text-[13px] font-medium hover:bg-white transition-colors"
            >
              Change image
            </button>
            <button
              type="button"
              onClick={() => {
                onChange("");
                onRemove?.();
              }}
              disabled={disabled || uploading}
              aria-label="Remove image"
              className="flex size-9 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="absolute bottom-2 left-2 bg-brand text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
            <CheckCircle2 className="size-3" /> Uploaded
          </div>
        </motion.div>
      ) : (
        <motion.div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled && !uploading) setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          animate={isDragging ? { scale: 0.99 } : { scale: 1 }}
          className={cn(
            "rounded-[1.2rem] p-6 transition-colors duration-200 text-center flex flex-col items-center justify-center gap-2 cursor-pointer relative min-h-[160px]",
            isDragging ? "bg-brand/[0.08]" : "bg-ink/[0.04] hover:bg-ink/[0.07]",
            (disabled || uploading) && "opacity-60 cursor-not-allowed",
          )}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2.5 w-full max-w-44">
              <span className="text-sm font-semibold text-ink tabular-nums">
                {progress}%
              </span>
              <div className="w-full h-1.5 rounded-full bg-ink/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-brand"
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  abortRef.current?.abort();
                }}
                className="text-xs font-medium text-ink/55 hover:text-red-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <div
                className={cn(
                  "p-3 rounded-2xl transition-colors",
                  isDragging ? "bg-brand text-white" : "bg-ink text-white",
                )}
              >
                {isDragging ? (
                  <UploadCloud className="size-6" />
                ) : (
                  <ImageIcon className="size-6" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">
                  {isDragging ? "Release to upload" : "Click or drag an image here"}
                </p>
                <p className="text-xs text-ink/50 mt-0.5">
                  PNG, JPG, WebP up to 8 MB
                </p>
              </div>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
