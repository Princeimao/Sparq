"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/store";
import { Loader2 } from "lucide-react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { navigationData } from "@/constant";

export default function StaticLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();

  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black">
      <div className="relative z-16 bg-background rounded-b-[32px] md:rounded-b-[48px] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.3)] pb-12">
        <Header navigationData={navigationData} />
        {children}
      </div>
      <div className="md:sticky md:bottom-0 md:z-10 w-full">
        <Footer />
      </div>
    </div>
  );
}
