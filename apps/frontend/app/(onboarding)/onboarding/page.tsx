"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Clock,
  Globe,
  Loader2,
  MapPin,
  Sparkles,
  Users,
} from "lucide-react";
import { formatINR, getPlans } from "@/lib/billing";
import {
  BUSINESS_TYPE_META,
  MODULE_META,
  WEEK_DAYS,
  completeOnboarding,
  defaultModulesFor,
  getOnboarding,
  hasModule,
  needsBusinessAddress,
  needsHours,
  needsServiceArea,
  saveOnboardingDraft,
  type BusinessModule,
  type LocationMode,
  type OnboardingDraft,
  type OperatingDay,
} from "@/lib/onboarding";
import { cn } from "@/lib/utils";

type StepId = "business" | "use" | "details" | "plan";

interface PlanOption {
  id: "FREE" | "GROWTH" | "PRO";
  name: string;
  monthlyPaise: number;
  blurb: string;
}

const STATIC_PLANS: PlanOption[] = [
  { id: "FREE", name: "Free", monthlyPaise: 0, blurb: "For trying things out" },
  {
    id: "GROWTH",
    name: "Growth",
    monthlyPaise: 99900,
    blurb: "For growing businesses",
  },
  {
    id: "PRO",
    name: "Pro",
    monthlyPaise: 249900,
    blurb: "The complete Sparq experience",
  },
];

const STEP_COPY: Record<StepId, { eyebrow: string; title: string; subtitle: string }> = {
  business: {
    eyebrow: "Your business",
    title: "Tell us about your business",
    subtitle: "This personalizes your assistant and dashboard.",
  },
  use: {
    eyebrow: "Your toolkit",
    title: "How will you use Sparq?",
    subtitle: "Select everything you want Sparq to handle.",
  },
  details: {
    eyebrow: "The specifics",
    title: "A few more details",
    subtitle: "Only what your business actually needs.",
  },
  plan: {
    eyebrow: "Your plan",
    title: "Choose your plan",
    subtitle: "Start free, upgrade anytime.",
  },
};

function showDetailsStep(draft: OnboardingDraft): boolean {
  return (
    hasModule(draft, "bookings") ||
    needsBusinessAddress(draft) ||
    needsServiceArea(draft)
  );
}

function profileToDraft(profile: Record<string, unknown>): OnboardingDraft {
  const get = (k: string) => (profile[k] as never) ?? undefined;
  return {
    businessName: (get("businessName") as string) || undefined,
    businessType:
      (get("businessType") as OnboardingDraft["businessType"]) ?? undefined,
    enabledModules: (get("enabledModules") as BusinessModule[]) ?? [],
    addressLine1: (get("addressLine1") as string) || undefined,
    city: (get("city") as string) || undefined,
    state: (get("state") as string) || undefined,
    pincode: (get("pincode") as string) || undefined,
    locationMode: (get("locationMode") as LocationMode) ?? undefined,
    serviceArea: (get("serviceArea") as string) || undefined,
    operatingHours:
      (get("operatingHours") as Record<string, OperatingDay>) ?? undefined,
    staffCount: (get("staffCount") as number) ?? undefined,
  };
}

