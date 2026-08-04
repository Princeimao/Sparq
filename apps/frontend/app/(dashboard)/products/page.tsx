"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { api } from "@/lib/api";
import { Loader2, Plus, Package, Edit, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ProductDrawer } from "@/components/products/ProductDrawer";

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  stock: number;
  sku?: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const fetchProducts = useCallback(async () => {
    const res = await api.get(`/products`);
    return res.data.products;
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);

      try {
        const products = await fetchProducts();
        setProducts(products);
      } catch {
        toast.error("Failed to load products");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [fetchProducts]);

  const handleDelete = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
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
    setDrawerOpen(true);
  };

  const openUpdateDrawer = (product: Product) => {
    setSelectedProduct(product);
    setDrawerOpen(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your catalog of products and services.
          </p>
        </div>
        <Button onClick={openCreateDrawer}>
          <Plus className="size-4 mr-2" />
          Add Product
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl bg-muted/5">
          <Package className="size-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No products found</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Add your first product to get started.
          </p>
          <Button onClick={openCreateDrawer} variant="outline">
            <Plus className="size-4 mr-2" />
            Add Product
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <Card
              key={product.id}
              className="overflow-hidden flex flex-col hover:shadow-md transition-all duration-200"
            >
              {product.image ? (
                <div className="relative w-full h-48 bg-muted">
                  {/* Note: since image domain isn't configured, we use standard img tag or unoptimized next/image */}
                  <img
                    src={product.image}
                    alt={product.name}
                    className="object-cover w-full h-full"
                  />
                </div>
              ) : (
                <div className="relative w-full h-48 bg-muted flex items-center justify-center">
                  <Package className="size-10 text-muted-foreground/30" />
                </div>
              )}
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-lg truncate">
                  {product.name}
                </CardTitle>
                {product.sku && (
                  <p className="text-xs text-muted-foreground font-mono">
                    SKU: {product.sku}
                  </p>
                )}
              </CardHeader>
              <CardContent className="p-4 pt-0 flex-1">
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-10">
                  {product.description || "No description provided."}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-semibold text-lg text-primary">
                    ${product.price.toFixed(2)}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${product.stock > 0 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}
                  >
                    {product.stock > 0
                      ? `${product.stock} in stock`
                      : "Out of stock"}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0 border-t flex items-center gap-2 mt-auto bg-muted/20">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={() => openUpdateDrawer(product)}
                >
                  <Edit className="size-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(product.id)}
                >
                  <Trash2 className="size-4 mr-2" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <ProductDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        product={selectedProduct}
        onSave={handleSaveProduct}
      />
    </div>
  );
}
