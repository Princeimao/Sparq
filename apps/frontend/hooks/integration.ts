"use client";

import { api } from "@/lib/api";

export function useWhatsAppConnect() {
    return () => {
        window.FB.login(
            async (response: any) => {
                console.log("login", response);

                if (response.authResponse?.code) {
                    const code = response.authResponse.code;
                    try {
                        const res = await api.post("/whatsapp/exchange", { code });

                        console.log("Backend response:", res.data);
                    } catch (err) {
                        console.error("Backend error:", err);
                    }
                }
            },
            {
                config_id: process.env.NEXT_PUBLIC_META_CONFIGURATION_ID,
                response_type: "code",
                override_default_response_type: true,
                extras: {
                    setup: {},
                },
            }
        );
    };
}

export function useIntegrationHandlers() {
    const whatsapp = useWhatsAppConnect();

    return {
        whatsapp,
        slack: () => {
            console.log("Slack connect logic");
        },
    };
}