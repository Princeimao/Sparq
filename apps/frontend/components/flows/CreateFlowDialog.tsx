"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRESET_FIELD_BLOCKS } from "./flowBlocks";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

interface CreateFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: { name: string; blocks: any[] }) => Promise<void>;
}

const PRESETS = [
  {
    id: "order",
    label: "Order Form",
    description: "Collect name, phone & delivery address for orders",
    blockIds: ["name", "phone", "address_line1", "city", "state", "pincode"],
  },
  {
    id: "appointment",
    label: "Appointment Booking",
    description: "Collect name, email, preferred date & time",
    blockIds: ["name", "email", "preferred_date", "preferred_time", "notes"],
  },
  {
    id: "reservation",
    label: "Table Reservation",
    description: "Party size, date, time and contact details",
    blockIds: ["name", "phone", "party_size", "preferred_date", "preferred_time"],
  },
  {
    id: "blank",
    label: "Blank Flow",
    description: "Start from scratch and add fields manually",
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
      const blocks = (preset?.blockIds ?? [])
        .map((blockId) => PRESET_FIELD_BLOCKS.find((b) => b.id === blockId))
        .filter(Boolean);

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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create WhatsApp Flow</DialogTitle>
          <DialogDescription>
            Choose a preset template or start from scratch.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="flow-name">Flow Name</Label>
            <Input
              id="flow-name"
              placeholder="e.g. Customer Order Form"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Presets */}
          <div className="flex flex-col gap-1.5">
            <Label>Start with a template</Label>
            <div className="grid grid-cols-2 gap-3">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() =>
                    setSelectedPreset((prev) =>
                      prev === preset.id ? null : preset.id,
                    )
                  }
                  className={`relative text-left p-4 rounded-xl border-2 transition-all duration-150 ${
                    selectedPreset === preset.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  {selectedPreset === preset.id && (
                    <div className="absolute top-2 right-2 size-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="size-3 text-primary-foreground" />
                    </div>
                  )}
                  <p className="text-sm font-semibold mb-1">{preset.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {preset.description}
                  </p>
                  {preset.blockIds.length > 0 && (
                    <Badge variant="secondary" className="mt-2 text-[10px]">
                      {preset.blockIds.length} fields
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || saving}
          >
            {saving ? (
              <span className="size-4 mr-1.5 animate-spin border-2 border-current border-t-transparent rounded-full inline-block" />
            ) : null}
            Create Flow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
