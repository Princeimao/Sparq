"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  Bell,
  Building2,
  Clock,
  Loader2,
  LogOut,
  Trash2,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { api } from "@/lib/api";
import { ImageUpload } from "@/components/ui/image-upload";
import { BusinessHoursCard } from "@/components/settings/BusinessHoursCard";
import {
  BUSINESS_TYPE_META,
  getOnboarding,
  saveOnboardingDraft,
  type BusinessType,
  type LocationMode,
  type OnboardingDraft,
} from "@/lib/onboarding";
import { useAppDispatch } from "@/lib/store";
import { logoutUser } from "@/lib/store/authSlice";
import { useConfirm } from "@/components/ui/confirm";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type TabId = "profile" | "business" | "hours" | "alerts" | "danger";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "profile", label: "Profile", icon: <UserRound size={13} /> },
  { id: "business", label: "Business", icon: <Building2 size={13} /> },
  { id: "hours", label: "Hours", icon: <Clock size={13} /> },
  { id: "alerts", label: "Alerts", icon: <Bell size={13} /> },
  { id: "danger", label: "Danger", icon: <TriangleAlert size={13} /> },
];

const EASE = [0.22, 1, 0.36, 1] as const;

const LOCATION_MODES: { id: LocationMode; title: string; blurb: string }[] = [
  { id: "AT_BUSINESS", title: "At business", blurb: "They come to you" },
  { id: "AT_CUSTOMER", title: "At customer", blurb: "You go to them" },
  { id: "BOTH", title: "Both", blurb: "Either works" },
];

interface AlertPrefs {
  emailOnOrder: boolean;
  emailOnBooking: boolean;
  whatsappErrorAlerts: boolean;
}

const ALERT_DEFAULTS: AlertPrefs = {
  emailOnOrder: true,
  emailOnBooking: true,
  whatsappErrorAlerts: true,
};

function loadAlertPrefs(): AlertPrefs {
  try {
    const raw = localStorage.getItem("sparq.alerts");
    if (raw) return { ...ALERT_DEFAULTS, ...JSON.parse(raw) };
  } catch {
    // fall through to defaults
  }
  return ALERT_DEFAULTS;
}

export default function SettingsPage() {
  const reduceMotion = useReducedMotion();
  const [tab, setTab] = useState<TabId>("profile");

  return (
    <div className="relative p-6 max-w-4xl mx-auto space-y-6">
      {!reduceMotion && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-0 size-72 rounded-full bg-brand/10 blur-[110px]"
          animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="relative"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
          Workspace
        </p>
        <h1 className="text-4xl font-semibold tracking-[-0.03em] text-ink mt-1">
          Settings
        </h1>
        <p className="text-[15px] text-ink/55 mt-2 leading-relaxed">
          Your profile, business details, hours and alerts — all in one place.
        </p>
      </motion.div>

      {/* Tab bar */}
      <div className="relative flex p-1 rounded-full bg-ink/[0.05] w-fit max-w-full overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={cn(
              "relative flex items-center gap-1.5 text-[13px] font-medium px-4 py-2 rounded-full transition-colors whitespace-nowrap",
              tab === t.id ? "text-white" : "text-ink/55 hover:text-ink",
              t.id === "danger" && tab !== t.id && "hover:text-red-600",
            )}
          >
            {tab === t.id && (
              <motion.span
                layoutId="settings-tab-pill"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
                className={cn(
                  "absolute inset-0 rounded-full",
                  t.id === "danger" ? "bg-red-600" : "bg-ink",
                )}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {t.icon}
              {t.label}
            </span>
          </button>
        ))}
      </div>

      {/* Panels */}
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={reduceMotion ? false : { opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -28 }}
            transition={{ duration: 0.28, ease: EASE }}
          >
            {tab === "profile" && <ProfilePanel reduceMotion={!!reduceMotion} />}
            {tab === "business" && <BusinessPanel reduceMotion={!!reduceMotion} />}
            {tab === "hours" && <BusinessHoursCard />}
            {tab === "alerts" && <AlertsPanel />}
            {tab === "danger" && <DangerPanel />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Shared bits ─────────────────────────────────────────────────────────────

function PanelTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-semibold tracking-tight text-ink">{children}</h2>
      {sub && <p className="text-[13px] text-ink/50 mt-1">{sub}</p>}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/45 mb-2">
      {children}
    </span>
  );
}

function FillInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      {...rest}
      className={cn(
        "w-full rounded-2xl bg-ink/[0.05] px-4 py-3 text-sm font-medium text-ink",
        "placeholder:text-ink/30 placeholder:font-normal",
        "transition-colors duration-200 hover:bg-ink/[0.07]",
        "focus:outline-none focus:bg-ink/[0.08]",
        "disabled:opacity-60",
        className,
      )}
    />
  );
}

function SavePill({
  onClick,
  saving,
  label = "Save changes",
}: {
  onClick: () => void;
  saving: boolean;
  label?: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={saving}
      className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-6 text-sm font-medium text-white transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 disabled:opacity-50"
    >
      {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {label}
    </motion.button>
  );
}

// ─── Profile ─────────────────────────────────────────────────────────────────

function ProfilePanel({ reduceMotion }: { reduceMotion: boolean }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [joined, setJoined] = useState("");

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => {
        const u = res.data.user;
        setName(u.name ?? "");
        setEmail(u.email ?? "");
        setAvatarUrl(u.avatarUrl ?? "");
        setJoined(u.createdAt ?? "");
      })
      .catch(() => toast.error("Could not load profile"))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!name.trim()) return toast.error("Name can't be empty");
    setSaving(true);
    try {
      await api.patch("/auth/me", { name: name.trim(), avatarUrl: avatarUrl || null });
      toast.success("Profile updated");
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          "Could not save profile",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3" aria-label="Loading profile">
        <div className="size-20 rounded-full bg-ink/10 animate-pulse" />
        <div className="h-12 rounded-2xl bg-ink/[0.05] animate-pulse" />
        <div className="h-12 rounded-2xl bg-ink/[0.05] animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      <PanelTitle sub="How your team and customers see you.">
        Profile
      </PanelTitle>
      <div className="space-y-5">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <ImageUpload
            value={avatarUrl}
            onChange={setAvatarUrl}
            onRemove={() => setAvatarUrl("")}
          />
          <div>
            <p className="text-[15px] font-semibold text-ink">{name || "Your name"}</p>
            <p className="text-[13px] text-ink/50">{email}</p>
            {joined && (
              <p className="text-xs text-ink/40 mt-0.5">
                Member since {new Date(joined).toLocaleDateString()}
              </p>
            )}
          </div>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Full name</FieldLabel>
            <FillInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
            />
          </div>
          <div>
            <FieldLabel>Email (sign-in)</FieldLabel>
            <FillInput value={email} disabled aria-label="Email" />
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <SavePill onClick={save} saving={saving} />
          <button
            onClick={() => {
              dispatch(logoutUser());
              router.push("/");
            }}
            className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium text-ink/60 hover:text-ink hover:bg-ink/[0.06] transition-colors"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Business ────────────────────────────────────────────────────────────────

function BusinessPanel({ reduceMotion }: { reduceMotion: boolean }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<OnboardingDraft>({});

  useEffect(() => {
    getOnboarding()
      .then((p) => {
        setDraft({
          businessName: p.businessName ?? undefined,
          businessType: p.businessType ?? undefined,
          description: p.description ?? undefined,
          contactEmail: p.contactEmail ?? undefined,
          contactPhone: p.contactPhone ?? undefined,
          locationMode: p.locationMode ?? undefined,
          addressLine1: p.addressLine1 ?? undefined,
          city: p.city ?? undefined,
          state: p.state ?? undefined,
          pincode: p.pincode ?? undefined,
          serviceArea: p.serviceArea ?? undefined,
        });
      })
      .catch(() => toast.error("Could not load business details"))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!draft.businessName?.trim()) return toast.error("Business name is required");
    setSaving(true);
    try {
      await saveOnboardingDraft(draft);
      toast.success("Business details saved");
    } catch {
      toast.error("Could not save business details");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3" aria-label="Loading business details">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 rounded-2xl bg-ink/[0.05] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <PanelTitle sub="Shown to customers on WhatsApp, invoices and bookings.">
        Business details
      </PanelTitle>
      <div className="space-y-6">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <FieldLabel>Business name</FieldLabel>
          <FillInput
            value={draft.businessName ?? ""}
            onChange={(e) => setDraft({ ...draft, businessName: e.target.value })}
            placeholder="e.g. Glow Salon & Spa"
            autoComplete="organization"
          />
        </motion.div>

        <div>
          <FieldLabel>Category</FieldLabel>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {BUSINESS_TYPE_META.map((t, i) => {
              const on = draft.businessType === (t.id as BusinessType);
              return (
                <motion.button
                  key={t.id}
                  type="button"
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.24) }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setDraft({ ...draft, businessType: t.id as BusinessType })}
                  aria-pressed={on}
                  className={cn(
                    "rounded-2xl px-3 py-2.5 text-[13px] font-medium transition-colors",
                    on ? "bg-ink text-white" : "bg-ink/[0.05] text-ink hover:bg-ink/[0.09]",
                  )}
                >
                  {t.label}
                </motion.button>
              );
            })}
          </div>
        </div>

        <div>
          <FieldLabel>Description</FieldLabel>
          <textarea
            value={draft.description ?? ""}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="One line about what you do…"
            rows={2}
            className="w-full rounded-2xl bg-ink/[0.05] px-4 py-3 text-sm font-medium text-ink placeholder:text-ink/30 placeholder:font-normal transition-colors hover:bg-ink/[0.07] focus:outline-none focus:bg-ink/[0.08] resize-none"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Contact email</FieldLabel>
            <FillInput
              type="email"
              value={draft.contactEmail ?? ""}
              onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value })}
              placeholder="hello@business.com"
            />
          </div>
          <div>
            <FieldLabel>Contact phone</FieldLabel>
            <FillInput
              type="tel"
              value={draft.contactPhone ?? ""}
              onChange={(e) => setDraft({ ...draft, contactPhone: e.target.value })}
              placeholder="+91 …"
            />
          </div>
        </div>

        <div>
          <FieldLabel>Where do you serve customers?</FieldLabel>
          <div className="grid sm:grid-cols-3 gap-2">
            {LOCATION_MODES.map((m) => {
              const on = draft.locationMode === m.id;
              return (
                <motion.button
                  key={m.id}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setDraft({ ...draft, locationMode: m.id })}
                  aria-pressed={on}
                  className={cn(
                    "rounded-2xl p-3.5 text-left transition-colors",
                    on ? "bg-ink text-white" : "bg-ink/[0.05] hover:bg-ink/[0.09]",
                  )}
                >
                  <span className={cn("block text-sm font-semibold", on ? "text-white" : "text-ink")}>
                    {m.title}
                  </span>
                  <span className={cn("block text-xs mt-0.5", on ? "text-white/60" : "text-ink/50")}>
                    {m.blurb}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        <div>
          <FieldLabel>Address</FieldLabel>
          <div className="space-y-2.5">
            <FillInput
              value={draft.addressLine1 ?? ""}
              onChange={(e) => setDraft({ ...draft, addressLine1: e.target.value })}
              placeholder="Street address"
              autoComplete="street-address"
            />
            <div className="grid grid-cols-3 gap-2.5">
              <FillInput
                value={draft.city ?? ""}
                onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                placeholder="City"
                aria-label="City"
              />
              <FillInput
                value={draft.state ?? ""}
                onChange={(e) => setDraft({ ...draft, state: e.target.value })}
                placeholder="State"
                aria-label="State"
              />
              <FillInput
                value={draft.pincode ?? ""}
                onChange={(e) => setDraft({ ...draft, pincode: e.target.value })}
                placeholder="Pincode"
                aria-label="Pincode"
                inputMode="numeric"
                className="tabular-nums"
              />
            </div>
          </div>
        </div>

        <div>
          <FieldLabel>Service area</FieldLabel>
          <FillInput
            value={draft.serviceArea ?? ""}
            onChange={(e) => setDraft({ ...draft, serviceArea: e.target.value })}
            placeholder="e.g. Andheri West, Mumbai"
          />
        </div>

        <SavePill onClick={save} saving={saving} />
      </div>
    </div>
  );
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

const ALERT_ROWS: { key: keyof AlertPrefs; title: string; blurb: string }[] = [
  {
    key: "emailOnOrder",
    title: "New order alerts",
    blurb: "Ping me the moment a customer places an order",
  },
  {
    key: "emailOnBooking",
    title: "New booking alerts",
    blurb: "Ping me whenever a table, room or slot gets booked",
  },
  {
    key: "whatsappErrorAlerts",
    title: "WhatsApp failure alerts",
    blurb: "Tell me instantly if message delivery starts failing",
  },
];

function AlertsPanel() {
  // Lazy initializer (localStorage guarded inside) — no sync effect needed.
  const [prefs, setPrefs] = useState<AlertPrefs>(loadAlertPrefs);

  const flip = (key: keyof AlertPrefs) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem("sparq.alerts", JSON.stringify(next));
      } catch {
        // storage unavailable — prefs apply for this session only
      }
      return next;
    });
  };

  return (
    <div>
      <PanelTitle sub="Which moments deserve a nudge. Stored on this device.">
        Alerts
      </PanelTitle>
      <div className="space-y-2">
        {ALERT_ROWS.map((row, i) => {
          const on = prefs[row.key];
          return (
            <motion.div
              key={row.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={cn(
                "flex items-center justify-between gap-4 rounded-[1.4rem] px-5 py-4 transition-colors duration-300",
                on ? "bg-ink text-white" : "bg-ink/[0.045]",
              )}
            >
              <div>
                <p className={cn("text-sm font-semibold", on ? "text-white" : "text-ink")}>
                  {row.title}
                </p>
                <p className={cn("text-xs mt-0.5", on ? "text-white/60" : "text-ink/50")}>
                  {row.blurb}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={row.title}
                onClick={() => flip(row.key)}
                className={cn(
                  "relative h-6.5 w-11.5 rounded-full transition-colors duration-300 shrink-0",
                  on ? "bg-brand" : "bg-ink/15",
                )}
              >
                <motion.span
                  layout
                  transition={{ type: "spring", stiffness: 550, damping: 30 }}
                  className={cn(
                    "absolute top-0.5 size-5.5 rounded-full bg-white",
                    on ? "right-0.5" : "left-0.5",
                  )}
                />
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Danger ──────────────────────────────────────────────────────────────────

function DangerPanel() {
  const confirmAction = useConfirm();
  return (
    <div>
      <PanelTitle sub="Irreversible actions. Tread carefully.">
        Danger zone
      </PanelTitle>
      <div className="rounded-[1.4rem] bg-red-500/10 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-red-700">Delete workspace & data</p>
          <p className="text-xs text-red-600/80 mt-0.5">
            Permanently erase catalog, flows and conversation history
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={async () => {
            const ok = await confirmAction({
              title: "Delete workspace & data?",
              body: "Catalog, flows and conversation history go away permanently.",
              confirmLabel: "Request deletion",
              tone: "danger",
            });
            if (ok) toast.error("Deletion request submitted. Support will confirm by email.");
          }}
          className="h-10 inline-flex items-center gap-2 rounded-full bg-red-600 px-5 text-[13px] font-medium text-white hover:bg-red-700 transition-colors"
        >
          <Trash2 className="size-4" aria-hidden />
          Delete
        </motion.button>
      </div>
    </div>
  );
}
