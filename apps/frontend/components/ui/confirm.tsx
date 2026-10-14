"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger renders a red confirm; default renders ink. */
  tone?: "danger" | "default";
}

type Resolver = (ok: boolean) => void;

const ConfirmContext = createContext<(opts: ConfirmOptions) => Promise<boolean>>(
  () => Promise.resolve(false),
);

/** Await user confirmation without the native alert box. */
export function useConfirm(): (opts: ConfirmOptions) => Promise<boolean> {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<Resolver | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setCurrent(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setCurrent(null);
  }, []);

  const danger = current?.tone === "danger";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {current && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/40 backdrop-blur-[2px] p-4"
            onClick={() => settle(false)}
            role="presentation"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              role="alertdialog"
              aria-modal="true"
              aria-label={current.title}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-[1.6rem] bg-paper p-6"
            >
              <span
                className={cn(
                  "flex size-11 items-center justify-center rounded-2xl",
                  danger ? "bg-red-500/10 text-red-600" : "bg-ink text-white",
                )}
              >
                <TriangleAlert className="size-5" />
              </span>
              <h3 className="text-lg font-semibold tracking-tight text-ink mt-4">
                {current.title}
              </h3>
              {current.body && (
                <p className="text-sm text-ink/60 mt-1.5 leading-relaxed">
                  {current.body}
                </p>
              )}
              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => settle(false)}
                  autoFocus
                  className="h-11 flex-1 rounded-full text-sm font-medium text-ink/60 hover:text-ink hover:bg-ink/[0.06] transition-colors"
                >
                  {current.cancelLabel ?? "Cancel"}
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => settle(true)}
                  className={cn(
                    "h-11 flex-1 rounded-full text-sm font-medium text-white transition-colors",
                    danger ? "bg-red-600 hover:bg-red-700" : "bg-ink hover:bg-brand",
                  )}
                >
                  {current.confirmLabel ?? "Confirm"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}
