"use client";

import { api } from "@/lib/api";
import { toast } from "sonner";
import { useEffect, useRef, useState, useCallback } from "react";
import type { IntegrationProvider } from "@/constant";

// ─── Types ───────────────────────────────────────────────────────────────────

export type IntegrationStatus = {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export function useWhatsAppConnect(onSuccess?: () => void) {
  const signupData = useRef<{ waba_id?: string; phone_number_id?: string }>({});

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.endsWith("facebook.com")) return;

      try {
        const data = JSON.parse(event.data);
        if (data.type === "WA_EMBEDDED_SIGNUP") {
          if (data.event === "FINISH") {
            const { waba_id, phone_number_id } = data.data;
            signupData.current = { waba_id, phone_number_id };
          }
        }
      } catch {
        console.log("Facebook message:", event.data);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return () => {
    if (!window.FB) {
      toast.error("Facebook SDK not loaded yet — try again in a moment");
      return;
    }

    window.FB.login(
      (response: any) => {
        if (response.authResponse?.code) {
          const code = response.authResponse.code;
          const { waba_id: wabaId, phone_number_id: phoneNumberId } =
            signupData.current;

          if (!wabaId || !phoneNumberId) {
            toast.error("Signup didn't return account details — try again");
            return;
          }

          api
            .post("/whatsapp/exchange", { code, wabaId, phoneNumberId })
            .then(() => {
              toast.success("WhatsApp connected successfully");
              onSuccess?.();
            })
            .catch((err: any) => {
              toast.error(
                err.response?.data?.error ?? "WhatsApp connection failed",
              );
            });
        }
      },
      {
        config_id: process.env.NEXT_PUBLIC_META_CONFIGURATION_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {} },
      },
    );
  };
}

export function useIntegrations() {
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIntegrations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get("/integrations/status");
      const list: IntegrationStatus[] = [
        ...(res.data.data.integrations ?? []),
      ];
      // Only surface WhatsApp when a connection row actually exists —
      // a null row means "never connected", not "connected".
      const wa = res.data.data.whatsappIntegration;
      if (wa) {
        list.push({ ...wa, type: "whatsapp", name: "WhatsApp" });
      }
      setIntegrations(list);
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to fetch integrations";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  return { integrations, isLoading, error, refetch: fetchIntegrations };
}

export function useConnectIntegration() {
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(
    async (
      provider: Exclude<IntegrationProvider, "whatsapp">,
      data: Record<string, string>,
      onSuccess?: () => void,
    ) => {
      setIsConnecting(true);
      try {
        const res = await api.post(`/integrations/${provider}/connect`, {
          ...data,
          activate: true,
        });
        toast.success(res.data.message || `${provider} connected successfully`);
        onSuccess?.();
      } catch (err: any) {
        const msg =
          err.response?.data?.error ||
          err.response?.data?.message ||
          `Failed to connect ${provider}`;
        toast.error(msg);
        throw err; // re-throw so dialog stays open on error
      } finally {
        setIsConnecting(false);
      }
    },
    [],
  );

  return { connect, isConnecting };
}

// ─── Toggle active/inactive ─────────────────────────────────────────────────

export function useToggleIntegration(onSuccess?: () => void) {
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const toggle = useCallback(
    async (integrationId: string, active: boolean) => {
      setTogglingId(integrationId);
      try {
        const res = await api.patch(`/integrations/${integrationId}/toggle`);
        toast.success(
          res.data.message ||
            `Integration ${active ? "activated" : "deactivated"}`,
        );
        onSuccess?.();
      } catch (err: any) {
        const msg = err.response?.data?.error || "Failed to toggle integration";
        toast.error(msg);
      } finally {
        setTogglingId(null);
      }
    },
    [onSuccess],
  );

  return { toggle, togglingId };
}

// ─── Disconnect an integration ───────────────────────────────────────────────

export function useDisconnectIntegration(onSuccess?: () => void) {
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  const disconnect = useCallback(
    async (integrationId: string, name: string) => {
      setDisconnectingId(integrationId);
      try {
        await api.delete(`/integrations/${integrationId}/disconnect`);
        toast.success(`${name} disconnected`);
        onSuccess?.();
      } catch (err: any) {
        const msg =
          err.response?.data?.error || "Failed to disconnect integration";
        toast.error(msg);
      } finally {
        setDisconnectingId(null);
      }
    },
    [onSuccess],
  );

  return { disconnect, disconnectingId };
}

// ─── WhatsApp toggle / disconnect (separate table, separate endpoints) ──────

export function useWhatsAppToggle(onSuccess?: () => void) {
  const [toggling, setToggling] = useState(false);

  const toggleWhatsApp = useCallback(async () => {
    setToggling(true);
    try {
      const res = await api.patch("/whatsapp/toggle");
      toast.success(res.data.message ?? "WhatsApp updated");
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to toggle WhatsApp");
    } finally {
      setToggling(false);
    }
  }, [onSuccess]);

  return { toggleWhatsApp, toggling };
}

export function useWhatsAppDisconnect(onSuccess?: () => void) {
  const [disconnecting, setDisconnecting] = useState(false);

  const disconnectWhatsApp = useCallback(async () => {
    setDisconnecting(true);
    try {
      const res = await api.delete("/whatsapp/disconnect");
      toast.success(res.data.message ?? "WhatsApp disconnected");
      onSuccess?.();
    } catch (err: any) {
      toast.error(
        err.response?.data?.error || "Failed to disconnect WhatsApp",
      );
    } finally {
      setDisconnecting(false);
    }
  }, [onSuccess]);

  return { disconnectWhatsApp, disconnecting };
}

// ─── WhatsApp Flows availability gate ───────────────────────────────────────
// Meta only unlocks Flows for numbers in good standing (GREEN/YELLOW
// quality rating). The backend is the single source of truth.

export type FlowsGateState = {
  connected: boolean;
  eligible: boolean;
  qualityRating: string | null;
  verified: boolean;
  reason: "ok" | "not_connected" | "disabled" | "low_quality" | "unverified" | "error";
};

export function useFlowsGate() {
  const [gate, setGate] = useState<FlowsGateState>({
    connected: false,
    eligible: false,
    qualityRating: null,
    verified: false,
    reason: "not_connected",
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/whatsapp/flows-status");
      setGate({
        connected: !!res.data.connected,
        eligible: !!res.data.eligible,
        qualityRating: res.data.qualityRating ?? null,
        verified: !!res.data.verified,
        reason: res.data.reason ?? "error",
      });
    } catch {
      setGate((g) => ({ ...g, reason: "error" }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { gate, loading, refresh };
}

// ─── Unified handlers (legacy shim kept for backward compat) ─────────────────

export function useIntegrationHandlers() {
  const whatsapp = useWhatsAppConnect();

  return {
    whatsapp,
    slack: () => {
      console.log("Slack connect logic");
    },
  };
}
