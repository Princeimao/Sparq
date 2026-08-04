"use client";

import PricingSection from "@/components/pricing-section";
import { navigationData } from "@/constant";

export default function PricingPage() {
  const activeNavigationData = navigationData.map((item) => ({
    ...item,
    isActive: item.href === "/pricing",
  }));

  return <PricingSection showComparisonTable={true} />;
}
