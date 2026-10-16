"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ImageOff } from "lucide-react";
import { resolveReadableUrl } from "@/lib/uploads";
import { cn } from "@/lib/utils";

/** Resolve-once hook for avatar spots that need a plain string src. */
export function useReadableUrl(storedUrl: string | null | undefined): string | null {
  const [prev, setPrev] = useState(storedUrl);
  const [resolved, setResolved] = useState<string | null>(null);

  // Render-time reset on src change (endorsed derived-state pattern).
  if (storedUrl !== prev) {
    setPrev(storedUrl);
    setResolved(null);
  }

  useEffect(() => {
    if (!storedUrl) return;
    let cancelled = false;
    resolveReadableUrl(storedUrl).then((url) => {
      if (!cancelled) setResolved(url);
    });
    return () => {
      cancelled = true;
    };
  }, [storedUrl]);

  return storedUrl ? resolved : null;
}

/**
 * Image that always renders when the bytes exist — public URL first,
 * signed read URL fallback for private buckets. Shows a tonal placeholder
 * while resolving or when nothing is reachable.
 */
export function ReadableImage({
  src,
  alt,
  className,
  imgClassName,
  eager = false,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
}) {
  const [prevSrc, setPrevSrc] = useState(src);
  const [state, setState] = useState<"pending" | "ready" | "failed">(
    src ? "pending" : "failed",
  );
  const [resolved, setResolved] = useState<string | null>(null);

  // Render-time reset on src change (endorsed derived-state pattern).
  if (src !== prevSrc) {
    setPrevSrc(src);
    setState(src ? "pending" : "failed");
    setResolved(null);
  }

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    resolveReadableUrl(src).then((url) => {
      if (cancelled) return;
      if (url) {
        setResolved(url);
        setState("ready");
      } else {
        setState("failed");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (state !== "ready" || !resolved) {
    return (
      <span
        className={cn(
          "flex items-center justify-center bg-ink/[0.06] text-ink/30",
          state === "pending" && "animate-pulse",
          className,
        )}
        title={state === "failed" && src ? "Image unreachable — check bucket access" : undefined}
        aria-label={state === "failed" ? `${alt} (unavailable)` : alt}
      >
        <ImageOff className="size-1/3 max-w-6 max-h-6" />
      </span>
    );
  }

  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn("block overflow-hidden", className)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolved}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        draggable={false}
        className={cn("size-full object-cover", imgClassName)}
      />
    </motion.span>
  );
}
