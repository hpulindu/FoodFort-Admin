import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import type {
  DaySchedule,
  MenuItem,
  OrderStatus,
} from "./types";

function callable<TReq, TRes>(name: string) {
  const fn = httpsCallable<TReq, TRes>(functions, name);
  return async (data: TReq): Promise<TRes> => {
    const res = await fn(data);
    return res.data;
  };
}

// ── Orders ───────────────────────────────────────────────────────────────────
export const adminUpdateOrderStatus = callable<
  { orderId: string; orderStatus: OrderStatus },
  { ok: true; orderStatus: OrderStatus }
>("adminUpdateOrderStatus");

export const adminRefundOrder = callable<
  { orderId: string; amount?: number; reason?: string },
  {
    ok: true;
    refundId: string;
    refundedAmount: number;
    refundStatus: "partial" | "full";
  }
>("adminRefundOrder");

// ── Menu ─────────────────────────────────────────────────────────────────────
export const adminUpsertMenuSection = callable<
  {
    id?: string;
    number: string;
    title: string;
    subtitle?: string | null;
    order?: number;
  },
  { ok: true; id: string }
>("adminUpsertMenuSection");

export const adminDeleteMenuSection = callable<
  { id: string },
  { ok: true }
>("adminDeleteMenuSection");

export const adminUpsertMenuItem = callable<
  { sectionId: string; item: MenuItem },
  { ok: true; itemId: string }
>("adminUpsertMenuItem");

export const adminDeleteMenuItem = callable<
  { sectionId: string; itemId: string },
  { ok: true }
>("adminDeleteMenuItem");

export const adminSetItemAvailability = callable<
  { sectionId: string; itemName: string; available: boolean },
  { ok: true }
>("adminSetItemAvailability");

export const adminReorderSections = callable<
  { order: string[] },
  { ok: true }
>("adminReorderSections");

// ── Sauces ───────────────────────────────────────────────────────────────────
export const adminUpsertSauce = callable<
  { id?: string; name: string; price: number; order?: number },
  { ok: true; id: string }
>("adminUpsertSauce");

export const adminDeleteSauce = callable<
  { id: string },
  { ok: true }
>("adminDeleteSauce");

export const adminSetSauceAvailability = callable<
  { id: string; available: boolean },
  { ok: true }
>("adminSetSauceAvailability");

// ── Settings ─────────────────────────────────────────────────────────────────
export const adminUpdateOperationHours = callable<
  { timezone: string; days: DaySchedule[] },
  { ok: true }
>("adminUpdateOperationHours");

export const adminSetOrderingPaused = callable<
  { paused: boolean; reason?: string },
  { ok: true; paused: boolean }
>("adminSetOrderingPaused");
