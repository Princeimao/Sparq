"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
import {
  Plus,
  Trash2,
  ChevronDown,
  GripVertical,
  Eye,
  EyeOff,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { LiveCustomerDevicePreview } from "./LiveCustomerDevicePreview";

export type FieldType =
  | "text"
  | "number"
  | "email"
  | "phone"
  | "select"
  | "date"
  | "time"
  | "textarea"
  | "checkbox"
  | "rating";

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  description?: string;
  required: boolean;
  options?: string[];
}

const FIELD_PALETTE: {
  type: FieldType;
  label: string;
  emoji: string;
  description: string;
}[] = [
    { type: "text", label: "Short Text", emoji: "✏️", description: "Single-line text" },
    { type: "textarea", label: "Long Text", emoji: "📝", description: "Multi-line text" },
    { type: "number", label: "Number", emoji: "🔢", description: "Numeric input" },
    { type: "email", label: "Email", emoji: "📧", description: "Email address" },
    { type: "phone", label: "Phone", emoji: "📱", description: "Phone number" },
    { type: "select", label: "Dropdown", emoji: "📋", description: "Multiple choice" },
    { type: "date", label: "Date", emoji: "📅", description: "Date picker" },
    { type: "time", label: "Time", emoji: "⏰", description: "Time picker" },
    { type: "checkbox", label: "Checkbox", emoji: "☑️", description: "Yes/No toggle" },
    { type: "rating", label: "Rating", emoji: "⭐", description: "Star rating" },
  ];

interface DragFormBuilderProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
}

