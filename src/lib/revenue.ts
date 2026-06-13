import type { Order } from "./types";
import { getPerthDateKey, RESTAURANT_TIMEZONE } from "./utils";

export type RangePreset = "today" | "week" | "month" | "custom";

export type DateRange = {
  startKey: string;
  endKey: string;
  label: string;
};

/** Parse a YYYY-MM-DD key into a Date anchored at noon UTC (avoids TZ rollover). */
function keyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function dateToKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDays(key: string, days: number): string {
  const dt = keyToDate(key);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dateToKey(dt);
}

export function rangeForPreset(preset: RangePreset, custom?: { start: string; end: string }): DateRange {
  const today = getPerthDateKey();

  switch (preset) {
    case "today":
      return { startKey: today, endKey: today, label: "Today" };
    case "week": {
      // Current week starting Monday (Perth).
      const dt = keyToDate(today);
      const dow = dt.getUTCDay(); // 0 = Sun
      const sinceMonday = (dow + 6) % 7;
      const startKey = addDays(today, -sinceMonday);
      return { startKey, endKey: today, label: "This week" };
    }
    case "month": {
      const startKey = today.slice(0, 8) + "01";
      return { startKey, endKey: today, label: "This month" };
    }
    case "custom": {
      const start = custom?.start ?? today;
      const end = custom?.end ?? today;
      // Guard against reversed ranges.
      const [a, b] = start <= end ? [start, end] : [end, start];
      return { startKey: a, endKey: b, label: "Custom range" };
    }
  }
}

export type TopItem = { name: string; qty: number; revenue: number };

export type RevenueSummary = {
  orderCount: number;
  ownerRevenue: number; // subtotal - refundedSubtotalEquivalent (excludes service fee)
  grossCustomerPaid: number; // sum of total
  serviceFeeTotal: number; // Skryptone application fee
  cardProcessingFeeTotal: number;
  subtotalTotal: number;
  refundedTotal: number; // gross customer refunded
  refundedSubtotalEquivalent: number;
  avgOrderValue: number; // owner revenue / order count
  topItems: TopItem[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeRevenue(orders: Order[]): RevenueSummary {
  let grossCustomerPaid = 0;
  let serviceFeeTotal = 0;
  let cardProcessingFeeTotal = 0;
  let subtotalTotal = 0;
  let refundedTotal = 0;
  let refundedSubtotalEquivalent = 0;

  const itemMap = new Map<string, TopItem>();

  for (const o of orders) {
    const subtotal = o.subtotal ?? 0;
    const total = o.total ?? 0;
    const refunded = o.refundedAmount ?? 0;

    grossCustomerPaid += total;
    serviceFeeTotal += o.serviceFee ?? 0;
    cardProcessingFeeTotal += o.cardProcessingFee ?? 0;
    subtotalTotal += subtotal;
    refundedTotal += refunded;

    // Proportional subtotal share of the refund (excludes fees).
    if (refunded > 0 && total > 0) {
      refundedSubtotalEquivalent += (refunded / total) * subtotal;
    }

    for (const item of o.items ?? []) {
      const key = item.name;
      const existing = itemMap.get(key) ?? { name: key, qty: 0, revenue: 0 };
      existing.qty += item.qty ?? 0;
      existing.revenue += (item.price ?? 0) * (item.qty ?? 0);
      itemMap.set(key, existing);
    }
  }

  const ownerRevenue = subtotalTotal - refundedSubtotalEquivalent;
  const orderCount = orders.length;

  const topItems = [...itemMap.values()]
    .map((i) => ({ ...i, revenue: round2(i.revenue) }))
    .sort((a, b) => b.qty - a.qty);

  return {
    orderCount,
    ownerRevenue: round2(ownerRevenue),
    grossCustomerPaid: round2(grossCustomerPaid),
    serviceFeeTotal: round2(serviceFeeTotal),
    cardProcessingFeeTotal: round2(cardProcessingFeeTotal),
    subtotalTotal: round2(subtotalTotal),
    refundedTotal: round2(refundedTotal),
    refundedSubtotalEquivalent: round2(refundedSubtotalEquivalent),
    avgOrderValue: orderCount ? round2(ownerRevenue / orderCount) : 0,
    topItems,
  };
}

export type DailyPoint = { day: string; ownerRevenue: number; orders: number };

/** Per-Perth-day series for charts, sorted ascending. */
export function dailySeries(orders: Order[]): DailyPoint[] {
  const map = new Map<string, DailyPoint>();
  for (const o of orders) {
    const day = o.orderDay ?? getPerthDateKey(o.createdAt?.toDate?.() ?? new Date());
    const point = map.get(day) ?? { day, ownerRevenue: 0, orders: 0 };
    const subtotal = o.subtotal ?? 0;
    const total = o.total ?? 0;
    const refunded = o.refundedAmount ?? 0;
    const refundedSub = refunded > 0 && total > 0 ? (refunded / total) * subtotal : 0;
    point.ownerRevenue = round2(point.ownerRevenue + subtotal - refundedSub);
    point.orders += 1;
    map.set(day, point);
  }
  return [...map.values()].sort((a, b) => a.day.localeCompare(b.day));
}

export { RESTAURANT_TIMEZONE };
