"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import { useReducedMotion } from "framer-motion";
import { api } from "@/lib/api";
import { toast } from "sonner";
import SalesBlock, { MonthlySalesData } from "@/components/SalesBlock";
import EarningReportChart from "@/components/EarningBlock";
import { AnimatedList } from "@/components/bits/AnimatedList";
import { NumberTicker } from "@/components/bits/NumberTicker";
import {
  Loader2,
  RefreshCw,
  Users,
  MessageSquare,
  CalendarCheck,
  Wallet,
  ArrowUpRight,
  ShoppingBag,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppSelector } from "@/lib/store";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
  monthlySales: MonthlySalesData[];
  orderStatus: { status: string; count: number; amount: number }[];
  topProducts: { name: string; orders: number; revenue: number }[];
  recentOrders: {
    id: string;
    productName: string;
    amount: number;
    status: string;
    createdAt: string;
    customer?: { name: string; phone: string };
  }[];
  recentCustomers: {
    id: string;
    name: string;
    phone: string;
    createdAt: string;
  }[];
  upcomingAppointments: {
    id: string;
    customerName?: string;
    startTime: string;
    status: string;
    service?: { name: string } | null;
  }[];
}

const STATS = [
  {
    key: "totalRevenue",
    label: "Revenue",
    caption: "Paid orders",
    icon: Wallet,
    chip: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    money: true,
  },
  {
    key: "customersCount",
    label: "Customers",
    caption: "Across channels",
    icon: Users,
    chip: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    money: false,
  },
  {
    key: "appointmentsCount",
    label: "Bookings",
    caption: "All time",
    icon: CalendarCheck,
    chip: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    money: false,
  },
  {
    key: "messagesCount",
    label: "Messages",
    caption: "WhatsApp volume",
    icon: MessageSquare,
    chip: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
    money: false,
  },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const DashboardPage = () => {
  const reduceMotion = useReducedMotion();
  const { user } = useAppSelector((state) => state.auth);
  const rootRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [range, setRange] = useState<"week" | "month">("week");

  const fetchDashboardData = useCallback(async () => {
    const res = await api.get("/dashboard/stats");
    if (res.data?.success && res.data?.data) return res.data.data;
    if (res.data?.metrics) return res.data;
    return null;
  }, []);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const dashboardData = await fetchDashboardData();
        if (dashboardData) setData(dashboardData);
      } catch (error) {
        console.error("Failed to load dashboard statistics:", error);
        toast.error("Could not load dashboard stats");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchDashboardData],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Anime.js staggered entrance for cards + rows.
  useEffect(() => {
    if (loading || reduceMotion || !data) return;
    const root = rootRef.current;
    if (!root) return;
    const cards = root.querySelectorAll("[data-db-card]");
    if (cards.length === 0) return;
    const anim = animate(cards, {
      opacity: [0, 1],
      translateY: [18, 0],
      scale: [0.98, 1],
      duration: 550,
      delay: stagger(70),
      ease: "outCubic",
    });
    return () => {
      anim.revert();
    };
  }, [loading, reduceMotion, !!data, range]);

  const windowDays = range === "week" ? 7 : 30;
  const [nowTick] = useState(() => Date.now());

  const recentOrders = useMemo(() => {
    const cutoff = nowTick - windowDays * 86400000;
    return (data?.recentOrders ?? []).filter(
      (o) => new Date(o.createdAt).getTime() >= cutoff,
    );
  }, [data, windowDays, nowTick]);

  const upcoming = useMemo(() => {
    const horizon = nowTick + windowDays * 86400000;
    return (data?.upcomingAppointments ?? []).filter(
      (b) => new Date(b.startTime).getTime() <= horizon,
    );
  }, [data, windowDays, nowTick]);

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const formatCurrency = (amount: number = 0) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div ref={rootRef} className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting()}, {firstName} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and track your business in one place
          </p>
        </div>
        <div className="flex items-center gap-2 lg:ml-auto flex-wrap">
          <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
            {todayLabel}
          </span>
          <div className="flex p-1 rounded-full border bg-card">
            {(["week", "month"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                aria-pressed={range === r}
                className={cn(
                  "text-xs font-medium px-3 py-1.5 rounded-full transition-colors",
                  range === r
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r === "week" ? "This week" : "This month"}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => load(true)}
            disabled={loading || refreshing}
            aria-label="Refresh stats"
            className="rounded-full size-9"
          >
            <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-3xl" />
          ))}
          <Skeleton className="h-72 rounded-3xl col-span-2 lg:col-span-4" />
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map((s) => {
              const Icon = s.icon;
              const value = (data?.metrics as any)?.[s.key] ?? 0;
              return (
                <Card
                  key={s.key}
                  data-db-card
                  className="rounded-3xl border shadow-sm overflow-hidden"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">
                          {s.label}
                        </p>
                        <p className="text-2xl font-bold mt-1 tabular-nums tracking-tight">
                          {s.money ? (
                            <>
                              $
                              <NumberTicker value={value} />
                            </>
                          ) : (
                            <NumberTicker value={value} />
                          )}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {s.caption}
                        </p>
                      </div>
                      <div className={cn("p-2.5 rounded-2xl", s.chip)}>
                        <Icon className="size-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Charts row */}
          <div data-db-card className="grid grid-cols-12 gap-4">
            <div className="col-span-12 xl:col-span-8 [&>div]:rounded-3xl">
              <SalesBlock
                monthlySales={data?.monthlySales}
                totalRevenue={data?.metrics.totalRevenue}
              />
            </div>
            <div className="col-span-12 xl:col-span-4 [&>div]:rounded-3xl [&>div]:h-full">
              <EarningReportChart
                totalRevenue={data?.metrics.totalRevenue}
                orderStatus={data?.orderStatus}
              />
            </div>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-12 gap-4">
            {/* Upcoming bookings */}
            <Card data-db-card className="rounded-3xl col-span-12 lg:col-span-4 h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Upcoming bookings
                  </CardTitle>
                  <CardDescription>
                    {range === "week" ? "Next 7 days" : "Next 30 days"}
                  </CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                  <Link href="/calendar">
                    Calendar <ChevronRight className="size-3.5" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {upcoming.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Nothing scheduled {range === "week" ? "this week" : "this month"} 🎉
                  </p>
                ) : (
                  <AnimatedList delay={500} cap={5}>
                    {upcoming.slice(0, 6).map((b) => (
                      <div
                        key={b.id}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl border bg-background"
                      >
                        <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {b.service?.name ?? "Booking"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {b.customerName ?? "Guest"} ·{" "}
                            {new Date(b.startTime).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {b.status}
                        </Badge>
                      </div>
                    ))}
                  </AnimatedList>
                )}
              </CardContent>
            </Card>

            {/* Top products */}
            <Card data-db-card className="rounded-3xl col-span-12 lg:col-span-4 h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Top products
                  </CardTitle>
                  <CardDescription>Highest revenue generators</CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                  <Link href="/products">
                    View all <ChevronRight className="size-3.5" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {!data?.topProducts || data.topProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No product sales recorded yet
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {data.topProducts.slice(0, 4).map((product, idx) => (
                      <div
                        key={idx}
                        data-db-card
                        className="flex items-center justify-between p-3 rounded-2xl border bg-muted/20"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 shrink-0">
                            <ShoppingBag className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {product.orders} orders
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold shrink-0">
                          {formatCurrency(product.revenue)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent orders */}
            <Card data-db-card className="rounded-3xl col-span-12 lg:col-span-4 h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Recent orders
                  </CardTitle>
                  <CardDescription>
                    Latest transactions {range === "week" ? "this week" : "this month"}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {recentOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No recent orders recorded
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {recentOrders.slice(0, 4).map((order) => (
                      <div
                        key={order.id}
                        data-db-card
                        className="flex items-center justify-between p-3 rounded-2xl border bg-muted/20"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {order.productName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {order.customer?.name || order.customer?.phone || "Guest"} •{" "}
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold">
                            {formatCurrency(order.amount)}
                          </p>
                          <Badge
                            variant={
                              order.status === "PAID" || order.status === "COMPLETED"
                                ? "outline"
                                : "secondary"
                            }
                            className="text-[10px] mt-0.5"
                          >
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
