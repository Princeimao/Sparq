"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCheck,
  CreditCard,
  Loader2,
  LucideIcon,
  PackageX,
} from "lucide-react";

type Props = {
  trigger: ReactNode;
  defaultOpen?: boolean;
  align?: "start" | "center" | "end";
};

type Notice = {
  id: string;
  icon: LucideIcon;
  tone: string;
  title: string;
  desc: string;
  href: string;
};

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

async function buildNotices(): Promise<Notice[]> {
  const notices: Notice[] = [];

  const [wa, productsRes, bookingsRes, subRes] = await Promise.all([
    api.get("/integrations/status").catch(() => null),
    api.get("/products").catch(() => null),
    api
      .get("/bookings", { params: { limit: 50 } })
      .catch(() => null),
    api.get("/billing/subscription").catch(() => null),
  ]);

  // 1. WhatsApp never connected / turned off
  const waRow = wa?.data?.data?.whatsappIntegration;
  if (!waRow) {
    notices.push({
      id: "wa-missing",
      icon: AlertTriangle,
      tone: "text-red-600 bg-red-500/10",
      title: "WhatsApp not connected",
      desc: "Connect it to start receiving orders",
      href: "/integrations",
    });
  } else if (waRow.isActive === false) {
    notices.push({
      id: "wa-off",
      icon: AlertTriangle,
      tone: "text-amber-600 bg-amber-500/10",
      title: "WhatsApp is switched off",
      desc: "Turn it back on in Integrations",
      href: "/integrations",
    });
  }

  // 2. Out-of-stock products
  const products: { id: string; name: string; stock: number }[] =
    productsRes?.data?.data?.products ?? productsRes?.data?.products ?? [];
  const empty = products.filter((p) => (p.stock ?? 0) <= 0).slice(0, 3);
  for (const p of empty) {
    notices.push({
      id: `stock-${p.id}`,
      icon: PackageX,
      tone: "text-orange-600 bg-orange-500/10",
      title: `${p.name} is out of stock`,
      desc: "Restock to keep selling on WhatsApp",
      href: "/products",
    });
  }

  // 3. Today's bookings
  const bookings: { startTime: string; status: string }[] =
    bookingsRes?.data?.data?.bookings ?? [];
  const today = new Date();
  const todays = bookings.filter((b) => {
    const s = new Date(b.startTime);
    return (
      sameDay(s, today) &&
      s.getTime() >= today.getTime() - 60 * 60 * 1000 &&
      !["CANCELLED", "NO_SHOW", "COMPLETED"].includes(b.status)
    );
  });
  if (todays.length > 0) {
    notices.push({
      id: "today-bookings",
      icon: CalendarCheck,
      tone: "text-brand bg-brand/10",
      title: `${todays.length} booking${todays.length === 1 ? "" : "s"} today`,
      desc: "Review the lineup on your calendar",
      href: "/calendar",
    });
  }

  // 4. Subscription ending / past-due
  const sub = subRes?.data?.data?.subscription ?? subRes?.data?.subscription;
  if (sub?.cancelAtPeriodEnd && sub?.currentPeriodEnd) {
    notices.push({
      id: "sub-ending",
      icon: CreditCard,
      tone: "text-amber-600 bg-amber-500/10",
      title: "Plan ends soon",
      desc: `Cancels ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`,
      href: "/subscription",
    });
  } else if (sub && sub.status && !["ACTIVE", "PENDING", "FREE"].includes(sub.status)) {
    notices.push({
      id: "sub-attention",
      icon: CreditCard,
      tone: "text-red-600 bg-red-500/10",
      title: "Subscription needs attention",
      desc: `Status: ${String(sub.status).toLowerCase()}`,
      href: "/subscription",
    });
  }

  return notices.slice(0, 6);
}

const NotificationDropdown = ({
  trigger,
  defaultOpen,
  align = "end",
}: Props) => {
  const router = useRouter();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const refresh = () => {
    setLoading(true);
    buildNotices()
      .then(setNotices)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) refresh();
  };

  // Preload once so the bell dot reflects reality.
  useEffect(() => {
    let cancelled = false;
    buildNotices()
      .then((n) => {
        if (!cancelled) setNotices(n);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex items-center justify-center">
      <DropdownMenu defaultOpen={defaultOpen} open={open} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <span className="relative inline-flex">
            {trigger}
            {!loading && notices.length > 0 && (
              <span className="absolute top-1 right-1 z-10 size-2 rounded-full bg-red-500 ring-2 ring-paper" />
            )}
          </span>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align={align}
          className="p-0 w-sm rounded-2xl data-open:slide-in-from-top-20! data-closed:slide-out-to-top-20 data-open:fade-in-0 data-closed:fade-out-0 data-closed:zoom-out-100 duration-400"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex items-center justify-between p-4">
              <p className="text-base font-medium text-popover-foreground">
                Notifications
              </p>
              {notices.length > 0 && (
                <Badge className="font-normal leading-0">
                  {notices.length} New
                </Badge>
              )}
            </DropdownMenuLabel>
          </DropdownMenuGroup>

          <DropdownMenuGroup>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Checking…
              </div>
            ) : notices.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-brand/10 text-brand mb-2">
                  <CheckCheck className="size-5" />
                </span>
                <p className="text-sm font-medium">All caught up</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Nothing needs your attention right now.
                </p>
              </div>
            ) : (
              notices.map(({ id, icon: Icon, tone, title, desc }) => (
                <DropdownMenuItem
                  key={id}
                  className="mx-1.5 my-1 p-2 flex items-center gap-3 cursor-pointer"
                  onClick={() => {
                    setOpen(false);
                    router.push(
                      notices.find((n) => n.id === id)?.href ?? "/dashboard",
                    );
                  }}
                >
                  <div className={cn("p-2.5 rounded-xl shrink-0", tone)}>
                    <Icon size={20} className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-popover-foreground">
                      {title}
                    </p>
                    <p className="max-w-52 truncate text-sm text-muted-foreground">
                      {desc}
                    </p>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuGroup>

          {notices.length > 0 && (
            <div className="mx-1.5 my-1 p-2">
              <Button
                className="rounded-xl w-full cursor-pointer h-9 hover:bg-primary/80"
                onClick={() => {
                  setOpen(false);
                  router.push("/calendar");
                }}
              >
                Review today
              </Button>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default NotificationDropdown;
