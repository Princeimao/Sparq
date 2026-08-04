import { WHATSAPP_FLOW } from "@/constant";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import React from "react";

const WhatsappDemo = () => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="flex justify-center"
    >
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="bg-[#075e54] text-white px-4 py-3 flex items-center gap-3">
          <div className="size-9 rounded-full bg-green-300 flex items-center justify-center text-green-900 font-bold text-sm">
            S
          </div>
          <div>
            <p className="font-semibold text-sm">Sparq Bot</p>
            <p className="text-xs text-green-200">Online · via WhatsApp</p>
          </div>
        </div>

        <div className="bg-[#ece5dd] dark:bg-zinc-900 px-4 py-4 flex flex-col gap-2 min-h-80">
          {WHATSAPP_FLOW.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: msg.delay }}
              className={cn(
                "flex",
                msg.side === "right" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "px-3 py-2 rounded-2xl text-xs max-w-[80%] shadow-sm",
                  msg.side === "right"
                    ? "bg-[#dcf8c6] dark:bg-green-900/60 text-gray-900 dark:text-green-100 rounded-tr-sm"
                    : "bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-tl-sm",
                )}
              >
                {msg.msg}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default WhatsappDemo;
