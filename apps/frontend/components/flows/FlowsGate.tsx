"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Hourglass,
  MessageSquareCode,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import type { FlowsGateState } from "@/hooks/integration";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

// ─── Availability banner (top of every Flows surface) ────────────────────────

export function FlowsStatusBanner({
  gate,
  onRetry,
}: {
  gate: FlowsGateState;
  onRetry?: () => void;
}) {
  if (!gate.connected || gate.reason === "not_connected") return null;

  const conf = (() => {
    switch (gate.reason) {
      case "ok":
        return {
          tone: "bg-brand/[0.12] text-brand-deep",
          icon: <BadgeCheck className="size-4 shrink-0" />,
          title: "Flows unlocked",
          body:
            gate.qualityRating === "YELLOW"
              ? "Number in fair standing (YELLOW) — keep quality high to stay unlocked."
              : "Your number is in good standing — customers can fill these forms right inside WhatsApp.",
        };
      case "unverified":
        return {
          tone: "bg-amber-500/10 text-amber-700",
          icon: <Hourglass className="size-4 shrink-0" />,
          title: "Verification pending",
          body: "Meta hasn't confirmed this number yet. You can keep building — publishing unlocks automatically once Meta clears it.",
        };
      case "low_quality":
        return {
          tone: "bg-red-500/10 text-red-700",
          icon: <ShieldAlert className="size-4 shrink-0" />,
          title: "Locked by Meta",
          body: "This number's quality rating is RED, so Meta withholds Flows. Cut broadcasts, answer fast, avoid reports — it unlocks on its own as quality recovers.",
        };
      case "disabled":
        return {
          tone: "bg-amber-500/10 text-amber-700",
          icon: <TriangleAlert className="size-4 shrink-0" />,
          title: "WhatsApp is switched off",
          body: "Turn it back on in Integrations to keep building flows.",
        };
      default:
        return {
          tone: "bg-ink/[0.05] text-ink/60",
          icon: <Hourglass className="size-4 shrink-0" />,
          title: "Checking availability…",
          body: "Asking Meta whether this number can use Flows.",
        };
    }
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className={cn(
        "flex items-start gap-3 rounded-[1.4rem] px-5 py-4",
        conf.tone,
      )}
      role="status"
    >
      {conf.icon}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{conf.title}</p>
        <p className="text-[13px] mt-0.5 leading-relaxed opacity-80">{conf.body}</p>
      </div>
      {onRetry && gate.reason !== "ok" && (
        <button
          onClick={onRetry}
          className="shrink-0 text-xs font-semibold underline underline-offset-2 opacity-80 hover:opacity-100"
        >
          Recheck
        </button>
      )}
    </motion.div>
  );
}

// ─── Full gate screen (WhatsApp not connected) ───────────────────────────────

export function WhatsAppRequiredGate() {
  const router = useRouter();
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="flex flex-col items-center text-center py-20"
      >
        <motion.span
          initial={{ scale: 0.7 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
          className="flex size-16 items-center justify-center rounded-[1.4rem] bg-ink text-white"
        >
          <MessageSquareCode className="size-7" />
        </motion.span>
        <h1 className="text-3xl font-semibold tracking-[-0.02em] text-ink mt-6">
          Connect WhatsApp first
        </h1>
        <p className="text-[15px] text-ink/55 mt-2 max-w-md leading-relaxed">
          Flow messages are filled in by customers right inside WhatsApp — so
          there&apos;s nothing to build until your number is connected.
        </p>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push("/integrations")}
          className="group mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-ink pl-6 pr-2 text-sm font-medium text-white transition-colors hover:bg-brand"
        >
          Connect WhatsApp
          <span className="flex size-9 items-center justify-center rounded-full bg-white/15 transition-transform duration-300 group-hover:translate-x-0.5">
            <ArrowRight className="size-4" />
          </span>
        </motion.button>
      </motion.div>
    </div>
  );
}
