"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import { animate, stagger } from "animejs";
import { toast } from "sonner";
import { ArrowRight, Check, Loader2 } from "lucide-react";
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
  { id: "GROWTH", name: "Growth", monthlyPaise: 99900, blurb: "For growing businesses" },
  { id: "PRO", name: "Pro", monthlyPaise: 249900, blurb: "The complete Sparq experience" },
];

const STEP_COPY: Record<StepId, { title: string; subtitle: string }> = {
  business: {
    title: "Tell us about your business",
    subtitle: "This personalizes your assistant and dashboard",
  },
  use: {
    title: "How do you plan to use Sparq?",
    subtitle: "Select everything you want Sparq to handle",
  },
  details: {
    title: "A few more details",
    subtitle: "Only what your business actually needs",
  },
  plan: {
    title: "Choose your plan",
    subtitle: "Start free, upgrade anytime",
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
    businessType: (get("businessType") as OnboardingDraft["businessType"]) ?? undefined,
    enabledModules: (get("enabledModules") as BusinessModule[]) ?? [],
    addressLine1: (get("addressLine1") as string) || undefined,
    city: (get("city") as string) || undefined,
    state: (get("state") as string) || undefined,
    pincode: (get("pincode") as string) || undefined,
    locationMode: (get("locationMode") as LocationMode) ?? undefined,
    serviceArea: (get("serviceArea") as string) || undefined,
    operatingHours: (get("operatingHours") as Record<string, OperatingDay>) ?? undefined,
    staffCount: (get("staffCount") as number) ?? undefined,
  };
}

