"use client";

import { api } from "@/lib/api";
import toast from "react-hot-toast";

import { useEffect, useRef } from "react";

export function useWhatsAppConnect() {
    const signupData = useRef<{ waba_id?: string; phone_number_id?: string }>({});

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (!event.origin.endsWith("facebook.com")) {
                return;
            }

            try {
                const data = JSON.parse(event.data);
                if (data.type === "WA_EMBEDDED_SIGNUP") {
                    console.log("WhatsApp signup event:", data);

                    if (data.event === "FINISH") {
                        const { waba_id, phone_number_id } = data.data;
                        signupData.current = { waba_id, phone_number_id };
                        console.log("Saved these with your user", { waba_id, phone_number_id });
                    }
                }
            } catch {
                console.log("Facebook message:", event.data);
            }
        };

        window.addEventListener("message", handleMessage);

        return () => {
            window.removeEventListener("message", handleMessage);
        };

    }, []);

    return () => {
        if (!window.FB) {
            toast.error("Facebook SDK not loaded");
            return;
        }

        window.FB.login(
            (response: any) => {
                console.log("login", response);

                if (response.authResponse?.code) {
                    const code = response.authResponse.code;
                    const { waba_id: wabaId, phone_number_id: phoneNumberId } = signupData.current;

                    api.post("/whatsapp/exchange", { code, wabaId, phoneNumberId }).then((res) => {
                        console.log(res.data);
                        toast.success("Whatsapp connected successfully");
                    }).catch(() => {
                        toast.error(
                            "Whatsapp connection failed"
                        );
                    });
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