"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { NumberTicker } from "@/components/bits/NumberTicker";
import { SlidePills } from "@/components/bits/SlidePills";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  PackageX,
  RefreshCw,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Users,
  Wallet,
} from "lucide-react";
import { useAppSelector } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ─── Types (all new fields optional — backend extends additively) ────────────

interface DashboardData {
  metrics: {
    totalSales: number;
    totalRevenue: number;
    messagesCount: number;
    productsCount: number;
    appointmentsCount: number;
    integrationsCount: number;
    customersCount: number;
  };
  weeklySales: { day: string; revenue: number; orders: number; date: string }[];
  monthlySales: { month: string; earning: number; orders: number }[];
  orderStatus: { status: string; count: number; amount: number }[];
  topProducts: { name: string; orders: number; revenue: number }[];
  recentOrders: {
    id: string;
    productName: string;
    amount: number;
    status: string;
    createdAt: string;
    customer?: { name: string; phone: string } | null;
  }[];
  recentCustomers: { id: string; name: string; phone: string; createdAt: string }[];
  upcomingAppointments: {
    id: string;
    customerName?: string;
    startTime: string;
    status: string;
    service?: { name: string } | null;
  }[];
  today?: { revenue: number; orders: number; bookings: number; revenueDeltaPct: number };
  period?: { weekRevenue: number; monthRevenue: number };
  newCustomersWeek?: number;
  unpaidAmount?: number;
  pendingOrders?: {
    id: string;
    productName: string;
    amount: number;
    createdAt: string;
    customerName: string | null;
  }[];
  lowStock?: { id: string; name: string; stock: number }[];
  todaysBookings?: {
    id: string;
    customerName: string;
    startTime: string;
    endTime: string;
    status: string;
    serviceName: string | null;
  }[];
  bookingsByStatus?: { status: string; count: number }[];
}

// ─── INR ─────────────────────────────────────────────────────────────────────