export default function OnboardingPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const bodyRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>({});
  const [plan, setPlan] = useState<PlanOption["id"] | null>(null);
  const [plans, setPlans] = useState<PlanOption[]>(STATIC_PLANS);
  const [missing, setMissing] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  // Steps are dynamic: the details step only exists when needed.
  const steps = useMemo<StepId[]>(() => {
    const list: StepId[] = ["business", "use"];
    if (showDetailsStep(draft)) list.push("details");
    list.push("plan");
    return list;
  }, [draft]);
  const step = steps[Math.min(stepIndex, steps.length - 1)] as StepId;

  // Boot: resume draft; completed profiles go straight to the app.
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
          setDraft(profileToDraft(profile as unknown as Record<string, unknown>));
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

  // Anime.js: staggered entrance on every step change.
  useEffect(() => {
    if (loading || reduceMotion) return;
    const root = bodyRef.current;
    if (!root) return;
    const rows = root.querySelectorAll("[data-ob-row]");
    if (rows.length === 0) return;
    const anim = animate(rows, {
      opacity: [0, 1],
      translateY: [14, 0],
      duration: 450,
      delay: stagger(65),
      ease: "outCubic",
    });
    return () => {
      anim.revert();
    };
  }, [step, loading, reduceMotion]);

  // Anime.js: success pop before routing out.
  useEffect(() => {
    if (!done || reduceMotion) return;
    const el = document.querySelector("[data-ob-success]");
    if (!el) return;
    const anim = animate(el, {
      scale: [0.4, 1],
      opacity: [0, 1],
      duration: 550,
      ease: "outBack(1.6)",
    });
    return () => {
      anim.revert();
    };
  }, [done, reduceMotion]);

  const popCheck = (e: React.MouseEvent<HTMLElement>) => {
    if (reduceMotion) return;
    const check = e.currentTarget.querySelector("[data-ob-check]");
    if (check) animate(check, { scale: [0.5, 1], duration: 280, ease: "outBack(2)" });
  };

  const persist = useCallback(async (next: OnboardingDraft, nextStep: number) => {
    setSaving(true);
    try {
      await saveOnboardingDraft({ ...next, step: nextStep });
    } catch {
      toast.error("Couldn't save progress just now");
    } finally {
      setSaving(false);
    }
  }, []);

  const go = (nextIndex: number) => {
    setMissing([]);
    setStepIndex(nextIndex);
    void persist(draft, nextIndex);
  };

  const toggleModule = (e: React.MouseEvent<HTMLElement>, module: BusinessModule) => {
    popCheck(e);
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
      // Brief success beat, then route by plan choice.
      setTimeout(() => {
        if (plan === "FREE") router.replace("/dashboard");
        else router.replace(`/subscription?plan=${plan}`);
      }, 1400);
    } catch (error: unknown) {
      const data = (
        error as { response?: { data?: { data?: { missing?: string[] }; error?: string } } }
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
      <div className="pt-10 space-y-3" aria-label="Loading setup">
        <div className="h-3 w-40 bg-zinc-100 rounded animate-pulse" />
        <div className="h-7 w-72 bg-zinc-100 rounded animate-pulse" />
        <div className="h-64 rounded-2xl border border-zinc-200 animate-pulse" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="pt-20 flex flex-col items-center text-center">
        <div
          data-ob-success
          className="size-16 rounded-full bg-zinc-900 text-white flex items-center justify-center"
        >
          <Check className="size-8" aria-hidden />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mt-5">You&apos;re all set</h1>
        <p className="text-sm text-zinc-500 mt-1.5">
          {plan === "FREE" ? "Taking you to your dashboard…" : "Taking you to checkout…"}
        </p>
      </div>
    );
  }

  const copy = STEP_COPY[step];

  return (
    <div ref={bodyRef} className="pt-6 sm:pt-10">
      {/* Progress */}
      <p className="text-[13px] text-zinc-500">
        Step {stepIndex + 1} of {steps.length}
      </p>
      <div className="flex gap-1.5 mt-2" aria-hidden>
        {steps.map((s, i) => (
          <span
            key={s}
            className={cn(
              "h-[3px] flex-1 rounded-full transition-colors duration-300",
              i <= stepIndex ? "bg-zinc-900" : "bg-zinc-200",
            )}
          />
        ))}
      </div>

      {/* Heading */}
      <h1 data-ob-row className="text-[22px] font-semibold tracking-tight mt-5">
        {copy.title}
      </h1>
      <p data-ob-row className="text-sm text-zinc-500 mt-1">
        {copy.subtitle}
      </p>

      {/* Card */}
      <div data-ob-row className="mt-5 rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        {step === "business" && (
          <StepBusiness
            draft={draft}
            onName={(v) => setDraft({ ...draft, businessName: v })}
            onType={(t) => {
              const next = { ...draft, businessType: t };
              if ((next.enabledModules ?? []).length === 0 && t) {
                next.enabledModules = defaultModulesFor(t);
              }
              setDraft(next);
            }}
            onPop={popCheck}
          />
        )}

        {step === "use" && <StepUse draft={draft} onToggle={toggleModule} />}

        {step === "details" && (
          <StepDetails
            draft={draft}
            onPatch={(patch) => setDraft({ ...draft, ...patch })}
            missing={missing}
          />
        )}

        {step === "plan" && (
          <StepPlan plans={plans} plan={plan} onPick={(e, id) => { popCheck(e); setPlan(id); }} />
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/70 px-4 py-3">
          <div>
            {stepIndex > 0 && (
              <button
                onClick={() => go(stepIndex - 1)}
                className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors px-2 py-1.5"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            {step !== "plan" && (
              <button
                onClick={() => go(stepIndex + 1)}
                className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors px-3 py-1.5"
              >
                Skip
              </button>
            )}
            {step === "plan" ? (
              <button
                onClick={finish}
                disabled={!plan || finishing || saving}
                className="flex items-center gap-1.5 bg-zinc-900 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-zinc-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {finishing ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {plan === "FREE" ? "Go to dashboard" : "Continue to payment"}
                <ArrowRight className="size-4" aria-hidden />
              </button>
            ) : (
              <button
                onClick={() => go(stepIndex + 1)}
                disabled={
                  saving ||
                  (step === "business" &&
                    (!draft.businessName?.trim() || !draft.businessType))
                }
                className="bg-zinc-900 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-zinc-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>

      {step === "business" &&
        (!draft.businessName?.trim() || !draft.businessType) && (
          <p className="text-xs text-zinc-400 mt-2.5">
            Add your business name and pick a type to continue — or Skip.
          </p>
        )}
      {saving && (
        <p className="text-xs text-zinc-400 mt-2.5">Saving…</p>
      )}
    </div>
  );
}

// ─── Rows ─────────────────────────────────────────────────────────────────────

function SelectRow({
  selected,
  onClick,
  title,
  blurb,
  multi,
}: {
  selected: boolean;
  onClick: (e: React.MouseEvent<HTMLElement>) => void;
  title: string;
  blurb?: string;
  multi?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "w-full flex items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors",
        "hover:bg-zinc-50 focus-visible:outline-none focus-visible:bg-zinc-50",
        selected && "bg-zinc-50/70",
      )}
    >
      <span className="min-w-0">
        <span className="block text-[15px] font-medium text-zinc-900">{title}</span>
        {blurb && (
          <span className="block text-[13px] text-zinc-500 mt-0.5 leading-snug">
            {blurb}
          </span>
        )}
      </span>
      <span
        data-ob-check
        aria-hidden
        className={cn(
          "shrink-0 size-5 flex items-center justify-center border transition-colors",
          multi ? "rounded-md" : "rounded-full",
          selected
            ? "border-zinc-900 bg-zinc-900 text-white"
            : "border-zinc-300 bg-white",
        )}
      >
        {selected && <Check className={multi ? "size-3.5" : "size-3"} />}
      </span>
    </button>
  );
}

