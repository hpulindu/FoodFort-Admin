import type { Timestamp } from "firebase/firestore";

export type OrderType = "pickup" | "dinein";

export type OrderStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled"
  | "refunded";

export type RefundStatus = "none" | "partial" | "full";

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "preparing",
  "ready",
  "completed",
  "cancelled",
  "refunded",
];

/** Active orders shown on the live board (not done/cancelled/refunded). */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "preparing",
  "ready",
];

export type OrderItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
};

export type RefundRecord = {
  id: string;
  amount: number;
  reason?: string | null;
  createdAt?: Timestamp | null;
  by?: string | null;
};

export type Order = {
  id: string;
  orderNumber?: number;
  orderDay?: string;
  type: OrderType;
  pickupTime: string | null;
  table: string | null;
  customer: { name: string; phone: string; email: string; notes: string };
  items: OrderItem[];
  subtotal: number;
  serviceFee: number;
  cardProcessingFee: number;
  total: number;
  currency: string;
  paymentIntentId: string;
  paymentStatus: string;
  orderStatus: OrderStatus;
  createdAt?: Timestamp | null;
  paidAt?: Timestamp | null;
  source?: string;
  // Refund tracking (written by adminRefundOrder)
  refundStatus?: RefundStatus;
  refundedAmount?: number;
  refunds?: RefundRecord[];
  lastRefundedAt?: Timestamp | null;
  refundedBy?: string | null;
};

export type MenuItem = {
  id?: string;
  name: string;
  description?: string | null;
  price: number;
  badge?: "chef" | "veg" | null;
  image?: string | null;
};

export type MenuSection = {
  id: string;
  number: string;
  title: string;
  subtitle?: string | null;
  order: number;
  items: MenuItem[];
  /** Map of itemName -> availability (false = sold out). */
  availability?: Record<string, boolean>;
};

export type Sauce = {
  id: string;
  name: string;
  price: number;
  order: number;
  available?: boolean;
};

export type DayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type DaySchedule = {
  day: DayKey;
  closed: boolean;
  open?: string;
  close?: string;
};

export type OperationHours = {
  timezone: string;
  days: DaySchedule[];
};

export type OrderingStatus = {
  paused: boolean;
  reason: string | null;
  pausedAt?: Timestamp | null;
  pausedBy?: string | null;
  updatedAt?: Timestamp | null;
};

export type AuditLog = {
  id: string;
  action: string;
  by: string;
  byEmail?: string | null;
  targetId?: string | null;
  details?: Record<string, unknown> | null;
  createdAt?: Timestamp | null;
};
