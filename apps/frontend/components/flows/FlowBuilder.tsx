"use client";

import { useState, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlignLeft,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  CalendarDays,
  Check,
  Clock3,
  Hash,
  ListChecks,
  Lock,
  Mail,
  Pencil,
  Phone,
  Plus,
  Save,
  Send,
  Trash2,
  Type,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PRESET_FIELD_BLOCKS, BLOCK_TYPE_LABELS } from "./flowBlocks";
import { cn } from "@/lib/utils";

export interface FlowBlock {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  description?: string;
  options?: string[];
}

interface FlowBuilderProps {
  flow: {
    id: string;
    name: string;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    flowSchema: { version: number; blocks: FlowBlock[] };
    endpointUrl?: string;
  };
  onSave: (blocks: FlowBlock[]) => Promise<void>;
  onPublish: () => Promise<void>;
  onRename: (name: string) => Promise<void>;
  onBack: () => void;
  publishLocked?: boolean;
}

const EASE = [0.22, 1, 0.36, 1] as const;

const TYPE_ICONS: Record<string, React.ReactNode> = {
  text: <Type className="size-4" />,
  phone: <Phone className="size-4" />,
  email: <Mail className="size-4" />,
  number: <Hash className="size-4" />,
  date: <CalendarDays className="size-4" />,
  time: <Clock3 className="size-4" />,
  textarea: <AlignLeft className="size-4" />,
  select: <ListChecks className="size-4" />,
};

const statusTone = {
  DRAFT: "bg-ink/10 text-ink/60",
  PUBLISHED: "bg-brand/15 text-brand-deep",
  ARCHIVED: "bg-amber-500/15 text-amber-700",
};

