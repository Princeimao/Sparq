"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarCheck,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  ShoppingBag,
  StickyNote,
  Tag,
  Trash2,
  User,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SlidePills } from "@/components/bits/SlidePills";
import { useConfirm } from "@/components/ui/confirm";
import {
  addCustomerAddress,
  deleteCustomerAddress,
  formatAddress,
  getCustomer,
  updateCustomer,
  type CustomerDetail,
} from "@/lib/customers";
import { getOnboarding, normalizeModules } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

const TAG_PRESETS = ["VIP", "Regular", "New", "Corporate", "Family"];

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  CONFIRMED: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  CHECKED_IN: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  PENDING: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  CANCELLED: "bg-red-500/10 text-red-600 border-red-500/20",
  NO_SHOW: "bg-red-500/10 text-red-600 border-red-500/20",
  FAILED: "bg-red-500/10 text-red-600 border-red-500/20",
  CAPTURED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap",
        STATUS_STYLES[status] ?? "bg-ink/[0.06] text-ink/55 border-transparent",
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function EmptyState({
  icon,
  title,
  blurb,
}: {
  icon: React.ReactNode;
  title: string;
  blurb: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-ink/[0.06] text-ink/50 mb-3">
        {icon}
      </span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="text-xs text-ink/50 mt-1 max-w-xs">{blurb}</p>
    </div>
  );
}

function tagsOf(customer: CustomerDetail | null): string[] {
  const raw = (customer?.customFields as { tags?: unknown } | null)?.tags;
  return Array.isArray(raw) ? raw.filter((t): t is string => typeof t === "string") : [];
}

function Section({
  index,
  reduceMotion,
  title,
  icon,
  sub,
  action,
  children,
  className,
}: {
  index: number;
  reduceMotion: boolean;
  title: string;
  icon: React.ReactNode;
  sub?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.06, 0.3), duration: 0.4, ease: EASE }}
      className={cn("rounded-[1.6rem] bg-ink/[0.045] p-5", className)}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-ink flex items-center gap-2">
            <span className="text-brand">{icon}</span> {title}
          </h2>
          {sub && <p className="text-xs text-ink/50 mt-1">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </motion.section>
  );
}

function FillInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      {...rest}
      className={cn(
        "w-full rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-ink",
        "placeholder:text-ink/30 placeholder:font-normal",
        "focus:outline-none focus:ring-2 focus:ring-brand/40 transition-shadow",
        "disabled:opacity-60",
        className,
      )}
    />
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/45 mb-1.5">
      {children}
    </span>
  );
}

