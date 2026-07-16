"use client";

import Script from "next/script";

declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: any;
  }
}

export default function FacebookSDK() {
  return (
    <>
      <Script
        src="https://connect.facebook.net/en_US/sdk.js"
        async
        defer
        crossOrigin="anonymous"
      />

      <Script id="facebook-init" strategy="afterInteractive">
        {`
          window.fbAsyncInit = function () {
            FB.init({
              appId: "${process.env.NEXT_PUBLIC_FACEBOOK_APP_ID}",
              cookie: true,
              autoLogAppEvents : true,
              xfbml: true,
              version: "v25.0"
            });
          };
        `}
      </Script>
    </>
  );
}
