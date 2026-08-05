"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAppDispatch } from "@/lib/store";
import { setTokens, fetchCurrentUser } from "@/lib/store/authSlice";

function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");

    if (accessToken && refreshToken) {
      dispatch(setTokens({ accessToken, refreshToken }));

      // Fetch user profile 
      dispatch(fetchCurrentUser())
        .unwrap()
        .then((data) => {
          router.push("/");
        })
        .catch(() => {
          router.push("/");
        });
    } else {
      router.push("/");
    }
  }, [router, searchParams, dispatch]);

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