const inr0 = (n: number = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

const inrShort = (n: number = 0) => {
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return inr0(n);
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function timeHM(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const EASE = [0.22, 1, 0.36, 1] as const;

const STATUS_COLORS: Record<string, string> = {
  PAID: "#178a4c",
  COMPLETED: "#0c2b1d",
  PENDING: "#d97706",
  CANCELLED: "#dc2626",
  CONFIRMED: "#2563eb",
  NO_SHOW: "#71717a",
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const reduceMotion = useReducedMotion();
  const { user } = useAppSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [range, setRange] = useState<"week" | "month">("week");
  const [nowTick] = useState(() => Date.now());

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await api.get("/dashboard/stats");
      const payload = res.data?.success ? res.data.data : (res.data ?? null);
      if (payload) setData(payload);
    } catch {
      toast.error("Could not load dashboard stats");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get("/dashboard/stats");
        const payload = res.data?.success ? res.data.data : (res.data ?? null);
        if (payload && !cancelled) setData(payload);
      } catch {
        if (!cancelled) toast.error("Could not load dashboard stats");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const today = data?.today;
  const delta = today?.revenueDeltaPct ?? 0;
  const deltaUp = delta >= 0;

  const chartData = useMemo(
    () =>
      range === "week"
        ? (data?.weeklySales ?? []).map((d) => ({ label: d.day, revenue: d.revenue, orders: d.orders }))
        : (data?.monthlySales ?? []).map((m) => ({ label: m.month, revenue: m.earning, orders: m.orders })),
    [data, range],
  );

  const chartTotal = useMemo(
    () => chartData.reduce((s, d) => s + (d.revenue || 0), 0),
    [chartData],
  );

  const donutData = useMemo(
    () => (data?.orderStatus ?? []).filter((s) => s.count > 0),
    [data],
  );

  const pending = useMemo(() => data?.pendingOrders ?? [], [data]);
  const lowStock = useMemo(() => data?.lowStock ?? [], [data]);
  const todays = useMemo(() => data?.todaysBookings ?? [], [data]);
  const attentionCount = pending.length + lowStock.length;

  const nextBooking = useMemo(() => {
    return todays.find((b) => new Date(b.startTime).getTime() >= nowTick - 30 * 60000) ?? null;
  }, [todays, nowTick]);

  return (
    <div className="relative p-6 max-w-7xl mx-auto space-y-5">
      {!reduceMotion && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-0 size-72 rounded-full bg-brand/10 blur-[110px]"
          animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Header */}
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="relative flex flex-col lg:flex-row lg:items-end gap-4"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
            {todayLabel}
          </p>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] text-ink mt-1">
            {greeting()}, {firstName}
          </h1>
          <p className="text-[15px] text-ink/55 mt-1.5">
            {attentionCount > 0
              ? `${attentionCount} thing${attentionCount === 1 ? "" : "s"} need${attentionCount === 1 ? "s" : ""} your eye today.`
              : "Everything's quiet — a good day to grow."}
          </p>
        </div>
        <div className="flex items-center gap-2 lg:ml-auto">
          <SlidePills
            id="dashboard-range"
            size="sm"
            value={range}
            onChange={setRange}
            options={[
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
            ]}
          />
          <button
            onClick={() => load(true)}
            disabled={loading || refreshing}
            aria-label="Refresh stats"
            className="rounded-full size-9 shrink-0 flex items-center justify-center bg-ink/[0.05] text-ink/60 hover:text-ink hover:bg-ink/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
          </button>
        </div>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 rounded-[1.4rem] bg-ink/[0.045] animate-pulse" />
          ))}
          <div className="h-72 rounded-[1.6rem] bg-ink/[0.045] animate-pulse col-span-2 lg:col-span-4" />
        </div>
      ) : (
        <>
          {/* KPI tiles */}
          <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Revenue hero */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE }}
              className="col-span-2 rounded-[1.6rem] bg-ink text-white p-5 overflow-hidden"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55 flex items-center gap-1.5">
                    <Wallet className="size-3.5" /> Revenue today
                  </p>
                  <p className="text-4xl font-semibold tracking-tight tabular-nums mt-2">
                    ₹<NumberTicker value={Math.round(today?.revenue ?? 0)} />
                  </p>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 mt-2 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums",
                      deltaUp ? "bg-brand/25 text-emerald-300" : "bg-red-500/20 text-red-300",
                    )}
                  >
                    {deltaUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                    {deltaUp ? "+" : ""}{delta}% vs yesterday
                  </span>
                </div>
                <div className="hidden sm:block w-36 h-20 shrink-0 -mr-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
                      <defs>
                        <linearGradient id="dbSpark" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#178a4c" stopOpacity={0.7} />
                          <stop offset="100%" stopColor="#178a4c" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#4ade80"
                        strokeWidth={2}
                        fill="url(#dbSpark)"
                        isAnimationActive={!reduceMotion}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <p className="text-xs text-white/50 mt-2 tabular-nums">
                {inrShort(data?.period?.weekRevenue)} this week · {inrShort(data?.period?.monthRevenue)} this month
              </p>
            </motion.div>

            <KpiTile
              index={1}
              reduceMotion={!!reduceMotion}
              label="Orders today"
              icon={<ShoppingBag className="size-4" />}
              value={today?.orders ?? 0}
              sub={(data?.unpaidAmount ?? 0) > 0 ? `${inrShort(data?.unpaidAmount)} awaiting payment` : "All collected"}
              href="/customers"
            />
            <KpiTile
              index={2}
              reduceMotion={!!reduceMotion}
              label="Bookings today"
              icon={<CalendarCheck className="size-4" />}
              value={today?.bookings ?? todays.length}
              sub={nextBooking ? `Next ${timeHM(nextBooking.startTime)} · ${nextBooking.customerName}` : "Nothing scheduled"}
              href="/calendar"
            />
          </div>

          {/* Customers strip */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08, ease: EASE }}
            className="relative flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[1.4rem] bg-ink/[0.045] px-5 py-3.5"
          >
            <span className="flex items-center gap-2 text-sm text-ink/60">
              <Users className="size-4 text-brand" />
              <span className="font-semibold text-ink tabular-nums">{data?.newCustomersWeek ?? 0}</span>
              new this week
            </span>
            <span className="text-sm text-ink/60">
              <span className="font-semibold text-ink tabular-nums">{data?.metrics.customersCount ?? 0}</span> total customers
            </span>
            <span className="text-sm text-ink/60">
              <span className="font-semibold text-ink tabular-nums">{data?.metrics.messagesCount ?? 0}</span> WhatsApp messages
            </span>
            <Link
              href="/customers"
              className="ml-auto inline-flex items-center gap-1 text-[13px] font-semibold text-ink hover:text-brand transition-colors"
            >
              View customers <ArrowRight className="size-3.5" />
            </Link>
          </motion.div>

          {/* Revenue chart + donut */}
          <div className="relative grid grid-cols-12 gap-3">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1, ease: EASE }}
              className="col-span-12 xl:col-span-8 rounded-[1.6rem] bg-ink/[0.045] p-5"
            >
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-ink">Revenue</h2>
                  <p className="text-xs text-ink/50">
                    {range === "week" ? "Last 7 days" : "Last 12 months"}
                  </p>
                </div>
                <p className="text-2xl font-semibold tracking-tight tabular-nums text-ink">
                  {inrShort(chartTotal)}
                </p>
              </div>
              <div className="h-60 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="dbRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#14160f" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#14160f" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "rgba(20,22,15,0.45)" }}
                      dy={6}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={52}
                      tick={{ fontSize: 11, fill: "rgba(20,22,15,0.45)" }}
                      tickFormatter={(v: number) => inrShort(v)}
                    />
                    <Tooltip
                      content={<RevenueTip />}
                      cursor={{ stroke: "rgba(20,22,15,0.2)", strokeWidth: 1 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#14160f"
                      strokeWidth={2.5}
                      fill="url(#dbRevenue)"
                      isAnimationActive={!reduceMotion}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.16, ease: EASE }}
              className="col-span-12 xl:col-span-4 rounded-[1.6rem] bg-ink/[0.045] p-5 flex flex-col"
            >
              <h2 className="text-base font-semibold tracking-tight text-ink">Orders by status</h2>
              <p className="text-xs text-ink/50">Where every order stands</p>
              {donutData.length === 0 ? (
                <p className="text-sm text-ink/45 py-10 text-center">No orders yet</p>
              ) : (
                <div className="relative h-48 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        dataKey="count"
                        nameKey="status"
                        innerRadius={58}
                        outerRadius={82}
                        paddingAngle={3}
                        cornerRadius={6}
                        strokeWidth={0}
                        isAnimationActive={!reduceMotion}
                      >
                        {donutData.map((s) => (
                          <Cell key={s.status} fill={STATUS_COLORS[s.status] ?? "#71717a"} />
                        ))}
                      </Pie>
                      <Tooltip content={<DonutTip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-2xl font-semibold tabular-nums text-ink">
                      {donutData.reduce((s, d) => s + d.count, 0)}
                    </p>
                    <p className="text-[11px] text-ink/50">orders</p>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                {donutData.map((s) => (
                  <span key={s.status} className="flex items-center gap-1.5 text-xs text-ink/60">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[s.status] ?? "#71717a" }}
                    />
                    {s.status} · <span className="font-semibold text-ink tabular-nums">{s.count}</span>
                  </span>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Action row */}
          <div className="relative grid grid-cols-12 gap-3">
            {/* Needs attention */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.2, ease: EASE }}
              className="col-span-12 lg:col-span-4 rounded-[1.6rem] bg-ink text-white p-5"
            >
              <h2 className="text-base font-semibold tracking-tight flex items-center gap-2">
                <TriangleAlert className="size-4 text-amber-400" /> Needs attention
              </h2>
              <p className="text-xs text-white/55 mt-0.5">Money and stock left on the table</p>
              <div className="mt-4 space-y-2">
                {pending.slice(0, 3).map((o) => (
                  <Link
                    key={o.id}
                    href="/customers"
                    className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.07] hover:bg-white/[0.12] transition-colors px-3.5 py-2.5"
                  >
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium truncate">
                        {o.productName}
                      </span>
                      <span className="block text-[11px] text-white/55 truncate">
                        {o.customerName ?? "Guest"} · collect payment
                      </span>
                    </span>
                    <span className="text-[13px] font-semibold tabular-nums shrink-0">
                      {inr0(o.amount)}
                    </span>
                  </Link>
                ))}
                {lowStock.slice(0, 2).map((p) => (
                  <Link
                    key={p.id}
                    href="/products"
                    className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.07] hover:bg-white/[0.12] transition-colors px-3.5 py-2.5"
                  >
                    <span className="min-w-0 flex items-center gap-2">
                      <PackageX className="size-4 text-amber-400 shrink-0" />
                      <span className="text-[13px] font-medium truncate">{p.name}</span>
                    </span>
                    <span className="text-[11px] font-semibold text-amber-300 shrink-0 tabular-nums">
                      {p.stock} left
                    </span>
                  </Link>
                ))}
                {pending.length === 0 && lowStock.length === 0 && (
                  <p className="text-[13px] text-white/55 py-4 text-center">
                    Nothing pending — nicely run. ✨
                  </p>
                )}
              </div>
            </motion.div>

            {/* Today's bookings */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.24, ease: EASE }}
              className="col-span-12 lg:col-span-4 rounded-[1.6rem] bg-ink/[0.045] p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-ink">Today&apos;s lineup</h2>
                  <p className="text-xs text-ink/50">{todays.length} booking{todays.length === 1 ? "" : "s"}</p>
                </div>
                <Link
                  href="/calendar"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-ink hover:text-brand transition-colors"
                >
                  Calendar <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
              <div className="mt-3 space-y-2">
                {todays.length === 0 && (
                  <p className="text-[13px] text-ink/45 py-6 text-center">
                    A quiet day — no bookings on the books.
                  </p>
                )}
                {todays.slice(0, 4).map((b) => (
                  <div key={b.id} className="flex items-center gap-3 rounded-2xl bg-white px-3.5 py-2.5">
                    <span className="text-[13px] font-bold tabular-nums text-ink shrink-0 w-16">
                      {timeHM(b.startTime)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-ink truncate">
                        {b.customerName}
                      </span>
                      <span className="block text-[11px] text-ink/50 truncate">
                        {b.serviceName ?? "Booking"}
                      </span>
                    </span>
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{ backgroundColor: STATUS_COLORS[b.status] ?? "#71717a" }}
                    />
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Top products */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.28, ease: EASE }}
              className="col-span-12 lg:col-span-4 rounded-[1.6rem] bg-ink/[0.045] p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-ink">Top sellers</h2>
                  <p className="text-xs text-ink/50">By revenue, all time</p>
                </div>
                <Link
                  href="/products"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-ink hover:text-brand transition-colors"
                >
                  Catalog <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
              {(data?.topProducts ?? []).length === 0 ? (
                <p className="text-[13px] text-ink/45 py-6 text-center">
                  No sales recorded yet.
                </p>
              ) : (
                <div className="mt-3 space-y-2.5">
                  {(data?.topProducts ?? []).slice(0, 4).map((p, i, arr) => {
                    const max = arr[0]?.revenue || 1;
                    return (
                      <div key={p.name}>
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-[13px] font-medium text-ink truncate">
                            <span className="text-ink/35 font-bold mr-1.5 tabular-nums">{i + 1}</span>
                            {p.name}
                          </p>
                          <p className="text-[13px] font-semibold tabular-nums text-ink shrink-0">
                            {inrShort(p.revenue)}
                          </p>
                        </div>
                        <div className="h-1.5 rounded-full bg-ink/10 mt-1.5 overflow-hidden">
                          <motion.div
                            initial={reduceMotion ? false : { width: 0 }}
                            animate={{ width: `${Math.max(6, (p.revenue / max) * 100)}%` }}
                            transition={{ duration: 0.7, delay: 0.3 + i * 0.08, ease: EASE }}
                            className="h-full rounded-full bg-gradient-to-r from-brand to-ink"
                          />
                        </div>
                        <p className="text-[11px] text-ink/45 mt-1 tabular-nums">{p.orders} orders</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>

          {/* Recent orders */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.32, ease: EASE }}
            className="relative rounded-[1.6rem] bg-ink/[0.045] p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-ink">Recent orders</h2>
                <p className="text-xs text-ink/50">Latest transactions across channels</p>
              </div>
              <Link
                href="/customers"
                className="inline-flex items-center gap-1 text-xs font-semibold text-ink hover:text-brand transition-colors"
              >
                All customers <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
            {(data?.recentOrders ?? []).length === 0 ? (
              <p className="text-[13px] text-ink/45 py-6 text-center">No orders yet.</p>
            ) : (
              <div className="mt-3 grid md:grid-cols-2 gap-2">
                <AnimatePresence initial={false}>
                  {(data?.recentOrders ?? []).slice(0, 6).map((o) => (
                    <motion.div
                      key={o.id}
                      layout
                      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3"
                    >
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium text-ink truncate">
                          {o.productName}
                        </span>
                        <span className="block text-[11px] text-ink/50 truncate">
                          {o.customer?.name || o.customer?.phone || "Guest"} ·{" "}
                          {new Date(o.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      </span>
                      <span className="text-right shrink-0">
                        <span className="block text-[13px] font-semibold tabular-nums text-ink">
                          {inr0(o.amount)}
                        </span>
                        <span
                          className="inline-block mt-0.5 rounded-full px-2 py-px text-[10px] font-semibold"
                          style={{
                            backgroundColor: `${STATUS_COLORS[o.status] ?? "#71717a"}1a`,
                            color: STATUS_COLORS[o.status] ?? "#71717a",
                          }}
                        >
                          {o.status}
                        </span>
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}

function TipShell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-ink text-white px-3.5 py-2.5 text-xs min-w-28">
      <p className="font-semibold mb-1">{label}</p>
      {children}
    </div>
  );
}

function RevenueTip(props: {
  active?: boolean;
  label?: string | number;
  payload?: { value?: number | string; payload?: { revenue?: number; orders?: number } }[];
}) {
  if (!props.active || !props.payload?.length) return null;
  const row = props.payload[0]?.payload;
  return (
    <TipShell label={String(props.label ?? "")}>
      <p className="tabular-nums">{inr0(row?.revenue)}</p>
      <p className="text-white/60 tabular-nums">{row?.orders ?? 0} orders</p>
    </TipShell>
  );
}

function DonutTip(props: {
  active?: boolean;
  payload?: { value?: number | string; payload?: { status?: string; count?: number; amount?: number } }[];
}) {
  if (!props.active || !props.payload?.length) return null;
  const row = props.payload[0]?.payload;
  return (
    <TipShell label={row?.status ?? ""}>
      <p className="tabular-nums">
        {row?.count ?? 0} orders · {inrShort(row?.amount)}
      </p>
    </TipShell>
  );
}

function KpiTile({  index,
  reduceMotion,
  label,
  icon,
  value,
  sub,
  href,
}: {
  index: number;
  reduceMotion: boolean;
  label: string;
  icon: React.ReactNode;
  value: number;
  sub: string;
  href: string;
}) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.04 * index, ease: EASE }}
    >
      <Link
        href={href}
        className="block rounded-[1.4rem] bg-ink/[0.045] hover:bg-ink/[0.07] transition-colors p-5 h-full"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50 flex items-center gap-1.5">
          <span className="text-brand">{icon}</span> {label}
        </p>
        <p className="text-3xl font-semibold tracking-tight tabular-nums text-ink mt-2">
          <NumberTicker value={value} />
        </p>
        <p className="text-xs text-ink/50 mt-1.5 truncate">{sub}</p>
      </Link>
    </motion.div>
  );
}
