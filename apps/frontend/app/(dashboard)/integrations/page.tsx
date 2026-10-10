"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { animate, stagger } from "animejs";
import { useReducedMotion } from "framer-motion";
import {
  MessageSquare,
  CreditCard,
  Calendar,
  ShoppingBag,
  RefreshCw,
  AlertTriangle,
  Loader2,
  LayoutGrid,
} from "lucide-react";

import { IntegrationCard } from "@/components/IntegrationCard";
import { IntegrationDialog } from "@/components/IntegrationDialog";
import { integrations, type IntegrationProvider, type IntegrationDefinition } from "@/constant";
import {
  useIntegrations,
  useConnectIntegration,
  useToggleIntegration,
  useDisconnectIntegration,
  useWhatsAppConnect,
} from "@/hooks/integration";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Category config ─────────────────────────────────────────────────────────

const CATEGORIES: {
  key: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    key: "messaging",
    label: "Messaging",
    icon: <MessageSquare size={16} />,
    description: "Connect messaging platforms to automate customer conversations",
  },
  {
    key: "payment",
    label: "Payments",
    icon: <CreditCard size={16} />,
    description: "Only one payment gateway can be active at a time",
  },
  {
    key: "scheduling",
    label: "Scheduling",
    icon: <Calendar size={16} />,
    description: "Sync calendars and manage appointment bookings",
  },
  {
    key: "ecommerce",
    label: "E-commerce",
    icon: <ShoppingBag size={16} />,
    description: "Integrate your store to sync products and orders",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

const Page = () => {
  const {
    integrations: connectedIntegrations,
    isLoading,
    error,
    refetch,
  } = useIntegrations();

  console.log(connectedIntegrations)
  const { connect } = useConnectIntegration();
  const { toggle, togglingId } = useToggleIntegration(refetch);
  const { disconnect } = useDisconnectIntegration(refetch);
  const whatsappConnect = useWhatsAppConnect();

  // Dialog state: which provider's dialog is open
  const [openDialog, setOpenDialog] = useState<IntegrationProvider | null>(null);
  // Track if reconfiguring an existing connection
  const [reconigureId, setReconfigureId] = useState<string | null>(null);
  const [tab, setTab] = useState("all");
  const reduceMotion = useReducedMotion();
  const gridRef = useRef<HTMLDivElement>(null);

  // ── Derived state ────────────────────────────────────────────────────────

  const getStatus = useCallback(
    (name: string) =>
      connectedIntegrations.find(
        (i) => i.name.toLowerCase() === name.toLowerCase()
      ),
    [connectedIntegrations]
  );

  // Payment conflict: is the OTHER payment provider currently active?
  const stripeStatus = getStatus("Stripe");
  const razorpayStatus = getStatus("Razorpay");
  const isPaymentConflict = (provider: string) => {
    if (provider === "stripe") return !!(razorpayStatus?.isActive);
    if (provider === "razorpay") return !!(stripeStatus?.isActive);
    return false;
  };

  const activePaymentCount = [stripeStatus, razorpayStatus].filter(
    (s) => s?.isActive
  ).length;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleConnect = (integration: IntegrationDefinition) => {
    if (integration.provider === "whatsapp") {
      whatsappConnect();
    } else {
      setOpenDialog(integration.provider);
      setReconfigureId(null);
    }
  };

  const handleConfigure = (integration: IntegrationDefinition, id: string) => {
    setOpenDialog(integration.provider);
    setReconfigureId(id);
  };

  const handleDialogSubmit = async (
    provider: Exclude<IntegrationProvider, "whatsapp">,
    data: Record<string, string>
  ) => {
    await connect(provider, data, refetch);
  };

  // ─────────────────────────────────────────────────────────────────────────

  const visibleCategories =
    tab === "all" ? CATEGORIES : CATEGORIES.filter((c) => c.key === tab);

  // Anime.js stagger whenever the visible grid changes.
  useEffect(() => {
    if (isLoading || reduceMotion) return;
    const root = gridRef.current;
    if (!root) return;
    const cards = root.querySelectorAll("[data-int-card]");
    if (cards.length === 0) return;
    const anim = animate(cards, {
      opacity: [0, 1],
      translateY: [16, 0],
      scale: [0.97, 1],
      duration: 450,
      delay: stagger(60),
      ease: "outCubic",
    });
    return () => {
      anim.revert();
    };
  }, [isLoading, reduceMotion, tab, connectedIntegrations.length]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Integrations
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-lg">
            Connect your workspace with third-party platforms to streamline
            payments, scheduling, and customer communication.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <div className="flex p-1 rounded-full border bg-card">
            {[{ key: "all", label: "All", icon: <LayoutGrid size={13} /> }, ...CATEGORIES.map((c) => ({ key: c.key, label: c.label, icon: c.icon }))].map(
              (t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  aria-pressed={tab === t.key}
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors",
                    tab === t.key
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.icon}
                  {t.label}
                </button>
              ),
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={refetch}
            disabled={isLoading}
            aria-label="Refresh integrations"
            className="rounded-full size-9 shrink-0"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {/* Connected strip */}
      {!isLoading && connectedIntegrations.length > 0 && (
        <div className="px-4 py-3 rounded-2xl bg-card border shadow-sm flex flex-wrap items-center gap-3">
          <div className="flex -space-x-2">
            {connectedIntegrations.slice(0, 5).map((i) => (
              <span
                key={i.id}
                title={i.name}
                className="size-8 rounded-full border-2 border-card bg-muted flex items-center justify-center overflow-hidden"
              >
                <Image
                  src={integrations.find((d) => d.name.toLowerCase() === i.name.toLowerCase())?.icon ?? "/whatsapp.png"}
                  alt={i.name}
                  width={20}
                  height={20}
                  className="object-contain"
                />
              </span>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {connectedIntegrations.length}
            </span>{" "}
            connected ·{" "}
            <span className="font-semibold text-foreground">
              {connectedIntegrations.filter((i) => i.isActive).length}
            </span>{" "}
            active
          </p>
          <div className="flex items-center gap-1.5 ml-auto flex-wrap">
            {connectedIntegrations.map((i) => (
              <span
                key={i.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 text-xs"
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    i.isActive ? "bg-green-500" : "bg-zinc-400",
                  )}
                />
                {i.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Payment conflict banner */}
      {activePaymentCount > 1 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-600 dark:text-amber-400">
          <AlertTriangle size={16} className="shrink-0" />
          <span>
            Multiple payment gateways are active. Only one should be active at a
            time. Please deactivate one.
          </span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{error}</span>
          <button
            onClick={refetch}
            className="ml-auto underline underline-offset-2 text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Integration sections */}
      {!isLoading && (
        <div ref={gridRef} className="space-y-8">
          {visibleCategories.map((cat) => {
            const catIntegrations = integrations.filter(
              (i) => i.category === cat.key
            );
            if (catIntegrations.length === 0) return null;

            return (
              <section key={cat.key}>
                {/* Section header */}
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="p-1.5 rounded-lg bg-muted text-muted-foreground">
                    {cat.icon}
                  </span>
                  <span className="text-sm font-semibold">{cat.label}</span>
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">
                    {cat.description}
                  </span>
                </div>

                {/* Cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {catIntegrations.map((integration) => {
                    const status = getStatus(integration.name);
                    const isConnected = !!status;
                    const isActive = status?.isActive ?? false;
                    const conflict =
                      integration.category === "payment" &&
                      isPaymentConflict(integration.provider);

                    return (
                      <IntegrationCard
                        key={integration.name}
                        name={integration.name}
                        description={integration.description}
                        icon={integration.icon}
                        category={integration.category}
                        integrationId={status?.id}
                        isConnected={isConnected}
                        isActive={isActive}
                        isPaymentConflict={conflict}
                        isTogglingId={togglingId}
                        onConnect={() => handleConnect(integration)}
                        onToggle={(id, active) => toggle(id, active)}
                        onDisconnect={
                          isConnected
                            ? (id) => disconnect(id, integration.name)
                            : undefined
                        }
                        onConfigure={
                          isConnected && integration.provider !== "whatsapp"
                            ? (id) => handleConfigure(integration, id)
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      {openDialog && openDialog !== "whatsapp" && (
        <IntegrationDialog
          provider={openDialog}
          isOpen={!!openDialog}
          isReconnecting={!!reconigureId}
          onClose={() => {
            setOpenDialog(null);
            setReconfigureId(null);
          }}
          onSubmit={(data) =>
            handleDialogSubmit(
              openDialog as Exclude<IntegrationProvider, "whatsapp">,
              data
            )
          }
        />
      )}
    </div>
  );
};

export default Page;
