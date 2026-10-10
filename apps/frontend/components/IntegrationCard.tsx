"use client";

import Image from "next/image";
import {
  Settings2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Unplug,
} from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import { FuseButton } from "@/components/bits/FuseButton";

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
  isTogglingId?: string | null;
  // Callbacks
  onConnect: () => void;
  onToggle: (id: string, active: boolean) => void;
  onDisconnect?: (id: string) => void;
  onConfigure?: (id: string) => void;
};

const CATEGORY_TILE: Record<string, string> = {
  messaging:
    "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  payment:
    "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
  scheduling:
    "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400",
  ecommerce:
    "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
};

export function IntegrationCard({
  name,
  description,
  icon,
  category,
  integrationId,
  isConnected = false,
  isActive = false,
  isPaymentConflict = false,
  isTogglingId,
  onConnect,
  onToggle,
  onDisconnect,
  onConfigure,
}: IntegrationCardProps) {
  const isToggling = isTogglingId === integrationId;
  const tileClass = CATEGORY_TILE[category] ?? "bg-zinc-500/10 text-zinc-500";

  return (
    <Card
      data-int-card
      className={cn(
        "rounded-3xl border shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
        isConnected && isActive && "ring-1 ring-primary/30",
      )}
    >
      {/* Active glow top bar */}
      {isConnected && isActive && (
        <div className="h-1 bg-linear-to-r from-emerald-400 via-emerald-500 to-emerald-400" />
      )}

      <CardContent className="flex flex-col justify-between gap-4 p-5">
        {/* Header Row */}
        <div className="flex items-start justify-between">
          {/* Icon */}
          <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shrink-0", tileClass)}>
            <Image
              src={icon}
              alt={name}
              width={30}
              height={30}
              className="rounded-lg object-contain"
            />
          </div>

          {/* Status badge */}
          <div className="flex flex-col items-end gap-1.5">
            {isConnected ? (
              <div className="flex items-center gap-1 text-[10px]">
                {isActive ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                    <span className="text-green-500 font-medium">Active</span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-zinc-500" />
                    <span className="text-muted-foreground">Inactive</span>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <AlertCircle size={10} />
                <span>Not connected</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div>
          <CardTitle className="text-[15px] font-semibold">{name}</CardTitle>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t pt-3.5">
          {isConnected ? (
            <>
              {/* Toggle */}
              <div className="flex items-center gap-2">
                {isToggling ? (
                  <Loader2
                    size={15}
                    className="animate-spin text-muted-foreground"
                  />
                ) : (
                  <Switch
                    id={`toggle-${name.toLowerCase().replace(/\s/g, "-")}`}
                    checked={isActive}
                    disabled={isPaymentConflict && !isActive}
                    onCheckedChange={(checked) =>
                      integrationId && onToggle(integrationId, checked)
                    }
                  />
                )}
                <span className="text-xs text-muted-foreground">
                  {isActive ? "Active" : "Inactive"}
                </span>
                {isPaymentConflict && !isActive && (
                  <span className="text-[10px] text-amber-500/80">
                    (Disable other payment first)
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {onConfigure && (
                  <button
                    onClick={() => integrationId && onConfigure(integrationId)}
                    title="Reconfigure"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-500/10 transition-colors"
                  >
                    <Settings2 size={14} />
                  </button>
                )}
                {onDisconnect && (
                  <button
                    onClick={() => integrationId && onDisconnect(integrationId)}
                    title="Disconnect"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Unplug size={14} />
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 size={12} className="text-zinc-500" />
                <span>Ready to connect</span>
              </div>
              <FuseButton
                onClick={onConnect}
                ariaLabel={`Connect ${name}`}
                className="[&>span:last-child]:px-3 [&>span:last-child]:py-1.5 [&>span:last-child]:text-xs"
              >
                <Settings2 size={13} />
                Connect
              </FuseButton>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