// ─── Step: business ───────────────────────────────────────────────────────────

function StepBusiness({
  draft,
  onName,
  onType,
  onPop,
}: {
  draft: OnboardingDraft;
  onName: (v: string) => void;
  onType: (t: OnboardingDraft["businessType"]) => void;
  onPop: (e: React.MouseEvent<HTMLElement>) => void;
}) {
  return (
    <div>
      <div data-ob-row className="px-4 py-4 border-b border-zinc-100">
        <label
          htmlFor="ob-business-name"
          className="block text-[13px] font-medium text-zinc-700 mb-1.5"
        >
          Business name
        </label>
        <input
          id="ob-business-name"
          placeholder="e.g. Glow Salon"
          value={draft.businessName ?? ""}
          onChange={(e) => onName(e.target.value)}
          autoComplete="organization"
          className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[15px] placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5"
        />
      </div>
      <div className="divide-y divide-zinc-100 max-h-[380px] overflow-y-auto">
        {BUSINESS_TYPE_META.map((t) => (
          <div key={t.id} data-ob-row>
            <SelectRow
              selected={draft.businessType === t.id}
              onClick={(e) => {
                onPop(e);
                onType(t.id);
              }}
              title={t.label}
              blurb={t.blurb}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step: use ────────────────────────────────────────────────────────────────

function StepUse({
  draft,
  onToggle,
}: {
  draft: OnboardingDraft;
  onToggle: (e: React.MouseEvent<HTMLElement>, m: BusinessModule) => void;
}) {
  return (
    <div className="divide-y divide-zinc-100">
      {MODULE_META.map((m) => (
        <div key={m.id} data-ob-row>
          <SelectRow
            multi
            selected={hasModule(draft, m.id)}
            onClick={(e) => onToggle(e, m.id)}
            title={m.label}
            blurb={m.blurb}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Step: details (only rendered when needed) ────────────────────────────────

function StepDetails({
  draft,
  onPatch,
  missing,
}: {
  draft: OnboardingDraft;
  onPatch: (patch: Partial<OnboardingDraft>) => void;
  missing: string[];
}) {
  const showLocation = hasModule(draft, "bookings");
  const showAddress = needsBusinessAddress(draft);
  const showArea = needsServiceArea(draft);
  const showHours = needsHours(draft);
  const hours = draft.operatingHours ?? {};

  const missingSet = new Set(missing);
  const err = (f: string) =>
    missingSet.has(f) ? "text-red-600 text-xs mt-1" : "hidden";

  return (
    <div>
      {missing.length > 0 && (
        <div data-ob-row className="px-4 py-3 border-b border-zinc-100 bg-red-50/60">
          <p className="text-[13px] font-medium text-red-700">
            Still needed: {missing.join(", ")}
          </p>
        </div>
      )}

      {showLocation && (
        <div data-ob-row className="border-b border-zinc-100">
          <p className="px-4 pt-3.5 text-[13px] font-medium text-zinc-700">
            Where do services happen?
          </p>
          <div className="divide-y divide-zinc-100 mt-1">
            {(
              [
                { id: "AT_BUSINESS", title: "At my business" },
                { id: "AT_CUSTOMER", title: "At the customer's place" },
                { id: "BOTH", title: "Both" },
              ] as Array<{ id: LocationMode; title: string }>
            ).map((opt) => (
              <SelectRow
                key={opt.id}
                selected={draft.locationMode === opt.id}
                onClick={() => onPatch({ locationMode: opt.id })}
                title={opt.title}
              />
            ))}
          </div>
        </div>
      )}

      {(showAddress || showArea) && (
        <div data-ob-row className="px-4 py-4 border-b border-zinc-100 space-y-3">
          {showAddress && (
            <>
              <div>
                <label htmlFor="ob-addr" className="block text-[13px] font-medium text-zinc-700 mb-1.5">
                  Business address
                </label>
                <input
                  id="ob-addr"
                  placeholder="Street address"
                  value={draft.addressLine1 ?? ""}
                  onChange={(e) => onPatch({ addressLine1: e.target.value })}
                  autoComplete="street-address"
                  className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[15px] placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400"
                />
                <p className={err("addressLine1")}>Required to finish setup.</p>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <input
                    placeholder="City"
                    aria-label="City"
                    value={draft.city ?? ""}
                    onChange={(e) => onPatch({ city: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[15px] placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400"
                  />
                  <p className={err("city")}>Required.</p>
                </div>
                <div>
                  <input
                    placeholder="State"
                    aria-label="State"
                    value={draft.state ?? ""}
                    onChange={(e) => onPatch({ state: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[15px] placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400"
                  />
                </div>
                <div>
                  <input
                    placeholder="Pincode"
                    aria-label="Pincode"
                    inputMode="numeric"
                    value={draft.pincode ?? ""}
                    onChange={(e) => onPatch({ pincode: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[15px] placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400"
                  />
                  <p className={err("pincode")}>6-digit.</p>
                </div>
              </div>
            </>
          )}
          {showArea && (
            <div>
              <label htmlFor="ob-area" className="block text-[13px] font-medium text-zinc-700 mb-1.5">
                Service area
              </label>
              <input
                id="ob-area"
                placeholder="e.g. Andheri to Bandra, Mumbai"
                value={draft.serviceArea ?? ""}
                onChange={(e) => onPatch({ serviceArea: e.target.value })}
                className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[15px] placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400"
              />
              <p className={err("serviceArea")}>Required for home visits.</p>
            </div>
          )}
        </div>
      )}

      {showHours && (
        <div data-ob-row className="px-4 py-4 border-b border-zinc-100">
          <p className="text-[13px] font-medium text-zinc-700 mb-2">Weekly hours</p>
          <div className="rounded-xl border border-zinc-200 divide-y divide-zinc-100">
            {WEEK_DAYS.map((day) => {
              const value: OperatingDay = hours[day.id] ?? { open: "09:00", close: "18:00" };
              const closed = !!value.closed;
              return (
                <div key={day.id} className="flex items-center gap-2.5 px-3 py-2">
                  <span className="text-[13px] w-9 text-zinc-600">{day.label}</span>
                  <button
                    onClick={() =>
                      onPatch({
                        operatingHours: { ...hours, [day.id]: { ...value, closed: !closed } },
                      })
                    }
                    aria-pressed={closed}
                    className={cn(
                      "text-xs px-2 py-1 rounded-md border transition-colors",
                      closed
                        ? "border-zinc-200 text-zinc-400"
                        : "border-zinc-900 bg-zinc-900 text-white",
                    )}
                  >
                    {closed ? "Closed" : "Open"}
                  </button>
                  {!closed && (
                    <div className="flex items-center gap-1.5 ml-auto">
                      <input
                        type="time"
                        aria-label={`${day.label} opens`}
                        value={value.open}
                        onChange={(e) =>
                          onPatch({
                            operatingHours: { ...hours, [day.id]: { ...value, open: e.target.value } },
                          })
                        }
                        className="text-[13px] rounded-lg border border-zinc-200 px-1.5 py-1 focus:outline-none focus:border-zinc-400"
                      />
                      <span className="text-zinc-400 text-xs">–</span>
                      <input
                        type="time"
                        aria-label={`${day.label} closes`}
                        value={value.close}
                        onChange={(e) =>
                          onPatch({
                            operatingHours: { ...hours, [day.id]: { ...value, close: e.target.value } },
                          })
                        }
                        className="text-[13px] rounded-lg border border-zinc-200 px-1.5 py-1 focus:outline-none focus:border-zinc-400"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className={err("operatingHours")}>Required to finish setup.</p>
          <div className="mt-3">
            <label htmlFor="ob-staff" className="block text-[13px] font-medium text-zinc-700 mb-1.5">
              Team size <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <input
              id="ob-staff"
              type="number"
              min={0}
              placeholder="e.g. 4"
              value={draft.staffCount ?? ""}
              onChange={(e) =>
                onPatch({ staffCount: e.target.value === "" ? undefined : Number(e.target.value) })
              }
              className="w-32 rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[15px] focus:outline-none focus:border-zinc-400"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step: plan ───────────────────────────────────────────────────────────────

function StepPlan({
  plans,
  plan,
  onPick,
}: {
  plans: PlanOption[];
  plan: PlanOption["id"] | null;
  onPick: (e: React.MouseEvent<HTMLElement>, id: PlanOption["id"]) => void;
}) {
  return (
    <div className="divide-y divide-zinc-100">
      {plans.map((p) => (
        <div key={p.id} data-ob-row>
          <button
            onClick={(e) => onPick(e, p.id)}
            aria-pressed={plan === p.id}
            className={cn(
              "w-full flex items-center justify-between gap-4 px-4 py-4 text-left transition-colors",
              "hover:bg-zinc-50 focus-visible:outline-none focus-visible:bg-zinc-50",
              plan === p.id && "bg-zinc-50/70",
            )}
          >
            <span className="min-w-0">
              <span className="flex items-baseline gap-2">
                <span className="text-[15px] font-medium text-zinc-900">{p.name}</span>
                <span className="text-[13px] text-zinc-500">
                  {p.monthlyPaise === 0 ? "Free forever" : `${formatINR(p.monthlyPaise)}/mo`}
                </span>
              </span>
              <span className="block text-[13px] text-zinc-500 mt-0.5">{p.blurb}</span>
            </span>
            <span
              data-ob-check
              aria-hidden
              className={cn(
                "shrink-0 size-5 rounded-full border flex items-center justify-center transition-colors",
                plan === p.id
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-white",
              )}
            >
              {plan === p.id && <Check className="size-3" />}
            </span>
          </button>
        </div>
      ))}
    </div>
  );
}
