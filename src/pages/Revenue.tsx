import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Button, Card, Spinner } from "../components/ui";
import { useOrdersByRange } from "../lib/data";
import {
  computeRevenue,
  dailySeries,
  rangeForPreset,
  type RangePreset,
} from "../lib/revenue";
import { exportRevenue } from "../lib/export";
import { formatCurrency, getPerthDateKey } from "../lib/utils";

const PRESETS: { id: RangePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "custom", label: "Custom" },
];

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
        {label}
      </span>
      <span className="font-display text-xl font-semibold">{value}</span>
      {hint && <span className="text-xs text-[var(--color-muted)]">{hint}</span>}
    </Card>
  );
}

export function RevenuePage() {
  const [preset, setPreset] = useState<RangePreset>("today");
  const [customStart, setCustomStart] = useState(getPerthDateKey());
  const [customEnd, setCustomEnd] = useState(getPerthDateKey());

  const range = useMemo(
    () => rangeForPreset(preset, { start: customStart, end: customEnd }),
    [preset, customStart, customEnd],
  );

  const { data: orders, loading } = useOrdersByRange(range.startKey, range.endKey);
  const summary = useMemo(() => computeRevenue(orders), [orders]);
  const daily = useMemo(() => dailySeries(orders), [orders]);

  return (
    <>
      <PageHeader
        title="Revenue"
        description="Owner revenue excludes the Skryptone service fee. Perth-local boundaries."
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={orders.length === 0}
            onClick={() => exportRevenue(summary, daily, range.label)}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <Button
            key={p.id}
            size="sm"
            variant={preset === p.id ? "primary" : "outline"}
            onClick={() => setPreset(p.id)}
          >
            {p.label}
          </Button>
        ))}
        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              max={getPerthDateKey()}
              onChange={(e) => setCustomStart(e.target.value)}
              className="h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-xs text-[var(--color-fg)]"
            />
            <span className="text-xs text-[var(--color-muted)]">to</span>
            <input
              type="date"
              value={customEnd}
              max={getPerthDateKey()}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-xs text-[var(--color-fg)]"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-7 w-7" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric
              label="Owner revenue"
              value={formatCurrency(summary.ownerRevenue)}
              hint="Subtotal − refunds (excl. service fee)"
            />
            <Metric
              label="Orders"
              value={String(summary.orderCount)}
              hint={`Avg ${formatCurrency(summary.avgOrderValue)}`}
            />
            <Metric
              label="Gross paid"
              value={formatCurrency(summary.grossCustomerPaid)}
              hint="Total customers paid"
            />
            <Metric
              label="Refunds"
              value={formatCurrency(summary.refundedTotal)}
              hint={`Subtotal eq. ${formatCurrency(summary.refundedSubtotalEquivalent)}`}
            />
            <Metric
              label="Service fee"
              value={formatCurrency(summary.serviceFeeTotal)}
              hint="Skryptone application fee"
            />
            <Metric
              label="Card processing"
              value={formatCurrency(summary.cardProcessingFeeTotal)}
              hint="Passed to customer"
            />
            <Metric label="Subtotal" value={formatCurrency(summary.subtotalTotal)} />
            <Metric
              label="Net of card fees"
              value={formatCurrency(summary.grossCustomerPaid - summary.cardProcessingFeeTotal)}
            />
          </div>

          {daily.length > 1 && (
            <Card className="mt-5">
              <h2 className="mb-3 font-display text-lg font-semibold">Owner revenue by day</h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={daily} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2c31" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: "#9b958c", fontSize: 11 }}
                      tickFormatter={(d: string) => d.slice(5)}
                    />
                    <YAxis tick={{ fill: "#9b958c", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: "#17181b",
                        border: "1px solid #2a2c31",
                        borderRadius: 8,
                        color: "#f2ebe3",
                      }}
                      formatter={(v: number) => formatCurrency(v)}
                    />
                    <Bar dataKey="ownerRevenue" fill="#bc6a2f" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          <Card className="mt-5">
            <h2 className="mb-3 font-display text-lg font-semibold">Top items</h2>
            {summary.topItems.length === 0 ? (
              <p className="py-4 text-center text-sm text-[var(--color-muted)]">
                No sales in this range.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-[var(--color-muted)]">
                      <th className="pb-2 font-medium">Item</th>
                      <th className="pb-2 text-right font-medium">Qty</th>
                      <th className="pb-2 text-right font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.topItems.slice(0, 15).map((it) => (
                      <tr key={it.name} className="border-t border-[var(--color-border)]">
                        <td className="py-2 pr-2">{it.name}</td>
                        <td className="py-2 text-right text-[var(--color-muted)]">{it.qty}</td>
                        <td className="py-2 text-right">{formatCurrency(it.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </>
  );
}
