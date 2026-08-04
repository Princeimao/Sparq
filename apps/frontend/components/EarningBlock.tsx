"use client";

import * as React from "react";
import { Label, Pie, PieChart } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

type EarningReportProps = {
  totalRevenue?: number;
  orderStatus?: { status: string; count: number; amount: number }[];
};

const defaultChartData = [
  { browser: "Website", visitors: 60, fill: "#3b82f6" },
  { browser: "Marketplace", visitors: 20, fill: "#38bdf8" },
  { browser: "Affiliate", visitors: 20, fill: "rgba(56, 189, 248, 0.5)" },
];

const chartConfig = {
  visitors: {
    label: "Visitors",
  },
  Website: {
    label: "Website",
    color: "#3b82f6",
  },
  Marketplace: {
    label: "Marketplace",
    color: "#38bdf8",
  },
  Affiliate: {
    label: "Affiliate",
    color: "rgba(56, 189, 248, 0.5)",
  },
} satisfies ChartConfig;

const formatCurrency = (val: number = 0) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);
};

export default function EarningReportChart({
  totalRevenue,
  orderStatus,
}: EarningReportProps) {
  const displayTotalRevenue = totalRevenue ?? 27850;

  const CustomerSegmentation = React.useMemo(() => {
    if (orderStatus && orderStatus.length > 0) {
      const paid =
        orderStatus.find((s) => s.status === "PAID")?.amount ||
        Math.round(displayTotalRevenue * 0.65);
      const pending =
        orderStatus.find((s) => s.status === "PENDING")?.amount ||
        Math.round(displayTotalRevenue * 0.2);
      const completed =
        orderStatus.find((s) => s.status === "COMPLETED")?.amount ||
        Math.round(displayTotalRevenue * 0.15);

      return [
        {
          id: 1,
          customer: "Direct Orders",
          borderColor: "bg-blue-500",
          badgeColor: "bg-teal-400/10 text-teal-600 dark:text-teal-400",
          earning: paid,
          growthPercentage: "+4.7%",
        },
        {
          id: 2,
          customer: "WhatsApp / Chat",
          borderColor: "bg-sky-400",
          badgeColor: "bg-teal-400/10 text-teal-600 dark:text-teal-400",
          earning: pending,
          growthPercentage: "+2.1%",
        },
        {
          id: 3,
          customer: "Automated Workflows",
          borderColor: "bg-sky-400/50",
          badgeColor: "bg-teal-400/10 text-teal-600 dark:text-teal-400",
          earning: completed,
          growthPercentage: "+1.5%",
        },
      ];
    }

    return [
      {
        id: 1,
        customer: "Website",
        borderColor: "bg-blue-500",
        badgeColor: "bg-teal-400/10 text-teal-600 dark:text-teal-400",
        earning: 18356,
        growthPercentage: "+4.7%",
      },
      {
        id: 2,
        customer: "Marketplace",
        borderColor: "bg-sky-400",
        badgeColor: "bg-teal-400/10 text-teal-600 dark:text-teal-400",
        earning: 4590,
        growthPercentage: "+2.1%",
      },
      {
        id: 3,
        customer: "Affiliate",
        borderColor: "bg-sky-400/50",
        badgeColor: "bg-teal-400/10 text-teal-600 dark:text-teal-400",
        earning: 4385,
        growthPercentage: "-1.7%",
      },
    ];
  }, [orderStatus, displayTotalRevenue]);

  return (
    <Card className="h-full w-full py-6 gap-6 flex flex-col justify-between">
      <CardHeader className="px-6">
        <CardTitle>
          <h4 className="text-lg font-semibold">Earning Reports</h4>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col justify-between gap-2 flex-1 px-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-square max-h-55 mx-auto w-full"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={defaultChartData}
              dataKey="visitors"
              nameKey="browser"
              innerRadius={60}
              strokeWidth={40}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) - 10}
                          className="fill-muted-foreground text-xs"
                        >
                          Total Revenue
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 15}
                          className="fill-foreground text-lg font-semibold"
                        >
                          {formatCurrency(displayTotalRevenue)}
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="flex flex-col gap-3 mt-4">
          {CustomerSegmentation.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={cn(item.borderColor, "w-1 h-4 rounded-full")}
                ></div>
                <h6 className={cn("text-sm font-medium leading-tight")}>
                  {item.customer}
                </h6>
              </div>
              <div className="flex items-center gap-1.5">
                <h6 className="text-sm font-medium">
                  {formatCurrency(item.earning)}
                </h6>
                <Badge
                  className={cn(
                    item.badgeColor,
                    "shadow-none text-xs px-1.5 py-0.5",
                  )}
                >
                  {item.growthPercentage}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
