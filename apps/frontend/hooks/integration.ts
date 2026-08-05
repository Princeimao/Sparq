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

export function useWhatsAppConnect() {
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
      toast.error("Facebook SDK not loaded");
      return;
    }

    window.FB.login(
      (response: any) => {
        if (response.authResponse?.code) {
          const code = response.authResponse.code;
          const { waba_id: wabaId, phone_number_id: phoneNumberId } =
            signupData.current;

          api
            .post("/whatsapp/exchange", { code, wabaId, phoneNumberId })
            .then(() => toast.success("WhatsApp connected successfully"))
            .catch(() => toast.error("WhatsApp connection failed"));
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
      const data = res.data.data.integrations;
      data.push({
        ...res.data.data.whatsappIntegration,
        type: "whatsapp",
        name: "whatsapp",
      });

      setIntegrations(res.data.data.integrations || []);
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
