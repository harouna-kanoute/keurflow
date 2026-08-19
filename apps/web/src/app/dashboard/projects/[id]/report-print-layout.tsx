import { formatMoney, type ReportData } from "@keurflow/business";
import { KeurFlowMark } from "@/components/keurflow-mark";

// Deliberately not using Tailwind color utilities (bg-slate-50, text-amber-700,
// etc.) anywhere in this file, and not reusing the dashboard's <DonutChart>/
// <BarChart> — html2canvas (which snapshots this off-screen layout for the
// PDF/print actions) cannot parse the oklch() colors Tailwind v4's default
// palette compiles to, and silently hangs trying to compute them. Every
// color here is a literal hex value passed via inline `style` instead, so a
// printed/exported report also always renders the same way regardless of
// the dashboard's current theme.
const COLOR = {
  white: "#ffffff",
  slate50: "#f8fafc",
  slate100: "#f1f5f9",
  slate200: "#e2e8f0",
  slate300: "#cbd5e1",
  slate400: "#94a3b8",
  slate500: "#64748b",
  slate700: "#334155",
  slate900: "#0f172a",
  amber50: "#fffbeb",
  amber700: "#b45309",
  brand600: "#5443c4",
};

function PrintDonut({ percent }: { percent: number }) {
  const size = 108;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(percent, 0), 100);
  const length = (clamped / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={COLOR.slate200} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={COLOR.brand600}
          strokeWidth={strokeWidth}
          strokeDasharray={`${length} ${circumference - length}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span style={{ fontSize: 18, fontWeight: 600, color: COLOR.slate900 }}>{clamped}%</span>
        <span style={{ fontSize: 10, color: COLOR.slate500 }}>fait</span>
      </div>
    </div>
  );
}

function PrintBarChart({ data }: { data: { label: string; value: number; formatted: string }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex h-32 items-end gap-4">
      {data.map((d) => (
        <div key={d.label} className="flex h-full flex-1 flex-col items-center gap-1.5">
          <span style={{ fontSize: 12, fontWeight: 500, color: COLOR.slate700 }}>{d.formatted}</span>
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-md"
              style={{
                height: `${d.value > 0 ? Math.max((d.value / max) * 100, 4) : 0}%`,
                backgroundColor: COLOR.brand600,
              }}
            />
          </div>
          <span style={{ fontSize: 12, color: COLOR.slate500 }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function StatTile({ label, value, warn }: { label: string; value: string; warn: boolean }) {
  return (
    <div
      className="rounded-xl p-3.5"
      style={{ backgroundColor: warn ? COLOR.amber50 : COLOR.slate50 }}
    >
      <p style={{ fontSize: 12, color: COLOR.slate500 }}>{label}</p>
      <p style={{ marginTop: 2, fontSize: 16, fontWeight: 600, color: warn ? COLOR.amber700 : COLOR.slate900 }}>
        {value}
      </p>
    </div>
  );
}

export function ReportPrintLayout({
  projectName,
  periodStart,
  periodEnd,
  summary,
  metrics,
  generatedAt,
}: {
  projectName: string;
  periodStart: string;
  periodEnd: string;
  summary: string;
  metrics: ReportData | null;
  generatedAt: string;
}) {
  return (
    <div
      className="flex flex-col p-10"
      style={{
        width: 760,
        backgroundColor: COLOR.white,
        color: COLOR.slate900,
        fontFamily: "var(--font-sans, ui-sans-serif, system-ui, sans-serif)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeurFlowMark className="h-7 w-7" />
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", color: COLOR.slate900 }}>
            KeurFlow
          </span>
        </div>
        <span
          className="rounded-full px-3 py-1 uppercase"
          style={{
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.02em",
            backgroundColor: COLOR.slate100,
            color: COLOR.slate500,
          }}
        >
          Rapport de chantier
        </span>
      </div>

      <h1 className="mt-8" style={{ fontSize: 24, fontWeight: 600, color: COLOR.slate900 }}>
        {projectName}
      </h1>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1" style={{ fontSize: 14, color: COLOR.slate500 }}>
        <span>
          Période : {periodStart} → {periodEnd}
        </span>
        <span style={{ color: COLOR.slate300 }}>•</span>
        <span>Généré le {generatedAt}</span>
      </div>

      <div className="mt-6" style={{ height: 1, backgroundColor: COLOR.slate200 }} />

      {metrics && (
        <>
          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
            <PrintDonut percent={metrics.progressPercent} />
            <div className="grid flex-1 grid-cols-2 gap-3">
              <StatTile
                label="Étapes terminées"
                value={`${metrics.milestonesCompleted} / ${metrics.milestonesTotal}`}
                warn={false}
              />
              <StatTile
                label="Documents manquants"
                value={String(metrics.documentsMissingCount)}
                warn={metrics.documentsMissingCount > 0}
              />
              <StatTile
                label="Dépenses à vérifier"
                value={String(metrics.toReviewCount)}
                warn={metrics.toReviewCount > 0}
              />
              <StatTile label="Devise" value={metrics.currencyCode} warn={false} />
            </div>
          </div>

          <p
            className="mt-8 uppercase"
            style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.02em", color: COLOR.slate500 }}
          >
            Financier ({metrics.currencyCode})
          </p>
          <div className="mt-3">
            <PrintBarChart
              data={[
                {
                  label: "Budget",
                  value: metrics.budgetMinor,
                  formatted: formatMoney(metrics.budgetMinor, metrics.currencyCode, metrics.minorUnit),
                },
                {
                  label: "Financé",
                  value: metrics.fundedInPeriodMinor,
                  formatted: formatMoney(metrics.fundedInPeriodMinor, metrics.currencyCode, metrics.minorUnit),
                },
                {
                  label: "Dépensé",
                  value: metrics.approvedInPeriodMinor,
                  formatted: formatMoney(metrics.approvedInPeriodMinor, metrics.currencyCode, metrics.minorUnit),
                },
              ]}
            />
          </div>
        </>
      )}

      <p
        className="mt-8 uppercase"
        style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.02em", color: COLOR.slate500 }}
      >
        Détails
      </p>
      <p
        className="mt-3 rounded-xl p-4 whitespace-pre-line"
        style={{ fontSize: 14, backgroundColor: COLOR.slate50, color: COLOR.slate700 }}
      >
        {summary}
      </p>

      <div
        className="mt-10 flex items-center justify-between pt-4"
        style={{ borderTop: `1px solid ${COLOR.slate200}` }}
      >
        <span style={{ fontSize: 11, color: COLOR.slate400 }}>Généré automatiquement par KeurFlow</span>
        <span style={{ fontSize: 11, color: COLOR.slate400 }}>{generatedAt}</span>
      </div>
    </div>
  );
}
