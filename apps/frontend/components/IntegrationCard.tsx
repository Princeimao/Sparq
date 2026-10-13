"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Loader2, Settings2, Unplug } from "lucide-react";
import { cn } from "@/lib/utils";

export type IntegrationCardProps = {
  name: string;
  description: string;
  icon: string;
  category: "messaging" | "payment" | "scheduling" | "ecommerce";
  // State from backend
  integrationId?: string;
  isConnected?: boolean;
  isActive?: boolean;
  // Payment exclusivity: when true, this card's toggle is disabled
  isPaymentConflict?: boolean;
  isBusy?: boolean;
  // Entrance animation
  index?: number;
  reduceMotion?: boolean;
  // Callbacks
  onConnect: () => void;
  onToggle: () => void;
  onDisconnect?: () => void;
  onConfigure?: () => void;
};

const EASE = [0.22, 1, 0.36, 1] as const;

function StatusPill({ connected, active }: { connected: boolean; active: boolean }) {
  if (!connected) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink/45">
        <span className="size-1.5 rounded-full bg-ink/25" />
        Not connected
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        active ? "bg-brand/15 text-brand-deep" : "bg-ink/10 text-ink/55",
      )}
    >
      <span className="relative flex size-1.5">
        {active && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-brand opacity-60 animate-ping" />
        )}
        <span
          className={cn(
            "relative inline-flex size-1.5 rounded-full",
            active ? "bg-brand" : "bg-ink/35",
          )}
        />
      </span>
      {active ? "On" : "Off"}
    </span>
  );
}

export function IntegrationCard({
  name,
  description,
  icon,
  integrationId: _integrationId,
  isConnected = false,
  isActive = false,
  isPaymentConflict = false,
  isBusy = false,
  index = 0,
  reduceMotion = false,
  onConnect,
  onToggle,
  onDisconnect,
  onConfigure,
}: IntegrationCardProps) {
  void _integrationId;
  const toggleDisabled = isBusy || (isPaymentConflict && !isActive);

  return (
    <motion.div
      data-int-card
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: Math.min(index * 0.06, 0.42),
        duration: 0.45,
        ease: EASE,
      }}
      className={cn(
        "rounded-[1.4rem] p-5 flex flex-col gap-4 transition-colors duration-300",
        isConnected && isActive ? "bg-ink text-white" : "bg-ink/[0.045]",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <motion.div
          whileHover={reduceMotion ? undefined : { rotate: -6, scale: 1.06 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className="size-12 rounded-2xl bg-white flex items-center justify-center shrink-0 overflow-hidden"
        >
          <Image
            src={icon}
            alt={name}
            width={30}
            height={30}
            className="object-contain"
          />
        </motion.div>
        <StatusPill connected={isConnected} active={isActive} />
      </div>

      {/* Content */}
      <div>
        <p
          className={cn(
            "text-[15px] font-semibold tracking-tight",
            isConnected && isActive ? "text-white" : "text-ink",
          )}
        >
          {name}
        </p>
        <p
          className={cn(
            "text-[13px] mt-1 leading-relaxed",
            isConnected && isActive ? "text-white/60" : "text-ink/50",
          )}
        >
          {description}
        </p>
      </div>

      {/* Footer */}
      {!isConnected ? (
        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <span className="text-xs text-ink/45">Ready to connect</span>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onConnect}
            aria-label={`Connect ${name}`}
            className="h-10 inline-flex items-center rounded-full bg-ink px-5 text-[13px] font-medium text-white transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
          >
            Connect
          </motion.button>
        </div>
      ) : (
        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2.5">
            {isBusy ? (
              <Loader2 size={16} className="animate-spin opacity-60" />
            ) : (
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                aria-label={`Turn ${name} ${isActive ? "off" : "on"}`}
                disabled={toggleDisabled}
                onClick={onToggle}
                className={cn(
                  "relative h-6.5 w-11.5 rounded-full transition-colors duration-300 shrink-0",
                  "focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2",
                  isActive ? "bg-brand" : "bg-white/20",
                  toggleDisabled && "opacity-50 cursor-not-allowed",
                )}
              >
                <motion.span
                  layout
                  transition={{ type: "spring", stiffness: 550, damping: 30 }}
                  className={cn(
                    "absolute top-0.5 size-5.5 rounded-full bg-white",
                    isActive ? "right-0.5" : "left-0.5",
                  )}
                />
              </button>
            )}
            <span
              className={cn(
                "text-xs font-medium",
                isConnected && isActive ? "text-white/70" : "text-ink/55",
              )}
            >
              {isActive ? "On" : "Off"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {onConfigure && (
              <button
                onClick={onConfigure}
                title={`Edit ${name} settings`}
                aria-label={`Edit ${name} settings`}
                className={cn(
                  "p-2 rounded-full transition-colors",
                  isConnected && isActive
                    ? "text-white/70 hover:text-white hover:bg-white/15"
                    : "text-ink/55 hover:text-ink hover:bg-ink/10",
                )}
              >
                <Settings2 size={15} />
              </button>
            )}
            {onDisconnect && (
              <button
                onClick={onDisconnect}
                title={`Disconnect ${name}`}
                aria-label={`Disconnect ${name}`}
                className={cn(
                  "p-2 rounded-full transition-colors",
                  isConnected && isActive
                    ? "text-white/70 hover:text-white hover:bg-white/15"
                    : "text-ink/55 hover:text-red-600 hover:bg-red-500/10",
                )}
              >
                <Unplug size={15} />
              </button>
            )}
          </div>
        </div>
      )}

      {isPaymentConflict && !isActive && (
        <p className="text-[11px] font-medium text-amber-600">
          Turn off the other payment gateway first.
        </p>
      )}
    </motion.div>
  );
}
