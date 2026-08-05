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
import { Badge } from "@/components/ui/badge";
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
  isTogglingId?: string | null;
  // Callbacks
  onConnect: () => void;
  onToggle: (id: string, active: boolean) => void;
  onDisconnect?: (id: string) => void;
  onConfigure?: (id: string) => void;
};

const CATEGORY_BADGE: Record<string, { label: string; class: string }> = {
  messaging: {
    label: "Messaging",
    class: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  payment: {
    label: "Payment",
    class: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  },
  scheduling: {
    label: "Scheduling",
    class: "bg-sky-500/10 text-sky-500 border-sky-500/20",
  },
  ecommerce: {
    label: "E-commerce",
    class: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  },
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
  const catBadge = CATEGORY_BADGE[category];

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-200 hover:shadow-md",
        isConnected && isActive && "ring-1 ring-primary/30",
      )}
    >
      {/* Active glow top bar */}
      {isConnected && isActive && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-primary/60 via-primary to-primary/60" />
      )}

      <CardContent className="flex flex-col justify-between gap-4 pt-6">
        {/* Header Row */}
        <div className="flex items-start justify-between">
          {/* Icon */}
          <div className="h-12 w-12 rounded-xl bg-zinc-500/10 flex items-center justify-center shrink-0">
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
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-medium px-2 py-0.5 border",
                catBadge.class,
              )}
            >
              {catBadge.label}
            </Badge>
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
          <CardTitle className="text-sm font-semibold">{name}</CardTitle>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 pt-3">
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
              <button
                onClick={onConnect}
                id={`connect-${name.toLowerCase().replace(/\s/g, "-")}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-all duration-150"
              >
                <Settings2 size={13} />
                Connect
              </button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
