import { useEffect, useState } from "react";
import { Clock, LogOut, PauseCircle, History, UserCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Button, Card, Field, Input, Spinner, Textarea, Toggle } from "../components/ui";
import { useAuditLogs, useOperationHours, useOrderingStatus } from "../lib/data";
import { DAY_KEYS, DAY_LABELS } from "../lib/hours";
import type { DaySchedule, OperationHours } from "../lib/types";
import { adminSetOrderingPaused, adminUpdateOperationHours } from "../lib/admin-api";
import { useAuth } from "../lib/auth";
import { formatPerthDateTime } from "../lib/utils";
import { toast } from "sonner";

function HoursEditor() {
  const { data: hours, loading } = useOperationHours();
  const [draft, setDraft] = useState<OperationHours | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading) setDraft(hours);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  if (loading || !draft) {
    return (
      <Card>
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      </Card>
    );
  }

  function updateDay(day: string, patch: Partial<DaySchedule>) {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            days: prev.days.map((d) => (d.day === day ? { ...d, ...patch } : d)),
          }
        : prev,
    );
  }

  async function save() {
    if (!draft) return;
    // Validate open/close present for open days.
    for (const d of draft.days) {
      if (!d.closed && (!d.open || !d.close)) {
        toast.error(`Set open and close times for ${DAY_LABELS[d.day]}.`);
        return;
      }
    }
    setSaving(true);
    try {
      await adminUpdateOperationHours({ timezone: draft.timezone, days: draft.days });
      toast.success("Operation hours updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save hours");
    } finally {
      setSaving(false);
    }
  }

  const byDay = new Map(draft.days.map((d) => [d.day, d]));

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-[var(--color-gold-soft)]" />
        <div>
          <h2 className="font-display text-lg font-semibold">Kitchen / ordering hours</h2>
          <p className="text-xs text-[var(--color-muted)]">
            Controls when online orders are accepted ({draft.timezone}).
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {DAY_KEYS.map((day) => {
          const schedule = byDay.get(day) ?? { day, closed: true };
          return (
            <div
              key={day}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-border)] p-2.5"
            >
              <span className="w-24 text-sm font-medium">{DAY_LABELS[day]}</span>
              <label className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
                <Toggle
                  checked={!schedule.closed}
                  onChange={(v) =>
                    updateDay(day, {
                      closed: !v,
                      open: schedule.open ?? "11:00",
                      close: schedule.close ?? "21:00",
                    })
                  }
                />
                {schedule.closed ? "Closed" : "Open"}
              </label>
              {!schedule.closed && (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={schedule.open ?? ""}
                    onChange={(e) => updateDay(day, { open: e.target.value })}
                    className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-sm"
                  />
                  <span className="text-xs text-[var(--color-muted)]">to</span>
                  <input
                    type="time"
                    value={schedule.close ?? ""}
                    onChange={(e) => updateDay(day, { close: e.target.value })}
                    className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-sm"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button loading={saving} onClick={save}>
          Save hours
        </Button>
      </div>
    </Card>
  );
}

function PauseControl() {
  const { data: ordering } = useOrderingStatus();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setReason(ordering.reason ?? "");
  }, [ordering.reason]);

  async function setPaused(paused: boolean) {
    setSaving(true);
    try {
      await adminSetOrderingPaused({ paused, reason: paused ? reason.trim() || undefined : undefined });
      toast.success(paused ? "Online ordering paused" : "Online ordering resumed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <PauseCircle className="h-5 w-5 text-[var(--color-gold-soft)]" />
        <div>
          <h2 className="font-display text-lg font-semibold">Pause online ordering</h2>
          <p className="text-xs text-[var(--color-muted)]">
            Temporarily stop checkout regardless of hours.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-3">
        <span className="text-sm font-medium">
          {ordering.paused ? "Ordering is paused" : "Ordering is live"}
        </span>
        <Toggle checked={ordering.paused} disabled={saving} onChange={setPaused} />
      </div>

      <Field label="Reason shown to customers (optional)">
        <Textarea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Kitchen at capacity"
        />
      </Field>
      {ordering.paused && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" loading={saving} onClick={() => setPaused(true)}>
            Update reason
          </Button>
        </div>
      )}
    </Card>
  );
}

function ActivityLog() {
  const { data: logs, loading } = useAuditLogs(20);
  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-[var(--color-gold-soft)]" />
        <h2 className="font-display text-lg font-semibold">Recent admin activity</h2>
      </div>
      {loading ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : logs.length === 0 ? (
        <p className="py-4 text-center text-sm text-[var(--color-muted)]">No activity logged yet.</p>
      ) : (
        <ul className="space-y-2">
          {logs.map((log) => (
            <li key={log.id} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate">
                  <span className="font-medium">{log.action}</span>
                  {log.targetId ? (
                    <span className="text-[var(--color-muted)]"> · {log.targetId}</span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-[var(--color-muted)]">
                  {log.byEmail ?? log.by}
                </p>
              </div>
              <span className="shrink-0 text-xs text-[var(--color-muted)]">
                {log.createdAt ? formatPerthDateTime(log.createdAt.toDate()) : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <>
      <PageHeader title="Settings" description="Operating hours, pause control, profile and activity." />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <HoursEditor />
          <PauseControl />
        </div>
        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-[var(--color-gold-soft)]" />
              <h2 className="font-display text-lg font-semibold">Admin profile</h2>
            </div>
            <Field label="Signed in as">
              <Input value={user?.email ?? ""} readOnly />
            </Field>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </Card>
          <ActivityLog />
        </div>
      </div>
    </>
  );
}
