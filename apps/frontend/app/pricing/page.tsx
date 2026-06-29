"use client";

import Header from "@/components/header";
import PricingSection from "@/components/pricing-section";
import Footer from "@/components/footer";
import { navigationData } from "@/constant";

export default function PricingPage() {
  const activeNavigationData = navigationData.map((item) => ({
    ...item,
    isActive: item.href === "/pricing",
  }));

  return (
    <div className="relative min-h-screen bg-black">
      <div className="relative z-20 bg-background rounded-b-[32px] md:rounded-b-[48px] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.3)] pb-12">
        <Header navigationData={navigationData} />
        <PricingSection showComparisonTable={true} />
      </div>
      <div className="md:sticky md:bottom-0 md:z-10 w-full">
        <Footer />
      </div>
    </div>
  );
}
