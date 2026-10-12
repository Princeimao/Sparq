"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/store";
import { integrations } from "@/constant";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingStory } from "@/components/landing/landing-story";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingHow } from "@/components/landing/landing-how";
import { LandingShowcase } from "@/components/landing/landing-showcase";
import { LandingBenefits } from "@/components/landing/landing-benefits";
import { LandingIntegrations } from "@/components/landing/landing-integrations";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingFinal } from "@/components/landing/landing-final";
import PricingSection from "@/components/pricing-section";
import { Reveal } from "@/components/landing/reveal";

/* Quiet capability + integration strip. No invented numbers. */
function CredibilityStrip() {
  return (
    <section
      aria-label="Capabilities and integrations"
      className="border-y border-zinc-200/70 bg-white"
    >
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        <Reveal>
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
            One workspace for chats, bookings, orders & payments
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {integrations.map((item) => (
              <li
                key={item.name}
                className="flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
              >
                <Image
                  src={item.icon}
                  alt=""
                  width={20}
                  height={20}
                  className="object-contain opacity-70 grayscale transition-all hover:opacity-100 hover:grayscale-0"
                />
                {item.name}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const handleCTA = () => {
    if (isAuthenticated) {
      router.push("/dashboard");
    } else {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000/api";
      window.location.href = `${backendUrl}/auth/google`;
    }
  };

  return (
    <div className="bg-[#faf9f6] text-[#14160f] antialiased">
      <LandingHero onPrimary={handleCTA} />
      <CredibilityStrip />
      <LandingStory />
      <LandingFeatures onPrimary={handleCTA} />
      <LandingHow />
      <LandingShowcase />
      <LandingBenefits />
      <LandingIntegrations />
      <div id="pricing">
        <PricingSection showComparisonTable={false} />
      </div>
      <LandingFaq />
      <LandingFinal onPrimary={handleCTA} />
    </div>
  );
}
