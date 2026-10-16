"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  Check,
  CloudUpload,
  ImagePlus,
  RotateCcw,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import {
  isSupportedImage,
  uploadImage,
  type UploadPurpose,
} from "@/lib/uploads";
import { ReadableImage } from "./ReadableImage";
import { cn } from "@/lib/utils";

interface Tile {
  id: string;
  preview: string;
  status: "uploading" | "done" | "error";
  progress: number;
  url?: string;
  error?: string;
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 36 36" className="size-9 -rotate-90" aria-hidden>
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        strokeWidth="3.5"
        className="stroke-white/25"
      />
      <motion.circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        strokeWidth="3.5"
        strokeLinecap="round"
        className="stroke-white"
        strokeDasharray={c}
        initial={false}
        animate={{ strokeDashoffset: c - (c * pct) / 100 }}
        transition={{ duration: 0.2 }}
      />
    </svg>
  );
}

/**
 * Drag-and-drop image uploader. Files go straight to the bucket via
 * presigned URLs (see lib/uploads) with per-file progress, previews and
 * springy add/remove/success motion throughout.
 */
export function DropzoneUploader({
  purpose,
  value,
  onChange,
  multiple = false,
  maxFiles = 6,
  maxSizeMB = 8,
  label = "Drop images here",
  sublabel = "or click to browse — PNG, JPG, WebP up to 8 MB",
}: {
  purpose: UploadPurpose;
  value: string[];
  onChange: (urls: string[]) => void;
  multiple?: boolean;
  maxFiles?: number;
  maxSizeMB?: number;
  label?: string;
  sublabel?: string;
}) {
  const reduceMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const aborters = useRef(new Map<string, AbortController>());
  const filesByTile = useRef(new Map<string, File>());
  const previews = useRef(new Set<string>());
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [tiles, setTiles] = useState<Tile[]>([]);

  // Abort in-flight uploads + revoke object URLs on unmount.
  useEffect(() => {
    const abortMap = aborters.current;
    const fileMap = filesByTile.current;
    const previewSet = previews.current;
    return () => {
      abortMap.forEach((c) => c.abort());
      abortMap.clear();
      fileMap.clear();
      previewSet.forEach((u) => URL.revokeObjectURL(u));
      previewSet.clear();
    };
  }, []);

  const revokePreview = useCallback((preview: string) => {
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    previews.current.delete(preview);
  }, []);

  const patchTile = useCallback((id: string, patch: Partial<Tile>) => {
    setTiles((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const startUpload = useCallback(
    async (tileId: string, file: File): Promise<string | null> => {
      const ctrl = new AbortController();
      aborters.current.set(tileId, ctrl);
      try {
        const url = await uploadImage(
          purpose,
          file,
          (pct) => patchTile(tileId, { progress: pct }),
          ctrl.signal,
        );
        patchTile(tileId, { status: "done", progress: 100, url });
        return url;
      } catch (err) {
        if ((err as Error)?.message === "Upload cancelled") {
          setTiles((prev) => prev.filter((t) => t.id !== tileId));
          return null;
        }
        patchTile(tileId, {
          status: "error",
          error: (err as Error)?.message ?? "Upload failed",
        });
        return null;
      } finally {
        aborters.current.delete(tileId);
      }
    },
    [purpose, patchTile],
  );

  const acceptFiles = useCallback(
    (incoming: FileList | File[]) => {
      const list = [...incoming];
      const room = multiple ? Math.max(0, maxFiles - value.length) : 1;
      if (list.length > room) {
        toast.error(
          multiple
            ? `Only ${room} more image${room === 1 ? "" : "s"} allowed`
            : "One image at a time",
        );
      }
      const queue: { tile: Tile; file: File }[] = [];
      for (const file of list.slice(0, Math.max(room, 0))) {
        if (!isSupportedImage(file)) {
          toast.error(`${file.name}: PNG, JPG, WebP, GIF or AVIF only`);
          continue;
        }
        if (file.size > maxSizeMB * 1024 * 1024) {
          toast.error(`${file.name}: over ${maxSizeMB} MB`);
          continue;
        }
        const preview = URL.createObjectURL(file);
        previews.current.add(preview);
        const tile: Tile = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          preview,
          status: "uploading",
          progress: 0,
        };
        filesByTile.current.set(tile.id, file);
        queue.push({ tile, file });
      }
      if (queue.length === 0) return;
      setTiles((prev) => (multiple ? [...prev, ...queue.map((q) => q.tile)] : queue.map((q) => q.tile)));
      // Sequential uploads keep progress honest on slow networks.
      void (async () => {
        const acc = [...value];
        for (const { tile, file } of queue) {
          const url = await startUpload(tile.id, file);
          if (url) acc.push(url);
        }
        if (acc.length !== value.length) {
          onChange(multiple ? acc : acc.slice(-1));
        }
      })();
    },
    [multiple, maxFiles, value, onChange, maxSizeMB, startUpload],
  );

  const removeTile = (tile: Tile) => {
    aborters.current.get(tile.id)?.abort();
    aborters.current.delete(tile.id);
    filesByTile.current.delete(tile.id);
    revokePreview(tile.preview);
    setTiles((prev) => prev.filter((t) => t.id !== tile.id));
    if (tile.url) onChange(value.filter((u) => u !== tile.url));
  };

  const retryTile = (tile: Tile) => {
    const file = filesByTile.current.get(tile.id);
    if (!file) return;
    patchTile(tile.id, { status: "uploading", progress: 0, error: undefined });
    void startUpload(tile.id, file).then((url) => {
      if (url) onChange(multiple ? [...value, url] : [url]);
    });
  };

  return (
    <div>
      {/* Drop surface */}
      <motion.button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          dragDepth.current += 1;
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          dragDepth.current = 0;
          if (e.dataTransfer.files.length) acceptFiles(e.dataTransfer.files);
        }}
        animate={reduceMotion ? undefined : dragging ? { scale: 1.015 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={cn(
          "w-full rounded-[1.4rem] px-5 py-7 flex flex-col items-center gap-2 text-center transition-colors duration-200 cursor-pointer",
          "focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2",
          dragging ? "bg-brand/[0.08]" : "bg-ink/[0.04] hover:bg-ink/[0.07]",
        )}
        aria-label="Upload images"
      >
        <motion.span
          animate={reduceMotion ? undefined : dragging ? { y: -4, scale: 1.1 } : { y: 0, scale: 1 }}
          className={cn(
            "flex size-12 items-center justify-center rounded-2xl transition-colors",
            dragging ? "bg-brand text-white" : "bg-ink text-white",
          )}
        >
          {dragging ? <CloudUpload className="size-6" /> : <ImagePlus className="size-6" />}
        </motion.span>
        <span className="text-sm font-semibold text-ink">
          {dragging ? "Release to upload" : label}
        </span>
        <span className="text-xs text-ink/50">{sublabel}</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
          multiple={multiple}
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            if (e.target.files?.length) acceptFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </motion.button>

      {/* Tiles */}
      {tiles.length > 0 && (
        <motion.div layout className="flex flex-wrap gap-2 mt-2.5">
          <AnimatePresence mode="popLayout" initial={false}>
            {tiles.map((tile) => (
              <motion.div
                key={tile.id}
                data-tile={tile.id}
                layout
                initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                className="relative size-20 rounded-2xl overflow-hidden bg-ink/10 shrink-0 group"
              >
                {tile.status === "uploading" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tile.preview}
                    alt=""
                    className="absolute inset-0 size-full object-cover"
                  />
                ) : tile.status === "done" && tile.url ? (
                  <ReadableImage
                    src={tile.url}
                    alt=""
                    className="absolute inset-0 size-full"
                  />
                ) : null}
                {tile.status === "uploading" && (
                  <span className="absolute inset-0 bg-ink/55 flex flex-col items-center justify-center gap-1">
                    <ProgressRing pct={tile.progress} />
                    <span className="text-[10px] font-bold text-white tabular-nums">
                      {tile.progress}%
                    </span>
                  </span>
                )}
                {tile.status === "done" && (
                  <motion.span
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 20, delay: 0.05 }}
                    className="absolute bottom-1 right-1 flex size-5 items-center justify-center rounded-full bg-brand text-white"
                  >
                    <Check className="size-3" strokeWidth={3.5} />
                  </motion.span>
                )}
                {tile.status === "error" && (
                  <button
                    type="button"
                    onClick={() => retryTile(tile)}
                    title={tile.error ?? "Upload failed — tap to retry"}
                    className="absolute inset-0 bg-red-600/85 flex flex-col items-center justify-center gap-0.5 p-1 text-center"
                  >
                    <TriangleAlert className="size-4 text-white" />
                    <span className="flex items-center gap-0.5 text-[9px] font-semibold text-white">
                      <RotateCcw className="size-2.5" /> Retry
                    </span>
                  </button>
                )}
                <span className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => removeTile(tile)}
                    aria-label="Remove image"
                    className="flex size-6 items-center justify-center rounded-full bg-ink/70 text-white hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