export function FlowBuilder({ flow, onSave, onPublish, onRename, onBack, publishLocked = false }: FlowBuilderProps) {
  const reduceMotion = useReducedMotion();
  const [blocks, setBlocks] = useState<FlowBlock[]>(
    flow.flowSchema?.blocks ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(flow.name);
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);

  // ─── Block Mutations ─────────────────────────────────────────────────────

  const addPresetBlock = useCallback((preset: typeof PRESET_FIELD_BLOCKS[number]) => {
    const extra = preset as Partial<Pick<FlowBlock, "placeholder" | "options">>;
    const newBlock: FlowBlock = {
      id: `${preset.id}_${Date.now()}`,
      type: preset.type,
      label: preset.label,
      required: preset.required,
      placeholder: extra.placeholder ?? "",
      options: extra.options ? [...extra.options] : undefined,
    };
    setBlocks((prev) => [...prev, newBlock]);
    setExpandedBlock(newBlock.id);
  }, []);

  const addCustomBlock = useCallback(() => {
    const newBlock: FlowBlock = {
      id: `custom_${Date.now()}`,
      type: "text",
      label: "New Field",
      required: false,
      placeholder: "",
    };
    setBlocks((prev) => [...prev, newBlock]);
    setExpandedBlock(newBlock.id);
  }, []);

  const updateBlock = useCallback(
    (id: string, updates: Partial<FlowBlock>) => {
      setBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...updates } : b)),
      );
    },
    [],
  );

  const removeBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const moveBlock = useCallback((id: string, direction: "up" | "down") => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx]!, next[idx]!];
      return next;
    });
  }, []);

  // ─── Save / Publish ──────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(blocks);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await handleSave();
      await onPublish();
    } finally {
      setPublishing(false);
    }
  };

  const handleRenameSubmit = async () => {
    if (nameValue.trim() && nameValue !== flow.name) {
      await onRename(nameValue.trim());
    }
    setEditingName(false);
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-[calc(100vh-13rem)] rounded-[1.6rem] bg-ink/[0.035] overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            aria-label="Back to flows"
            className="size-9 rounded-full flex items-center justify-center text-ink/60 hover:text-ink hover:bg-ink/[0.06] transition-colors shrink-0"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="min-w-0">
            {editingName ? (
              <input
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => e.key === "Enter" && handleRenameSubmit()}
                autoFocus
                aria-label="Flow name"
                className="h-8 text-sm font-semibold w-48 rounded-xl bg-white px-3 focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            ) : (
              <div className="flex items-center gap-1.5">
                <h2 className="text-[15px] font-semibold tracking-tight text-ink truncate">
                  {flow.name}
                </h2>
                <button
                  onClick={() => setEditingName(true)}
                  aria-label="Rename flow"
                  className="p-1.5 rounded-full text-ink/40 hover:text-ink hover:bg-ink/[0.06] transition-colors shrink-0"
                >
                  <Pencil className="size-3" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Badge className={cn("text-[10px] font-semibold border-0", statusTone[flow.status])}>
                {flow.status}
              </Badge>
              <span className="text-xs text-ink/45 tabular-nums">
                {blocks.length} field{blocks.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleSave}
            disabled={saving}
            className="h-10 inline-flex items-center gap-1.5 rounded-full px-4 text-[13px] font-medium text-ink/70 hover:text-ink hover:bg-ink/[0.06] transition-colors disabled:opacity-50"
          >
            {saving ? (
              <span className="size-3.5 animate-spin border-2 border-current border-t-transparent rounded-full inline-block" />
            ) : (
              <Save className="size-3.5" />
            )}
            Save
          </motion.button>
          {flow.status !== "PUBLISHED" && (
            <motion.button
              whileTap={publishLocked ? undefined : { scale: 0.96 }}
              onClick={handlePublish}
              disabled={publishing || publishLocked}
              title={publishLocked ? "Publishing unlocks when Meta clears this number" : "Publish to WhatsApp"}
              className="h-10 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-medium text-white transition-colors hover:bg-brand disabled:opacity-40"
            >
              {publishing ? (
                <span className="size-3.5 animate-spin border-2 border-current border-t-transparent rounded-full inline-block" />
              ) : publishLocked ? (
                <Lock className="size-3.5" />
              ) : (
                <Send className="size-3.5" />
              )}
              Publish
            </motion.button>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        {/* Left panel — preset blocks picker */}
        <aside className="lg:w-64 lg:shrink-0 overflow-y-auto">
          <div className="p-4">
            <p className="text-[11px] font-semibold text-ink/45 uppercase tracking-[0.14em] mb-2.5 px-1">
              Add fields
            </p>
            <div className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-1">
              {PRESET_FIELD_BLOCKS.map((preset, i) => (
                <motion.button
                  key={preset.id}
                  type="button"
                  initial={reduceMotion ? false : { opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.3 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => addPresetBlock(preset)}
                  className="flex items-center gap-2.5 pl-2 pr-3 py-2 rounded-2xl bg-white hover:bg-ink hover:text-white text-left transition-colors group shrink-0 lg:shrink"
                >
                  <span className="flex size-8 items-center justify-center rounded-xl bg-ink/[0.06] text-ink group-hover:bg-white/15 group-hover:text-white transition-colors shrink-0">
                    {TYPE_ICONS[preset.type] ?? <Type className="size-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold truncate">{preset.label}</span>
                    <span className="block text-[10px] opacity-60">
                      {BLOCK_TYPE_LABELS[preset.type]}
                    </span>
                  </span>
                  <Plus className="size-3.5 opacity-0 group-hover:opacity-100 shrink-0 ml-auto" />
                </motion.button>
              ))}
            </div>

            <button
              onClick={addCustomBlock}
              className="mt-2 w-full h-10 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-ink/[0.05] hover:bg-ink/[0.09] text-[13px] font-medium text-ink transition-colors"
            >
              <Plus className="size-3.5" />
              Custom field
            </button>
          </div>
        </aside>

        {/* Center — ordered field list */}
        <main className="flex-1 overflow-y-auto p-4 min-h-64">
          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-64 gap-3 text-center py-10">
              <motion.span
                initial={reduceMotion ? false : { scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className="flex size-14 items-center justify-center rounded-[1.2rem] bg-ink text-white text-2xl"
              >
                ☰
              </motion.span>
              <p className="font-semibold text-ink">No fields yet</p>
              <p className="text-sm text-ink/50 max-w-xs">
                Add fields from the panel. The customer fills them all in one
                WhatsApp screen — no back-and-forth.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 max-w-2xl mx-auto">
              <p className="text-[13px] text-ink/50 px-1">
                Shown to the customer in this order.
              </p>

              <AnimatePresence mode="popLayout" initial={false}>
                {blocks.map((block, idx) => (
                  <motion.div
                    key={block.id}
                    layout
                    initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.28, ease: EASE }}
                  >
                    <Collapsible
                      open={expandedBlock === block.id}
                      onOpenChange={(open) =>
                        setExpandedBlock(open ? block.id : null)
                      }
                    >
                      <div
                        className={cn(
                          "rounded-[1.2rem] overflow-hidden transition-colors",
                          expandedBlock === block.id ? "bg-ink text-white" : "bg-white",
                        )}
                      >
                        {/* Block header row */}
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center gap-2.5 px-3.5 py-3 cursor-pointer">
                            <span
                              className={cn(
                                "flex size-8 items-center justify-center rounded-xl shrink-0",
                                expandedBlock === block.id
                                  ? "bg-white/10 text-white"
                                  : "bg-ink/[0.06] text-ink",
                              )}
                            >
                              {TYPE_ICONS[block.type] ?? <Type className="size-4" />}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p
                                className={cn(
                                  "text-sm font-semibold truncate",
                                  expandedBlock === block.id ? "text-white" : "text-ink",
                                )}
                              >
                                {block.label || "(unlabelled)"}
                              </p>
                              <p
                                className={cn(
                                  "text-[11px]",
                                  expandedBlock === block.id ? "text-white/55" : "text-ink/45",
                                )}
                              >
                                {BLOCK_TYPE_LABELS[block.type]} ·{" "}
                                {block.required ? "Required" : "Optional"}
                              </p>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                aria-label="Move up"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveBlock(block.id, "up");
                                }}
                                disabled={idx === 0}
                                className="p-1.5 rounded-full opacity-60 hover:opacity-100 disabled:opacity-20 transition-opacity"
                              >
                                <ArrowUp className="size-3.5" />
                              </button>
                              <button
                                aria-label="Move down"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveBlock(block.id, "down");
                                }}
                                disabled={idx === blocks.length - 1}
                                className="p-1.5 rounded-full opacity-60 hover:opacity-100 disabled:opacity-20 transition-opacity"
                              >
                                <ArrowDown className="size-3.5" />
                              </button>
                              <button
                                aria-label="Delete field"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeBlock(block.id);
                                }}
                                className="p-1.5 rounded-full opacity-60 hover:opacity-100 hover:text-red-500 transition-all"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                              <ChevronDown
                                className={cn(
                                  "size-4 opacity-60 transition-transform duration-300",
                                  expandedBlock === block.id && "rotate-180",
                                )}
                              />
                            </div>
                          </div>
                        </CollapsibleTrigger>

                        {/* Block editor */}
                        <CollapsibleContent>
                          <div className="px-3.5 pb-3.5 pt-1 grid grid-cols-2 gap-2.5">
                            <div className="col-span-2">
                              <FieldLabel light>Field label</FieldLabel>
                              <EditorInput
                                light
                                value={block.label}
                                onChange={(v) => updateBlock(block.id, { label: v })}
                                placeholder="e.g. Full name"
                              />
                            </div>
                            <div>
                              <FieldLabel light>Field type</FieldLabel>
                              <Select
                                value={block.type}
                                onValueChange={(v) =>
                                  updateBlock(block.id, { type: v })
                                }
                              >
                                <SelectTrigger className="h-10 text-sm rounded-2xl bg-white/10! border-0 text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(BLOCK_TYPE_LABELS).map(
                                    ([type, label]) => (
                                      <SelectItem key={type} value={type}>
                                        {label}
                                      </SelectItem>
                                    ),
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <FieldLabel light>Placeholder</FieldLabel>
                              <EditorInput
                                light
                                value={block.placeholder ?? ""}
                                onChange={(v) =>
                                  updateBlock(block.id, { placeholder: v })
                                }
                                placeholder="Hint text…"
                              />
                            </div>
                            <div className="col-span-2">
                              <FieldLabel light>
                                Description <span className="opacity-60">(optional)</span>
                              </FieldLabel>
                              <EditorInput
                                light
                                value={block.description ?? ""}
                                onChange={(v) =>
                                  updateBlock(block.id, { description: v })
                                }
                                placeholder="Help text shown to the customer"
                              />
                            </div>
                            {block.type === "select" && (
                              <div className="col-span-2">
                                <FieldLabel light>
                                  Options <span className="opacity-60">(one per line)</span>
                                </FieldLabel>
                                <Textarea
                                  value={(block.options ?? []).join("\n")}
                                  onChange={(e) =>
                                    updateBlock(block.id, {
                                      options: e.target.value
                                        .split("\n")
                                        .filter(Boolean),
                                    })
                                  }
                                  rows={3}
                                  placeholder={"Option 1\nOption 2\nOption 3"}
                                  className="text-sm rounded-2xl bg-white/10! border-0 text-white placeholder:text-white/35 focus-visible:ring-brand"
                                />
                              </div>
                            )}
                            <div className="col-span-2 flex items-center justify-between rounded-2xl bg-white/[0.07] px-3.5 py-2.5">
                              <div>
                                <p className="text-[13px] font-medium text-white">Required</p>
                                <p className="text-[11px] text-white/55">
                                  Customer must answer this
                                </p>
                              </div>
                              <Switch
                                checked={block.required}
                                onCheckedChange={(v) =>
                                  updateBlock(block.id, { required: v })
                                }
                                aria-label="Required field"
                              />
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  </motion.div>
                ))}
              </AnimatePresence>

              <button
                type="button"
                onClick={addCustomBlock}
                className="flex items-center justify-center gap-2 py-3.5 rounded-[1.2rem] bg-ink/[0.05] hover:bg-ink/[0.09] text-sm font-medium text-ink transition-colors"
              >
                <Plus className="size-4" />
                Add field
              </button>
            </div>
          )}
        </main>

        {/* Right — live WhatsApp preview */}
        <aside className="lg:w-72 shrink-0 overflow-y-auto">
          <div className="p-4 lg:sticky lg:top-0">
            <p className="text-[11px] font-semibold text-ink/45 uppercase tracking-[0.14em] mb-2.5 px-1">
              Customer sees
            </p>
            <div className="rounded-[1.4rem] bg-ink text-white p-3.5">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key="intro"
                  layout
                  className="rounded-2xl bg-white/[0.08] px-3 py-2.5"
                >
                  <p className="text-[10px] font-semibold text-brand uppercase tracking-wider mb-0.5">
                    Your business
                  </p>
                  <p className="text-xs text-white/85 leading-relaxed">
                    Hi! Tap below and fill this in one go. 👇
                  </p>
                </motion.div>
                {blocks.map((b) => (
                  <motion.div
                    key={b.id}
                    layout
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.25, ease: EASE }}
                    className="rounded-2xl bg-white/[0.08] px-3 py-2 mt-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold text-white truncate">
                        {b.label || "(unlabelled)"}
                      </p>
                      {b.required && (
                        <span className="text-[10px] font-bold text-red-400">*</span>
                      )}
                    </div>
                    <p className="text-[10px] text-white/45 truncate mt-0.5">
                      {b.placeholder || BLOCK_TYPE_LABELS[b.type]}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
              {blocks.length === 0 && (
                <p className="text-[11px] text-white/40 text-center py-4">
                  Fields appear here live as you add them.
                </p>
              )}
              <motion.div layout className="mt-2.5 rounded-2xl bg-brand py-2.5 text-center">
                <p className="text-xs font-semibold text-white flex items-center justify-center gap-1.5">
                  <Check className="size-3.5" strokeWidth={3} /> Submit
                </p>
              </motion.div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function FieldLabel({ light, children }: { light?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "block text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5",
        light ? "text-white/55" : "text-ink/45",
      )}
    >
      {children}
    </span>
  );
}

function EditorInput({
  light,
  value,
  onChange,
  placeholder,
}: {
  light?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "w-full h-10 rounded-2xl px-3.5 text-sm font-medium focus:outline-none transition-colors",
        light
          ? "bg-white/10 text-white placeholder:text-white/35 focus:bg-white/[0.14]"
          : "bg-ink/[0.05] text-ink placeholder:text-ink/30 focus:bg-ink/[0.08]",
      )}
    />
  );
}
