import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AUD = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
});

export function formatCurrency(amount: number | undefined | null): string {
  return AUD.format(Number.isFinite(amount as number) ? (amount as number) : 0);
}

export const RESTAURANT_TIMEZONE = "Australia/Perth";

/** YYYY-MM-DD key in the restaurant's timezone (matches backend orderDay). */
export function getPerthDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: RESTAURANT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Human time in Perth, e.g. "7:42 PM". */
export function formatPerthTime(date: Date): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: RESTAURANT_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/** Human date + time in Perth, e.g. "13 Jun, 7:42 PM". */
export function formatPerthDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: RESTAURANT_TIMEZONE,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}
