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
      
      // Fetch user profile and organization memberships
      dispatch(fetchCurrentUser())
        .unwrap()
        .then((data) => {
          const userOrgs = data.user.memberships || [];
          if (userOrgs.length > 0) {
            const firstOrgId = userOrgs[0].organization.id;
            router.push(`/${firstOrgId}/dashboard`);
          } else {
            router.push("/onboarding");
          }
        })
        .catch(() => {
          router.push("/");
        });
    } else {
      router.push("/");
    }
  }, [router, searchParams, dispatch]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <p className="text-zinc-400">Authenticating...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A]" />}>
      <AuthCallbackHandler />
    </Suspense>
  );
}
