"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, RefreshCw, Search, Users } from "lucide-react";
import { toast } from "react-hot-toast";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type Customer = {
  id: string;
  name: string | null;
  phone: string;
  externalId: string | null;
  address: string | null;
  optedIn: boolean;
  createdAt: string;
  _count?: { orders: number; conversations: number };
};

const emptyForm = {
  name: "",
  phone: "",
  externalId: "",
  address: "",
  optedIn: true,
};

export default function CustomersPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    const response = await api.get(`/organizations/${orgId}/customers`, {
      params: { search: search || undefined, limit: 50 },
    });
    setCustomers(response.data.customers);
    setLoading(false);
  };

  useEffect(() => {
    loadCustomers().catch(() => setLoading(false));
  }, [orgId]);

  const createCustomer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post(`/organizations/${orgId}/customers`, {
        phone: form.phone,
        name: form.name || undefined,
        externalId: form.externalId || undefined,
        address: form.address || undefined,
        optedIn: form.optedIn,
      });
      toast.success("Customer added");
      setForm(emptyForm);
      await loadCustomers();
    } catch {
      toast.error("Could not add customer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-4" />
            Add customer
          </CardTitle>
          <CardDescription>Store customer data for WhatsApp, orders, and appointments.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={createCustomer}>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Aarav Mehta"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                required
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                placeholder="+919876543210"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="externalId">External ID</Label>
              <Input
                id="externalId"
                value={form.externalId}
                onChange={(event) => setForm((current) => ({ ...current, externalId: event.target.value }))}
                placeholder="Shopify or CRM ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={form.address}
                onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                placeholder="Delivery address"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.optedIn}
                onCheckedChange={(checked) => setForm((current) => ({ ...current, optedIn: checked === true }))}
              />
              WhatsApp opt-in
            </label>
            <Button className="w-full" disabled={saving}>
              <Plus />
              {saving ? "Saving..." : "Create customer"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Customer table</CardTitle>
              <CardDescription>Contacts, order counts, and conversation history signals.</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  className="w-56 pl-8"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") loadCustomers();
                  }}
                  placeholder="Search customer"
                />
              </div>
              <Button variant="outline" size="icon" onClick={loadCustomers}>
                <RefreshCw />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading customers...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Conversations</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name || "Unnamed customer"}</TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell>{customer._count?.orders ?? 0}</TableCell>
                    <TableCell>{customer._count?.conversations ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant={customer.optedIn ? "outline" : "destructive"}>
                        {customer.optedIn ? "OPTED IN" : "OPTED OUT"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