type DetailTab = "overview" | "orders" | "bookings" | "messages";

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const reduceMotion = useReducedMotion();
  const confirmAction = useConfirm();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<string[]>(["products", "bookings"]);
  const [dtab, setDtab] = useState<DetailTab>("overview");
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [savingTags, setSavingTags] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    label: "",
    line1: "",
    city: "",
    state: "",
    pincode: "",
    landmark: "",
    isDefault: false,
  });
  const [savingAddress, setSavingAddress] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [detail, profile] = await Promise.all([
          getCustomer(id),
          getOnboarding().catch(() => null),
        ]);
        if (cancelled) return;
        setCustomer(detail);
        setNotes(detail.notes ?? "");
        setTags(tagsOf(detail));
        if (profile && profile.enabledModules.length > 0) {
          setModules(normalizeModules(profile.enabledModules));
        }
      } catch {
        if (!cancelled) toast.error("Failed to load customer");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const saveNotes = async () => {
    if (!customer) return;
    setSavingNotes(true);
    try {
      const updated = await updateCustomer(customer.id, { notes });
      setCustomer({ ...customer, notes: updated.notes });
      toast.success("Notes saved");
    } catch {
      toast.error("Could not save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  const saveTags = async (next: string[]) => {
    if (!customer) return;
    setTags(next);
    setSavingTags(true);
    try {
      const updated = await updateCustomer(customer.id, {
        customFields: { ...((customer.customFields as Record<string, unknown> | null) ?? {}), tags: next },
      });
      setCustomer({ ...customer, customFields: updated.customFields });
      toast.success("Tags updated");
    } catch {
      setTags(tagsOf(customer));
      toast.error("Could not save tags");
    } finally {
      setSavingTags(false);
    }
  };

  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    setSavingAddress(true);
    try {
      const address = await addCustomerAddress(customer.id, {
        label: addressForm.label || undefined,
        line1: addressForm.line1,
        city: addressForm.city,
        state: addressForm.state || undefined,
        pincode: addressForm.pincode,
        landmark: addressForm.landmark || undefined,
        isDefault: addressForm.isDefault,
      });
      setCustomer({ ...customer, addresses: [address, ...customer.addresses] });
      setShowAddressForm(false);
      setAddressForm({
        label: "",
        line1: "",
        city: "",
        state: "",
        pincode: "",
        landmark: "",
        isDefault: false,
      });
      toast.success("Address saved");
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Could not save address";
      toast.error(msg);
    } finally {
      setSavingAddress(false);
    }
  };

  const removeAddress = async (addressId: string) => {
    if (!customer) return;
    const ok = await confirmAction({
      title: "Delete this address?",
      body: "Orders and bookings that already use it keep their snapshot.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await deleteCustomerAddress(customer.id, addressId);
      setCustomer({
        ...customer,
        addresses: customer.addresses.filter((a) => a.id !== addressId),
      });
      toast.success("Address deleted");
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Could not delete address";
      toast.error(msg);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-3">
        <div className="h-16 rounded-[1.4rem] bg-ink/[0.05] animate-pulse" />
        <div className="grid md:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-56 rounded-[1.6rem] bg-ink/[0.05] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6 max-w-6xl mx-auto text-center py-24">
        <p className="font-semibold text-ink">Customer not found</p>
        <p className="text-sm text-ink/50 mt-1 mb-5">
          It may have been deleted or belongs to another business.
        </p>
        <Link
          href="/customers"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-white hover:bg-brand transition-colors"
        >
          <ArrowLeft className="size-4" /> Back to customers
        </Link>
      </div>
    );
  }

  const showOrders = modules.includes("products");
  const showBookings = modules.includes("bookings");

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="relative p-6 max-w-6xl mx-auto space-y-5"
    >
      {!reduceMotion && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-0 size-72 rounded-full bg-brand/10 blur-[110px]"
          animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Header */}
      <div className="relative flex items-center gap-4 flex-wrap">
        <Link
          href="/customers"
          aria-label="Back to customers"
          className="size-9 rounded-full flex items-center justify-center text-ink/60 hover:text-ink hover:bg-ink/[0.06] transition-colors shrink-0"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <motion.span
          initial={reduceMotion ? false : { scale: 0.7 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="size-13 rounded-full bg-ink text-white flex items-center justify-center text-lg font-bold shrink-0"
        >
          {(customer.name ?? customer.phone)?.charAt(0).toUpperCase()}
        </motion.span>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink truncate">
            {customer.name ?? "Unknown customer"}
          </h1>
          <p className="text-[13px] text-ink/55 flex items-center gap-1.5 tabular-nums">
            <Phone className="size-3.5" /> {customer.phone}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="rounded-full bg-ink/[0.06] px-2.5 py-1 text-[11px] font-semibold text-ink/60 tabular-nums">
            {customer._count.orders} orders
          </span>
          <span className="hidden sm:inline rounded-full bg-ink/[0.06] px-2.5 py-1 text-[11px] font-semibold text-ink/60 tabular-nums">
            {customer._count.bookings} bookings
          </span>
          <Link
            href={`/customers/${customer.id}/edit`}
            className="h-9 ml-1 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-medium text-white hover:bg-brand transition-colors"
          >
            <Pencil className="size-3.5" /> Edit
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="relative">
        <SlidePills
          id="customer-detail"
          size="sm"
          value={dtab}
          onChange={setDtab}
          options={[
            { value: "overview", label: "Overview" },
            ...(showOrders ? [{ value: "orders" as DetailTab, label: "Orders" }] : []),
            ...(showBookings ? [{ value: "bookings" as DetailTab, label: "Bookings" }] : []),
            { value: "messages", label: "Messages" },
          ]}
        />
      </div>

      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={dtab}
            initial={reduceMotion ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            {dtab === "overview" && (
              <div className="space-y-3">
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                  <Section index={0} reduceMotion={!!reduceMotion} title="Contact" icon={<User className="size-4" />}>
                    <dl className="space-y-2.5 text-sm">
                      {[
                        ["Name", customer.name ?? "—"],
                        ["Phone", customer.phone],
                        ["Email", customer.email ?? "—"],
                        ["Customer since", new Date(customer.createdAt).toLocaleDateString()],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-3">
                          <dt className="text-ink/50">{k}</dt>
                          <dd className="font-medium text-ink text-right break-all">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </Section>

                  <Section
                    index={1}
                    reduceMotion={!!reduceMotion}
                    title="Notes"
                    icon={<StickyNote className="size-4" />}
                    sub="Visible to your team when fulfilling."
                  >
                    <textarea
                      rows={4}
                      placeholder="Preferences, allergies, VIP flags…"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-2xl bg-white px-4 py-3 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-brand/40 resize-none transition-shadow"
                    />
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={saveNotes}
                      disabled={savingNotes}
                      className="mt-2.5 h-10 inline-flex items-center rounded-full bg-ink px-5 text-[13px] font-medium text-white hover:bg-brand transition-colors disabled:opacity-50"
                    >
                      {savingNotes ? "Saving…" : "Save notes"}
                    </motion.button>
                  </Section>

                  <Section
                    index={2}
                    reduceMotion={!!reduceMotion}
                    title="Tags"
                    icon={<Tag className="size-4" />}
                    sub="Taps save instantly."
                    className="md:col-span-2 xl:col-span-1"
                  >
                    <div className="flex flex-wrap gap-1.5">
                      {TAG_PRESETS.map((t) => {
                        const on = tags.includes(t);
                        return (
                          <button
                            key={t}
                            type="button"
                            disabled={savingTags}
                            onClick={() => saveTags(on ? tags.filter((x) => x !== t) : [...tags, t])}
                            aria-pressed={on}
                            className={cn(
                              "text-xs px-2.5 py-1.5 rounded-full font-medium transition-colors disabled:opacity-50",
                              on ? "bg-ink text-white" : "bg-white text-ink/60 hover:text-ink",
                            )}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                    {tags.length > 0 && (
                      <p className="text-[11px] text-ink/45 mt-2 tabular-nums">
                        {tags.length} tag{tags.length === 1 ? "" : "s"}
                      </p>
                    )}
                  </Section>
                </div>

                <Section
                  index={3}
                  reduceMotion={!!reduceMotion}
                  title="Saved addresses"
                  icon={<MapPin className="size-4" />}
                  sub="Only ever used when explicitly chosen."
                  action={
                    <button
                      onClick={() => setShowAddressForm((v) => !v)}
                      className="h-9 inline-flex items-center gap-1 rounded-full bg-white px-3.5 text-xs font-semibold text-ink hover:bg-ink hover:text-white transition-colors"
                    >
                      <Plus className="size-3.5" /> Add
                    </button>
                  }
                >
                  <AnimatePresence initial={false}>
                    {showAddressForm && (
                      <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={saveAddress}
                        className="overflow-hidden"
                      >
                        <div className="rounded-2xl bg-white p-4 grid sm:grid-cols-2 gap-3 mb-3">
                          <div>
                            <FieldLabel>Label</FieldLabel>
                            <FillInput
                              placeholder="Home / Work"
                              value={addressForm.label}
                              onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                            />
                          </div>
                          <div>
                            <FieldLabel>Pincode *</FieldLabel>
                            <FillInput
                              required
                              inputMode="numeric"
                              placeholder="400001"
                              value={addressForm.pincode}
                              onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <FieldLabel>Street address *</FieldLabel>
                            <FillInput
                              required
                              value={addressForm.line1}
                              onChange={(e) => setAddressForm({ ...addressForm, line1: e.target.value })}
                            />
                          </div>
                          <div>
                            <FieldLabel>City *</FieldLabel>
                            <FillInput
                              required
                              value={addressForm.city}
                              onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                            />
                          </div>
                          <div>
                            <FieldLabel>Landmark</FieldLabel>
                            <FillInput
                              value={addressForm.landmark}
                              onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <motion.button
                              whileTap={{ scale: 0.97 }}
                              type="submit"
                              disabled={savingAddress}
                              className="h-10 inline-flex items-center rounded-full bg-ink px-5 text-[13px] font-medium text-white hover:bg-brand transition-colors disabled:opacity-50"
                            >
                              {savingAddress ? "Saving…" : "Save address"}
                            </motion.button>
                          </div>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>
                  {customer.addresses.length === 0 ? (
                    <EmptyState
                      icon={<MapPin className="size-5" />}
                      title="No saved addresses"
                      blurb="Addresses collected during orders or home visits can be saved here."
                    />
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-2">
                      {customer.addresses.map((a) => (
                        <div key={a.id} className="rounded-2xl bg-white p-3.5 flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-ink flex items-center gap-2">
                              {a.label || "Address"}
                              {a.isDefault && (
                                <span className="rounded-full bg-brand/15 text-brand-deep px-2 py-px text-[10px]">
                                  Default
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-ink/55 mt-1">{formatAddress(a)}</p>
                          </div>
                          <button
                            aria-label="Delete address"
                            onClick={() => removeAddress(a.id)}
                            className="flex size-7 items-center justify-center rounded-full text-ink/45 hover:text-red-600 hover:bg-red-500/10 transition-colors shrink-0"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              </div>
            )}

            {dtab === "orders" && showOrders && (
              <Section index={0} reduceMotion={!!reduceMotion} title="Orders" icon={<ShoppingBag className="size-4" />} sub={`${customer.orders.length} total`}>
                {customer.orders.length === 0 ? (
                  <EmptyState
                    icon={<ShoppingBag className="size-5" />}
                    title="No orders yet"
                    blurb="Product orders placed over WhatsApp or the dashboard appear here."
                  />
                ) : (
                  <div className="space-y-2">
                    {customer.orders.map((o) => (
                      <div key={o.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{o.productName}</p>
                          <p className="text-xs text-ink/50 tabular-nums">
                            {new Date(o.purchaseDate).toLocaleDateString()}
                            {o.amount != null ? ` · ₹${o.amount}` : ""}
                          </p>
                        </div>
                        <StatusBadge status={o.status} />
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            )}

            {dtab === "bookings" && showBookings && (
              <Section index={0} reduceMotion={!!reduceMotion} title="Bookings" icon={<CalendarCheck className="size-4" />} sub={`${customer.bookings.length} total`}>
                {customer.bookings.length === 0 ? (
                  <EmptyState
                    icon={<CalendarCheck className="size-5" />}
                    title="No bookings yet"
                    blurb="Appointments, table bookings and home visits appear here."
                  />
                ) : (
                  <div className="space-y-2">
                    {customer.bookings.map((b) => {
                      const who = b.allocations
                        .map((a) => a.staff?.name ?? a.resource?.name)
                        .filter(Boolean)
                        .join(", ");
                      return (
                        <div key={b.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink truncate">
                              {b.service?.name ?? "Booking"}
                              {b.partySize ? ` · ${b.partySize} guests` : ""}
                              {b.locationMode === "AT_CUSTOMER" ? " 🏠" : ""}
                            </p>
                            <p className="text-xs text-ink/50 tabular-nums">
                              {new Date(b.startTime).toLocaleString()}
                              {who ? ` · ${who}` : ""}
                            </p>
                          </div>
                          <StatusBadge status={b.status} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </Section>
            )}

            {dtab === "messages" && (
              <Section index={0} reduceMotion={!!reduceMotion} title="Messages" icon={<MessageCircle className="size-4" />} sub="WhatsApp thread, newest last">
                {customer.messages.length === 0 ? (
                  <EmptyState
                    icon={<MessageCircle className="size-5" />}
                    title="No message history"
                    blurb="WhatsApp conversations with this customer will appear here."
                  />
                ) : (
                  <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                    {customer.messages.map((m) => (
                      <div
                        key={m.id}
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                          m.direction === "OUTBOUND"
                            ? "ml-auto bg-ink text-white rounded-br-md"
                            : "bg-white text-ink rounded-bl-md",
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.body ?? `(${m.type})`}</p>
                        <p className={cn("text-[10px] mt-1 tabular-nums", m.direction === "OUTBOUND" ? "text-white/60" : "text-ink/45")}>
                          {new Date(m.createdAt).toLocaleString()} · {m.status}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
