"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  User,
  Mail,
  Building2,
  Shield,
  Key,
  Copy,
  Check,
  Loader2,
  Phone,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/ui/image-upload";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt?: string;
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    avatarUrl: "",
    companyName: "Sparq Automation Inc.",
    phone: "+1 (555) 234-5678",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get("/auth/me");
      const u = res.data.user;
      setUser(u);
      setFormData((prev) => ({
        ...prev,
        name: u.name || "",
        email: u.email || "",
        avatarUrl: u.avatarUrl || "",
      }));
    } catch {
      toast.error("Failed to load user profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.patch("/auth/me", {
        name: formData.name,
        avatarUrl: formData.avatarUrl,
      });
      setUser(res.data.user);
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const copyApiKey = () => {
    const fakeKey = `sp_live_${user?.id || "token"}_98f2371ab2094`;
    navigator.clipboard.writeText(fakeKey);
    setCopiedKey(true);
    toast.success("API key copied to clipboard");
    setTimeout(() => setCopiedKey(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Profile & Business Details</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your personal account, company information, and API credentials.
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1 text-xs gap-1.5 border-primary/30 bg-primary/5 text-primary">
          <Sparkles className="size-3" /> Pro Account
        </Badge>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card Summary */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-3 w-28 h-28">
              <ImageUpload
                value={formData.avatarUrl}
                onChange={(url) => setFormData((prev) => ({ ...prev, avatarUrl: url }))}
                onRemove={() => setFormData((prev) => ({ ...prev, avatarUrl: "" }))}
              />
            </div>
            <CardTitle className="text-lg font-bold">{formData.name || "User Name"}</CardTitle>
            <CardDescription className="text-xs">{formData.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-2 text-xs border-t">
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">Account Status</span>
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                Active
              </Badge>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">WhatsApp API</span>
              <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">
                Connected
              </Badge>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">Joined</span>
              <span className="font-medium text-foreground">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Recent"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Edit Details Form */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="size-4 text-primary" /> Personal & Company Information
            </CardTitle>
            <CardDescription>Update your contact and business details.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" value={formData.email} disabled className="bg-muted/50" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Business / Company Name</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Contact Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Save Profile Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* WhatsApp Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="size-4 text-emerald-500" /> WhatsApp Business Cloud API Integration
          </CardTitle>
          <CardDescription>
            Your connected Meta WABA Account details used by Sparq Automation Worker.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3 border rounded-xl bg-muted/20">
            <p className="text-xs text-muted-foreground font-medium">WABA Account ID</p>
            <p className="text-sm font-mono font-semibold mt-1">109847261538920</p>
          </div>
          <div className="p-3 border rounded-xl bg-muted/20">
            <p className="text-xs text-muted-foreground font-medium">Phone Number ID</p>
            <p className="text-sm font-mono font-semibold mt-1">583920194827102</p>
          </div>
          <div className="p-3 border rounded-xl bg-muted/20">
            <p className="text-xs text-muted-foreground font-medium">Quality Rating</p>
            <p className="text-sm font-semibold text-emerald-600 mt-1 flex items-center gap-1">
              <Check className="size-3.5" /> High Quality (Green)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* API Key Credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="size-4 text-amber-500" /> Sparq API Access Tokens
          </CardTitle>
          <CardDescription>
            Use this bearer token to authenticate backend API requests and custom webhooks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              type="password"
              value={`sp_live_${user?.id || "token"}_98f2371ab2094`}
              readOnly
              className="font-mono text-xs bg-muted/30 flex-1"
            />
            <Button variant="outline" onClick={copyApiKey} className="shrink-0">
              {copiedKey ? <Check className="size-4 text-emerald-500 mr-1.5" /> : <Copy className="size-4 mr-1.5" />}
              {copiedKey ? "Copied" : "Copy Token"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
