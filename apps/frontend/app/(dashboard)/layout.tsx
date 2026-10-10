"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAppSelector } from "@/lib/store";
import AppSidebar from "@/components/AppSidebar";
import FacebookSDK from "@/components/FacebookSDK";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getOnboarding } from "@/lib/onboarding";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAppSelector(
    (state) => state.auth,
  );
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!isInitialized) return;
    // No session → landing page.
    if (!isAuthenticated) {
      router.replace("/");
      return;
    }
    // Mandatory signup onboarding: incomplete profiles can't use the app.
    let cancelled = false;
    getOnboarding()
      .then((profile) => {
        if (cancelled) return;
        if (profile.onboardingStatus !== "COMPLETED") {
          router.replace("/onboarding");
        } else {
          setAllowed(true);
        }
      })
      .catch(() => {
        // Fail open so a billing/profile API blip can't lock users out.
        if (!cancelled) setAllowed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isInitialized, isAuthenticated, router]);

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <AppSidebar>
        <div className="w-full h-full">
          <div className="p-4">
            <FacebookSDK />
            {children}
          </div>
        </div>
      </AppSidebar>
    </TooltipProvider>
  );
}
