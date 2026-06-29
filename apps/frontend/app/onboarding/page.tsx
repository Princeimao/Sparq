"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Building2, ArrowRight } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "@/lib/store";
import { fetchCurrentUser } from "@/lib/store/authSlice";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function OnboardingPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, organizations, isAuthenticated, isLoading: authLoading } = useAppSelector((state) => state.auth);
  const [orgName, setOrgName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If not authenticated and not loading, redirect to landing
    if (!authLoading && !isAuthenticated) {
      router.push("/");
      return;
    }

    // If already has organizations, redirect to the first one
    if (!authLoading && isAuthenticated && organizations.length > 0) {
      router.push(`/${organizations[0].id}/dashboard`);
    }
  }, [isAuthenticated, organizations, authLoading, router]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;

    setIsLoading(true);
    try {
      const response = await api.post("/organizations", {
        name: orgName,
      });

      const newOrgId = response.data.organization?.id;
      
      toast.success("Organization created successfully!");
      
      // Reload user profile to include the new membership in Redux state
      await dispatch(fetchCurrentUser()).unwrap();
      
      if (newOrgId) {
        router.push(`/${newOrgId}/dashboard`);
      } else {
        router.push("/dashboard");
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.error || "Failed to create organization",
      );
      setIsLoading(false);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <section className="flex items-center justify-center h-screen">
      <div className="w-2xl xl:px-16 lg:px-8 px-4 mx-auto">
        <div className="w-full col-span-12 md:col-span-5">
          <Card className="ring-0 p-8 gap-6 md:gap-8 border rounded-2xl animate-in fade-in slide-in-from-right-10 duration-1000 delay-100 ease-in-out fill-mode-both">
            <CardHeader className="p-0">
              <CardTitle className="text-2xl font-semibold text-primary">
                Welcome, {user?.name || "there"}!
              </CardTitle>
              <CardDescription>
                Let's set up your workspace. What is the name of your business
                or organization?
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <form onSubmit={handleCreateOrg} className="space-y-5">
                <div className="flex flex-col gap-6">
                  <Input
                    id="orgName"
                    name="orgName"
                    placeholder="Organization Name"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="dark:bg-background h-9 shadow-xs"
                    required
                  />

                  {/* submit button */}
                  <Button
                    type="submit"
                    size="lg"
                    className="rounded-xl bg-blue-500 hover:bg-blue-500/80 text-white hover:cursor-pointer h-10"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating..." : "Continue to Dashboard"}
                    {!isLoading && <ArrowRight size={18} />}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

import { Loader2 } from "lucide-react";
