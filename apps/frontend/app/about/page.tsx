import { navigationData } from "@/constant";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Zap, Globe, ShieldCheck, Users, MessageSquare, BarChart3 } from "lucide-react";

const values = [
  {
    icon: Zap,
    title: "Speed at Scale",
    description: "We believe automation should feel instant. Every feature is built to handle thousands of conversations without ever slowing down.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy First",
    description: "Your customers' data is encrypted, and never shared. We comply with GDPR, DPDP, and Meta's data policies.",
  },
  {
    icon: Globe,
    title: "Built for India & Beyond",
    description: "Razorpay, INR billing, and multi-language support are first-class citizens — not afterthoughts.",
  },
  {
    icon: Users,
    title: "Customer Obsessed",
    description: "Our support team responds within hours, not days. We treat every business like our only customer.",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp Native",
    description: "We don't wrap third-party chatbots. We integrate directly with Meta's Cloud API so every message is reliable and on-brand.",
  },
  {
    icon: BarChart3,
    title: "Data-Driven Growth",
    description: "Every order, appointment, and reservation feeds your analytics dashboard so you always know what's working.",
  },
];

const team = [
  { name: "Dipesh Rathod", role: "Founder & CEO", avatar: "DR" },
  { name: "Engineering Team", role: "Backend & Infrastructure", avatar: "ET" },
  { name: "Design Team", role: "Product & UX", avatar: "DT" },
];

export default function AboutPage() {
  return (
    <div className="relative min-h-screen bg-black">
      <div className="relative z-20 bg-background rounded-b-[32px] md:rounded-b-[48px] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.3)] pb-12">
        <Header navigationData={navigationData} />

        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 before:absolute before:w-full before:h-full before:bg-linear-to-r before:from-sky-100 before:via-white before:to-amber-100 before:rounded-full before:blur-3xl before:-z-10 dark:before:from-slate-800 dark:before:via-black dark:before:to-stone-700 dark:before:blur-3xl dark:before:-z-10" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 text-center relative">
            <Badge variant="outline" className="text-sm h-auto py-1 px-3 border-0 outline outline-border mb-6">
              About Sparq
            </Badge>
            <h1 className="text-5xl md:text-7xl font-medium leading-tight mb-6">
              We're building the{" "}
              <span className="italic font-normal">operating system</span>{" "}
              for modern businesses on WhatsApp
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
              Sparq started with one simple idea: businesses shouldn't need to
              hire a developer to automate their WhatsApp conversations. Today,
              we power orders, appointments, and reservations for hundreds of
              businesses across India and beyond.
            </p>
            <Button
              asChild
              className="relative text-sm font-medium rounded-full h-12 p-1 ps-6 pe-14 group transition-all duration-500 hover:ps-14 hover:pe-6 w-fit overflow-hidden cursor-pointer"
            >
              <a href="/pricing">
                <span className="relative z-10 transition-all duration-500">See Pricing</span>
                <span className="absolute right-1 w-10 h-10 bg-background text-foreground rounded-full flex items-center justify-center transition-all duration-500 group-hover:right-[calc(100%-44px)] group-hover:rotate-45">
                  <ArrowUpRight size={16} />
                </span>
              </a>
            </Button>
          </div>
        </section>

        {/* Mission */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <Badge variant="outline" className="text-sm h-auto py-1 px-3 border-0 outline outline-border mb-4">
                Our Mission
              </Badge>
              <h2 className="text-4xl font-medium mb-6">
                Every business deserves automation that actually works
              </h2>
              <p className="text-muted-foreground leading-8 mb-4">
                Most automation tools are built for tech companies with
                engineering teams. Sparq is built for the bakery owner, the
                hair salon, the gym — anyone running a real business that
                communicates with customers on WhatsApp every day.
              </p>
              <p className="text-muted-foreground leading-8">
                By combining LLM-powered intent detection with a visual flow
                builder and plug-and-play payment integrations, we let you go
                from zero to a fully automated WhatsApp store in under an hour.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 p-6 border border-border rounded-2xl bg-muted/30">
                <p className="text-4xl font-semibold mb-2">500+</p>
                <p className="text-sm text-muted-foreground">Businesses powered</p>
              </div>
              <div className="p-6 border border-border rounded-2xl bg-muted/30">
                <p className="text-4xl font-semibold mb-2">2M+</p>
                <p className="text-sm text-muted-foreground">Messages processed</p>
              </div>
              <div className="p-6 border border-border rounded-2xl bg-muted/30">
                <p className="text-4xl font-semibold mb-2">99.9%</p>
                <p className="text-sm text-muted-foreground">Uptime SLA</p>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex flex-col gap-4 items-center mb-16 text-center">
            <Badge variant="outline" className="text-sm h-auto py-1 px-3 border-0 outline outline-border">
              Our Values
            </Badge>
            <h2 className="text-4xl md:text-5xl font-medium">What we stand for</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((v) => (
              <div
                key={v.title}
                className="p-6 border border-border rounded-2xl hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary mb-4">
                  <v.icon size={20} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-7">{v.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Team */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex flex-col gap-4 items-center mb-16 text-center">
            <Badge variant="outline" className="text-sm h-auto py-1 px-3 border-0 outline outline-border">
              The Team
            </Badge>
            <h2 className="text-4xl md:text-5xl font-medium">The people behind Sparq</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            {team.map((member) => (
              <div
                key={member.name}
                className="flex flex-col items-center gap-4 p-8 border border-border rounded-2xl min-w-48 flex-1 max-w-xs"
              >
                <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-semibold text-primary">
                  {member.avatar}
                </div>
                <div className="text-center">
                  <p className="font-semibold">{member.name}</p>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="relative overflow-hidden min-h-60 flex items-center justify-center px-6 border border-border rounded-3xl before:absolute before:w-full before:h-4/5 before:bg-linear-to-r before:from-sky-100 before:via-white before:to-amber-100 before:rounded-full before:top-8 before:blur-3xl before:-z-10 dark:before:from-sky-400/10 dark:before:via-black dark:before:to-amber-300/10 dark:before:blur-3xl dark:before:-z-10">
            <div className="flex flex-col gap-6 items-center text-center">
              <h2 className="text-3xl md:text-4xl font-medium">
                Ready to automate your business?
              </h2>
              <Button
                asChild
                className="relative text-sm font-medium rounded-full h-12 p-1 ps-6 pe-14 group transition-all duration-500 hover:ps-14 hover:pe-6 w-fit overflow-hidden cursor-pointer"
              >
                <a href="/pricing">
                  <span className="relative z-10 transition-all duration-500">Get Started Free</span>
                  <span className="absolute right-1 w-10 h-10 bg-background text-foreground rounded-full flex items-center justify-center transition-all duration-500 group-hover:right-[calc(100%-44px)] group-hover:rotate-45">
                    <ArrowUpRight size={16} />
                  </span>
                </a>
              </Button>
            </div>
          </div>
        </section>
      </div>

      <div className="md:sticky md:bottom-0 md:z-10 w-full">
        <Footer />
      </div>
    </div>
  );
}
