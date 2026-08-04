"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

type Features = {
  icon: LucideIcon;
  content: string;
}[];

const Feature = ({ featureData }: { featureData: Features }) => {
  return (
    <section>
      <div className="lg:py-20 sm:py-16 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <div className="flex flex-col gap-8 md:gap-12">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.8,
                ease: [0.21, 0.47, 0.32, 0.98],
              }}
              className="flex flex-col md:flex-row items-center md:items-end justify-center md:justify-between gap-4"
            >
              <div className="flex flex-col gap-4 max-w-full items-center md:items-start text-center md:text-left md:max-w-xl">
                <Badge variant="outline" className="px-3 py-1 h-auto text-sm font-normal">
                  Platform Capabilities
                </Badge>
                <h2 className="text-3xl md:text-4xl font-semibold">
                  Everything your business needs to grow on WhatsApp
                </h2>
                <p className="text-lg font-normal text-muted-foreground">
                  From automated conversations to payment collection — Sparq connects every touchpoint your customer has with your brand.
                </p>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
              {/* Testimonial / Hero card */}
              <motion.div
                initial={{ x: -100, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.8,
                  ease: [0.21, 0.47, 0.32, 0.98],
                }}
                className="rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-sky-950/40 dark:to-indigo-950/40 border border-border overflow-hidden"
              >
                <div className="p-8 sm:p-12 h-full flex flex-col justify-between gap-10">
                  {/* Simulated WhatsApp chat bubbles */}
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-end">
                      <div className="bg-sky-500 text-white text-sm rounded-2xl rounded-tr-sm px-4 py-2 max-w-[70%]">
                        Hi, I'd like to book an appointment 👋
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-card border border-border text-foreground text-sm rounded-2xl rounded-tl-sm px-4 py-2 max-w-[70%]">
                        Sure! I have slots available on Monday & Wednesday. Which do you prefer? 📅
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-sky-500 text-white text-sm rounded-2xl rounded-tr-sm px-4 py-2 max-w-[70%]">
                        Monday 11am works great!
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-card border border-border text-foreground text-sm rounded-2xl rounded-tl-sm px-4 py-2 max-w-[70%]">
                        ✅ Booked! You'll receive a confirmation & payment link shortly.
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-base font-medium text-foreground italic">
                      "Sparq automated 80% of our booking conversations. Our team now focuses on what matters — delivering the service."
                    </p>
                    <div className="mt-4">
                      <p className="text-sm font-semibold text-sky-600">Priya Sharma</p>
                      <span className="text-xs text-muted-foreground">Co-founder, BloomSpa • Mumbai</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Feature cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6">
                {featureData?.map((value, index) => (
                  <motion.div
                    key={index}
                    initial={{ x: 100, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.8,
                      delay: index * 0.1,
                      ease: [0.21, 0.47, 0.32, 0.98],
                    }}
                  >
                    <Card className="py-8 bg-muted ring-0 border-0 h-full hover:bg-muted/80 transition-colors group">
                      <CardContent className="w-full h-full px-8 flex flex-col items-start gap-12 justify-between">
                        <value.icon
                          className="w-6 h-6 text-sky-500 group-hover:scale-110 transition-transform"
                          strokeWidth={1.5}
                        />
                        <p className="text-base text-primary font-normal">
                          {value?.content}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Feature;
