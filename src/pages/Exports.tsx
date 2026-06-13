import { useMemo, useState } from "react";
import {
  FileSpreadsheet,
  ReceiptText,
  RotateCcw,
  TrendingUp,
  UtensilsCrossed,
  History,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Button, Card, Spinner } from "../components/ui";
import {
  useAuditLogs,
  useMenuSections,
  useOrdersByRange,
  useSauces,
} from "../lib/data";
import {
  computeRevenue,
  dailySeries,
  rangeForPreset,
  type RangePreset,
} from "../lib/revenue";
import {
  exportAudit,
  exportMenu,
  exportOrders,
  exportRefunds,
  exportRevenue,
} from "../lib/export";
import { getPerthDateKey } from "../lib/utils";

const PRESETS: { id: RangePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "custom", label: "Custom" },
];

function ExportRow({
  icon,
  title,
  description,
  count,
  onExport,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  count: string;
  onExport: () => void;
  disabled?: boolean;
}) {
  return (
    <Card className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-gold-soft)]">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="truncate text-xs text-[var(--color-muted)]">{description}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden text-xs text-[var(--color-muted)] sm:inline">{count}</span>
        <Button size="sm" variant="outline" onClick={onExport} disabled={disabled}>
          <FileSpreadsheet className="h-4 w-4" />
          .xlsx
        </Button>
      </div>
    </Card>
  );
}

export function ExportsPage() {
  const [preset, setPreset] = useState<RangePreset>("month");
  const [customStart, setCustomStart] = useState(getPerthDateKey());
  const [customEnd, setCustomEnd] = useState(getPerthDateKey());

  const range = useMemo(
    () => rangeForPreset(preset, { start: customStart, end: customEnd }),
    [preset, customStart, customEnd],
  );

  const { data: orders, loading: ordersLoading } = useOrdersByRange(range.startKey, range.endKey);
  const { data: sections } = useMenuSections();
  const { data: sauces } = useSauces();
  const { data: logs } = useAuditLogs(200);

  const summary = useMemo(() => computeRevenue(orders), [orders]);
  const daily = useMemo(() => dailySeries(orders), [orders]);
  const refundCount = orders.filter((o) => (o.refundedAmount ?? 0) > 0).length;

  return (
    <>
      <PageHeader
        title="Exports"
        description="Download reports as Excel workbooks. Totals match the dashboard."
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
        <span className="text-xs text-[var(--color-muted)]">
          {range.startKey} → {range.endKey}
        </span>
      </div>

      {ordersLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-7 w-7" />
        </div>
      ) : (
        <div className="space-y-3">
          <ExportRow
            icon={<ReceiptText className="h-5 w-5" />}
            title="Orders & order items"
            description="Two sheets: order summary + line items"
            count={`${orders.length} orders`}
            disabled={orders.length === 0}
            onExport={() => exportOrders(orders)}
          />
          <ExportRow
            icon={<TrendingUp className="h-5 w-5" />}
            title="Revenue report"
            description="Summary, daily breakdown, top items"
            count={range.label}
            disabled={orders.length === 0}
            onExport={() => exportRevenue(summary, daily, range.label)}
          />
          <ExportRow
            icon={<RotateCcw className="h-5 w-5" />}
            title="Refunds"
            description="All refunds in range with reasons"
            count={`${refundCount} refunded`}
            disabled={refundCount === 0}
            onExport={() => exportRefunds(orders)}
          />
          <ExportRow
            icon={<UtensilsCrossed className="h-5 w-5" />}
            title="Menu & sauces"
            description="Current menu items, prices, availability"
            count={`${sections.length} sections`}
            disabled={sections.length === 0}
            onExport={() => exportMenu(sections, sauces)}
          />
          <ExportRow
            icon={<History className="h-5 w-5" />}
            title="Admin activity (audit log)"
            description="Recent admin actions"
            count={`${logs.length} entries`}
            disabled={logs.length === 0}
            onExport={() => exportAudit(logs)}
          />
        </div>
      )}
    </>
  );
}
