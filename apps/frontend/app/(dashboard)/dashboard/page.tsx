"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import StatisticsBlock, {
  DashboardMetricsData,
} from "@/components/StatisticsBlock";
import SalesBlock, { MonthlySalesData } from "@/components/SalesBlock";
import EarningReportChart from "@/components/EarningBlock";
import {
  Loader2,
  RefreshCw,
  Users,
  MessageSquare,
  Workflow,
  Calendar,
  ShoppingBag,
  ArrowUpRight,
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
import Link from "next/link";

interface DashboardData {
  metrics: DashboardMetricsData & {
    totalSales: number;
    messagesCount: number;
    productsCount: number;
    appointmentsCount: number;
    activeWorkflowsCount: number;
    integrationsCount: number;
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
    title: string;
    startTime: string;
    status: string;
  }[];
}

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);

  const fetchDashboardData = useCallback(async () => {
    const res = await api.get("/dashboard/stats");

    if (res.data?.success && res.data?.data) {
      return res.data.data;
    }

    if (res.data?.metrics) {
      return res.data;
    }

    return null;
  }, []);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);

      try {
        const dashboardData = await fetchDashboardData();

        if (dashboardData) {
          setData(dashboardData);
        }
      } catch (error) {
        console.error("Failed to load dashboard statistics:", error);
        toast.error("Could not load dashboard stats");
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [fetchDashboardData]);

  const formatCurrency = (amount: number = 0) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time business performance, sales analytics, and conversion
            insights
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchDashboardData()}
          disabled={loading || refreshing}
          className="gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh Stats
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Loading dashboard performance data...
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Hero Statistics Row */}
          <StatisticsBlock metrics={data?.metrics} />

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Total Customers
                  </p>
                  <h4 className="text-xl font-bold mt-1">
                    {data?.metrics.customersCount ?? 0}
                  </h4>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500">
                  <Users className="size-5" />
                </div>
              </div>
            </Card>

            <Card className="rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Total Messages
                  </p>
                  <h4 className="text-xl font-bold mt-1">
                    {data?.metrics.messagesCount ?? 0}
                  </h4>
                </div>
                <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal-500">
                  <MessageSquare className="size-5" />
                </div>
              </div>
            </Card>

            <Card className="rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Active Workflows
                  </p>
                  <h4 className="text-xl font-bold mt-1">
                    {data?.metrics.activeWorkflowsCount ?? 0}
                  </h4>
                </div>
                <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-500">
                  <Workflow className="size-5" />
                </div>
              </div>
            </Card>

            <Card className="rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Appointments
                  </p>
                  <h4 className="text-xl font-bold mt-1">
                    {data?.metrics.appointmentsCount ?? 0}
                  </h4>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500">
                  <Calendar className="size-5" />
                </div>
              </div>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 xl:col-span-8">
              <SalesBlock
                monthlySales={data?.monthlySales}
                totalRevenue={data?.metrics.totalRevenue}
              />
            </div>
            <div className="col-span-12 xl:col-span-4">
              <EarningReportChart
                totalRevenue={data?.metrics.totalRevenue}
                orderStatus={data?.orderStatus}
              />
            </div>
          </div>

          {/* Bottom Insights Row */}
          <div className="grid grid-cols-12 gap-6">
            {/* Top Products */}
            <Card className="col-span-12 lg:col-span-6 rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Top Performing Products
                  </CardTitle>
                  <CardDescription>
                    Highest revenue generating products
                  </CardDescription>
                </div>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                >
                  <Link href="/products">
                    View All <ArrowUpRight className="size-3.5" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {!data?.topProducts || data.topProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    No product sales recorded yet
                  </p>
                ) : (
                  <div className="space-y-4">
                    {data.topProducts.map((product, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/20"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-md bg-primary/10 text-primary">
                            <ShoppingBag className="size-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {product.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {product.orders} total orders
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold">
                          {formatCurrency(product.revenue)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Orders Activity */}
            <Card className="col-span-12 lg:col-span-6 rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Recent Sales & Orders
                  </CardTitle>
                  <CardDescription>
                    Latest transactions across all channels
                  </CardDescription>
                </div>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                >
                  <Link href="/orders">
                    View All <ArrowUpRight className="size-3.5" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {!data?.recentOrders || data.recentOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    No recent orders recorded
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.recentOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/20"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {order.productName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {order.customer?.name ||
                              order.customer?.phone ||
                              "Guest"}{" "}
                            • {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">
                            {formatCurrency(order.amount)}
                          </p>
                          <Badge
                            variant={
                              order.status === "PAID" ||
                              order.status === "COMPLETED"
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
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
