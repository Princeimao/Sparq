"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Settings,
  Lock,
  Bell,
  Key,
  Globe,
  Check,
  Loader2,
  Shield,
  Trash2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [integrationKeys, setIntegrationKeys] = useState({
    whatsappVerifyToken: "sparq_verify_token_2026",
    geminiApiKey: "AIzaSyB************************",
    webhookUrl: "https://api.sparq.app/api/whatsapp/webhook",
  });

  const [notifications, setNotifications] = useState({
    emailOnOrder: true,
    emailOnBooking: true,
    whatsappErrorAlerts: true,
    weeklyReport: true,
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return toast.error("New passwords do not match");
    }
    setSavingPassword(true);
    setTimeout(() => {
      setSavingPassword(false);
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Security password updated successfully");
    }, 1000);
  };

  const handleKeysSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKeys(true);
    setTimeout(() => {
      setSavingKeys(false);
      toast.success("API keys and webhook secrets saved!");
    }, 1000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-semibold tracking-tight">Account & System Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure security, webhook verification keys, and notification triggers.
        </p>
      </motion.div>

      {/* Account Security / Password Change */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="size-4 text-primary" /> Password & Security
          </CardTitle>
          <CardDescription>Update your account password to ensure maximum security.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={savingPassword}>
                {savingPassword && <Loader2 className="mr-2 size-4 animate-spin" />}
                Update Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Webhook & AI Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="size-4 text-emerald-500" /> Webhook Secrets & AI Keys
          </CardTitle>
          <CardDescription>Configure Meta Webhook Token and Gemini AI models.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleKeysSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsappVerifyToken">WhatsApp Webhook Verify Token</Label>
              <Input
                id="whatsappVerifyToken"
                value={integrationKeys.whatsappVerifyToken}
                onChange={(e) => setIntegrationKeys({ ...integrationKeys, whatsappVerifyToken: e.target.value })}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="geminiApiKey">Google Gemini API Key (Intent Router)</Label>
              <Input
                id="geminiApiKey"
                type="password"
                value={integrationKeys.geminiApiKey}
                onChange={(e) => setIntegrationKeys({ ...integrationKeys, geminiApiKey: e.target.value })}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhookUrl">Inbound Webhook Listener URL</Label>
              <Input
                id="webhookUrl"
                value={integrationKeys.webhookUrl}
                readOnly
                className="font-mono text-xs bg-muted/30"
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={savingKeys}>
                {savingKeys && <Loader2 className="mr-2 size-4 animate-spin" />}
                <Save className="size-4 mr-1.5" /> Save API Config
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="size-4 text-amber-500" /> Notification Triggers
          </CardTitle>
          <CardDescription>Select when Sparq will send you automated system alerts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b">
            <div>
              <p className="text-sm font-medium">Order Confirmation Emails</p>
              <p className="text-xs text-muted-foreground">Send email copy whenever a customer completes an order</p>
            </div>
            <Switch
              checked={notifications.emailOnOrder}
              onCheckedChange={(v) => setNotifications({ ...notifications, emailOnOrder: v })}
            />
          </div>

          <div className="flex items-center justify-between py-2 border-b">
            <div>
              <p className="text-sm font-medium">Reservation Booking Emails</p>
              <p className="text-xs text-muted-foreground">Notify staff when a hotel room or table is booked</p>
            </div>
            <Switch
              checked={notifications.emailOnBooking}
              onCheckedChange={(v) => setNotifications({ ...notifications, emailOnBooking: v })}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">WhatsApp Exception & Failure Alerts</p>
              <p className="text-xs text-muted-foreground">Receive instant alerts if WhatsApp API fails to deliver</p>
            </div>
            <Switch
              checked={notifications.whatsappErrorAlerts}
              onCheckedChange={(v) => setNotifications({ ...notifications, whatsappErrorAlerts: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-base text-destructive flex items-center gap-2">
            <Trash2 className="size-4" /> Danger Zone
          </CardTitle>
          <CardDescription>Irreversible actions for your workspace account.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Delete Account & Data</p>
            <p className="text-xs text-muted-foreground">Permanently erase catalog, flows, and conversation history</p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm("Are you sure you want to request account deletion?")) {
                toast.error("Account deletion request submitted.");
              }
            }}
          >
            Delete Account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
