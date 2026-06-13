import { useState } from "react";
import {
  Phone,
  Mail,
  Receipt,
  RotateCcw,
  StickyNote,
  Utensils,
  Clock,
} from "lucide-react";
import type { Order, OrderStatus } from "../lib/types";
import { ORDER_STATUSES } from "../lib/types";
import { adminRefundOrder, adminUpdateOrderStatus } from "../lib/admin-api";
import { Drawer, Modal } from "./overlays";
import { Badge, Button, Field, Input, Select, Textarea } from "./ui";
import { statusTone, formatOrderNumber } from "../lib/order-helpers";
import { formatCurrency, formatPerthDateTime } from "../lib/utils";
import { toast } from "sonner";

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className={strong ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}

export function OrderDetailDrawer({
  order,
  open,
  onClose,
}: {
  order: Order | null;
  open: boolean;
  onClose: () => void;
}) {
  const [savingStatus, setSavingStatus] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  if (!order) return null;

  const created = order.createdAt?.toDate?.();
  const refundable =
    order.paymentStatus === "paid" && (order.refundStatus ?? "none") !== "full";
  const alreadyRefunded = order.refundedAmount ?? 0;

  async function changeStatus(status: OrderStatus) {
    if (!order) return;
    setSavingStatus(true);
    try {
      await adminUpdateOrderStatus({ orderId: order.id, orderStatus: status });
      toast.success(`Order marked ${status}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setSavingStatus(false);
    }
  }

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title={
          <span className="flex items-center gap-2">
            Order #{formatOrderNumber(order.orderNumber, order.id)}
            <Badge tone={statusTone(order.orderStatus)}>{order.orderStatus}</Badge>
          </span>
        }
        footer={
          <div className="flex flex-wrap gap-2">
            {refundable && (
              <Button variant="outline" onClick={() => setRefundOpen(true)}>
                <RotateCcw className="h-4 w-4" />
                Refund
              </Button>
            )}
            <a href={`tel:${order.customer?.phone}`} className="flex-1">
              <Button variant="secondary" className="w-full">
                <Phone className="h-4 w-4" />
                Call
              </Button>
            </a>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
            <span className="inline-flex items-center gap-1 capitalize">
              <Utensils className="h-3.5 w-3.5" />
              {order.type}
              {order.table ? ` · Table ${order.table}` : ""}
            </span>
            {created && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatPerthDateTime(created)}
              </span>
            )}
          </div>

          {/* Customer */}
          <div className="card space-y-2 p-3">
            <p className="text-sm font-semibold">{order.customer?.name || "Customer"}</p>
            <div className="flex flex-col gap-1.5 text-sm">
              {order.customer?.phone && (
                <a
                  href={`tel:${order.customer.phone}`}
                  className="inline-flex items-center gap-2 text-[var(--color-gold-soft)] hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  {order.customer.phone}
                </a>
              )}
              {order.customer?.email && (
                <a
                  href={`mailto:${order.customer.email}`}
                  className="inline-flex items-center gap-2 text-[var(--color-gold-soft)] hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  {order.customer.email}
                </a>
              )}
            </div>
            {order.customer?.notes && (
              <p className="flex items-start gap-2 rounded-md bg-[var(--color-bg)] p-2 text-sm">
                <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-muted)]" />
                {order.customer.notes}
              </p>
            )}
          </div>

          {/* Items */}
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              <Receipt className="h-4 w-4" /> Items
            </p>
            <ul className="space-y-1.5">
              {order.items?.map((it, i) => (
                <li key={`${it.id}-${i}`} className="flex justify-between text-sm">
                  <span>
                    <span className="text-[var(--color-muted)]">{it.qty}× </span>
                    {it.name}
                  </span>
                  <span>{formatCurrency(it.price * it.qty)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Totals */}
          <div className="card space-y-1.5 p-3">
            <Row label="Subtotal" value={formatCurrency(order.subtotal)} />
            <Row label="Service fee (Skryptone)" value={formatCurrency(order.serviceFee)} />
            <Row label="Card processing" value={formatCurrency(order.cardProcessingFee)} />
            <div className="my-1 border-t border-[var(--color-border)]" />
            <Row label="Total paid" value={formatCurrency(order.total)} strong />
            {alreadyRefunded > 0 && (
              <Row label="Refunded" value={`- ${formatCurrency(alreadyRefunded)}`} />
            )}
          </div>

          {/* Status */}
          <Field label="Update status">
            <Select
              value={order.orderStatus}
              disabled={savingStatus}
              onChange={(e) => changeStatus(e.target.value as OrderStatus)}
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Drawer>

      <RefundModal
        order={order}
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
      />
    </>
  );
}

function RefundModal({
  order,
  open,
  onClose,
}: {
  order: Order;
  open: boolean;
  onClose: () => void;
}) {
  const alreadyRefunded = order.refundedAmount ?? 0;
  const remaining = Math.max(0, (order.total ?? 0) - alreadyRefunded);
  const [mode, setMode] = useState<"full" | "partial">("full");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      const payload: { orderId: string; amount?: number; reason?: string } = {
        orderId: order.id,
        reason: reason.trim() || undefined,
      };
      if (mode === "partial") {
        const value = Number(amount);
        if (!Number.isFinite(value) || value <= 0 || value > remaining) {
          toast.error(`Enter an amount between 0 and ${formatCurrency(remaining)}.`);
          setSubmitting(false);
          return;
        }
        payload.amount = value;
      }
      const res = await adminRefundOrder(payload);
      toast.success(
        `Refunded ${formatCurrency(res.refundedAmount)} (${res.refundStatus})`,
      );
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refund failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Refund order #${formatOrderNumber(order.orderNumber, order.id)}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" loading={submitting} onClick={submit}>
            Confirm refund
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="rounded-lg bg-[var(--color-warning)]/10 px-3 py-2 text-xs text-[var(--color-warning)]">
          Refunds are issued from the connected account. The Skryptone service fee
          ({formatCurrency(order.serviceFee)}) is not returned — the merchant absorbs it.
        </p>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={mode === "full" ? "primary" : "outline"}
            onClick={() => setMode("full")}
          >
            Full ({formatCurrency(remaining)})
          </Button>
          <Button
            size="sm"
            variant={mode === "partial" ? "primary" : "outline"}
            onClick={() => setMode("partial")}
          >
            Partial
          </Button>
        </div>

        {mode === "partial" && (
          <Field label={`Amount (max ${formatCurrency(remaining)})`}>
            <Input
              type="number"
              step="0.01"
              min="0"
              max={remaining}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </Field>
        )}

        <Field label="Reason (optional)">
          <Textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Item unavailable"
          />
        </Field>
      </div>
    </Modal>
  );
}
