"use client";

import { useEffect } from "react";
import AppSidebar from "@/components/AppSidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/store";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { orgId } = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, organizations, isLoading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push("/");
      return;
    }

    const isMember = organizations.some((org) => org.id === orgId);
    if (!isMember) {
      toast.error("You are not a member of this organization");
      if (organizations.length > 0) {
        router.push(`/${organizations[0].id}/dashboard`);
      } else {
        router.push("/onboarding");
      }
    }
  }, [isAuthenticated, organizations, orgId, isLoading, router]);

  if (isLoading || !isAuthenticated || !organizations.some((org) => org.id === orgId)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const path = pathname.split("/")[2] || "Dashboard";
  return (
    <TooltipProvider>
      <AppSidebar orgId={orgId as string}>
        <div className="p-4 w-full h-full">
          <h1 className="text-2xl font-semibold mb-2 pl-1">
            {path.split("")[0].toUpperCase() + path.split("").slice(1).join("")}
          </h1>
          {children}
        </div>
      </AppSidebar>
    </TooltipProvider>
  );
}
