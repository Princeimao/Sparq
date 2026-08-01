"use client";

import { useState, useCallback } from "react";
import {
  ArrowLeft,
  Save,
  Globe,
  GripVertical,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Pencil,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Separator } from "@/components/ui/separator";
import { PRESET_FIELD_BLOCKS, BLOCK_TYPE_LABELS, BLOCK_TYPE_ICONS } from "./flowBlocks";

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
}

const statusConfig = {
  DRAFT: "bg-muted text-muted-foreground",
  PUBLISHED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  ARCHIVED: "bg-amber-100 text-amber-700",
};

export function FlowBuilder({ flow, onSave, onPublish, onRename, onBack }: FlowBuilderProps) {
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
    const newBlock: FlowBlock = {
      id: `${preset.id}_${Date.now()}`,
      type: preset.type,
      label: preset.label,
      required: preset.required,
      placeholder: (preset as any).placeholder ?? "",
      options: (preset as any).options ? [...(preset as any).options] : undefined,
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
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            {editingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onBlur={handleRenameSubmit}
                  onKeyDown={(e) => e.key === "Enter" && handleRenameSubmit()}
                  autoFocus
                  className="h-7 text-sm font-semibold w-48"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">{flow.name}</h2>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setEditingName(true)}
                >
                  <Pencil className="size-3 text-muted-foreground" />
                </Button>
              </div>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              <Badge className={`text-[10px] ${statusConfig[flow.status]}`}>
                {flow.status === "PUBLISHED" && <CheckCircle2 className="size-2.5 mr-1" />}
                {flow.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {blocks.length} field{blocks.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            {saving ? (
              <span className="size-4 mr-1.5 animate-spin border-2 border-current border-t-transparent rounded-full inline-block" />
            ) : (
              <Save className="size-4 mr-1.5" />
            )}
            Save
          </Button>
          {flow.status !== "PUBLISHED" && (
            <Button onClick={handlePublish} disabled={publishing}>
              {publishing ? (
                <span className="size-4 mr-1.5 animate-spin border-2 border-current border-t-transparent rounded-full inline-block" />
              ) : (
                <Globe className="size-4 mr-1.5" />
              )}
              Publish to WhatsApp
            </Button>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — preset blocks picker */}
        <aside className="w-64 border-r bg-muted/20 overflow-y-auto shrink-0">
          <div className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Pre-built Fields
            </p>
            <div className="flex flex-col gap-2">
              {PRESET_FIELD_BLOCKS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => addPresetBlock(preset)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-background hover:bg-accent hover:border-primary/30 text-left transition-colors group"
                >
                  <span className="text-base select-none">
                    {BLOCK_TYPE_ICONS[preset.type] ?? "▤"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{preset.label}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {BLOCK_TYPE_LABELS[preset.type]}
                    </p>
                  </div>
                  <Plus className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                </button>
              ))}
            </div>

            <Separator className="my-4" />

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={addCustomBlock}
            >
              <Plus className="size-3.5 mr-1.5" />
              Custom Field
            </Button>
          </div>
        </aside>

        {/* Right panel — ordered field list */}
        <main className="flex-1 overflow-y-auto p-6">
          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <div className="size-14 rounded-2xl bg-muted flex items-center justify-center text-2xl">
                📋
              </div>
              <p className="font-medium">No fields yet</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Add fields from the left panel. Each field becomes a question
                asked to your WhatsApp customer.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-w-2xl mx-auto">
              <p className="text-sm text-muted-foreground mb-2">
                Fields are shown to the customer in this order.
              </p>

              {blocks.map((block, idx) => (
                <Collapsible
                  key={block.id}
                  open={expandedBlock === block.id}
                  onOpenChange={(open) =>
                    setExpandedBlock(open ? block.id : null)
                  }
                >
                  <div className="border border-border rounded-xl overflow-hidden">
                    {/* Block header row */}
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-3 px-4 py-3 bg-background hover:bg-muted/30 cursor-pointer transition-colors">
                        <GripVertical className="size-4 text-muted-foreground shrink-0" />
                        <span className="text-base select-none w-6 text-center">
                          {BLOCK_TYPE_ICONS[block.type] ?? "▤"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {block.label || "(unlabelled)"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {BLOCK_TYPE_LABELS[block.type]} ·{" "}
                            {block.required ? "Required" : "Optional"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveBlock(block.id, "up");
                            }}
                            disabled={idx === 0}
                          >
                            <ChevronUp className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveBlock(block.id, "down");
                            }}
                            disabled={idx === blocks.length - 1}
                          >
                            <ChevronDown className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeBlock(block.id);
                            }}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                          <ChevronDown
                            className={`size-4 text-muted-foreground transition-transform ${
                              expandedBlock === block.id ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    {/* Block editor */}
                    <CollapsibleContent>
                      <div className="px-4 pb-4 pt-3 border-t border-border bg-muted/10 grid grid-cols-2 gap-4">
                        {/* Label */}
                        <div className="col-span-2 flex flex-col gap-1.5">
                          <Label className="text-xs">Field Label</Label>
                          <Input
                            value={block.label}
                            onChange={(e) =>
                              updateBlock(block.id, { label: e.target.value })
                            }
                            placeholder="e.g. Full Name"
                            className="h-8 text-sm"
                          />
                        </div>

                        {/* Type */}
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs">Field Type</Label>
                          <Select
                            value={block.type}
                            onValueChange={(v) =>
                              updateBlock(block.id, { type: v })
                            }
                          >
                            <SelectTrigger className="h-8 text-sm">
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

                        {/* Placeholder */}
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs">Placeholder</Label>
                          <Input
                            value={block.placeholder ?? ""}
                            onChange={(e) =>
                              updateBlock(block.id, {
                                placeholder: e.target.value,
                              })
                            }
                            placeholder="Hint text..."
                            className="h-8 text-sm"
                          />
                        </div>

                        {/* Description */}
                        <div className="col-span-2 flex flex-col gap-1.5">
                          <Label className="text-xs">
                            Description{" "}
                            <span className="text-muted-foreground">(optional)</span>
                          </Label>
                          <Input
                            value={block.description ?? ""}
                            onChange={(e) =>
                              updateBlock(block.id, {
                                description: e.target.value,
                              })
                            }
                            placeholder="Help text shown to the user"
                            className="h-8 text-sm"
                          />
                        </div>

                        {/* Options (only for select) */}
                        {block.type === "select" && (
                          <div className="col-span-2 flex flex-col gap-1.5">
                            <Label className="text-xs">
                              Options{" "}
                              <span className="text-muted-foreground">
                                (one per line)
                              </span>
                            </Label>
                            <Textarea
                              value={(block.options ?? []).join("\n")}
                              onChange={(e) =>
                                updateBlock(block.id, {
                                  options: e.target.value
                                    .split("\n")
                                    .filter(Boolean),
                                })
                              }
                              rows={4}
                              placeholder={"Option 1\nOption 2\nOption 3"}
                              className="text-sm"
                            />
                          </div>
                        )}

                        {/* Required toggle */}
                        <div className="col-span-2 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium">Required</p>
                            <p className="text-[11px] text-muted-foreground">
                              User must answer this field
                            </p>
                          </div>
                          <Switch
                            checked={block.required}
                            onCheckedChange={(v) =>
                              updateBlock(block.id, { required: v })
                            }
                          />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}

              {/* Add field shortcut at bottom */}
              <button
                type="button"
                onClick={addCustomBlock}
                className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
              >
                <Plus className="size-4" />
                Add Field
              </button>
            </div>
          )}
        </main>

        {/* Preview panel */}
        <aside className="w-72 border-l bg-muted/10 overflow-y-auto shrink-0">
          <div className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              WhatsApp Preview
            </p>
            <div className="rounded-2xl bg-[#ECE5DD] dark:bg-zinc-800 p-3 flex flex-col gap-2 min-h-64">
              {/* Chat bubble header */}
              <div className="bg-white dark:bg-zinc-700 rounded-xl px-3 py-2 text-xs shadow-sm">
                <p className="font-semibold text-green-700 dark:text-green-400 mb-1">
                  Business
                </p>
                <p className="text-zinc-700 dark:text-zinc-200 leading-5">
                  Hi! Please fill in the form below to continue.
                </p>
              </div>

              {blocks.length > 0 && (
                <div className="bg-white dark:bg-zinc-700 rounded-xl px-3 py-2 shadow-sm flex flex-col gap-2">
                  <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Form Fields
                  </p>
                  {blocks.map((b) => (
                    <div
                      key={b.id}
                      className="bg-zinc-50 dark:bg-zinc-600 rounded-lg px-2.5 py-2"
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-200">
                          {b.label}
                        </p>
                        {b.required && (
                          <span className="text-[9px] text-red-500">*</span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-400">
                        {b.placeholder || BLOCK_TYPE_LABELS[b.type]}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {blocks.length === 0 && (
                <div className="flex items-center justify-center flex-1 py-6">
                  <p className="text-xs text-zinc-400 text-center">
                    Add fields to see a preview
                  </p>
                </div>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              This is a visual representation. Actual appearance may vary.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
