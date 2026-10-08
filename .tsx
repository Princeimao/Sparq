"use client";

import { useState } from "react";
import Link from "next/link";
import MarketingNavbar from "@/components/marketing/MarketingNavbar";
import {
  Search,
  Video,
  Mic,
  UserCheck,
  Brain,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Bot,
  Layers,
  Compass,
} from "lucide-react";

export default function Home() {
  const [targetCompany, setTargetCompany] = useState("Stripe");
  const [targetRole, setTargetRole] = useState(
    "Senior Payments Infrastructure Engineer",
  );

  const presetLoops = [
    { company: "Stripe", role: "Payments Infrastructure Lead" },
    { company: "Google", role: "L5 Full Stack Engineer" },
    { company: "OpenAI", role: "AI Systems Specialist" },
    { company: "Meta", role: "Product Infrastructure" },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-neutral-800">
      <MarketingNavbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 max-w-5xl mx-auto text-center space-y-8">
        {/* Subtle Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
          <span>Agora RTC Real-Time Video Engine</span>
          <span className="text-neutral-600">•</span>
          <span className="text-neutral-400">Community Interview Dataset</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-[1.1]">
          Practice the interview you’re <br />
          <span className="text-neutral-400 font-normal">
            actually preparing for.
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-sm md:text-base text-neutral-400 leading-relaxed font-normal">
          Not generic chatbot prompts. Simulate realistic multi-round hiring
          loops with Agora video interviewers, persona switching, and adaptive
          follow-up questions tailored to your target company and code.
        </p>

        {/* Company / Role Search Bar */}
        <div className="max-w-xl mx-auto bg-neutral-900/80 border border-neutral-800 p-2 rounded-xl backdrop-blur-md flex flex-col md:flex-row items-center gap-2 shadow-2xl">
          <div className="flex-1 w-full px-3 py-1.5 border-b md:border-b-0 md:border-r border-neutral-800 flex items-center gap-2">
            <Search className="w-4 h-4 text-neutral-500 shrink-0" />
            <input
              type="text"
              placeholder="Target Company (e.g. Stripe)"
              value={targetCompany}
              onChange={(e) => setTargetCompany(e.target.value)}
              className="w-full bg-transparent text-white placeholder-neutral-500 focus:outline-none text-xs font-medium"
            />
          </div>
          <div className="flex-1 w-full px-3 py-1.5 flex items-center gap-2">
            <span className="text-[10px] text-neutral-500 uppercase font-semibold">
              Role:
            </span>
            <input
              type="text"
              placeholder="Target Role (e.g. Senior Backend)"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-full bg-transparent text-white placeholder-neutral-500 focus:outline-none text-xs font-medium"
            />
          </div>
          <Link
            href={`/simulator?company=${encodeURIComponent(targetCompany)}&role=${encodeURIComponent(targetRole)}`}
            className="w-full md:w-auto"
          >
            <button className="w-full md:w-auto px-4 py-2.5 rounded-lg bg-neutral-100 text-neutral-950 hover:bg-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-sm">
              <span>Start</span>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-950" />
            </button>
          </Link>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-neutral-500 pt-2">
          <span>Popular presets:</span>
          {presetLoops.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setTargetCompany(p.company);
                setTargetRole(p.role);
              }}
              className="px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 text-[11px] transition-colors"
            >
              {p.company} • {p.role}
            </button>
          ))}
        </div>
      </section>

      {/* Clean Meet Preview Card */}
      <section className="py-12 px-4 max-w-5xl mx-auto">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 md:p-6 space-y-4 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h3 className="font-semibold text-xs md:text-sm text-white">
                Stripe • Senior Payments Infrastructure Round
              </h3>
            </div>
            <span className="text-[11px] font-mono text-neutral-400">
              Agora RTC Live • 12:40
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[320px]">
            {/* AI Interviewer Tile */}
            <div className="rounded-xl bg-neutral-950 border border-neutral-800 p-5 flex flex-col items-center justify-center text-center relative">
              <div className="absolute top-3 left-3 text-[10px] font-medium text-neutral-400 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded">
                Marcus Vance (Staff Engineer)
              </div>
              <div className="w-20 h-20 rounded-full border border-neutral-700 overflow-hidden mb-3">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80"
                  alt="Interviewer"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-xs text-neutral-300 italic max-w-xs">
                "What kind of request scale was your payment idempotency system
                handling under peak load?"
              </p>
            </div>

            {/* Candidate Tile */}
            <div className="rounded-xl bg-neutral-950 border border-neutral-800 p-5 flex flex-col items-center justify-center text-center relative">
              <div className="absolute top-3 left-3 text-[10px] font-medium text-neutral-400 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded">
                You (Candidate)
              </div>
              <div className="w-20 h-20 rounded-full border border-neutral-800 bg-neutral-900 flex items-center justify-center text-xs font-bold text-neutral-400 mb-3">
                YOU
              </div>
              <p className="text-xs text-neutral-400">
                "We processed around 25,000 transactions/sec..."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Feature Section */}
      <section
        id="features"
        className="py-20 px-4 max-w-5xl mx-auto space-y-12"
      >
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            Engineered for Technical Excellence
          </h2>
          <p className="text-neutral-400 text-xs md:text-sm">
            Clean, modular architecture matching actual engineering hiring
            loops.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
            <div className="w-8 h-8 rounded bg-neutral-800 flex items-center justify-center text-neutral-300">
              <Video className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">
              Agora Real-Time RTC
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Low-latency video and audio streaming room with mic, camera, and
              active speaker state detection.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
            <div className="w-8 h-8 rounded bg-neutral-800 flex items-center justify-center text-neutral-300">
              <UserCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">
              Multi-Round Personas
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Recruiters, Staff Engineers, Security Leads, and Hiring Managers
              with realistic interviewer personalities.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
            <div className="w-8 h-8 rounded bg-neutral-800 flex items-center justify-center text-neutral-300">
              <Brain className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">
              Adaptive Follow-Ups
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              The AI probes scale, database bottlenecks, deadlocks, and
              trade-off choices based on your actual answers.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-neutral-800/80 text-center text-xs text-neutral-500">
        <p>© 2026 Agora Interview Simulator • Minimalist Modern Design</p>
      </footer>
    </div>
  );
}
