"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Plus,
  Users,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { CustomerDrawer } from "@/components/customers/CustomerDrawer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface Customer {
  id: string;
  name?: string;
  phone: string;
  externalId?: string;
  address?: string;
  optedIn: boolean;
  createdAt: string;
  _count?: {
    orders: number;
    conversations: number;
  };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const changePage = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return;

    setPagination((prev) => ({
      ...prev,
      page,
    }));
  };

  const fetchCustomers = useCallback(async (page: number, limit: number) => {
    const res = await api.get(`/customers/customers`, {
      params: {
        page,
        limit,
      },
    });

    return res.data;
  }, []);

  useEffect(() => {
    const loadCustomers = async () => {
      setLoading(true);

      try {
        const res = await fetchCustomers(pagination.page, pagination.limit);

        setCustomers(res.data.customers);
        setPagination(res.data.pagination);
      } catch {
        toast.error("Failed to load customers");
      } finally {
        setLoading(false);
      }
    };

    loadCustomers();
  }, [fetchCustomers, pagination.page, pagination.limit]);

  const handleDelete = async (customerId: string) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;
    try {
      await api.delete(`/customers/${customerId}`);
      setCustomers((prev) => prev.filter((c) => c.id !== customerId));
      toast.success("Customer deleted successfully");
    } catch {
      toast.error("Failed to delete customer");
    }
  };

  const handleSaveCustomer = (savedCustomer: Customer, isUpdate: boolean) => {
    if (isUpdate) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === savedCustomer.id ? { ...c, ...savedCustomer } : c,
        ),
      );
    } else {
      setCustomers((prev) => [savedCustomer, ...prev]);
    }
    setDrawerOpen(false);
  };

  const openCreateDrawer = () => {
    setSelectedCustomer(null);
    setDrawerOpen(true);
  };

  const openUpdateDrawer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDrawerOpen(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your customers and their details.
          </p>
        </div>
        <Button onClick={openCreateDrawer} className="py-5 rounded-2xl">
          <Plus className="size-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl bg-muted/5">
          <Users className="size-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No customers found</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Add your first customer to start tracking conversations and orders.
          </p>
          <Button onClick={openCreateDrawer} variant="outline">
            <Plus className="size-4 mr-2" />
            Add Customer
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg bg-card text-card-foreground shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>External ID</TableHead>
                <TableHead>Opted In</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">
                    {customer.name || (
                      <span className="text-muted-foreground italic">
                        Unknown
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell>
                    {customer.externalId ? (
                      <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                        {customer.externalId}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {customer.optedIn ? (
                      <div className="flex items-center text-green-600 dark:text-green-400 text-sm">
                        <CheckCircle2 className="size-4 mr-1.5" />
                        Yes
                      </div>
                    ) : (
                      <div className="flex items-center text-muted-foreground text-sm">
                        <XCircle className="size-4 mr-1.5" />
                        No
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openUpdateDrawer(customer)}
                    >
                      <Edit className="size-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDelete(customer.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && customers.length > 0 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-muted-foreground">
            Showing page {pagination.page} of {pagination.totalPages} (
            {pagination.total} customers)
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

            {Array.from(
              { length: pagination.totalPages },
              (_, index) => index + 1,
            ).map((page) => (
              <Button
                key={page}
                variant={page === pagination.page ? "default" : "outline"}
                size="sm"
                onClick={() => changePage(page)}
              >
                {page}
              </Button>
            ))}

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

      <CustomerDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        customer={selectedCustomer}
        onSave={handleSaveCustomer}
      />
    </div>
  );
}
