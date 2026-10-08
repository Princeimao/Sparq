"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Send,
  X,
  ChevronLeft,
  CheckCheck,
  Star,
  Sparkles,
  Phone,
  Video,
  Info,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FormField } from "./DragFormBuilder";

interface LiveCustomerDevicePreviewProps {
  title?: string;
  description?: string;
  fields: FormField[];
  className?: string;
}

export function LiveCustomerDevicePreview({
  title = "Customer Registration",
  description = "Please fill out the information below.",
  fields,
  className = "",
}: LiveCustomerDevicePreviewProps) {
  const [platform, setPlatform] = useState<"instagram" | "whatsapp">("instagram");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Platform Switcher */}
      <div className="flex items-center gap-2 mb-4 bg-muted/50 p-1.5 rounded-full border shadow-sm">
        <button
          type="button"
          onClick={() => setPlatform("instagram")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            platform === "instagram"
              ? "bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white shadow"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg> Instagram DM
        </button>
        <button
          type="button"
          onClick={() => setPlatform("whatsapp")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            platform === "whatsapp"
              ? "bg-emerald-600 text-white shadow"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageCircle className="size-3.5" /> WhatsApp Flow
        </button>
      </div>

      {/* Realistic Smartphone Frame */}
      <div className="relative w-[310px] h-[610px] bg-black rounded-[42px] p-3 shadow-2xl border-4 border-slate-800 flex flex-col overflow-hidden">
        {/* Phone Notch / Dynamic Island */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-4 bg-black rounded-full z-50 flex items-center justify-end px-2">
          <div className="size-2.5 rounded-full bg-slate-900 border border-slate-700" />
        </div>

        {/* Screen Container */}
        <div className="relative flex-1 w-full h-full rounded-[32px] overflow-hidden bg-background flex flex-col font-sans">
          {/* Header Bar */}
          {platform === "instagram" ? (
            <div className="bg-background border-b px-3 pt-6 pb-2.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ChevronLeft className="size-5 text-foreground" />
                <div className="size-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[1.5px]">
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-white text-[10px] font-bold">
                    SQ
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold leading-none flex items-center gap-1">
                    sparq.official <Badge className="bg-blue-500 text-[8px] h-3 px-1">✓</Badge>
                  </p>
                  <p className="text-[10px] text-muted-foreground">Active now</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-foreground">
                <Phone className="size-4" />
                <Video className="size-4" />
              </div>
            </div>
          ) : (
            <div className="bg-emerald-700 text-white px-3 pt-6 pb-2.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ChevronLeft className="size-5" />
                <div className="size-8 rounded-full bg-emerald-900 flex items-center justify-center text-white text-xs font-bold">
                  SQ
                </div>
                <div>
                  <p className="text-xs font-semibold leading-none">Sparq Official</p>
                  <p className="text-[10px] opacity-80">Official Business</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Video className="size-4" />
                <MoreVertical className="size-4" />
              </div>
            </div>
          )}

          {/* Chat Body */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs bg-muted/10">
            <div className="text-center my-2">
              <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                Today 18:20
              </span>
            </div>

            {/* Business Incoming Chat Bubble */}
            <div className="flex gap-2 max-w-[85%]">
              <div className="p-3 rounded-2xl rounded-tl-sm bg-muted/40 border shadow-xs space-y-2">
                <p className="text-xs">
                  Hi! Thank you for reaching out to Sparq. Please tap below to open the interactive form.
                </p>

                {/* Form Action Card / Button inside Chat */}
                <div className="border rounded-xl p-2.5 bg-background shadow-sm space-y-1.5">
                  <div className="flex items-center gap-1.5 text-primary text-[11px] font-semibold">
                    <Sparkles className="size-3" />
                    <span>{title}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{description}</p>
                  <Button
                    size="sm"
                    onClick={() => { setIsFormOpen(true); setSubmitted(false); }}
                    className={`w-full text-xs h-7 rounded-lg ${
                      platform === "instagram"
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    }`}
                  >
                    Fill Form
                  </Button>
                </div>
              </div>
            </div>

            {/* User Submitted Message Bubble */}
            {submitted && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-end"
              >
                <div className="p-3 rounded-2xl rounded-tr-sm bg-primary text-primary-foreground max-w-[80%] space-y-1">
                  <p className="text-[11px] font-medium flex items-center gap-1">
                    <CheckCheck className="size-3 text-emerald-400" /> Form Submitted Successfully!
                  </p>
                  <p className="text-[10px] opacity-90">
                    Thank you! We received your response.
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Interactive Form Drawer Sheet inside Phone Screen */}
          <AnimatePresence>
            {isFormOpen && (
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="absolute inset-0 bg-background z-40 flex flex-col"
              >
                {/* Form Screen Header */}
                <div className="px-4 py-3 border-b flex items-center justify-between shrink-0 bg-muted/20">
                  <span className="text-xs font-bold text-foreground truncate">{title}</span>
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="p-1 rounded-full hover:bg-muted"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Form Body */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  <p className="text-xs text-muted-foreground">{description}</p>

                  {fields.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      No fields added yet. Add fields in the builder to preview here!
                    </div>
                  ) : (
                    fields.map((field) => (
                      <div key={field.id} className="space-y-1 text-left">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                          {field.label}
                          {field.required && <span className="text-red-500">*</span>}
                        </label>
                        {field.description && (
                          <p className="text-[10px] text-muted-foreground">{field.description}</p>
                        )}

                        {field.type === "textarea" ? (
                          <textarea
                            disabled
                            placeholder={field.placeholder || "Type here..."}
                            className="w-full text-xs p-2 rounded-lg border bg-muted/20 min-h-[60px]"
                          />
                        ) : field.type === "select" ? (
                          <div className="w-full text-xs p-2 rounded-lg border bg-muted/20 text-muted-foreground flex justify-between items-center">
                            <span>{field.placeholder || "Select an option"}</span>
                            <ChevronLeft className="size-3 -rotate-90" />
                          </div>
                        ) : field.type === "rating" ? (
                          <div className="flex gap-1.5 pt-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} className="size-5 text-amber-400 fill-amber-400" />
                            ))}
                          </div>
                        ) : field.type === "checkbox" ? (
                          <div className="flex items-center gap-2 pt-1">
                            <div className="size-4 rounded border bg-primary flex items-center justify-center text-white text-[10px]">
                              ✓
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {field.placeholder || "I agree"}
                            </span>
                          </div>
                        ) : (
                          <input
                            disabled
                            type={field.type}
                            placeholder={field.placeholder || `Enter ${field.label}...`}
                            className="w-full text-xs p-2 rounded-lg border bg-muted/20 h-8"
                          />
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Form Footer */}
                <div className="p-3 border-t bg-muted/10 shrink-0">
                  <Button
                    onClick={() => {
                      setIsFormOpen(false);
                      setSubmitted(true);
                    }}
                    className={`w-full text-xs h-9 rounded-xl font-bold ${
                      platform === "instagram"
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                        : "bg-emerald-600 text-white"
                    }`}
                  >
                    Submit Response
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
