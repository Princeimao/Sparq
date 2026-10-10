"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
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
  Trash2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
    <Badge
      variant="outline"
      className={cn("text-[10px]", STATUS_STYLES[status] ?? "bg-muted text-muted-foreground")}
    >
      {status.replace(/_/g, " ")}
    </Badge>
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
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-3 rounded-full bg-muted/60 text-muted-foreground mb-3">
        {icon}
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">{blurb}</p>
    </div>
  );
}

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const reduceMotion = useReducedMotion();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<string[]>(["products", "bookings"]);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [detail, profile] = await Promise.all([
        getCustomer(id),
        getOnboarding().catch(() => null),
      ]);
      setCustomer(detail);
      setNotes(detail.notes ?? "");
      if (profile && profile.enabledModules.length > 0) {
        setModules(normalizeModules(profile.enabledModules));
      }
    } catch {
      toast.error("Failed to load customer");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

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
    if (!customer || !confirm("Delete this saved address?")) return;
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
      <div className="p-6 max-w-6xl mx-auto space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid md:grid-cols-3 gap-4">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl md:col-span-2" />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6 max-w-6xl mx-auto text-center py-24">
        <p className="font-medium">Customer not found</p>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          It may have been deleted or belongs to another business.
        </p>
        <Button asChild variant="outline">
          <Link href="/customers">
            <ArrowLeft className="size-4 mr-2" /> Back to customers
          </Link>
        </Button>
      </div>
    );
  }

  const showOrders = modules.includes("products");
  const showBookings = modules.includes("bookings");

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 max-w-6xl mx-auto space-y-6"
    >
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" aria-label="Back to customers">
          <Link href="/customers">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <span className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold shrink-0">
          {(customer.name ?? customer.phone)?.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight truncate">
            {customer.name ?? "Unknown customer"}
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Phone className="size-3.5" /> {customer.phone}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <Badge variant="secondary">{customer._count.orders} orders</Badge>
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {customer._count.bookings} bookings
          </Badge>
          <Button asChild size="sm" className="rounded-full">
            <Link href={`/customers/${customer.id}/edit`}>
              <Pencil className="size-3.5 mr-1" /> Edit
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {showOrders && <TabsTrigger value="orders">Orders</TabsTrigger>}
          {showBookings && <TabsTrigger value="bookings">Bookings</TabsTrigger>}
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="size-4 text-primary" /> Contact details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{customer.name ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone / WhatsApp</span>
                  <span className="font-medium font-mono text-xs">{customer.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{customer.email ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer since</span>
                  <span className="font-medium">
                    {new Date(customer.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <StickyNote className="size-4 text-amber-500" /> Notes
                </CardTitle>
                <CardDescription>
                  Visible to your team when fulfilling bookings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  rows={4}
                  placeholder="Preferences, allergies, VIP flags…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <Button size="sm" onClick={saveNotes} disabled={savingNotes}>
                  {savingNotes ? "Saving…" : "Save notes"}
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="size-4 text-emerald-500" /> Saved addresses
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddressForm((v) => !v)}
                >
                  <Plus className="size-3.5 mr-1.5" /> Add
                </Button>
              </div>
              <CardDescription>
                Saved for convenience — an order or visit always uses an
                explicitly chosen address.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {showAddressForm && (
                <form
                  onSubmit={saveAddress}
                  className="rounded-xl border p-4 grid sm:grid-cols-2 gap-3"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="addr-label">Label</Label>
                    <Input
                      id="addr-label"
                      placeholder="Home / Work"
                      value={addressForm.label}
                      onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="addr-pin">Pincode *</Label>
                    <Input
                      id="addr-pin"
                      required
                      inputMode="numeric"
                      placeholder="400001"
                      value={addressForm.pincode}
                      onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="addr-line">Street address *</Label>
                    <Input
                      id="addr-line"
                      required
                      value={addressForm.line1}
                      onChange={(e) => setAddressForm({ ...addressForm, line1: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="addr-city">City *</Label>
                    <Input
                      id="addr-city"
                      required
                      value={addressForm.city}
                      onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="addr-land">Landmark</Label>
                    <Input
                      id="addr-land"
                      value={addressForm.landmark}
                      onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" size="sm" disabled={savingAddress}>
                      {savingAddress ? "Saving…" : "Save address"}
                    </Button>
                  </div>
                </form>
              )}
              {customer.addresses.length === 0 ? (
                <EmptyState
                  icon={<MapPin className="size-5" />}
                  title="No saved addresses"
                  blurb="Addresses collected during orders or home visits can be saved here."
                />
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {customer.addresses.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-xl border p-3.5 flex items-start gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold flex items-center gap-2">
                          {a.label || "Address"}
                          {a.isDefault && (
                            <Badge variant="outline" className="text-[10px]">
                              Default
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatAddress(a)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 hover:bg-destructive/10 hover:text-destructive shrink-0"
                        aria-label="Delete address"
                        onClick={() => removeAddress(a.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {showOrders && (
          <TabsContent value="orders">
            <Card className="rounded-2xl">
              <CardContent className="pt-4">
                {customer.orders.length === 0 ? (
                  <EmptyState
                    icon={<ShoppingBag className="size-5" />}
                    title="No orders yet"
                    blurb="Product orders placed over WhatsApp or the dashboard appear here."
                  />
                ) : (
                  <div className="divide-y">
                    {customer.orders.map((o) => (
                      <div key={o.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-sm font-medium">{o.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(o.purchaseDate).toLocaleDateString()}
                            {o.amount != null ? ` · ₹${o.amount}` : ""}
                          </p>
                        </div>
                        <StatusBadge status={o.status} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {showBookings && (
          <TabsContent value="bookings">
            <Card className="rounded-2xl">
              <CardContent className="pt-4">
                {customer.bookings.length === 0 ? (
                  <EmptyState
                    icon={<CalendarCheck className="size-5" />}
                    title="No bookings yet"
                    blurb="Appointments, table bookings and home visits appear here."
                  />
                ) : (
                  <div className="divide-y">
                    {customer.bookings.map((b) => {
                      const who = b.allocations
                        .map((a) => a.staff?.name ?? a.resource?.name)
                        .filter(Boolean)
                        .join(", ");
                      return (
                        <div key={b.id} className="flex items-center justify-between py-3 gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {b.service?.name ?? "Booking"}
                              {b.partySize ? ` · ${b.partySize} guests` : ""}
                              {b.locationMode === "AT_CUSTOMER" ? " 🏠" : ""}
                            </p>
                            <p className="text-xs text-muted-foreground">
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
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="messages">
          <Card className="rounded-2xl">
            <CardContent className="pt-4">
              {customer.messages.length === 0 ? (
                <EmptyState
                  icon={<MessageCircle className="size-5" />}
                  title="No message history"
                  blurb="WhatsApp conversations with this customer will appear here."
                />
              ) : (
                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                  {customer.messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                        m.direction === "OUTBOUND"
                          ? "ml-auto bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted rounded-bl-md",
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.body ?? `(${m.type})`}</p>
                      <p
                        className={cn(
                          "text-[10px] mt-1",
                          m.direction === "OUTBOUND"
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground",
                        )}
                      >
                        {new Date(m.createdAt).toLocaleString()} · {m.status}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
