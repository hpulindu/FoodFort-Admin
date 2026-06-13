import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellOff, ClipboardList, Phone } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Badge, Button, EmptyState, Select, Spinner } from "../components/ui";
import { OrderDetailDrawer } from "../components/OrderDetailDrawer";
import { useOrdersByDay } from "../lib/data";
import type { Order, OrderStatus, OrderType } from "../lib/types";
import { ORDER_STATUSES } from "../lib/types";
import { formatCurrency, formatPerthTime, getPerthDateKey } from "../lib/utils";
import { formatOrderNumber, nextStatuses, statusTone } from "../lib/order-helpers";
import { adminUpdateOrderStatus } from "../lib/admin-api";
import { toast } from "sonner";

function useNewOrderNotifier(orders: Order[], enabled: boolean) {
  const known = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(orders.map((o) => o.id));
    if (known.current === null) {
      known.current = ids; // first load — don't notify for existing orders
      return;
    }
    if (enabled && typeof Notification !== "undefined" && Notification.permission === "granted") {
      for (const o of orders) {
        if (!known.current.has(o.id)) {
          new Notification("New Food Fort order", {
            body: `#${formatOrderNumber(o.orderNumber, o.id)} · ${o.customer?.name ?? ""} · ${formatCurrency(o.total)}`,
            silent: true,
          });
        }
      }
    }
    known.current = ids;
  }, [orders, enabled]);
}

function OrderCard({ order, onOpen }: { order: Order; onOpen: () => void }) {
  const [busy, setBusy] = useState(false);
  const created = order.createdAt?.toDate?.();

  async function quickStatus(status: OrderStatus, e: React.MouseEvent) {
    e.stopPropagation();
    setBusy(true);
    try {
      await adminUpdateOrderStatus({ orderId: order.id, orderStatus: status });
      toast.success(`Order marked ${status}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      onClick={onOpen}
      className="card cursor-pointer p-4 transition-colors hover:border-[var(--color-gold)]/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-semibold">
              #{formatOrderNumber(order.orderNumber, order.id)}
            </span>
            <Badge tone={statusTone(order.orderStatus)}>{order.orderStatus}</Badge>
          </div>
          <p className="mt-0.5 truncate text-sm text-[var(--color-muted)]">
            {order.customer?.name || "Customer"} ·{" "}
            <span className="capitalize">{order.type}</span>
            {order.table ? ` · T${order.table}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold">{formatCurrency(order.total)}</p>
          {created && (
            <p className="text-xs text-[var(--color-muted)]">{formatPerthTime(created)}</p>
          )}
        </div>
      </div>

      <p className="mt-2 line-clamp-1 text-xs text-[var(--color-muted)]">
        {order.items?.map((i) => `${i.qty}× ${i.name}`).join(", ")}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {nextStatuses(order.orderStatus).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={s === "cancelled" ? "outline" : "secondary"}
            loading={busy}
            onClick={(e) => quickStatus(s, e)}
          >
            {s === "cancelled" ? "Cancel" : `Mark ${s}`}
          </Button>
        ))}
        {order.customer?.phone && (
          <a
            href={`tel:${order.customer.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="ml-auto"
          >
            <Button size="sm" variant="ghost">
              <Phone className="h-4 w-4" />
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}

export function OrdersPage() {
  const [dateKey, setDateKey] = useState(getPerthDateKey());
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all" | "active">("active");
  const [typeFilter, setTypeFilter] = useState<OrderType | "all">("all");
  const [selected, setSelected] = useState<Order | null>(null);
  const [notify, setNotify] = useState(false);

  const { data: orders, loading } = useOrdersByDay(dateKey);
  useNewOrderNotifier(orders, notify);

  // Keep the open drawer's order in sync with live updates.
  const selectedLive = selected ? orders.find((o) => o.id === selected.id) ?? selected : null;

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (typeFilter !== "all" && o.type !== typeFilter) return false;
      if (statusFilter === "all") return true;
      if (statusFilter === "active") {
        return ["pending", "preparing", "ready"].includes(o.orderStatus);
      }
      return o.orderStatus === statusFilter;
    });
  }, [orders, statusFilter, typeFilter]);

  async function toggleNotify() {
    if (notify) {
      setNotify(false);
      return;
    }
    if (typeof Notification === "undefined") {
      toast.error("Notifications are not supported in this browser.");
      return;
    }
    const perm =
      Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
    if (perm === "granted") {
      setNotify(true);
      toast.success("New-order notifications on");
    } else {
      toast.error("Notification permission denied");
    }
  }

  return (
    <>
      <PageHeader
        title="Orders"
        description="Live order board. Updates in real time."
        actions={
          <Button variant={notify ? "primary" : "outline"} size="sm" onClick={toggleNotify}>
            {notify ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            Notify
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Select value={dateKey} onChange={(e) => setDateKey(e.target.value)} className="hidden" />
        <input
          type="date"
          value={dateKey}
          max={getPerthDateKey()}
          onChange={(e) => setDateKey(e.target.value)}
          className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm text-[var(--color-fg)] focus:border-[var(--color-gold)] focus:outline-none"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "all" | "active")}
        >
          <option value="active">Active</option>
          <option value="all">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s}
            </option>
          ))}
        </Select>
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as OrderType | "all")}
        >
          <option value="all">All types</option>
          <option value="pickup">Pickup</option>
          <option value="dinein">Dine-in</option>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-7 w-7" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-8 w-8" />}
          title="No orders"
          description="No orders match the current filters for this day."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((o) => (
            <OrderCard key={o.id} order={o} onOpen={() => setSelected(o)} />
          ))}
        </div>
      )}

      <OrderDetailDrawer
        order={selectedLive}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
