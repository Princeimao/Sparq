"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FuseButton } from "@/components/bits/FuseButton";
import { Celebration, StepDots, SuccessCheck } from "./Celebration";
import { cn } from "@/lib/utils";

export interface WizardStepDef<T> {
  id: string;
  title: string;
  hint?: string;
  /** Render step body. Must call onChange for every field it edits. */
  render: (data: T, onChange: (patch: Partial<T>) => void) => React.ReactNode;
  /** Return an error string to block advancing, or null when valid. */
  validate?: (data: T) => string | null;
}

export interface WizardSuccess {
  title: string;
  message: string;
}

interface WizardDialogProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  steps: WizardStepDef<T>[];
  initialData: T;
  submitLabel?: string;
  /** Persist. Throw / return error string on failure. */
  onSubmit: (data: T) => Promise<WizardSuccess | void>;
  /** Called with the success payload so lists can refresh. */
  onDone?: () => void;
  /** Reset to a fresh draft after "Create another". */
  freshData?: () => T;
}

/**
 * Reusable multi-step creation dialog: animated progress, slide
 * transitions, per-step validation and a celebratory success state.
 */
export function WizardDialog<T>({
  open,
  onOpenChange,
  title,
  subtitle,
  steps,
  initialData,
  submitLabel = "Create",
  onSubmit,
  onDone,
  freshData,
}: WizardDialogProps<T>) {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [data, setData] = useState<T>(initialData);
  const [prevOpen, setPrevOpen] = useState(open);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<WizardSuccess | null>(null);
  const [burst, setBurst] = useState(0);

  // Reset the draft when the dialog transitions from closed → open.
  // (Render-time adjustment — the React-endorsed pattern for derived state.)
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setData(freshData ? freshData() : initialData);
      setStep(0);
      setDir(1);
      setError(null);
      setSubmitting(false);
      setSuccess(null);
    }
  }

  const patch = (p: Partial<T>) => {
    setData((d) => ({ ...d, ...p }));
    setError(null);
  };

  const go = (next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
    setError(null);
  };

  const next = () => {
    const problem = steps[step]?.validate?.(data) ?? null;
    if (problem) {
      setError(problem);
      return;
    }
    go(Math.min(step + 1, steps.length - 1));
  };

  const submit = async () => {
    const problem = steps[step]?.validate?.(data) ?? null;
    if (problem) {
      setError(problem);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await onSubmit(data);
      setSuccess(
        result ?? { title: "Created", message: "All done — looking good." },
      );
      setBurst((b) => b + 1);
      onDone?.();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ??
        (e instanceof Error ? e.message : null) ??
        "Something went wrong. Try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const close = (v: boolean) => {
    if (submitting) return;
    onOpenChange(v);
  };

  const last = step === steps.length - 1;
  const current = steps[step];

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg rounded-3xl border-zinc-200/80 bg-paper p-0 overflow-hidden gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-lg font-semibold tracking-tight text-ink">
                {success ? success.title : title}
              </DialogTitle>
              {!success && (
                <DialogDescription className="text-[13px] mt-0.5">
                  {subtitle ? `${subtitle} · ` : ""}Step {step + 1} of {steps.length} —{" "}
                  {current?.title}
                  {current?.hint ? ` · ${current.hint}` : ""}
                </DialogDescription>
              )}
            </div>
            <button
              onClick={() => close(false)}
              aria-label="Close dialog"
              className="rounded-full p-1.5 text-muted-foreground hover:bg-ink/5 hover:text-foreground transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
          {!success && (
            <div className="mt-3 flex items-center justify-between">
              <StepDots total={steps.length} current={step} />
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {step + 1} / {steps.length}
              </span>
            </div>
          )}
          {/* progress hairline */}
          {!success && (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-200/70">
              <motion.div
                className="h-full rounded-full bg-brand"
                initial={false}
                animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
                transition={{ type: "spring", stiffness: 260, damping: 28 }}
              />
            </div>
          )}
        </DialogHeader>

        {/* Body */}
        <div className="px-6 pb-6">
          {success ? (
            <div className="relative flex flex-col items-center py-6 text-center">
              <SuccessCheck />
              <Celebration burstKey={burst} />
              <p className="mt-4 text-sm text-muted-foreground max-w-xs">
                {success.message}
              </p>
              <div className="mt-6 flex gap-2">
                <Button variant="outline" className="rounded-full" onClick={() => close(false)}>
                  Done
                </Button>
                {freshData && (
                  <Button
                    className="rounded-full bg-ink text-white hover:bg-ink/90"
                    onClick={() => {
                      setData(freshData());
                      setStep(0);
                      setSuccess(null);
                    }}
                  >
                    Create another
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              <AnimatePresence
                mode="wait"
                custom={dir}
                initial={false}
              >
                <motion.div
                  key={current?.id ?? step}
                  custom={dir}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 32 * dir }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -32 * dir }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="min-h-56"
                >
                  {current?.render(data, patch)}
                </motion.div>
              </AnimatePresence>

              {error && (
                <motion.p
                  key={error}
                  initial={reduceMotion ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="alert"
                  className="mt-3 text-xs font-medium text-destructive"
                >
                  {error}
                </motion.p>
              )}

              <div className="mt-5 flex items-center justify-between">
                <Button
                  variant="ghost"
                  className="rounded-full"
                  disabled={step === 0 || submitting}
                  onClick={() => go(step - 1)}
                >
                  <ArrowLeft className="size-4 mr-1.5" /> Back
                </Button>
                {last ? (
                  <FuseButton
                    onClick={submit}
                    disabled={submitting}
                    ariaLabel={submitLabel}
                  >
                    {submitting && <Loader2 className="size-4 animate-spin" />}
                    {submitting ? "Creating…" : submitLabel}
                  </FuseButton>
                ) : (
                  <Button
                    onClick={next}
                    className="rounded-full bg-ink text-white hover:bg-ink/90"
                  >
                    Continue <ArrowRight className="size-4 ml-1.5" />
                  </Button>
                )}
              </div>
            </>
          )}
        </div>

        {/* brand hairline */}
        <div className={cn("h-1 w-full", success ? "bg-brand" : "bg-zinc-200/60")}>
          {!success && (
            <motion.div
              className="h-full bg-brand origin-left"
              initial={false}
              animate={{ scaleX: (step + 1) / steps.length }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
