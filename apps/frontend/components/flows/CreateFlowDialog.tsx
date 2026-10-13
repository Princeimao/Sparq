"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PRESET_FIELD_BLOCKS } from "./flowBlocks";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FlowTemplateBlock {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface CreateFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: { name: string; blocks: FlowTemplateBlock[] }) => Promise<void>;
}

const PRESETS = [
  {
    id: "order",
    label: "Order Form",
    description: "Name, phone & delivery address",
    blockIds: ["name", "phone", "address_line1", "city", "state", "pincode"],
  },
  {
    id: "appointment",
    label: "Appointment",
    description: "Name, email, date & time",
    blockIds: ["name", "email", "preferred_date", "preferred_time", "notes"],
  },
  {
    id: "reservation",
    label: "Reservation",
    description: "Party size, date, time & contact",
    blockIds: ["name", "phone", "party_size", "preferred_date", "preferred_time"],
  },
  {
    id: "blank",
    label: "Blank Flow",
    description: "Start from scratch",
    blockIds: [],
  },
];

export function CreateFlowDialog({
  open,
  onOpenChange,
  onCreate,
}: CreateFlowDialogProps) {
  const [name, setName] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setSelectedPreset(null);
    setSaving(false);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const preset = PRESETS.find((p) => p.id === selectedPreset);
      const blocks: FlowTemplateBlock[] = (preset?.blockIds ?? [])
        .map((blockId) => PRESET_FIELD_BLOCKS.find((b) => b.id === blockId))
        .filter((b): b is (typeof PRESET_FIELD_BLOCKS)[number] => !!b)
        .map((b) => ({
          id: b.id,
          type: b.type,
          label: b.label,
          required: b.required,
          ...("placeholder" in b ? { placeholder: b.placeholder as string } : {}),
          ...("options" in b ? { options: [...(b.options as readonly string[])] } : {}),
        }));

      await onCreate({ name: name.trim(), blocks });
      reset();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-lg rounded-[1.6rem] bg-paper border-0 p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight text-ink">
            New flow
          </DialogTitle>
          <DialogDescription className="text-[13px] text-ink/55">
            Name it, pick a starting template, then shape the fields in the builder.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/45 mb-1.5">
              Flow name
            </span>
            <input
              id="flow-name"
              placeholder="e.g. Table booking form"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full rounded-2xl bg-ink/[0.05] px-4 py-3 text-sm font-medium text-ink placeholder:text-ink/30 placeholder:font-normal focus:outline-none focus:bg-ink/[0.08] transition-colors"
            />
          </div>

          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/45 mb-1.5">
              Template
            </span>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((preset) => {
                const on = selectedPreset === preset.id;
                return (
                  <motion.button
                    key={preset.id}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() =>
                      setSelectedPreset((prev) =>
                        prev === preset.id ? null : preset.id,
                      )
                    }
                    aria-pressed={on}
                    className={cn(
                      "relative text-left p-3.5 rounded-[1.2rem] transition-colors",
                      on ? "bg-ink text-white" : "bg-ink/[0.05] hover:bg-ink/[0.09]",
                    )}
                  >
                    {on && (
                      <span className="absolute top-2.5 right-2.5 size-5 rounded-full bg-white flex items-center justify-center">
                        <Check className="size-3 text-ink" strokeWidth={3} />
                      </span>
                    )}
                    <p className={cn("text-[13px] font-semibold", on ? "text-white" : "text-ink")}>
                      {preset.label}
                    </p>
                    <p className={cn("text-[11px] mt-0.5 leading-snug", on ? "text-white/60" : "text-ink/50")}>
                      {preset.description}
                    </p>
                    {preset.blockIds.length > 0 && (
                      <span
                        className={cn(
                          "inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full",
                          on ? "bg-white/15 text-white" : "bg-ink/10 text-ink/60",
                        )}
                      >
                        {preset.blockIds.length} fields
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="h-11 px-5 rounded-full text-sm font-medium text-ink/60 hover:text-ink hover:bg-ink/[0.06] transition-colors"
          >
            Cancel
          </button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleCreate}
            disabled={!name.trim() || saving}
            className="h-11 inline-flex items-center gap-2 rounded-full bg-ink px-6 text-sm font-medium text-white hover:bg-brand transition-colors disabled:opacity-40"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Create & edit
          </motion.button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
