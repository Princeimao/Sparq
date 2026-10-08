"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Plus,
  Loader2,
  FormInput,
  MoreVertical,
  Trash2,
  Edit,
  Copy,
  CheckCircle2,
  Circle,
  Globe,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DragFormBuilder, FormField } from "@/components/forms/DragFormBuilder";

type FormPurpose = "ORDER" | "APPOINTMENT" | "RESERVATION" | "LEAD" | "FEEDBACK" | "CUSTOM";

interface CustomForm {
  id: string;
  name: string;
  purpose: FormPurpose;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
}

const purposeConfig: Record<FormPurpose, { label: string; emoji: string; description: string }> = {
  ORDER: { label: "Order Form", emoji: "🛒", description: "Collect product orders" },
  APPOINTMENT: { label: "Appointment", emoji: "📅", description: "Booking & scheduling" },
  RESERVATION: { label: "Reservation", emoji: "🏨", description: "Hotel/table reservations" },
  LEAD: { label: "Lead Capture", emoji: "🎯", description: "Collect customer leads" },
  FEEDBACK: { label: "Feedback", emoji: "⭐", description: "Collect reviews & ratings" },
  CUSTOM: { label: "Custom Form", emoji: "✏️", description: "Build any custom form" },
};

const statusConfig = {
  DRAFT: { label: "Draft", icon: Circle, className: "bg-muted text-muted-foreground" },
  ACTIVE: { label: "Active", icon: CheckCircle2, className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  ARCHIVED: { label: "Archived", icon: Globe, className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
};

export default function FormsPage() {
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingForm, setEditingForm] = useState<CustomForm | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newFormData, setNewFormData] = useState({ name: "", purpose: "CUSTOM" as FormPurpose });
  const [saving, setSaving] = useState(false);

  // Load forms from localStorage (since there may not be a dedicated forms API yet)
  useEffect(() => {
    const stored = localStorage.getItem("sparq_custom_forms");
    if (stored) {
      try {
        setForms(JSON.parse(stored));
      } catch { }
    }
  }, []);

  const saveForms = useCallback((newForms: CustomForm[]) => {
    setForms(newForms);
    localStorage.setItem("sparq_custom_forms", JSON.stringify(newForms));
  }, []);

  const handleCreateForm = () => {
    if (!newFormData.name.trim()) return toast.error("Form name is required");
    const newForm: CustomForm = {
      id: `form_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: newFormData.name.trim(),
      purpose: newFormData.purpose,
      status: "DRAFT",
      fields: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newForm, ...forms];
    saveForms(updated);
    setCreateDialogOpen(false);
    setNewFormData({ name: "", purpose: "CUSTOM" });
    setEditingForm(newForm);
    toast.success("Form created!");
  };

  const handleSaveForm = () => {
    if (!editingForm) return;
    setSaving(true);
    const updated = forms.map((f) =>
      f.id === editingForm.id ? { ...editingForm, updatedAt: new Date().toISOString() } : f
    );
    saveForms(updated);
    setTimeout(() => setSaving(false), 500);
    toast.success("Form saved!");
  };

  const handleDeleteForm = (id: string) => {
    if (!confirm("Delete this form?")) return;
    const updated = forms.filter((f) => f.id !== id);
    saveForms(updated);
    if (editingForm?.id === id) setEditingForm(null);
    toast.success("Form deleted");
  };

  const handleDuplicateForm = (form: CustomForm) => {
    const dup: CustomForm = {
      ...form,
      id: `form_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: `${form.name} (Copy)`,
      status: "DRAFT",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [dup, ...forms];
    saveForms(updated);
    toast.success("Form duplicated!");
  };

  const handleToggleStatus = (form: CustomForm) => {
    const next = form.status === "ACTIVE" ? "DRAFT" : "ACTIVE";
    const updated = forms.map((f) => (f.id === form.id ? { ...f, status: next as any, updatedAt: new Date().toISOString() } : f));
    saveForms(updated);
    if (editingForm?.id === form.id) setEditingForm((prev) => prev ? { ...prev, status: next as any } : null);
    toast.success(`Form ${next === "ACTIVE" ? "activated" : "deactivated"}`);
  };

  const handleFieldsChange = useCallback((fields: FormField[]) => {
    setEditingForm((prev) => prev ? { ...prev, fields } : null);
  }, []);

  // ─── Edit view ───────────────────────────────────────────────────────────────
  if (editingForm) {
    const purposeInfo = purposeConfig[editingForm.purpose];

    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] -m-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background z-10 shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setEditingForm(null)}>
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base">{purposeInfo.emoji}</span>
                <h2 className="text-sm font-semibold">{editingForm.name}</h2>
                <Badge className={`text-[10px] ${statusConfig[editingForm.status]?.className}`}>
                  {editingForm.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {editingForm.fields.length} field{editingForm.fields.length !== 1 ? "s" : ""} · {purposeInfo.label}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggleStatus(editingForm)}
            >
              {editingForm.status === "ACTIVE" ? (
                <><Circle className="size-3.5 mr-1.5" /> Deactivate</>
              ) : (
                <><CheckCircle2 className="size-3.5 mr-1.5" /> Activate</>
              )}
            </Button>
            <Button onClick={handleSaveForm} disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="size-4 mr-1.5" />
              )}
              Save Form
            </Button>
          </div>
        </div>

        {/* Drag Form Builder */}
        <DragFormBuilder fields={editingForm.fields} onChange={handleFieldsChange} />
      </div>
    );
  }

  // ─── List view ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Form Builder</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create drag-and-drop forms for orders, appointments, reservations, and more.
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="py-5 rounded-2xl">
          <Plus className="size-4 mr-2" />
          New Form
        </Button>
      </motion.div>

      {/* Purpose quick-start cards */}
      {forms.length === 0 && (
        <div className="mb-8">
          <p className="text-sm font-medium text-muted-foreground mb-4">Quick Start Templates</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(purposeConfig).map(([purpose, config]) => (
              <motion.button
                key={purpose}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setNewFormData({ name: config.label, purpose: purpose as FormPurpose });
                  setCreateDialogOpen(true);
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/30 transition-all text-center"
              >
                <span className="text-2xl">{config.emoji}</span>
                <p className="text-xs font-medium">{config.label}</p>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {forms.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-muted/5"
        >
          <Layers className="size-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No forms yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Create your first form using the drag-and-drop builder.
          </p>
          <Button onClick={() => setCreateDialogOpen(true)} variant="outline">
            <Plus className="size-4 mr-2" />
            Create Form
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {forms.map((form) => {
            const purposeInfo = purposeConfig[form.purpose];
            const status = statusConfig[form.status];
            const StatusIcon = status.icon;

            return (
              <motion.div
                key={form.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                layout
              >
                <Card
                  className="group cursor-pointer hover:shadow-md hover:ring-2 hover:ring-primary/20 transition-all duration-200"
                  onClick={() => setEditingForm(form)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center size-9 rounded-lg bg-primary/10 text-xl">
                          {purposeInfo.emoji}
                        </div>
                        <CardTitle className="text-sm font-medium truncate max-w-[140px]">
                          {form.name}
                        </CardTitle>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingForm(form); }}>
                            <Edit className="size-3.5 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicateForm(form); }}>
                            <Copy className="size-3.5 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleToggleStatus(form); }}>
                            {form.status === "ACTIVE" ? (
                              <><Circle className="size-3.5 mr-2" />Deactivate</>
                            ) : (
                              <><CheckCircle2 className="size-3.5 mr-2" />Activate</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => { e.stopPropagation(); handleDeleteForm(form.id); }}
                          >
                            <Trash2 className="size-3.5 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`text-[11px] flex items-center gap-1 ${status.className}`}>
                        <StatusIcon className="size-3" />
                        {status.label}
                      </Badge>
                      <Badge variant="outline" className="text-[11px]">
                        {purposeInfo.label}
                      </Badge>
                      <Badge variant="outline" className="text-[11px]">
                        {form.fields.length} fields
                      </Badge>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-3">
                    <span className="text-xs text-muted-foreground">
                      Updated {new Date(form.updatedAt).toLocaleDateString()}
                    </span>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create New Form</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Form Name *</Label>
              <Input
                placeholder="e.g. Hotel Booking Form"
                value={newFormData.name}
                onChange={(e) => setNewFormData((p) => ({ ...p, name: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleCreateForm()}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Form Purpose</Label>
              <Select
                value={newFormData.purpose}
                onValueChange={(v) => setNewFormData((p) => ({ ...p, purpose: v as FormPurpose }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(purposeConfig).map(([value, config]) => (
                    <SelectItem key={value} value={value}>
                      {config.emoji} {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {purposeConfig[newFormData.purpose].description}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateForm}>Create & Edit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
