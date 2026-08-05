"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Eye,
  EyeOff,
  Loader2,
  Link as LinkIcon,
  Lock,
  Key,
} from "lucide-react";
import type { IntegrationProvider } from "@/constant";


type FieldConfig = {
  key: string;
  label: string;
  placeholder: string;
  type: "text" | "password" | "url";
  icon: React.ReactNode;
  required: boolean;
  hint?: string;
};

const FIELDS: Record<IntegrationProvider, FieldConfig[]> = {
  stripe: [
    {
      key: "publishableKey",
      label: "Publishable Key",
      placeholder: "pk_live_...",
      type: "text",
      icon: <Key size={15} />,
      required: true,
      hint: "Starts with pk_live_ or pk_test_",
    },
    {
      key: "secretKey",
      label: "Secret Key",
      placeholder: "sk_live_...",
      type: "password",
      icon: <Lock size={15} />,
      required: true,
      hint: "Keep this secret — never share it publicly",
    },
  ],
  razorpay: [
    {
      key: "keyId",
      label: "Key ID",
      placeholder: "rzp_live_...",
      type: "text",
      icon: <Key size={15} />,
      required: true,
      hint: "Found in Razorpay Dashboard → API Keys",
    },
    {
      key: "keySecret",
      label: "Key Secret",
      placeholder: "Your Razorpay secret",
      type: "password",
      icon: <Lock size={15} />,
      required: true,
      hint: "Keep this secret — never share it publicly",
    },
  ],
  calcom: [
    {
      key: "apiKey",
      label: "Cal.com API Key",
      placeholder: "cal_live_...",
      type: "password",
      icon: <Lock size={15} />,
      required: true,
      hint: "Found in Cal.com → Settings → API Keys",
    },
    {
      key: "bookingUrl",
      label: "Booking URL (optional)",
      placeholder: "https://cal.com/your-username",
      type: "url",
      icon: <LinkIcon size={15} />,
      required: false,
      hint: "Your public Cal.com booking page link",
    },
  ],
  woocommerce: [
    {
      key: "storeUrl",
      label: "Store URL",
      placeholder: "https://yourstore.com",
      type: "url",
      icon: <LinkIcon size={15} />,
      required: true,
      hint: "Your WooCommerce store domain",
    },
    {
      key: "consumerKey",
      label: "Consumer Key",
      placeholder: "ck_...",
      type: "text",
      icon: <Key size={15} />,
      required: true,
      hint: "Generated in WooCommerce → Settings → Advanced → REST API",
    },
    {
      key: "consumerSecret",
      label: "Consumer Secret",
      placeholder: "cs_...",
      type: "password",
      icon: <Lock size={15} />,
      required: true,
      hint: "Keep this secret — shown only once",
    },
  ],
  whatsapp: [],
};

const DIALOG_META: Record<
  IntegrationProvider,
  { title: string; description: string; color: string }
> = {
  stripe: {
    title: "Connect Stripe",
    description:
      "Enter your Stripe API keys to start accepting payments. You can find them in your Stripe Dashboard.",
    color: "from-violet-600/20 to-purple-600/10",
  },
  razorpay: {
    title: "Connect Razorpay",
    description:
      "Enter your Razorpay API credentials to enable Indian payment processing.",
    color: "from-blue-600/20 to-indigo-600/10",
  },
  calcom: {
    title: "Connect Cal.com",
    description:
      "Enter your Cal.com API key to sync booking availability and appointments.",
    color: "from-sky-600/20 to-cyan-600/10",
  },
  woocommerce: {
    title: "Connect WooCommerce",
    description:
      "Enter your WooCommerce REST API credentials to sync your store's products and orders.",
    color: "from-purple-600/20 to-pink-600/10",
  },
  whatsapp: {
    title: "Connect WhatsApp",
    description: "Connect your WhatsApp Business Account via Facebook login.",
    color: "from-green-600/20 to-emerald-600/10",
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

type IntegrationDialogProps = {
  provider: IntegrationProvider;
  isOpen: boolean;
  isReconnecting?: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, string>) => Promise<void>;
};

export function IntegrationDialog({
  provider,
  isOpen,
  isReconnecting = false,
  onClose,
  onSubmit,
}: IntegrationDialogProps) {
  const fields = FIELDS[provider];
  const meta = DIALOG_META[provider];

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, ""])),
  );
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const togglePasswordVisibility = (key: string) => {
    setShowPassword((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit(values);
      // Reset form on success
      setValues(Object.fromEntries(fields.map((f) => [f.key, ""])));
      onClose();
    } catch {
      // Error handling is done in the parent
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = fields
    .filter((f) => f.required)
    .every((f) => values[f.key]?.trim().length > 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <div
          className={`absolute inset-x-0 top-0 h-1 rounded-t-xl bg-linear-to-r ${meta.color} opacity-80`}
        />

        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {isReconnecting
              ? `Reconnect ${provider === "calcom" ? "Cal.com" : meta.title.replace("Connect ", "")}`
              : meta.title}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            {meta.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {fields.map((field) => {
            const isPasswordField = field.type === "password";
            const isVisible = showPassword[field.key];
            const inputType = isPasswordField
              ? isVisible
                ? "text"
                : "password"
              : field.type;

            return (
              <div key={field.key} className="space-y-1.5">
                <Label
                  htmlFor={`dialog-${provider}-${field.key}`}
                  className="text-sm font-medium flex items-center gap-1.5"
                >
                  <span className="text-muted-foreground">{field.icon}</span>
                  {field.label}
                  {!field.required && (
                    <span className="text-xs text-muted-foreground font-normal ml-1">
                      (optional)
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id={`dialog-${provider}-${field.key}`}
                    type={inputType}
                    placeholder={field.placeholder}
                    value={values[field.key]}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className="pr-10 font-mono text-sm"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {isPasswordField && (
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility(field.key)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {isVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  )}
                </div>
                {field.hint && (
                  <p className="text-xs text-muted-foreground">{field.hint}</p>
                )}
              </div>
            );
          })}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={!isValid || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 size={15} className="animate-spin mr-2" />
                  Connecting…
                </>
              ) : isReconnecting ? (
                "Reconnect"
              ) : (
                "Connect"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
