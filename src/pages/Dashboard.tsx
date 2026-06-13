import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  PauseCircle,
  PlayCircle,
  ChevronRight,
  Store,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Badge, Button, Card, Spinner } from "../components/ui";
import { Modal } from "../components/overlays";
import { OrderDetailDrawer } from "../components/OrderDetailDrawer";
import { useOperationHours, useOrderingStatus, useTodayOrders } from "../lib/data";
import { computeRevenue } from "../lib/revenue";
import { isStoreOpen } from "../lib/hours";
import { adminSetOrderingPaused } from "../lib/admin-api";
import { formatCurrency, formatPerthTime } from "../lib/utils";
import { formatOrderNumber, statusTone } from "../lib/order-helpers";
import type { Order } from "../lib/types";
import { Textarea } from "../components/ui";
import { toast } from "sonner";

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
          {label}
        </span>
        <span className="text-[var(--color-gold-soft)]">{icon}</span>
      </div>
      <p className="font-display text-2xl font-semibold">{value}</p>
      {sub && <p className="text-xs text-[var(--color-muted)]">{sub}</p>}
    </Card>
  );
}

export function DashboardPage() {
  const { data: orders, loading } = useTodayOrders();
  const { data: ordering } = useOrderingStatus();
  const { data: hours } = useOperationHours();
  const [selected, setSelected] = useState<Order | null>(null);
  const [pauseModal, setPauseModal] = useState(false);
  const [reason, setReason] = useState("");
  const [savingPause, setSavingPause] = useState(false);

  const summary = useMemo(() => computeRevenue(orders), [orders]);
  const activeOrders = useMemo(
    () => orders.filter((o) => ["pending", "preparing", "ready"].includes(o.orderStatus)),
    [orders],
  );
  const open = isStoreOpen(hours);
  const selectedLive = selected ? orders.find((o) => o.id === selected.id) ?? selected : null;

  async function pauseNow() {
    setSavingPause(true);
    try {
      await adminSetOrderingPaused({ paused: true, reason: reason.trim() || undefined });
      toast.success("Online ordering paused");
      setPauseModal(false);
      setReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to pause");
    } finally {
      setSavingPause(false);
    }
  }

  async function resumeNow() {
    setSavingPause(true);
    try {
      await adminSetOrderingPaused({ paused: false });
      toast.success("Online ordering resumed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resume");
    } finally {
      setSavingPause(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Today at a glance, Perth time."
        actions={
          ordering.paused ? (
            <Button variant="primary" size="sm" loading={savingPause} onClick={resumeNow}>
              <PlayCircle className="h-4 w-4" />
              Resume ordering
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setPauseModal(true)}>
              <PauseCircle className="h-4 w-4" />
              Pause ordering
            </Button>
          )
        }
      />

      {/* Status banner */}
      <Card className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Store className="h-5 w-5 text-[var(--color-gold-soft)]" />
          <div>
            <p className="text-sm font-medium">
              {ordering.paused
                ? "Ordering paused"
                : open
                  ? "Open and accepting orders"
                  : "Closed (outside operating hours)"}
            </p>
            <p className="text-xs text-[var(--color-muted)]">
              {ordering.paused && ordering.reason
                ? ordering.reason
                : "Customer checkout is gated by hours + pause toggle."}
            </p>
          </div>
        </div>
        <Badge tone={ordering.paused ? "danger" : open ? "success" : "neutral"}>
          {ordering.paused ? "Paused" : open ? "Open" : "Closed"}
        </Badge>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-7 w-7" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={<ClipboardList className="h-5 w-5" />}
              label="Active orders"
              value={String(activeOrders.length)}
              sub={`${orders.length} total today`}
            />
            <StatCard
              icon={<DollarSign className="h-5 w-5" />}
              label="Revenue"
              value={formatCurrency(summary.ownerRevenue)}
              sub="Excludes service fee"
            />
            <StatCard
              icon={<ShoppingBag className="h-5 w-5" />}
              label="Orders"
              value={String(summary.orderCount)}
              sub={`Avg ${formatCurrency(summary.avgOrderValue)}`}
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="Gross paid"
              value={formatCurrency(summary.grossCustomerPaid)}
              sub={`Refunds ${formatCurrency(summary.refundedTotal)}`}
            />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {/* Active orders list */}
            <div className="lg:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">Active orders</h2>
                <Link to="/orders" className="text-xs text-[var(--color-gold-soft)] hover:underline">
                  View all
                </Link>
              </div>
              {activeOrders.length === 0 ? (
                <Card>
                  <p className="py-6 text-center text-sm text-[var(--color-muted)]">
                    No active orders right now.
                  </p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {activeOrders.slice(0, 6).map((o) => (
                    <button
                      key={o.id}
                      onClick={() => setSelected(o)}
                      className="card flex w-full items-center justify-between p-3 text-left transition-colors hover:border-[var(--color-gold)]/40"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-display text-base font-semibold">
                          #{formatOrderNumber(o.orderNumber, o.id)}
                        </span>
                        <div>
                          <p className="text-sm">{o.customer?.name || "Customer"}</p>
                          <p className="text-xs capitalize text-[var(--color-muted)]">
                            {o.type}
                            {o.createdAt?.toDate ? ` · ${formatPerthTime(o.createdAt.toDate())}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={statusTone(o.orderStatus)}>{o.orderStatus}</Badge>
                        <span className="text-sm font-semibold">{formatCurrency(o.total)}</span>
                        <ChevronRight className="h-4 w-4 text-[var(--color-muted)]" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Top items + quick actions */}
            <div className="space-y-4">
              <div>
                <h2 className="mb-2 font-display text-lg font-semibold">Top items today</h2>
                <Card>
                  {summary.topItems.length === 0 ? (
                    <p className="py-4 text-center text-sm text-[var(--color-muted)]">
                      No sales yet.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {summary.topItems.slice(0, 5).map((it) => (
                        <li key={it.name} className="flex justify-between text-sm">
                          <span className="truncate pr-2">{it.name}</span>
                          <span className="shrink-0 text-[var(--color-muted)]">
                            {it.qty}× · {formatCurrency(it.revenue)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>

              <div>
                <h2 className="mb-2 font-display text-lg font-semibold">Quick actions</h2>
                <div className="grid grid-cols-2 gap-2">
                  <Link to="/orders">
                    <Button variant="secondary" className="w-full">
                      Orders
                    </Button>
                  </Link>
                  <Link to="/menu">
                    <Button variant="secondary" className="w-full">
                      Menu
                    </Button>
                  </Link>
                  <Link to="/revenue">
                    <Button variant="secondary" className="w-full">
                      Revenue
                    </Button>
                  </Link>
                  <Link to="/exports">
                    <Button variant="secondary" className="w-full">
                      Exports
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <OrderDetailDrawer
        order={selectedLive}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
      />

      <Modal
        open={pauseModal}
        onClose={() => setPauseModal(false)}
        title="Pause online ordering"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPauseModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={savingPause} onClick={pauseNow}>
              Pause ordering
            </Button>
          </div>
        }
      >
        <p className="mb-3 text-sm text-[var(--color-muted)]">
          Customers will be blocked from checking out until you resume. Add an optional
          reason shown to customers.
        </p>
        <Textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Kitchen at capacity — back in 30 minutes"
        />
      </Modal>
    </>
  );
}
