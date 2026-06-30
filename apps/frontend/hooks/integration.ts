"use client";

export function useWhatsAppConnect() {
    return () => {
        window.FB.login(
            (response: any) => {
                console.log("login", response);

                if (response.authResponse?.code) {
                    console.log("Code:", response.authResponse.code);
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