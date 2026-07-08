"use client";

import EarningReportChart from "@/components/EarningBlock";
import TopProductTable from "@/components/ProductTable";
import SalesBlock from "@/components/SalesBlock";
import SalesByCountryWidget from "@/components/SalesByCountryBlock";
import StatisticsBlock from "@/components/StatisticsBlock";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const page = () => {
  const [loading, setLoading] = useState(false);
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here&apos;s what&apos;s happening with your business today
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6 max-w-7xl mx-auto">
          <div className="col-span-12">
            <StatisticsBlock />
          </div>

          <div className="col-span-12 xl:col-span-6">
            <SalesBlock />
          </div>
          <div className="col-span-12 sm:col-span-6 xl:col-span-3">
            <EarningReportChart />
          </div>
        </div>
      )}
    </div>
  );
};

export default page;
