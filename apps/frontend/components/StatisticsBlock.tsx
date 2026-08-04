import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  CalendarDays,
  LucideIcon,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DashboardMetric = {
  label: string;
  value: string;
  percentage: string;
  isPositive?: boolean;
};

type MainDashboardData = {
  title: string;
  description: string;
  metrics: DashboardMetric[];
};

type StatItem = {
  title: string;
  value: string;
  percentage: string;
  icon: LucideIcon;
  isPositive?: boolean;
};

export type DashboardMetricsData = {
  totalRevenue?: number;
  expenseAmount?: number;
  profitAmount?: number;
  conversionRate?: number;
  weeklyRevenue?: number;
  purchaseOrdersCount?: number;
  totalSales?: number;
  customersCount?: number;
};


type StatisticsBlockProps = {
  metrics?: DashboardMetricsData;
  mainDashboard?: MainDashboardData;
  secondaryStats?: StatItem[];
};

const formatCurrency = (val: number = 0) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);
};

const StatisticsBlock = ({
  metrics,
  mainDashboard,
  secondaryStats,
}: StatisticsBlockProps) => {
  const displayMainDashboard: MainDashboardData = mainDashboard || {
    title: "Analytics Dashboard",
    description: "Real-time performance overview & statistics",
    metrics: [
      {
        label: "Earnings",
        value: formatCurrency(metrics?.totalRevenue ?? 27850),
        percentage: "+18%",
        isPositive: true,
      },
      {
        label: "Expense",
        value: formatCurrency(metrics?.expenseAmount ?? 18453),
        percentage: "-5%",
        isPositive: false,
      },
      {
        label: "Conversion Rate",
        value: `${metrics?.conversionRate ?? 12.4}%`,
        percentage: "+3.2%",
        isPositive: true,
      },
    ],
  };

  const displaySecondaryStats: StatItem[] = secondaryStats || [
    {
      title: "Weekly Sales",
      value: formatCurrency(metrics?.weeklyRevenue ?? 4587),
      percentage: "+18%",
      icon: CalendarDays,
      isPositive: true,
    },
    {
      title: "Purchase Orders",
      value: (metrics?.purchaseOrdersCount ?? 230).toString(),
      percentage: "+12%",
      icon: ShoppingBag,
      isPositive: true,
    },
  ];

  return (
    <div className="grid grid-cols-12 gap-6 h-full">
      <div className="col-span-12 xl:col-span-6 h-full">
        <Card className="p-0 ring-0 border rounded-2xl relative h-full">
          <CardContent className="p-0">
            <div className="ps-6 py-4 flex flex-col gap-9 justify-between">
              <div>
                <p className="text-lg font-medium text-card-foreground">
                  {displayMainDashboard.title}
                </p>
                <p className="text-xs font-normal text-muted-foreground">
                  {displayMainDashboard.description}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-6">
                {displayMainDashboard.metrics.map((metric, index) => (
                  <div key={index} className="flex items-center gap-6">
                    <div>
                      <p className="text-xs font-normal text-muted-foreground">
                        {metric.label}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-2xl font-medium text-card-foreground">
                          {metric.value}
                        </p>
                        <Badge
                          className={cn(
                            "font-normal text-muted-foreground",
                            metric.isPositive
                              ? "bg-teal-400/10 text-teal-600 dark:text-teal-400"
                              : "bg-red-500/10 text-red-600 dark:text-red-400"
                          )}
                        >
                          {metric.percentage}
                        </Badge>
                      </div>
                    </div>
                    {index < displayMainDashboard.metrics.length - 1 && (
                      <Separator orientation="vertical" className={"h-12 hidden sm:block"} />
                    )}
                  </div>
                ))}
              </div>
            </div>
            {/* image */}
            <img
              src="https://images.shadcnspace.com/assets/backgrounds/stats-01.webp"
              alt="user-img"
              width={211}
              height={168}
              className="absolute bottom-0 right-0 hidden sm:block"
            />
          </CardContent>
        </Card>
      </div>
      {displaySecondaryStats.map((stat, index) => (
        <div key={index} className="col-span-12 sm:col-span-6 xl:col-span-3">
          <Card className="py-6 ring-0 border rounded-2xl">
            <CardContent className="px-6 flex items-start justify-between">
              <div className="flex flex-col gap-5 justify-between">
                <div className="flex flex-col gap-1">
                  <p className="text-lg font-medium text-card-foreground">
                    {stat.title}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-medium text-card-foreground">
                      {stat.value}
                    </p>
                    <Badge
                      className={cn(
                        "font-normal text-muted-foreground",
                        stat.isPositive !== false
                          ? "bg-teal-400/10 text-teal-600 dark:text-teal-400"
                          : "bg-red-500/10 text-red-600 dark:text-red-400"
                      )}
                    >
                      {stat.percentage}
                    </Badge>
                  </div>
                </div>
                {/* button */}
                <Button
                  variant={"outline"}
                  className={
                    "flex items-center gap-1.5 w-fit rounded-xl cursor-pointer shadow-xs h-9"
                  }
                >
                  <span>See Report</span>
                  <ArrowRight size={16} />
                </Button>
              </div>
              <div className="p-3 rounded-full border bg-muted/30">
                <stat.icon size={16} />
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
};

export default StatisticsBlock;
