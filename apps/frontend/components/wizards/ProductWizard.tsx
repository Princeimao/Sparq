"use client";

import { useRef } from "react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropzoneUploader } from "@/components/uploads/DropzoneUploader";
import { ReadableImage } from "@/components/uploads/ReadableImage";
import { WizardDialog, type WizardStepDef } from "./WizardDialog";
import type { Product } from "@/app/(dashboard)/products/page";

interface Draft {
  name: string;
  description: string;
  image: string;
  price: string;
  stock: string;
}

const fresh = (): Draft => ({
  name: "",
  description: "",
  image: "",
  price: "",
  stock: "0",
});

function req(v: string, msg: string): string | null {
  return v.trim() ? null : msg;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-zinc-200/60 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right break-words max-w-55">{value || "—"}</span>
    </div>
  );
}

export function ProductWizard({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (product: Product) => void;
}) {
  const createdRef = useRef<Product | null>(null);

  const steps: WizardStepDef<Draft>[] = [
    {
      id: "details",
      title: "Details",
      hint: "What are you selling?",
      render: (d, onChange) => (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pw-name">Product name *</Label>
            <Input
              id="pw-name"
              value={d.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. Birthday cake"
              className="rounded-xl"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw-desc">Description</Label>
            <Textarea
              id="pw-desc"
              value={d.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Flavours, sizes, what makes it special…"
              rows={3}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Photo</Label>
            <DropzoneUploader
              purpose="products"
              value={d.image.trim() ? [d.image.trim()] : []}
              onChange={(urls) => onChange({ image: urls[0] ?? "" })}
              label="Drop a photo here"
              sublabel="or click to browse — uploads straight to your bucket"
            />
            <div className="flex gap-2 items-center">
              <Input
                id="pw-image"
                value={d.image}
                onChange={(e) => onChange({ image: e.target.value })}
                placeholder="…or paste an image URL"
                className="rounded-xl"
              />
              {d.image.trim() && (
                <ReadableImage
                  src={d.image.trim()}
                  alt=""
                  className="size-10 rounded-xl shrink-0"
                />
              )}
            </div>
          </div>
        </div>
      ),
      validate: (d) => req(d.name, "Give your product a name to continue."),
    },
    {
      id: "pricing",
      title: "Price & stock",
      hint: "What does it cost?",
      render: (d, onChange) => (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pw-price">Price (₹) *</Label>
            <Input
              id="pw-price"
              type="number"
              min="0"
              step="0.01"
              value={d.price}
              onChange={(e) => onChange({ price: e.target.value })}
              placeholder="0.00"
              className="rounded-xl"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw-stock">Opening stock</Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Decrease stock"
                onClick={() =>
                  onChange({ stock: String(Math.max(0, (parseInt(d.stock, 10) || 0) - 1)) })
                }
                className="size-9 rounded-xl border border-zinc-200 text-lg leading-none hover:border-zinc-900 transition-colors"
              >
                −
              </button>
              <Input
                id="pw-stock"
                type="number"
                min="0"
                value={d.stock}
                onChange={(e) => onChange({ stock: e.target.value })}
                className="rounded-xl text-center tabular-nums"
              />
              <button
                type="button"
                aria-label="Increase stock"
                onClick={() => onChange({ stock: String((parseInt(d.stock, 10) || 0) + 1) })}
                className="size-9 rounded-xl border border-zinc-200 text-lg leading-none hover:border-zinc-900 transition-colors"
              >
                +
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              WhatsApp orders decrement stock automatically.
            </p>
          </div>
        </div>
      ),
      validate: (d) => {
        const p = parseFloat(d.price);
        if (d.price.trim() === "" || Number.isNaN(p) || p < 0)
          return "Enter a valid price (0 or more).";
        const s = parseInt(d.stock, 10);
        if (d.stock.trim() === "" || Number.isNaN(s) || s < 0)
          return "Stock must be 0 or more.";
        return null;
      },
    },
    {
      id: "review",
      title: "Review",
      hint: "Ready to list it?",
      render: (d) => (
        <div className="rounded-2xl border border-zinc-200/80 bg-white px-4 py-2">
          <SummaryRow label="Name" value={d.name.trim()} />
          <SummaryRow label="Description" value={d.description.trim()} />
          <SummaryRow
            label="Price"
            value={d.price.trim() ? `₹${parseFloat(d.price).toFixed(2)}` : "—"}
          />
          <SummaryRow label="Stock" value={`${parseInt(d.stock, 10) || 0} units`} />
        </div>
      ),
    },
  ];

  return (
    <WizardDialog<Draft>
      open={open}
      onOpenChange={onOpenChange}
      title="New product"
      subtitle="List it once — sell it on WhatsApp forever."
      steps={steps}
      initialData={fresh()}
      freshData={fresh}
      submitLabel="Create product"
      onSubmit={async (d) => {
        const res = await api.post(`/products`, {
          name: d.name.trim(),
          description: d.description.trim() || undefined,
          price: parseFloat(d.price),
          stock: parseInt(d.stock, 10) || 0,
          image: d.image.trim() || undefined,
        });
        const product = res.data.data.product as Product;
        createdRef.current = product;
        return {
          title: `${product.name} is live!`,
          message: "Customers can now order it over WhatsApp.",
        };
      }}
      onDone={() => {
        if (createdRef.current) onCreated(createdRef.current);
      }}
    />
  );
}
