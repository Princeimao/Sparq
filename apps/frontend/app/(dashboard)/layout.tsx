"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/store";
import { Loader2 } from "lucide-react";

import AppSidebar from "@/components/AppSidebar";
import FacebookSDK from "@/components/FacebookSDK";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // const router = useRouter();

  // const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  // useEffect(() => {
  //   if (isLoading) return;

  //   if (!isAuthenticated) {
  //     router.replace("/");
  //   }
  // }, [isAuthenticated, isLoading, router]);

  // if (isLoading || !isAuthenticated) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-[#ffffff]">
  //       <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
  //     </div>
  //   );
  // }

  return (
    <TooltipProvider>
      <AppSidebar>
        <div className="p-4 w-full h-full">
          <FacebookSDK />
          {children}
        </div>
      </AppSidebar>
    </TooltipProvider>
  );
}
