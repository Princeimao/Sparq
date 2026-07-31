"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

const page = () => {
  const [sessionInfo, setSessionInfo] = useState(null);
  const [sdkResponse, setSdkResponse] = useState(null);
  const navigate = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (window.FB) return;

    window.fbAsyncInit = function () {
      window.FB.init({
        appId: "1477441731064394",
        cookie: true,
        xfbml: false,
        version: "v25.0",
      });
      console.log("Facebook SDK initialized");
    };

    const loadSDK = () => {
      if (document.getElementById("facebook-jssdk")) return;

      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";

      document.body.appendChild(script);
    };

    loadSDK();
  }, []);

  const fbLoginCallback = (response: any) => {
    if (response.authResponse) {
      const code = response.authResponse.code;

      // IMPORTANT:
      // Send this code to your backend
      // Exchange it server-to-server for an access token
      setSessionInfo(code);
      console.log("Authorization Code:", code);
    }

    setSdkResponse(response);
  };

  const launchWhatsAppSignup = () => {
    if (!window.FB) {
      alert("Facebook SDK not loaded yet.");
      return;
    }

    window.FB.login(fbLoginCallback, {
      config_id: "1040341221778882",
      response_type: "code",
      override_default_response_type: true,
      extras: { version: "v4" },
    });
  };

  return (
    <div
      style={{ padding: "20px", fontFamily: "Helvetica, Arial, sans-serif" }}
    >
      <button
        onClick={launchWhatsAppSignup}
        style={{
          backgroundColor: "#1877f2",
          border: 0,
          borderRadius: "4px",
          color: "#fff",
          cursor: "pointer",
          fontSize: "16px",
          fontWeight: "bold",
          height: "40px",
          padding: "0 24px",
        }}
      >
        {loading ? "Processing..." : "Login with Facebook"}
      </button>

      <h3>Session Info Response:</h3>
      <pre>{sessionInfo && JSON.stringify(sessionInfo, null, 2)}</pre>

      <h3>SDK Response:</h3>
      <pre>{sdkResponse && JSON.stringify(sdkResponse, null, 2)}</pre>
    </div>
  );
};

export default page;
