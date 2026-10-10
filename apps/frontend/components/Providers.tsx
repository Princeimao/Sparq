"use client";

import { useEffect } from "react";
import { Provider } from "react-redux";
import { store, useAppDispatch, useAppSelector } from "@/lib/store";
import { fetchCurrentUser } from "@/lib/store/authSlice";
import { Loader2 } from "lucide-react";

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { isInitialized } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // The session lives in httpOnly cookies, so always ask the backend who
    // we are on boot — no localStorage token check needed.
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ffffff] text-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-black" />
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
