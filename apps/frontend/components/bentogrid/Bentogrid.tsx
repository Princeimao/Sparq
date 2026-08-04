import { Badge } from "@/components/ui/badge";
import AnimatedUiBlock from "./AnimatedUiBlock";
import ReminderAnimation from "./ReminderAnimation";
import { Zap, Shield, BarChart3, Puzzle } from "lucide-react";

const bentoFeatures = [
  {
    icon: Zap,
    title: "Smart Automation",
    description:
      "Set up multi-step WhatsApp flows once — Sparq handles every customer message automatically, 24/7.",
    gradient: "from-sky-500/20 to-indigo-500/20",
  },
  {
    icon: Shield,
    title: "Meta Verified & Secure",
    description:
      "Official WhatsApp Cloud API integration. All messages are encrypted and delivered through Meta's infrastructure.",
    gradient: "from-emerald-500/20 to-teal-500/20",
  },
  {
    icon: BarChart3,
    title: "Revenue Analytics",
    description:
      "Track orders, payments, and conversion rates in your dashboard. Know exactly what's driving growth.",
    gradient: "from-amber-500/20 to-orange-500/20",
  },
];

const Bentogrid = () => {
  return (
    <section>
      <div className="py-11 md:py-20">
        <div className="max-w-7xl xl:px-16 lg:px-8 px-4 mx-auto flex flex-col gap-12">
          <div className="flex flex-col gap-4 items-center justify-center max-w-3xl mx-auto">
            <Badge
              variant={"outline"}
              className="px-3 py-1 h-auto text-sm font-normal"
            >
              How It Works
            </Badge>
            <h2 className="text-center md:text-5xl text-3xl mx-auto font-medium">
              Automate your entire customer journey on WhatsApp
            </h2>
            <p className="text-center text-muted-foreground text-base max-w-xl">
              Sparq connects your WhatsApp Business account to a powerful automation engine — handling bookings, orders, payments, and follow-ups without lifting a finger.
            </p>
          </div>

          <div className="grid grid-cols-12 gap-5">
            {/* Reminder / Notification Automation Card */}
            <div className="lg:col-span-4 col-span-12 overflow-hidden">
              <div className="rounded-xl border border-border h-full flex flex-col">
                <div className="bg-muted rounded-t-xl py-8 px-9 relative flex-1">
                  <ReminderAnimation />
                </div>
                <div className="flex flex-col gap-0.5 p-8 border-t border-border">
                  <h3 className="text-xl font-medium text-foreground">
                    Automated Reminders & Notifications
                  </h3>
                  <p className="text-base font-normal text-muted-foreground">
                    Send order confirmations, appointment reminders, and re-engagement messages automatically to your customers on WhatsApp.
                  </p>
                </div>
              </div>
            </div>

            {/* Animated UI / Bot Flow Builder Card */}
            <div className="lg:col-span-8 col-span-12 overflow-hidden">
              <div className="rounded-xl border border-border">
                <div className="bg-muted rounded-t-xl py-7 lg:px-30 px-6 relative">
                  <AnimatedUiBlock />
                </div>
                <div className="flex flex-col gap-0.5 p-8 border-t border-border">
                  <h3 className="text-xl font-medium text-foreground">
                    Visual Bot Flow Builder
                  </h3>
                  <p className="text-base font-normal text-muted-foreground">
                    Design complete conversational experiences with our drag-and-drop WhatsApp flow editor. Build lead capture, FAQ bots, appointment booking, and payment flows — no code required.
                  </p>
                </div>
              </div>
            </div>

            {/* Three feature tiles */}
            {bentoFeatures.map((feat, i) => (
              <div key={i} className="lg:col-span-4 col-span-12 overflow-hidden">
                <div className="rounded-xl border border-border h-full flex flex-col">
                  <div
                    className={`p-8 bg-gradient-to-br ${feat.gradient} rounded-t-xl flex-1 flex items-center justify-center`}
                  >
                    <feat.icon className="size-12 text-foreground/60" strokeWidth={1.2} />
                  </div>
                  <div className="flex flex-col gap-0.5 p-8 border-t border-border">
                    <h3 className="text-xl font-medium text-foreground">
                      {feat.title}
                    </h3>
                    <p className="text-base font-normal text-muted-foreground">
                      {feat.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Bentogrid;
