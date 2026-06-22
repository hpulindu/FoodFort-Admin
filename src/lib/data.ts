import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  limit as fbLimit,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  AuditLog,
  MenuSection,
  OperationHours,
  Order,
  OrderingStatus,
  Sauce,
} from "./types";
import { getPerthDateKey } from "./utils";

export type AsyncData<T> = {
  data: T;
  loading: boolean;
  error: string | null;
};

function tsMillis(v: unknown): number {
  if (v && typeof v === "object" && "toMillis" in v) {
    try {
      return (v as { toMillis: () => number }).toMillis();
    } catch {
      return 0;
    }
  }
  return 0;
}

function mapOrder(snap: QueryDocumentSnapshot<DocumentData>): Order {
  const d = snap.data();
  return {
    id: snap.id,
    ...(d as Omit<Order, "id">),
  };
}

/** Live orders for a single Perth day (defaults to today). */
export function useOrdersByDay(dateKey?: string): AsyncData<Order[]> {
  const key = dateKey ?? getPerthDateKey();
  const [state, setState] = useState<AsyncData<Order[]>>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    setState((s) => ({ ...s, loading: true }));
    const q = query(collection(db, "orders"), where("orderDay", "==", key));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const orders = snap.docs.map(mapOrder);
        orders.sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt));
        setState({ data: orders, loading: false, error: null });
      },
      (err) => setState({ data: [], loading: false, error: err.message }),
    );
    return unsub;
  }, [key]);

  return state;
}

/** Live orders across all days, newest first (optional day filter in the UI). */
export function useOrders(options?: { dateKey?: string; limit?: number }): AsyncData<Order[]> {
  const dateKey = options?.dateKey?.trim() || undefined;
  const limit = options?.limit ?? 500;
  const [state, setState] = useState<AsyncData<Order[]>>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    setState((s) => ({ ...s, loading: true }));
    const q = dateKey
      ? query(collection(db, "orders"), where("orderDay", "==", dateKey))
      : query(collection(db, "orders"), orderBy("createdAt", "desc"), fbLimit(limit));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const orders = snap.docs.map(mapOrder);
        if (dateKey) {
          orders.sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt));
        }
        setState({ data: orders, loading: false, error: null });
      },
      (err) => setState({ data: [], loading: false, error: err.message }),
    );
    return unsub;
  }, [dateKey, limit]);

  return state;
}

/** Live orders across an inclusive Perth-day range (YYYY-MM-DD keys). */
export function useOrdersByRange(startKey: string, endKey: string): AsyncData<Order[]> {
  const [state, setState] = useState<AsyncData<Order[]>>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    setState((s) => ({ ...s, loading: true }));
    const q = query(
      collection(db, "orders"),
      where("orderDay", ">=", startKey),
      where("orderDay", "<=", endKey),
      orderBy("orderDay", "desc"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const orders = snap.docs.map(mapOrder);
        orders.sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt));
        setState({ data: orders, loading: false, error: null });
      },
      (err) => setState({ data: [], loading: false, error: err.message }),
    );
    return unsub;
  }, [startKey, endKey]);

  return state;
}

export function useMenuSections(): AsyncData<MenuSection[]> {
  const [state, setState] = useState<AsyncData<MenuSection[]>>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const q = query(collection(db, "menuSections"), orderBy("order"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const sections = snap.docs.map((s) => ({
          id: s.id,
          ...(s.data() as Omit<MenuSection, "id">),
        }));
        setState({ data: sections, loading: false, error: null });
      },
      (err) => setState({ data: [], loading: false, error: err.message }),
    );
    return unsub;
  }, []);

  return state;
}

export function useSauces(): AsyncData<Sauce[]> {
  const [state, setState] = useState<AsyncData<Sauce[]>>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const q = query(collection(db, "sauces"), orderBy("order"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const sauces = snap.docs.map((s) => ({
          id: s.id,
          ...(s.data() as Omit<Sauce, "id">),
        }));
        setState({ data: sauces, loading: false, error: null });
      },
      (err) => setState({ data: [], loading: false, error: err.message }),
    );
    return unsub;
  }, []);

  return state;
}

const DEFAULT_HOURS: OperationHours = {
  timezone: "Australia/Perth",
  days: [
    { day: "monday", closed: true },
    { day: "tuesday", closed: false, open: "15:00", close: "21:00" },
    { day: "wednesday", closed: false, open: "11:00", close: "21:00" },
    { day: "thursday", closed: false, open: "11:00", close: "21:00" },
    { day: "friday", closed: false, open: "11:00", close: "21:00" },
    { day: "saturday", closed: false, open: "11:00", close: "21:00" },
    { day: "sunday", closed: false, open: "11:00", close: "21:00" },
  ],
};

export function useOperationHours(): AsyncData<OperationHours> {
  const [state, setState] = useState<AsyncData<OperationHours>>({
    data: DEFAULT_HOURS,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const ref = doc(db, "storeSettings", "operationHours");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.exists() ? (snap.data() as OperationHours) : DEFAULT_HOURS;
        setState({ data, loading: false, error: null });
      },
      (err) => setState({ data: DEFAULT_HOURS, loading: false, error: err.message }),
    );
    return unsub;
  }, []);

  return state;
}

export function useOrderingStatus(): AsyncData<OrderingStatus> {
  const [state, setState] = useState<AsyncData<OrderingStatus>>({
    data: { paused: false, reason: null },
    loading: true,
    error: null,
  });

  useEffect(() => {
    const ref = doc(db, "storeSettings", "ordering");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.exists()
          ? (snap.data() as OrderingStatus)
          : { paused: false, reason: null };
        setState({ data, loading: false, error: null });
      },
      (err) =>
        setState({ data: { paused: false, reason: null }, loading: false, error: err.message }),
    );
    return unsub;
  }, []);

  return state;
}

export function useAuditLogs(max = 25): AsyncData<AuditLog[]> {
  const [state, setState] = useState<AsyncData<AuditLog[]>>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const q = query(
      collection(db, "auditLogs"),
      orderBy("createdAt", "desc"),
      fbLimit(max),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const logs = snap.docs.map((s) => ({
          id: s.id,
          ...(s.data() as Omit<AuditLog, "id">),
        }));
        setState({ data: logs, loading: false, error: null });
      },
      (err) => setState({ data: [], loading: false, error: err.message }),
    );
    return unsub;
  }, [max]);

  return state;
}

/** Convenience: today's orders plus a memoized active subset. */
export function useTodayOrders() {
  const today = useMemo(() => getPerthDateKey(), []);
  return useOrdersByDay(today);
}