const EASE = [0.22, 1, 0.36, 1] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>({});
  const [plan, setPlan] = useState<PlanOption["id"] | null>(null);
  const [plans, setPlans] = useState<PlanOption[]>(STATIC_PLANS);
  const [missing, setMissing] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  // Dynamic steps based on current business setup
  const steps = useMemo<StepId[]>(() => {
    const list: StepId[] = ["business", "use"];
    if (showDetailsStep(draft)) list.push("details");
    list.push("plan");
    return list;
  }, [draft]);
  const step = steps[Math.min(stepIndex, steps.length - 1)] as StepId;

  useEffect(() => {
    Promise.all([
      getOnboarding().catch(() => null),
      getPlans().catch(() => null),
    ])
      .then(([profile, fetchedPlans]) => {
        if (profile && profile.onboardingStatus === "COMPLETED") {
          router.replace("/dashboard");
          return;
        }
        if (profile) {
          setDraft(
            profileToDraft(profile as unknown as Record<string, unknown>),
          );
        }
        if (fetchedPlans && fetchedPlans.length > 0) {
          const byId = new Map(fetchedPlans.map((p) => [p.id, p]));
          setPlans(
            (["FREE", "GROWTH", "PRO"] as const).map((id) => {
              const p = byId.get(id);
              const fallback = STATIC_PLANS.find((s) => s.id === id)!;
              return {
                id,
                name: p?.name ?? fallback.name,
                monthlyPaise: p?.monthlyPricePaise ?? fallback.monthlyPaise,
                blurb: fallback.blurb,
              };
            }),
          );
        }
      })
      .catch(() => toast.error("Could not load setup"))
      .finally(() => setLoading(false));
  }, [router]);

  const persist = useCallback(
    async (next: OnboardingDraft, nextStep: number) => {
      setSaving(true);
      try {
        await saveOnboardingDraft({ ...next, step: nextStep });
      } catch {
        toast.error("Couldn't save progress just now");
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const go = (nextIndex: number) => {
    setMissing([]);
    setStepIndex(nextIndex);
    void persist(draft, nextIndex);
  };

  const toggleModule = (module: BusinessModule) => {
    const current = draft.enabledModules ?? [];
    setDraft({
      ...draft,
      enabledModules: current.includes(module)
        ? current.filter((m) => m !== module)
        : [...current, module],
    });
  };

  const finish = async () => {
    if (!plan) return;
    setFinishing(true);
    setMissing([]);
    try {
      await persist(draft, stepIndex);
      await completeOnboarding(draft);
      setDone(true);
      setTimeout(() => {
        if (plan === "FREE") router.replace("/dashboard");
        else router.replace(`/subscription?plan=${plan}`);
      }, 1500);
    } catch (error: unknown) {
      const data = (
        error as {
          response?: {
            data?: { data?: { missing?: string[] }; error?: string };
          };
        }
      )?.response?.data;
      const missingFields = data?.data?.missing ?? [];
      if (missingFields.length > 0) {
        setMissing(missingFields);
        const needsBusiness = missingFields.some((f) =>
          ["businessName", "businessType"].includes(f),
        );
        const target = needsBusiness
          ? steps.indexOf("business")
          : steps.indexOf("details");
        setStepIndex(target >= 0 ? target : 0);
        toast.error("A few details are still needed");
      } else {
        toast.error(data?.error ?? "Could not finish setup");
      }
    } finally {
      setFinishing(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-10 space-y-5 max-w-xl" aria-label="Loading setup">
        <div className="h-3 w-32 bg-ink/10 rounded-full animate-pulse" />
        <div className="h-10 w-72 bg-ink/10 rounded-2xl animate-pulse" />
        <div className="h-72 rounded-[2rem] bg-ink/[0.04] animate-pulse" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="pt-16 flex flex-col items-center text-center max-w-md mx-auto">
        <motion.div
          initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="size-20 rounded-full bg-ink text-white flex items-center justify-center"
        >
          <Check className="size-9" aria-hidden />
        </motion.div>
        <motion.h1
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease: EASE }}
          className="text-4xl font-semibold tracking-[-0.03em] mt-7 text-ink"
        >
          You&apos;re all set
        </motion.h1>
        <motion.p
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-[15px] text-ink/55 mt-2"
        >
          {plan === "FREE"
            ? "Preparing your dashboard experience…"
            : "Redirecting to checkout…"}
        </motion.p>
      </div>
    );
  }

  const copy = STEP_COPY[step];
  const pct = Math.round(((stepIndex + 1) / steps.length) * 100);
  const canAdvance = !(
    saving ||
    (step === "business" && (!draft.businessName?.trim() || !draft.businessType))
  );

  return (
    <div className="relative pt-6 sm:pt-10 pb-12">
      {/* Ambient washes */}
      {!reduceMotion && (
        <>
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -top-28 -right-28 size-80 rounded-full bg-brand/15 blur-[110px]"
            animate={{ x: [0, -24, 0], y: [0, 24, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute top-64 -left-32 size-80 rounded-full bg-[#e3ddc9]/70 blur-[110px]"
            animate={{ x: [0, 24, 0], y: [0, -20, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}

      <div className="relative">
        {/* Progress */}
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/45">
          <span className="text-brand">
            {copy.eyebrow} · {stepIndex + 1}/{steps.length}
          </span>
          <span className="tabular-nums">{pct}%</span>
        </div>
        <div
          className="mt-2.5 h-1.5 rounded-full bg-ink/10 overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand to-ink"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: EASE }}
          />
        </div>

        {/* Heading */}
        <motion.div
          key={step}
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="mt-8"
        >
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-[-0.03em] leading-[1.02] text-ink">
            {copy.title}
          </h1>
          <p className="text-[15px] text-ink/55 mt-2.5 leading-relaxed">
            {copy.subtitle}
          </p>
        </motion.div>

        {/* Step body — open canvas, no container */}
        <div className="mt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={reduceMotion ? false : { opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -32 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              {step === "business" && (
                <StepBusiness
                  draft={draft}
                  reduceMotion={!!reduceMotion}
                  onName={(v) => setDraft({ ...draft, businessName: v })}
                  onType={(t) => {
                    const next = { ...draft, businessType: t };
                    if ((next.enabledModules ?? []).length === 0 && t) {
                      next.enabledModules = defaultModulesFor(t);
                    }
                    setDraft(next);
                  }}
                />
              )}

              {step === "use" && (
                <StepUse
                  draft={draft}
                  reduceMotion={!!reduceMotion}
                  onToggle={toggleModule}
                />
              )}

              {step === "details" && (
                <StepDetails
                  draft={draft}
                  reduceMotion={!!reduceMotion}
                  onPatch={(patch) => setDraft({ ...draft, ...patch })}
                  missing={missing}
                />
              )}

              {step === "plan" && (
                <StepPlan
                  plans={plans}
                  plan={plan}
                  reduceMotion={!!reduceMotion}
                  onPick={setPlan}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="mt-9 flex items-center justify-between gap-3">
          <div>
            {stepIndex > 0 && (
              <button
                onClick={() => go(stepIndex - 1)}
                className="group inline-flex h-12 items-center gap-2 px-2 text-sm font-medium text-ink/60 hover:text-ink transition-colors"
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-ink/[0.06] transition-transform duration-300 group-hover:-translate-x-0.5">
                  <ArrowLeft className="size-4" aria-hidden />
                </span>
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {step !== "plan" && (
              <button
                onClick={() => go(stepIndex + 1)}
                className="h-12 px-4 text-sm font-medium text-ink/50 hover:text-ink transition-colors"
              >
                Skip
              </button>
            )}
            {step === "plan" ? (
              <PrimaryPill
                onClick={finish}
                disabled={!plan || finishing || saving}
                busy={finishing}
                label={plan === "FREE" ? "Go to dashboard" : "Continue to payment"}
              />
            ) : (
              <PrimaryPill
                onClick={() => go(stepIndex + 1)}
                disabled={!canAdvance}
                busy={false}
                label="Next"
              />
            )}
          </div>
        </div>

        {step === "business" &&
          (!draft.businessName?.trim() || !draft.businessType) && (
            <p className="text-xs text-ink/40 mt-4">
              Add your business name and pick a type to continue — or Skip.
            </p>
          )}
        {saving && (
          <p className="text-xs text-ink/40 mt-3 animate-pulse">
            Saving changes…
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Landing-style primary pill ──────────────────────────────────────────────

function PrimaryPill({
  onClick,
  disabled,
  busy,
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  busy: boolean;
  label: string;
}) {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className="group inline-flex h-12 items-center gap-2 rounded-full bg-ink pl-6 pr-2 text-sm font-medium text-white transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : label}
      <span className="flex size-9 items-center justify-center rounded-full bg-white/15 transition-transform duration-300 group-hover:translate-x-0.5">
        <ArrowRight className="size-4" aria-hidden />
      </span>
    </motion.button>
  );
}

// ─── Eyebrow label ───────────────────────────────────────────────────────────

function Eyebrow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/45">
      <span className="text-brand">{icon}</span>
      {children}
    </span>
  );
}

// ─── Filled borderless input ─────────────────────────────────────────────────

function FillInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean },
) {
  const { invalid, className, ...rest } = props;
  return (
    <input
      {...rest}
      className={cn(
        "w-full rounded-2xl bg-ink/[0.05] px-5 py-4 text-[15px] font-medium text-ink",
        "placeholder:text-ink/30 placeholder:font-normal",
        "transition-colors duration-200 hover:bg-ink/[0.07]",
        "focus:outline-none focus:bg-ink/[0.08]",
        invalid && "bg-red-500/10 focus:bg-red-500/15",
        className,
      )}
    />
  );
}

// ─── Selection tile (tonal, borderless) ──────────────────────────────────────

function Tile({
  selected,
  onClick,
  index,
  reduceMotion,
  className,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  index: number;
  reduceMotion: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.045, 0.4), duration: 0.4, ease: EASE }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "text-left rounded-[1.4rem] p-5 transition-colors duration-250",
        "focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2",
        selected
          ? "bg-ink text-white"
          : "bg-ink/[0.045] hover:bg-ink/[0.08] text-ink",
        className,
      )}
    >
      {children}
    </motion.button>
  );
}

function CheckDot({ selected, dark }: { selected: boolean; dark?: boolean }) {
  return (
    <motion.span
      aria-hidden
      initial={false}
      animate={selected ? { scale: 1, opacity: 1 } : { scale: 0.6, opacity: 0.9 }}
      transition={{ type: "spring", stiffness: 500, damping: 26 }}
      className={cn(
        "shrink-0 size-6 flex items-center justify-center rounded-full",
        selected
          ? dark
            ? "bg-white text-ink"
            : "bg-brand text-white"
          : "bg-ink/10 text-transparent",
      )}
    >
      <Check className="size-3.5" strokeWidth={3} />
    </motion.span>
  );
}

// ─── Step 1: Business ────────────────────────────────────────────────────────

function StepBusiness({
  draft,
  reduceMotion,
  onName,
  onType,
}: {
  draft: OnboardingDraft;
  reduceMotion: boolean;
  onName: (v: string) => void;
  onType: (t: OnboardingDraft["businessType"]) => void;
}) {
  return (
    <div className="space-y-8">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="space-y-3"
      >
        <Eyebrow icon={<Building2 className="size-3.5" aria-hidden />}>
          Business name
        </Eyebrow>
        <div className="relative">
          <FillInput
            id="ob-business-name"
            placeholder="e.g. Glow Salon & Spa"
            value={draft.businessName ?? ""}
            onChange={(e) => onName(e.target.value)}
            autoComplete="organization"
            aria-label="Business name"
          />
          {draft.businessName?.trim() && (
            <motion.span
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center size-6 rounded-full bg-brand/15 text-brand"
            >
              <Check className="size-3.5" strokeWidth={3} />
            </motion.span>
          )}
        </div>
      </motion.div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Eyebrow icon={<Sparkles className="size-3.5" aria-hidden />}>
            Select category
          </Eyebrow>
          <span className="text-xs text-ink/40">Pick what describes you best</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[400px] overflow-y-auto pr-1 -mr-1 pb-1">
          {BUSINESS_TYPE_META.map((t, i) => {
            const isSelected = draft.businessType === t.id;
            return (
              <Tile
                key={t.id}
                selected={isSelected}
                index={i}
                reduceMotion={reduceMotion}
                onClick={() => onType(t.id)}
              >
                <span className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      "text-[15px] font-semibold tracking-tight",
                      isSelected ? "text-white" : "text-ink",
                    )}
                  >
                    {t.label}
                  </span>
                  <CheckDot selected={isSelected} dark />
                </span>
                {t.blurb && (
                  <span
                    className={cn(
                      "block text-[13px] mt-1.5 leading-relaxed",
                      isSelected ? "text-white/60" : "text-ink/50",
                    )}
                  >
                    {t.blurb}
                  </span>
                )}
              </Tile>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Use Case ────────────────────────────────────────────────────────

function StepUse({
  draft,
  reduceMotion,
  onToggle,
}: {
  draft: OnboardingDraft;
  reduceMotion: boolean;
  onToggle: (m: BusinessModule) => void;
}) {
  return (
    <div className="space-y-2.5">
      {MODULE_META.map((m, i) => {
        const selected = hasModule(draft, m.id);
        return (
          <Tile
            key={m.id}
            selected={selected}
            index={i}
            reduceMotion={reduceMotion}
            onClick={() => onToggle(m.id)}
            className="w-full"
          >
            <span className="flex items-center justify-between gap-4">
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-[15px] font-semibold tracking-tight",
                    selected ? "text-white" : "text-ink",
                  )}
                >
                  {m.label}
                </span>
                {m.blurb && (
                  <span
                    className={cn(
                      "block text-[13px] mt-1 leading-relaxed",
                      selected ? "text-white/60" : "text-ink/50",
                    )}
                  >
                    {m.blurb}
                  </span>
                )}
              </span>
              <CheckDot selected={selected} dark />
            </span>
          </Tile>
        );
      })}
    </div>
  );
}

// ─── Step 3: Details ─────────────────────────────────────────────────────────

function StepDetails({
  draft,
  reduceMotion,
  onPatch,
  missing,
}: {
  draft: OnboardingDraft;
  reduceMotion: boolean;
  onPatch: (patch: Partial<OnboardingDraft>) => void;
  missing: string[];
}) {
  const showLocation = hasModule(draft, "bookings");
  const showAddress = needsBusinessAddress(draft);
  const showArea = needsServiceArea(draft);
  const showHours = needsHours(draft);
  const hours = draft.operatingHours ?? {};

  const missingSet = new Set(missing);
  const hasErr = (f: string) => missingSet.has(f);

  const section = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 14 } as const,
          animate: { opacity: 1, y: 0 } as const,
          transition: { delay, duration: 0.4, ease: EASE } as const,
        };

  return (
    <div className="space-y-8">
      {missing.length > 0 && (
        <motion.div
          {...section(0)}
          className="px-5 py-4 rounded-[1.4rem] bg-red-500/10 flex items-center gap-3"
        >
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60 animate-ping" />
            <span className="relative inline-flex size-2 rounded-full bg-red-500" />
          </span>
          <p className="text-[13px] font-semibold text-red-700">
            Missing details required: {missing.join(", ")}
          </p>
        </motion.div>
      )}

      {/* Location */}
      {showLocation && (
        <motion.div {...section(0.02)} className="space-y-3">
          <Eyebrow icon={<MapPin className="size-3.5" aria-hidden />}>
            Service delivery
          </Eyebrow>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {(
              [
                { id: "AT_BUSINESS", title: "At business", blurb: "They come to you" },
                { id: "AT_CUSTOMER", title: "At customer", blurb: "You go to them" },
                { id: "BOTH", title: "Both", blurb: "Either works" },
              ] as Array<{ id: LocationMode; title: string; blurb: string }>
            ).map((opt, i) => {
              const isSelected = draft.locationMode === opt.id;
              return (
                <Tile
                  key={opt.id}
                  selected={isSelected}
                  index={i}
                  reduceMotion={reduceMotion}
                  onClick={() => onPatch({ locationMode: opt.id })}
                  className="p-4 text-center"
                >
                  <span
                    className={cn(
                      "block text-sm font-semibold",
                      isSelected ? "text-white" : "text-ink",
                    )}
                  >
                    {opt.title}
                  </span>
                  <span
                    className={cn(
                      "block text-xs mt-0.5",
                      isSelected ? "text-white/60" : "text-ink/50",
                    )}
                  >
                    {opt.blurb}
                  </span>
                </Tile>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Address + area */}
      {(showAddress || showArea) && (
        <motion.div {...section(0.06)} className="space-y-6">
          {showAddress && (
            <div className="space-y-3">
              <Eyebrow icon={<Building2 className="size-3.5" aria-hidden />}>
                Physical address
              </Eyebrow>
              <div className="space-y-2.5">
                <div>
                  <FillInput
                    id="ob-addr"
                    placeholder="Street address"
                    aria-label="Street address"
                    value={draft.addressLine1 ?? ""}
                    onChange={(e) => onPatch({ addressLine1: e.target.value })}
                    autoComplete="street-address"
                    invalid={hasErr("addressLine1")}
                  />
                  {hasErr("addressLine1") && (
                    <Err>Street address is required.</Err>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <FillInput
                      placeholder="City"
                      aria-label="City"
                      value={draft.city ?? ""}
                      onChange={(e) => onPatch({ city: e.target.value })}
                      invalid={hasErr("city")}
                      className="px-4 py-3.5 text-sm"
                    />
                    {hasErr("city") && <Err>Required.</Err>}
                  </div>
                  <FillInput
                    placeholder="State"
                    aria-label="State"
                    value={draft.state ?? ""}
                    onChange={(e) => onPatch({ state: e.target.value })}
                    className="px-4 py-3.5 text-sm"
                  />
                  <div>
                    <FillInput
                      placeholder="Pincode"
                      aria-label="Pincode"
                      inputMode="numeric"
                      value={draft.pincode ?? ""}
                      onChange={(e) => onPatch({ pincode: e.target.value })}
                      invalid={hasErr("pincode")}
                      className="px-4 py-3.5 text-sm tabular-nums"
                    />
                    {hasErr("pincode") && <Err>6 digits.</Err>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {showArea && (
            <div className="space-y-3">
              <Eyebrow icon={<Globe className="size-3.5" aria-hidden />}>
                Service region
              </Eyebrow>
              <FillInput
                id="ob-area"
                placeholder="e.g. Andheri West, Mumbai"
                value={draft.serviceArea ?? ""}
                onChange={(e) => onPatch({ serviceArea: e.target.value })}
                invalid={hasErr("serviceArea")}
              />
              {hasErr("serviceArea") && <Err>Service area is required.</Err>}
            </div>
          )}
        </motion.div>
      )}

      {/* Hours + staff */}
      {showHours && (
        <motion.div {...section(0.1)} className="space-y-6">
          <div className="space-y-3">
            <Eyebrow icon={<Clock className="size-3.5" aria-hidden />}>
              Weekly hours
            </Eyebrow>
            <div className="space-y-1.5">
              {WEEK_DAYS.map((day, i) => {
                const value: OperatingDay = hours[day.id] ?? {
                  open: "09:00",
                  close: "18:00",
                };
                const closed = !!value.closed;
                return (
                  <motion.div
                    key={day.id}
                    initial={reduceMotion ? false : { opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + Math.min(i * 0.03, 0.2), duration: 0.35, ease: EASE }}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-2xl px-4 py-2.5 transition-colors duration-200",
                      closed ? "bg-ink/[0.025]" : "bg-ink/[0.05]",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[13px] font-semibold w-10",
                        closed ? "text-ink/35" : "text-ink",
                      )}
                    >
                      {day.label}
                    </span>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          onPatch({
                            operatingHours: {
                              ...hours,
                              [day.id]: { ...value, closed: !closed },
                            },
                          })
                        }
                        aria-pressed={closed}
                        className={cn(
                          "text-[11px] font-semibold px-3 py-1.5 rounded-full transition-colors duration-200",
                          "focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2",
                          closed
                            ? "bg-ink/10 text-ink/45"
                            : "bg-brand text-white",
                        )}
                      >
                        {closed ? "Closed" : "Open"}
                      </button>
                      {!closed && (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="time"
                            aria-label={`${day.label} opens`}
                            value={value.open}
                            onChange={(e) =>
                              onPatch({
                                operatingHours: {
                                  ...hours,
                                  [day.id]: { ...value, open: e.target.value },
                                },
                              })
                            }
                            className="text-xs font-medium rounded-xl bg-white/70 px-2 py-1.5 text-ink focus:outline-none focus:bg-white"
                          />
                          <span className="text-ink/30 text-xs">–</span>
                          <input
                            type="time"
                            aria-label={`${day.label} closes`}
                            value={value.close}
                            onChange={(e) =>
                              onPatch({
                                operatingHours: {
                                  ...hours,
                                  [day.id]: { ...value, close: e.target.value },
                                },
                              })
                            }
                            className="text-xs font-medium rounded-xl bg-white/70 px-2 py-1.5 text-ink focus:outline-none focus:bg-white"
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
            {hasErr("operatingHours") && <Err>Operating hours are required.</Err>}
          </div>

          <div className="space-y-3">
            <Eyebrow icon={<Users className="size-3.5" aria-hidden />}>
              Team size <span className="normal-case font-normal">(optional)</span>
            </Eyebrow>
            <FillInput
              id="ob-staff"
              type="number"
              min={0}
              placeholder="e.g. 5"
              value={draft.staffCount ?? ""}
              onChange={(e) =>
                onPatch({
                  staffCount:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
              className="max-w-40 tabular-nums"
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Err({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-red-600 mt-1.5 px-1">{children}</p>;
}

// ─── Step 4: Plan ────────────────────────────────────────────────────────────

function StepPlan({
  plans,
  plan,
  reduceMotion,
  onPick,
}: {
  plans: PlanOption[];
  plan: PlanOption["id"] | null;
  reduceMotion: boolean;
  onPick: (id: PlanOption["id"]) => void;
}) {
  return (
    <div className="space-y-2.5">
      {plans.map((p, i) => {
        const selected = plan === p.id;
        return (
          <Tile
            key={p.id}
            selected={selected}
            index={i}
            reduceMotion={reduceMotion}
            onClick={() => onPick(p.id)}
            className="w-full"
          >
            <span className="flex items-center justify-between gap-4">
              <span className="min-w-0">
                <span className="flex items-baseline gap-2.5">
                  <span
                    className={cn(
                      "text-base font-semibold tracking-tight",
                      selected ? "text-white" : "text-ink",
                    )}
                  >
                    {p.name}
                  </span>
                  <span
                    className={cn(
                      "text-[13px] font-medium tabular-nums",
                      selected ? "text-brand-ink/80" : "text-brand",
                    )}
                  >
                    {p.monthlyPaise === 0
                      ? "Free forever"
                      : `${formatINR(p.monthlyPaise)}/mo`}
                  </span>
                </span>
                <span
                  className={cn(
                    "block text-[13px] mt-1",
                    selected ? "text-white/60" : "text-ink/50",
                  )}
                >
                  {p.blurb}
                </span>
              </span>
              <CheckDot selected={selected} dark />
            </span>
          </Tile>
        );
      })}
    </div>
  );
}
