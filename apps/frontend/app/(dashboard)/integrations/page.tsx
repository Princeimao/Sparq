"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  MessageSquare,
  CreditCard,
  Calendar,
  ShoppingBag,
  RefreshCw,
  AlertTriangle,
  LayoutGrid,
} from "lucide-react";

import { IntegrationCard } from "@/components/IntegrationCard";
import { IntegrationDialog } from "@/components/IntegrationDialog";
import { SlidePills } from "@/components/bits/SlidePills";
import { integrations, type IntegrationProvider, type IntegrationDefinition } from "@/constant";
import {
  useIntegrations,
  useConnectIntegration,
  useToggleIntegration,
  useDisconnectIntegration,
  useWhatsAppConnect,
  useWhatsAppToggle,
  useWhatsAppDisconnect,
} from "@/hooks/integration";
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
    description: "Automate customer conversations",
  },
  {
    key: "payment",
    label: "Payments",
    icon: <CreditCard size={16} />,
    description: "Only one payment gateway can be on at a time",
  },
  {
    key: "scheduling",
    label: "Scheduling",
    icon: <Calendar size={16} />,
    description: "Sync calendars and bookings",
  },
  {
    key: "ecommerce",
    label: "E-commerce",
    icon: <ShoppingBag size={16} />,
    description: "Sync products and orders",
  },
];

const EASE = [0.22, 1, 0.36, 1] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

const Page = () => {
  const {
    integrations: connectedIntegrations,
    isLoading,
    error,
    refetch,
  } = useIntegrations();

  const { connect } = useConnectIntegration();
  const { toggle, togglingId } = useToggleIntegration(refetch);
  const { disconnect } = useDisconnectIntegration(refetch);
  const { toggleWhatsApp, toggling: togglingWhatsApp } = useWhatsAppToggle(refetch);
  const { disconnectWhatsApp } = useWhatsAppDisconnect(refetch);
  const whatsappConnect = useWhatsAppConnect(refetch);

  // Dialog state: which provider's dialog is open
  const [openDialog, setOpenDialog] = useState<IntegrationProvider | null>(null);
  // Track if reconfiguring an existing connection
  const [reconigureId, setReconfigureId] = useState<string | null>(null);
  const [tab, setTab] = useState("all");
  const reduceMotion = useReducedMotion();

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

  const activeCount = connectedIntegrations.filter((i) => i.isActive).length;
  let cardIndex = 0;

  return (
    <div className="relative p-6 max-w-7xl mx-auto space-y-7">
      {/* Ambient wash */}
      {!reduceMotion && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-0 size-72 rounded-full bg-brand/10 blur-[110px]"
          animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Page Header */}
      <div className="relative flex flex-col sm:flex-row sm:items-end gap-4">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
            Connected apps
          </p>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] text-ink mt-1">
            Integrations
          </h1>
          <p className="text-[15px] text-ink/55 mt-2 max-w-lg leading-relaxed">
            Plug in payments, calendars and storefronts — and switch them on
            or off anytime.
          </p>
        </motion.div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <SlidePills
            id="integrations-tabs"
            size="sm"
            value={tab}
            onChange={setTab}
            options={[
              { value: "all", label: "All", icon: <LayoutGrid size={13} /> },
              ...CATEGORIES.map((c) => ({ value: c.key, label: c.label, icon: c.icon })),
            ]}
          />
          <button
            onClick={refetch}
            disabled={isLoading}
            aria-label="Refresh integrations"
            className="rounded-full size-9 shrink-0 flex items-center justify-center bg-ink/[0.05] text-ink/60 hover:text-ink hover:bg-ink/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Connected summary band */}
      {!isLoading && connectedIntegrations.length > 0 && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="relative px-5 py-4 rounded-[1.4rem] bg-ink text-white flex flex-wrap items-center gap-3"
        >
          <div className="flex -space-x-2">
            {connectedIntegrations.slice(0, 5).map((i) => (
              <span
                key={i.id}
                title={i.name}
                className="size-9 rounded-full bg-white flex items-center justify-center overflow-hidden ring-2 ring-ink"
              >
                <Image
                  src={integrations.find((d) => d.name.toLowerCase() === i.name.toLowerCase())?.icon ?? "/whatsapp.png"}
                  alt={i.name}
                  width={22}
                  height={22}
                  className="object-contain"
                />
              </span>
            ))}
          </div>
          <p className="text-sm text-white/70">
            <span className="font-semibold text-white tabular-nums">
              {connectedIntegrations.length}
            </span>{" "}
            connected ·{" "}
            <span className="font-semibold text-white tabular-nums">
              {activeCount}
            </span>{" "}
            on
          </p>
          <div className="flex items-center gap-1.5 ml-auto flex-wrap">
            {connectedIntegrations.map((i) => (
              <span
                key={i.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-xs text-white/80"
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    i.isActive ? "bg-brand" : "bg-white/30",
                  )}
                />
                {i.name}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Payment conflict banner */}
      {activePaymentCount > 1 && (
        <div className="relative flex items-center gap-3 px-5 py-3.5 rounded-[1.4rem] bg-amber-500/10 text-sm text-amber-700">
          <AlertTriangle size={16} className="shrink-0" />
          <span>
            Two payment gateways are on. Only one can take payments at a time —
            switch one off.
          </span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="relative flex items-center gap-3 px-5 py-3.5 rounded-[1.4rem] bg-red-500/10 text-sm text-red-700">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{error}</span>
          <button
            onClick={refetch}
            className="ml-auto underline underline-offset-2 text-xs font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 rounded-[1.4rem] bg-ink/[0.045] animate-pulse" />
          ))}
        </div>
      )}

      {/* Integration sections */}
      {!isLoading && (
        <div key={tab} className="relative space-y-8">
          {visibleCategories.map((cat) => {
            const catIntegrations = integrations.filter(
              (i) => i.category === cat.key
            );
            if (catIntegrations.length === 0) return null;

            return (
              <section key={cat.key}>
                <div className="flex items-baseline gap-2.5 mb-3.5 px-1">
                  <span className="text-brand">{cat.icon}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/60">
                    {cat.label}
                  </span>
                  <span className="text-xs text-ink/40 hidden sm:inline">
                    {cat.description}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {catIntegrations.map((integration) => {
                    const status = getStatus(integration.name);
                    const isConnected = !!status;
                    const isActive = status?.isActive ?? false;
                    const isWhatsapp = integration.provider === "whatsapp";
                    const conflict =
                      integration.category === "payment" &&
                      isPaymentConflict(integration.provider);
                    const busy = isWhatsapp
                      ? togglingWhatsApp
                      : togglingId === status?.id;
                    const idx = cardIndex++;

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
                        isBusy={busy}
                        index={idx}
                        reduceMotion={!!reduceMotion}
                        onConnect={() => handleConnect(integration)}
                        onToggle={() =>
                          isWhatsapp
                            ? toggleWhatsApp()
                            : status?.id && toggle(status.id, !isActive)
                        }
                        onDisconnect={
                          isConnected
                            ? () =>
                                isWhatsapp
                                  ? disconnectWhatsApp()
                                  : status?.id &&
                                    disconnect(status.id, integration.name)
                            : undefined
                        }
                        onConfigure={
                          isConnected && !isWhatsapp
                            ? () => status?.id && handleConfigure(integration, status.id)
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
