"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { api } from "@/lib/api";
import { Plus, Package, Pencil, Trash2, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ProductDrawer } from "@/components/products/ProductDrawer";
import { ProductWizard } from "@/components/wizards/ProductWizard";
import { SlidePills } from "@/components/bits/SlidePills";
import { useConfirm } from "@/components/ui/confirm";
import { cn } from "@/lib/utils";

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  stock: number;
  sku?: string;
}

const EASE = [0.22, 1, 0.36, 1] as const;

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
  }).format(n);

type StockFilter = "all" | "in" | "low" | "out";

function stockState(stock: number): "in" | "low" | "out" {
  if (stock <= 0) return "out";
  if (stock <= 5) return "low";
  return "in";
}

const STOCK_PILL: Record<string, string> = {
  in: "bg-brand/15 text-brand-deep",
  low: "bg-amber-500/15 text-amber-700",
  out: "bg-red-500/15 text-red-700",
};

const STOCK_LABEL: Record<string, (s: number) => string> = {
  in: (s) => `${s} in stock`,
  low: (s) => `Only ${s} left`,
  out: () => "Out of stock",
};

export default function ProductsPage() {
  const reduceMotion = useReducedMotion();
  const confirmAction = useConfirm();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StockFilter>("all");

  const fetchProducts = useCallback(async () => {
    const res = await api.get(`/products`);
    return res.data.data.products;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await fetchProducts();
        if (!cancelled) setProducts(list);
      } catch {
        if (!cancelled) toast.error("Failed to load products");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchProducts]);

  const handleDelete = async (productId: string, productName: string) => {
    const ok = await confirmAction({
      title: `Delete ${productName}?`,
      body: "It disappears from your catalog and WhatsApp orders immediately.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`/products/${productId}`);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      toast.success("Product deleted successfully");
    } catch {
      toast.error("Failed to delete product");
    }
  };

  const handleSaveProduct = (savedProduct: Product, isUpdate: boolean) => {
    if (isUpdate) {
      setProducts((prev) =>
        prev.map((p) => (p.id === savedProduct.id ? savedProduct : p)),
      );
    } else {
      setProducts((prev) => [savedProduct, ...prev]);
    }
    setDrawerOpen(false);
  };

  const openCreateDrawer = () => {
    setSelectedProduct(null);
    setWizardOpen(true);
  };

  const openUpdateDrawer = (product: Product) => {
    setSelectedProduct(product);
    setDrawerOpen(true);
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (filter !== "all" && stockState(p.stock) !== filter) return false;
      if (q && !`${p.name} ${p.sku ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, query, filter]);

  const counts = useMemo(
    () => ({
      all: products.length,
      in: products.filter((p) => stockState(p.stock) === "in").length,
      low: products.filter((p) => stockState(p.stock) === "low").length,
      out: products.filter((p) => stockState(p.stock) === "out").length,
    }),
    [products],
  );

  return (
    <div className="relative p-6 max-w-7xl mx-auto space-y-5">
      {!reduceMotion && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-0 size-72 rounded-full bg-brand/10 blur-[110px]"
          animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Header */}
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="relative flex flex-col sm:flex-row sm:items-end gap-4"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
            Catalog · {products.length} product{products.length === 1 ? "" : "s"}
          </p>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] text-ink mt-1">
            Products
          </h1>
          <p className="text-[15px] text-ink/55 mt-1.5">
            Everything customers can order over WhatsApp.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-ink/40" />
            <input
              placeholder="Search products…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search products"
              className="pl-8 h-10 w-44 rounded-full text-xs font-medium bg-ink/[0.05] text-ink placeholder:text-ink/35 focus:outline-none focus:bg-ink/[0.08] transition-colors"
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={openCreateDrawer}
            className="h-10 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-medium text-white hover:bg-brand transition-colors"
          >
            <Plus className="size-4" /> Add product
          </motion.button>
        </div>
      </motion.div>

      {/* Stock filter */}
      <div className="relative">
        <SlidePills
          id="products-stock"
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: <>All <span className="tabular-nums opacity-70">{counts.all}</span></> },
            { value: "in", label: <>In stock <span className="tabular-nums opacity-70">{counts.in}</span></> },
            { value: "low", label: <>Low <span className="tabular-nums opacity-70">{counts.low}</span></> },
            { value: "out", label: <>Out <span className="tabular-nums opacity-70">{counts.out}</span></> },
          ]}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-[1.4rem] bg-ink/[0.045] animate-pulse overflow-hidden">
              <div className="aspect-[4/3] bg-ink/[0.05]" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-2/3 rounded-full bg-ink/10" />
                <div className="h-4 w-1/3 rounded-full bg-ink/10" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex flex-col items-center justify-center py-20 text-center rounded-[1.6rem] bg-ink/[0.035]"
        >
          <span className="flex size-14 items-center justify-center rounded-[1.2rem] bg-ink text-white">
            <Package className="size-7" />
          </span>
          <h3 className="text-lg font-semibold text-ink mt-4">No products yet</h3>
          <p className="text-sm text-ink/50 mt-1 mb-5">
            Add your first product to start selling on WhatsApp.
          </p>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={openCreateDrawer}
            className="h-11 inline-flex items-center gap-1.5 rounded-full bg-ink px-5 text-sm font-medium text-white hover:bg-brand transition-colors"
          >
            <Plus className="size-4" /> Add product
          </motion.button>
        </motion.div>
      ) : visible.length === 0 ? (
        <div className="relative py-16 text-center">
          <p className="font-medium text-sm text-ink">Nothing matches</p>
          <p className="text-xs text-ink/50 mt-1">Try a different search or filter.</p>
        </div>
      ) : (
        <motion.div layout className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          <AnimatePresence mode="popLayout">
            {visible.map((product, i) => {
              const state = stockState(product.stock);
              return (
                <motion.article
                  key={product.id}
                  layout
                  initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.35, ease: EASE }}
                  className="group rounded-[1.4rem] bg-ink/[0.045] hover:bg-ink/[0.065] transition-colors overflow-hidden flex flex-col"
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-ink/[0.05]">
                    {product.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        className={cn(
                          "size-full object-cover transition-transform duration-500 group-hover:scale-[1.05]",
                          state === "out" && "grayscale opacity-70",
                        )}
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Package className="size-10 text-ink/20" />
                      </span>
                    )}
                    <span
                      className={cn(
                        "absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-semibold",
                        STOCK_PILL[state],
                        state === "in" && "bg-white/90 text-ink",
                      )}
                    >
                      {STOCK_LABEL[state](product.stock)}
                    </span>
                    <span className="absolute right-2.5 top-2.5 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button
                        onClick={() => openUpdateDrawer(product)}
                        aria-label={`Edit ${product.name}`}
                        className="flex size-8 items-center justify-center rounded-full bg-white/95 text-ink hover:bg-white transition-colors"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id, product.name)}
                        aria-label={`Delete ${product.name}`}
                        className="flex size-8 items-center justify-center rounded-full bg-white/95 text-ink hover:bg-red-600 hover:text-white transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </span>
                  </div>
                  {/* Body */}
                  <div className="p-4 flex flex-col gap-1 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-[15px] tracking-tight text-ink leading-snug line-clamp-1">
                        {product.name}
                      </h3>
                      <p className="text-[15px] font-bold tabular-nums text-ink shrink-0">
                        {inr(product.price)}
                      </p>
                    </div>
                    {product.sku && (
                      <p className="text-[11px] text-ink/40 font-mono">SKU {product.sku}</p>
                    )}
                    <p className="text-[13px] text-ink/50 leading-relaxed line-clamp-2 min-h-10">
                      {product.description || "No description yet."}
                    </p>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      <ProductDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        product={selectedProduct}
        onSave={handleSaveProduct}
      />
      <ProductWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onCreated={(p) => setProducts((prev) => [p, ...prev])}
      />
    </div>
  );
}
