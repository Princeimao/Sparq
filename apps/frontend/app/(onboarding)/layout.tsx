"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/store";
import { logoutUser } from "@/lib/store/authSlice";

/**
 * Minimal standalone chrome for the mandatory signup onboarding flow.
 * No sidebar — just logo, help link and sign-out, like a focused setup page.
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isInitialized } = useAppSelector(
    (state) => state.auth,
  );

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.replace("/");
    }
  }, [isInitialized, isAuthenticated, router]);

  const handleSignOut = () => {
    dispatch(logoutUser());
    router.push("/");
  };

  if (!isInitialized || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col">
      <header className="flex items-center justify-between px-5 sm:px-8 py-4">
        <Link href="/" className="flex items-center" aria-label="Sparq home">
          <span className="text-xl font-semibold tracking-tight">Spar</span>
          <Image src="/logo.svg" alt="" width={20} height={20} aria-hidden />
        </Link>
        <p className="hidden sm:block text-sm text-zinc-500">
          Need help?{" "}
          <a
            href="mailto:support@sparq.app"
            className="font-medium text-zinc-900 hover:underline underline-offset-2"
          >
            Get in touch
          </a>
        </p>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
        >
          <LogOut className="size-4" aria-hidden />
          Sign Out
        </button>
      </header>
      <main className="flex-1 flex justify-center px-5 pb-16">
        <div className="w-full max-w-xl">{children}</div>
      </main>
    </div>
  );
}
