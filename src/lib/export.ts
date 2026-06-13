import * as XLSX from "xlsx";
import type { AuditLog, MenuSection, Order, Sauce } from "./types";
import type { RevenueSummary } from "./revenue";
import { formatPerthDateTime, getPerthDateKey } from "./utils";

function tsToText(v: Order["createdAt"]): string {
  const d = v?.toDate?.();
  return d ? formatPerthDateTime(d) : "";
}

function downloadWorkbook(sheets: Record<string, unknown[]>, fileBase: string) {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  }
  XLSX.writeFile(wb, `${fileBase}_${getPerthDateKey()}.xlsx`);
}

export function exportOrders(orders: Order[], fileBase = "foodfort_orders") {
  const orderRows = orders.map((o) => ({
    "Order #": o.orderNumber ?? "",
    "Order ID": o.id,
    Date: tsToText(o.createdAt),
    "Order Day": o.orderDay ?? "",
    Type: o.type,
    Status: o.orderStatus,
    Customer: o.customer?.name ?? "",
    Phone: o.customer?.phone ?? "",
    Email: o.customer?.email ?? "",
    Table: o.table ?? "",
    Notes: o.customer?.notes ?? "",
    Subtotal: o.subtotal ?? 0,
    "Service Fee": o.serviceFee ?? 0,
    "Card Fee": o.cardProcessingFee ?? 0,
    Total: o.total ?? 0,
    "Refunded Amount": o.refundedAmount ?? 0,
    "Refund Status": o.refundStatus ?? "none",
    "Payment Intent": o.paymentIntentId,
  }));

  const itemRows = orders.flatMap((o) =>
    (o.items ?? []).map((it) => ({
      "Order #": o.orderNumber ?? "",
      "Order ID": o.id,
      Date: tsToText(o.createdAt),
      Item: it.name,
      Qty: it.qty,
      "Unit Price": it.price,
      "Line Total": (it.price ?? 0) * (it.qty ?? 0),
    })),
  );

  downloadWorkbook({ Orders: orderRows, "Order Items": itemRows }, fileBase);
}

export function exportRefunds(orders: Order[], fileBase = "foodfort_refunds") {
  const rows = orders
    .filter((o) => (o.refundedAmount ?? 0) > 0 || (o.refunds?.length ?? 0) > 0)
    .flatMap((o) =>
      (o.refunds && o.refunds.length
        ? o.refunds
        : [{ id: "", amount: o.refundedAmount ?? 0, reason: null, by: o.refundedBy }]
      ).map((r) => ({
        "Order #": o.orderNumber ?? "",
        "Order ID": o.id,
        "Order Date": tsToText(o.createdAt),
        "Refund ID": r.id ?? "",
        "Refund Amount": r.amount ?? 0,
        Reason: r.reason ?? "",
        "Refunded At": r.createdAt ? formatPerthDateTime(r.createdAt.toDate()) : tsToText(o.lastRefundedAt),
        "Refunded By": r.by ?? o.refundedBy ?? "",
        "Order Total": o.total ?? 0,
        "Refund Status": o.refundStatus ?? "none",
      })),
    );
  downloadWorkbook({ Refunds: rows }, fileBase);
}

export function exportRevenue(
  summary: RevenueSummary,
  daily: { day: string; ownerRevenue: number; orders: number }[],
  rangeLabel: string,
  fileBase = "foodfort_revenue",
) {
  const summaryRows = [
    { Metric: "Range", Value: rangeLabel },
    { Metric: "Orders", Value: summary.orderCount },
    { Metric: "Owner Revenue (excl. service fee)", Value: summary.ownerRevenue },
    { Metric: "Gross Customer Paid", Value: summary.grossCustomerPaid },
    { Metric: "Subtotal Total", Value: summary.subtotalTotal },
    { Metric: "Skryptone Service Fee", Value: summary.serviceFeeTotal },
    { Metric: "Card Processing Fee", Value: summary.cardProcessingFeeTotal },
    { Metric: "Refunded (gross)", Value: summary.refundedTotal },
    { Metric: "Refunded Subtotal Equivalent", Value: summary.refundedSubtotalEquivalent },
    { Metric: "Average Order Value", Value: summary.avgOrderValue },
  ];
  const dailyRows = daily.map((d) => ({
    Day: d.day,
    "Owner Revenue": d.ownerRevenue,
    Orders: d.orders,
  }));
  const topRows = summary.topItems.map((t) => ({
    Item: t.name,
    Qty: t.qty,
    Revenue: t.revenue,
  }));
  downloadWorkbook(
    { Summary: summaryRows, "Daily Breakdown": dailyRows, "Top Items": topRows },
    fileBase,
  );
}

export function exportMenu(
  sections: MenuSection[],
  sauces: Sauce[],
  fileBase = "foodfort_menu",
) {
  const itemRows = sections.flatMap((s) =>
    (s.items ?? []).map((it) => ({
      Section: s.title,
      "Section ID": s.id,
      "Item ID": it.id ?? "",
      Name: it.name,
      Description: it.description ?? "",
      Price: it.price,
      Badge: it.badge ?? "",
      Available: s.availability?.[it.name] !== false,
      "Has Image": Boolean(it.image),
    })),
  );
  const sauceRows = sauces.map((s) => ({
    "Sauce ID": s.id,
    Name: s.name,
    Price: s.price,
    Available: s.available !== false,
  }));
  downloadWorkbook({ "Menu Items": itemRows, Sauces: sauceRows }, fileBase);
}

export function exportAudit(logs: AuditLog[], fileBase = "foodfort_audit") {
  const rows = logs.map((l) => ({
    Date: l.createdAt ? formatPerthDateTime(l.createdAt.toDate()) : "",
    Action: l.action,
    By: l.byEmail ?? l.by,
    Target: l.targetId ?? "",
    Details: l.details ? JSON.stringify(l.details) : "",
  }));
  downloadWorkbook({ "Admin Activity": rows }, fileBase);
}
