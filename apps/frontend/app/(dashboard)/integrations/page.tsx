"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import {
  MessageSquare,
  CreditCard,
  Calendar,
  ShoppingBag,
  RefreshCw,
  AlertTriangle,
  Loader2,
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-10">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Integrations
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-lg">
            Connect your workspace with third-party platforms to streamline
            payments, scheduling, and customer communication.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refetch}
          disabled={isLoading}
          className="gap-2 shrink-0"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

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
        <div className="space-y-10">
          {CATEGORIES.map((cat) => {
            const catIntegrations = integrations.filter(
              (i) => i.category === cat.key
            );
            if (catIntegrations.length === 0) return null;

            return (
              <section key={cat.key}>
                {/* Section header */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="text-muted-foreground">{cat.icon}</span>
                    {cat.label}
                  </div>
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">
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

      {/* Connection summary */}
      {!isLoading && connectedIntegrations.length > 0 && (
        <div className="mt-8 px-5 py-4 rounded-xl bg-muted/40 border border-border flex flex-wrap items-center gap-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {connectedIntegrations.length}
            </span>{" "}
            integration{connectedIntegrations.length !== 1 ? "s" : ""} connected
            &nbsp;·&nbsp;
            <span className="font-semibold text-foreground">
              {connectedIntegrations.filter((i) => i.isActive).length}
            </span>{" "}
            active
          </div>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {connectedIntegrations.map((i) => (
              <div
                key={i.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background border border-border text-xs"
              >
                {i.isActive ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                )}
                {i.name}
              </div>
            ))}
          </div>
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
