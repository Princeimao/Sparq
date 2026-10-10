"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAppDispatch } from "@/lib/store";
import { fetchCurrentUser } from "@/lib/store/authSlice";

function AuthCallbackHandler() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  useEffect(() => {
    // The backend sets httpOnly session cookies before redirecting here,
    // so no tokens ever appear in the URL. Just confirm the session.
    dispatch(fetchCurrentUser())
      .unwrap()
      .then(() => {
        router.push("/dashboard");
      })
      .catch(() => {
        router.push("/");
      });
  }, [router, dispatch]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#ffffff] text-black">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
        <p className="text-black">Authenticating...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#ffffff]" />}>
      <AuthCallbackHandler />
    </Suspense>
  );
}