function FieldItem({
  field,
  index,
  total,
  onUpdate,
  onRemove,
  onDuplicate,
}: {
  field: FormField;
  index: number;
  total: number;
  onUpdate: (id: string, updates: Partial<FormField>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={field}
      id={field.id}
      dragListener={false}
      dragControls={controls}
      className="list-none"
    >
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="border border-border rounded-xl overflow-hidden bg-background shadow-sm"
      >
        {/* Header row */}
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
            {/* Drag handle */}
            <button
              className="cursor-grab active:cursor-grabbing touch-none shrink-0"
              onPointerDown={(e) => controls.start(e)}
            >
              <GripVertical className="size-4 text-muted-foreground" />
            </button>

            <span className="text-base select-none w-6 text-center shrink-0">
              {FIELD_PALETTE.find((f) => f.type === field.type)?.emoji ?? "▤"}
            </span>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{field.label || "(unlabelled)"}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {field.type} · {field.required ? "Required" : "Optional"}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={(e) => { e.stopPropagation(); onDuplicate(field.id); }}
                title="Duplicate"
              >
                <Copy className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-destructive hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); onRemove(field.id); }}
              >
                <Trash2 className="size-3.5" />
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7">
                  <ChevronDown
                    className={`size-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
                  />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          {/* Editor panel */}
          <CollapsibleContent>
            <div className="px-4 pb-4 pt-3 border-t border-border bg-muted/10 grid grid-cols-2 gap-4">
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label className="text-xs">Field Label</Label>
                <Input
                  value={field.label}
                  onChange={(e) => onUpdate(field.id, { label: e.target.value })}
                  placeholder="e.g. Full Name"
                  className="h-8 text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Field Type</Label>
                <Select
                  value={field.type}
                  onValueChange={(v) => onUpdate(field.id, { type: v as FieldType })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_PALETTE.map((f) => (
                      <SelectItem key={f.type} value={f.type}>
                        {f.emoji} {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Placeholder</Label>
                <Input
                  value={field.placeholder ?? ""}
                  onChange={(e) => onUpdate(field.id, { placeholder: e.target.value })}
                  placeholder="Hint text..."
                  className="h-8 text-sm"
                />
              </div>

              <div className="col-span-2 flex flex-col gap-1.5">
                <Label className="text-xs">Help Text <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  value={field.description ?? ""}
                  onChange={(e) => onUpdate(field.id, { description: e.target.value })}
                  placeholder="Help text shown to the user"
                  className="h-8 text-sm"
                />
              </div>

              {field.type === "select" && (
                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label className="text-xs">Options <span className="text-muted-foreground">(one per line)</span></Label>
                  <Textarea
                    value={(field.options ?? []).join("\n")}
                    onChange={(e) =>
                      onUpdate(field.id, {
                        options: e.target.value.split("\n").filter(Boolean),
                      })
                    }
                    rows={4}
                    placeholder={"Option 1\nOption 2\nOption 3"}
                    className="text-sm"
                  />
                </div>
              )}

              <div className="col-span-2 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium">Required</p>
                  <p className="text-[11px] text-muted-foreground">User must fill this field</p>
                </div>
                <Switch
                  checked={field.required}
                  onCheckedChange={(v) => onUpdate(field.id, { required: v })}
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </motion.div>
    </Reorder.Item>
  );
}

export function DragFormBuilder({ fields, onChange }: DragFormBuilderProps) {
  const [showPreview, setShowPreview] = useState(false);

  const addField = useCallback((type: FieldType) => {
    const palette = FIELD_PALETTE.find((f) => f.type === type);
    const newField: FormField = {
      id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      label: palette?.label ?? "New Field",
      required: false,
      placeholder: "",
      options: type === "select" ? ["Option 1", "Option 2"] : undefined,
    };
    onChange([...fields, newField]);
  }, [fields, onChange]);

  const updateField = useCallback((id: string, updates: Partial<FormField>) => {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }, [fields, onChange]);

  const removeField = useCallback((id: string) => {
    onChange(fields.filter((f) => f.id !== id));
  }, [fields, onChange]);

  const duplicateField = useCallback((id: string) => {
    const idx = fields.findIndex((f) => f.id === id);
    if (idx === -1) return;
    const original = fields[idx]!;
    const duplicate: FormField = {
      ...original,
      id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      label: `${original.label} (copy)`,
    };
    const next = [...fields];
    next.splice(idx + 1, 0, duplicate);
    onChange(next);
  }, [fields, onChange]);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left palette */}
      <aside className="w-56 border-r bg-muted/20 overflow-y-auto shrink-0">
        <div className="p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Field Types
          </p>
          {FIELD_PALETTE.map((palette) => (
            <button
              key={palette.type}
              type="button"
              onClick={() => addField(palette.type)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-background hover:bg-accent hover:border-primary/30 text-left transition-all group"
            >
              <span className="text-base select-none">{palette.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{palette.label}</p>
                <p className="text-[10px] text-muted-foreground">{palette.description}</p>
              </div>
              <Plus className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
            </button>
          ))}
        </div>
      </aside>

      {/* Main area */}
      <main className="flex-1 overflow-y-auto p-6">
        {/* Toggle preview */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm font-medium">
              {fields.length === 0
                ? "Drag fields from the left panel"
                : `${fields.length} field${fields.length === 1 ? "" : "s"} · drag to reorder`}
            </p>
            <p className="text-xs text-muted-foreground">
              Drag the ⠿ handle on each field to reorder
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="gap-2"
          >
            {showPreview ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {showPreview ? "Hide Preview" : "Live Preview"}
          </Button>
        </div>

        <div className={`flex gap-6 ${showPreview ? "flex-row" : ""}`}>
          {/* Fields list */}
          <div className={showPreview ? "flex-1" : "w-full max-w-2xl mx-auto"}>
            {fields.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-xl text-center gap-3">
                <span className="text-3xl">📋</span>
                <p className="font-medium">No fields yet</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Click any field type from the left panel to add it here.
                </p>
              </div>
            ) : (
              <Reorder.Group
                axis="y"
                values={fields}
                onReorder={onChange}
                className="flex flex-col gap-3"
              >
                <AnimatePresence>
                  {fields.map((field, idx) => (
                    <FieldItem
                      key={field.id}
                      field={field}
                      index={idx}
                      total={fields.length}
                      onUpdate={updateField}
                      onRemove={removeField}
                      onDuplicate={duplicateField}
                    />
                  ))}
                </AnimatePresence>
              </Reorder.Group>
            )}

            {fields.length > 0 && (
              <button
                type="button"
                onClick={() => addField("text")}
                className="mt-3 w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
              >
                <Plus className="size-4" />
                Add Field
              </button>
            )}
          </div>

          {/* Live Customer Instagram & WhatsApp Device Preview */}
          {showPreview && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="shrink-0 sticky top-2"
            >
              <LiveCustomerDevicePreview
                title="Customer Flow Form"
                description="Live interactive preview of how customers view this form on mobile."
                fields={fields}
              />
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
