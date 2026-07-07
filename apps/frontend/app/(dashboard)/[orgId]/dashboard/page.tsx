import EarningReportChart from "@/components/EarningBlock";
import TopProductTable from "@/components/ProductTable";
import SalesBlock from "@/components/SalesBlock";
import SalesByCountryWidget from "@/components/SalesByCountryBlock";
import StatisticsBlock from "@/components/StatisticsBlock";

const page = () => {
  return (
    <div className="grid grid-cols-12 gap-6 p-6 max-w-7xl mx-auto">
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
  );
};

export default page;
