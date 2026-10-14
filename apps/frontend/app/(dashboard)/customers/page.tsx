"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  Plus,
  Users,
  Pencil,
  Trash2,
  Search,
  ShoppingBag,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  listCustomers,
  deleteCustomer,
  type Customer,
} from "@/lib/customers";
import { CustomerWizard } from "@/components/wizards/CustomerWizard";
import { useConfirm } from "@/components/ui/confirm";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function CustomersPage() {
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const confirmAction = useConfirm();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
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
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await listCustomers({
          page: pagination.page,
          limit: pagination.limit,
          search: debouncedSearch || undefined,
        });
        if (!cancelled) {
          setCustomers(res.customers);
          setPagination(res.pagination);
        }
      } catch {
        if (!cancelled) toast.error("Failed to load customers");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit, debouncedSearch]);

  const changePage = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return;
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleDelete = async (customerId: string, label: string) => {
    const ok = await confirmAction({
      title: `Delete ${label}?`,
      body: "Linked orders and bookings are kept for your records.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await deleteCustomer(customerId);
      setCustomers((prev) => prev.filter((c) => c.id !== customerId));
      toast.success("Customer deleted");
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Failed to delete customer";
      toast.error(msg);
    }
  };

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
            People · {pagination.total} total
          </p>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] text-ink mt-1">
            Customers
          </h1>
          <p className="text-[15px] text-ink/55 mt-1.5">
            Orders, bookings and chats — one profile each.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-ink/40" />
            <input
              placeholder="Search name or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search customers"
              className="pl-8 h-10 w-52 rounded-full text-xs font-medium bg-ink/[0.05] text-ink placeholder:text-ink/35 focus:outline-none focus:bg-ink/[0.08] transition-colors"
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setWizardOpen(true)}
            className="h-10 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-medium text-white hover:bg-brand transition-colors self-start sm:self-auto"
          >
            <Plus className="size-4" /> Add customer
          </motion.button>
        </div>
      </motion.div>

      {/* List */}
      <div className="relative">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-[1.4rem] bg-ink/[0.045] px-4 py-3.5 animate-pulse">
                <div className="size-10 rounded-full bg-ink/10 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-40 rounded-full bg-ink/10" />
                  <div className="h-3 w-56 rounded-full bg-ink/10" />
                </div>
              </div>
            ))}
          </div>
        ) : customers.length === 0 ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center rounded-[1.6rem] bg-ink/[0.035]"
          >
            <span className="flex size-14 items-center justify-center rounded-[1.2rem] bg-ink text-white">
              <Users className="size-7" />
            </span>
            <h3 className="text-lg font-semibold text-ink mt-4">
              {debouncedSearch ? "No matching customers" : "No customers yet"}
            </h3>
            <p className="text-sm text-ink/50 mt-1 mb-5 max-w-sm">
              {debouncedSearch
                ? "Try a different name or phone number."
                : "They appear here automatically when they message you, order or book."}
            </p>
            {!debouncedSearch && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setWizardOpen(true)}
                className="h-11 inline-flex items-center gap-1.5 rounded-full bg-ink px-5 text-sm font-medium text-white hover:bg-brand transition-colors"
              >
                <Plus className="size-4" /> Add customer
              </motion.button>
            )}
          </motion.div>
        ) : (
          <motion.div layout className="space-y-2">
            <AnimatePresence mode="popLayout" initial={false}>
              {customers.map((customer, i) => {
                const orders = customer._count?.orders ?? 0;
                const bookings = customer._count?.bookings ?? 0;
                const label = customer.name || customer.phone;
                return (
                  <motion.div
                    key={customer.id}
                    layout
                    initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.3, ease: EASE }}
                    className="group flex items-center gap-3.5 rounded-[1.4rem] bg-ink/[0.045] hover:bg-ink/[0.07] transition-colors px-4 py-3 cursor-pointer"
                    onClick={() => router.push(`/customers/${customer.id}`)}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") router.push(`/customers/${customer.id}`);
                    }}
                  >
                    <span className="size-10 rounded-full bg-ink text-white flex items-center justify-center text-sm font-bold shrink-0">
                      {(customer.name ?? customer.phone)?.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-[15px] tracking-tight text-ink truncate">
                        {customer.name || <span className="text-ink/40 italic">Unknown</span>}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-ink/50 tabular-nums">
                        <MessageCircle className="size-3" /> {customer.phone}
                      </span>
                    </span>
                    <span className="hidden md:flex items-center gap-1.5 shrink-0">
                      {orders > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white text-ink/65 tabular-nums">
                          <ShoppingBag className="size-3" /> {orders}
                        </span>
                      )}
                      {bookings > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white text-ink/65 tabular-nums">
                          <CalendarCheck className="size-3" /> {bookings}
                        </span>
                      )}
                      {orders === 0 && bookings === 0 && (
                        <span className="text-[11px] italic text-ink/40">New</span>
                      )}
                    </span>
                    <span className="hidden sm:block text-[11px] text-ink/40 tabular-nums shrink-0">
                      {new Date(customer.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <span className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button
                        aria-label={`Edit ${label}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/customers/${customer.id}/edit`);
                        }}
                        className="flex size-8 items-center justify-center rounded-full bg-white text-ink hover:bg-ink hover:text-white transition-colors"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        aria-label={`Delete ${label}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(customer.id, label);
                        }}
                        className="flex size-8 items-center justify-center rounded-full bg-white text-ink/60 hover:bg-red-600 hover:text-white transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Pagination */}
      {!loading && customers.length > 0 && (
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[13px] text-ink/50 tabular-nums">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} customers
          </p>
          <div className="flex items-center gap-1.5">
            <button
              disabled={pagination.page === 1}
              onClick={() => changePage(pagination.page - 1)}
              className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-ink/[0.05] text-ink hover:bg-ink/[0.1] transition-colors disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              disabled={pagination.page === pagination.totalPages}
              onClick={() => changePage(pagination.page + 1)}
              className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-ink/[0.05] text-ink hover:bg-ink/[0.1] transition-colors disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}

      <CustomerWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onCreated={(c) => setCustomers((prev) => [c, ...prev])}
      />
    </div>
  );
}

// Re-export for compatibility.
export type { Customer };
