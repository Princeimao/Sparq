"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
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

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
};

const quickMetrics = [
  {
    key: "customersCount",
    label: "Total Customers",
    icon: Users,
    color: "bg-blue-500/10 text-blue-500",
    gradient: "from-blue-500/5 to-blue-500/0",
  },
  {
    key: "messagesCount",
    label: "Total Messages",
    icon: MessageSquare,
    color: "bg-teal-500/10 text-teal-500",
    gradient: "from-teal-500/5 to-teal-500/0",
  },
  {
    key: "activeWorkflowsCount",
    label: "Active Workflows",
    icon: Workflow,
    color: "bg-purple-500/10 text-purple-500",
    gradient: "from-purple-500/5 to-purple-500/0",
  },
  {
    key: "appointmentsCount",
    label: "Appointments",
    icon: Calendar,
    color: "bg-amber-500/10 text-amber-500",
    gradient: "from-amber-500/5 to-amber-500/0",
  },
];

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
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
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
      </motion.div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Loading dashboard performance data...
          </p>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-8"
        >
          {/* Hero Statistics Row */}
          <motion.div variants={itemVariants}>
            <StatisticsBlock metrics={data?.metrics} />
          </motion.div>

          {/* Quick Metrics Bar */}
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {quickMetrics.map((metric) => {
              const Icon = metric.icon;
              const count = (data?.metrics as any)?.[metric.key] ?? 0;
              return (
                <motion.div key={metric.key} variants={itemVariants}>
                  <Card
                    className={`rounded-xl border p-4 overflow-hidden relative bg-gradient-to-br ${metric.gradient}`}
                  >
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">
                          {metric.label}
                        </p>
                        <motion.h4
                          key={count}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xl font-bold mt-1"
                        >
                          {count}
                        </motion.h4>
                      </div>
                      <div className={`p-2.5 rounded-lg ${metric.color}`}>
                        <Icon className="size-5" />
                      </div>
                    </motion.div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Charts Row */}
          <motion.div variants={itemVariants} className="grid grid-cols-12 gap-6">
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
          </motion.div>

          {/* Bottom Insights Row */}
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-12 gap-6"
          >
            {/* Top Products */}
            <motion.div variants={itemVariants} className="col-span-12 lg:col-span-6">
              <Card className="rounded-2xl h-full">
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
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
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
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Orders Activity */}
            <motion.div variants={itemVariants} className="col-span-12 lg:col-span-6">
              <Card className="rounded-2xl h-full">
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
                      {data.recentOrders.map((order, idx) => (
                        <motion.div
                          key={order.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
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
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default DashboardPage;
