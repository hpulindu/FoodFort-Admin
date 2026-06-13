import type { DayKey, DaySchedule, OperationHours } from "./types";

export const DAY_KEYS: DayKey[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const DAY_LABELS: Record<DayKey, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function getLocalParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const weekday = parts.find((p) => p.type === "weekday")?.value.toLowerCase() ?? "";
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return { day: weekday as DayKey, time: `${hour}:${minute}` };
}

export function getDaySchedule(hours: OperationHours, date = new Date()): DaySchedule | null {
  const { day } = getLocalParts(date, hours.timezone);
  return hours.days.find((d) => d.day === day) ?? null;
}

export function isStoreOpen(hours: OperationHours, date = new Date()): boolean {
  const schedule = getDaySchedule(hours, date);
  if (!schedule || schedule.closed || !schedule.open || !schedule.close) return false;
  const { time } = getLocalParts(date, hours.timezone);
  const current = parseTimeToMinutes(time);
  return current >= parseTimeToMinutes(schedule.open) && current < parseTimeToMinutes(schedule.close);
}

export function formatTimeLabel(time?: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}
