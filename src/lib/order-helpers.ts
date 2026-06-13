import type { OrderStatus } from "./types";

export function statusTone(
  status: OrderStatus,
): "neutral" | "gold" | "success" | "warning" | "danger" | "info" {
  switch (status) {
    case "pending":
      return "warning";
    case "preparing":
      return "info";
    case "ready":
      return "gold";
    case "completed":
      return "success";
    case "cancelled":
      return "neutral";
    case "refunded":
      return "danger";
    default:
      return "neutral";
  }
}

export function formatOrderNumber(orderNumber?: number, fallbackId?: string): string {
  if (orderNumber != null && orderNumber > 0) {
    return String(orderNumber).padStart(3, "0");
  }
  return fallbackId?.slice(-6) ?? "---";
}

/** Next forward status options offered as quick actions. */
export function nextStatuses(status: OrderStatus): OrderStatus[] {
  switch (status) {
    case "pending":
      return ["preparing", "cancelled"];
    case "preparing":
      return ["ready", "cancelled"];
    case "ready":
      return ["completed", "cancelled"];
    default:
      return [];
  }
}
