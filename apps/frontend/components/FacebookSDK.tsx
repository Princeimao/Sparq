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
        strategy="afterInteractive"
      />

      <Script id="facebook-init" strategy="afterInteractive">
        {`
          window.fbAsyncInit = function () {
            FB.init({
              appId: "${process.env.NEXT_PUBLIC_FACEBOOK_APP_ID}",
              cookie: true,
              xfbml: false,
              version: "v23.0"
            });
          };
        `}
      </Script>
    </>
  );
}
