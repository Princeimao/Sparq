"use client";

import { useEffect } from "react";
import { Provider } from "react-redux";
import { store, useAppDispatch, useAppSelector } from "@/lib/store";
import { fetchCurrentUser, setInitialized } from "@/lib/store/authSlice";
import { Loader2 } from "lucide-react";

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { isInitialized, accessToken } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // If we have an access token, fetch the user info
    if (accessToken) {
      dispatch(fetchCurrentUser());
    } else {
      dispatch(setInitialized());
    }
  }, [dispatch, accessToken]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          <p className="text-zinc-400">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthInitializer>{children}</AuthInitializer>
    </Provider>
  );
}
