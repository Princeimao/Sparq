"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Users,
  Edit,
  Trash2,
  Search,
  ShoppingBag,
  CalendarCheck,
  MessageCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  listCustomers,
  deleteCustomer,
  type Customer,
} from "@/lib/customers";

export default function CustomersPage() {
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (page: number, limit: number, q: string) => {
      setLoading(true);
      try {
        const res = await listCustomers({
          page,
          limit,
          search: q || undefined,
        });
        setCustomers(res.customers);
        setPagination(res.pagination);
      } catch {
        toast.error("Failed to load customers");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    load(pagination.page, pagination.limit, debouncedSearch);
  }, [load, pagination.page, pagination.limit, debouncedSearch]);

  const changePage = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return;
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleDelete = async (customerId: string) => {
    if (!confirm("Delete this customer? Linked orders and bookings are kept.")) return;
    try {
      await deleteCustomer(customerId);
      setCustomers((prev) => prev.filter((c) => c.id !== customerId));
      toast.success("Customer deleted successfully");
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Failed to delete customer";
      toast.error(msg);
    }
  };

  const activity = (c: Customer) => {
    const orders = c._count?.orders ?? 0;
    const bookings = c._count?.bookings ?? 0;
    const parts: string[] = [];
    if (orders > 0) parts.push(`${orders} order${orders > 1 ? "s" : ""}`);
    if (bookings > 0)
      parts.push(`${bookings} booking${bookings > 1 ? "s" : ""}`);
    return parts.length > 0 ? parts.join(" · ") : "New — no activity yet";
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Everyone who interacts with your business — orders, bookings
            and chats in one place.
          </p>
        </div>
        <Button
          onClick={() => router.push("/customers/new")}
          className="py-5 rounded-2xl self-start sm:self-auto"
        >
          <Plus className="size-4 mr-2" />
          Add Customer
        </Button>
      </motion.div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 rounded-xl"
          aria-label="Search customers"
        />
      </div>

      {loading ? (
        <div className="border rounded-lg overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b last:border-0">
              <Skeleton className="size-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-8 w-20 hidden sm:block" />
            </div>
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl bg-muted/5">
          <Users className="size-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">
            {debouncedSearch ? "No matching customers" : "No customers yet"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-sm">
            {debouncedSearch
              ? "Try a different name or phone number."
              : "Customers appear here automatically when they message you on WhatsApp, place orders or make bookings."}
          </p>
          {!debouncedSearch && (
            <Button
              onClick={() => router.push("/customers/new")}
              variant="outline"
            >
              <Plus className="size-4 mr-2" />
              Add Customer
            </Button>
          )}
        </div>
      ) : (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border rounded-lg bg-card text-card-foreground shadow-sm overflow-hidden"
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Activity</TableHead>
                <TableHead className="hidden sm:table-cell">Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer, i) => (
                <motion.tr
                  key={customer.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                >
                  <TableCell>
                    <Link
                      href={`/customers/${customer.id}`}
                      className="flex items-center gap-3 group"
                    >
                      <span className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                        {(customer.name ?? customer.phone)?.charAt(0).toUpperCase()}
                      </span>
                      <span>
                        <span className="font-medium block group-hover:text-primary group-hover:underline underline-offset-2">
                          {customer.name || (
                            <span className="text-muted-foreground italic">Unknown</span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MessageCircle className="size-3" /> {customer.phone}
                        </span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-xs text-muted-foreground flex items-center gap-2">
                      {(customer._count?.orders ?? 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <ShoppingBag className="size-3.5" /> {customer._count!.orders}
                        </span>
                      )}
                      {(customer._count?.bookings ?? 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <CalendarCheck className="size-3.5" /> {customer._count!.bookings}
                        </span>
                      )}
                      {!(customer._count?.orders || customer._count?.bookings) && (
                        <span className="italic">New</span>
                      )}
                    </span>
                    <span className="sr-only">{activity(customer)}</span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                    {new Date(customer.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${customer.name ?? customer.phone}`}
                      onClick={() => router.push(`/customers/${customer.id}/edit`)}
                    >
                      <Edit className="size-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${customer.name ?? customer.phone}`}
                      className="hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDelete(customer.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </motion.div>
      )}

      {!loading && customers.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} customers)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => changePage(pagination.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => changePage(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}

// Re-export for compatibility.
export type { Customer };
