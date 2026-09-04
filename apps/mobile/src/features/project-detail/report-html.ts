import { formatMoney } from "@keurflow/business";
import { PROJECT_TYPES } from "@keurflow/config";
import type { Project, Report } from "./types";

const PROJECT_TYPE_LABELS = new Map(PROJECT_TYPES.map((t) => [t.code, t.label]));

// Same palette as web's report-print-layout.tsx COLOR object — literal hex
// values (not Tailwind classes) for the same reason web uses them: a
// consistent look regardless of the device's theme.
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

// Rendered through expo-print's WebView, unlike web's html2canvas snapshot —
// no oklch()/Tailwind restriction here, but user-controlled text (project
// name/description, report summary) still lands in a raw HTML string, so it
// gets the same escaping web's report-actions.tsx applies before printing.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString("fr-FR") : "—";
}

function formatGeneratedAt(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Direct port of web's PrintDonut (same size/strokeWidth/radius math, same
// SVG stroke-dasharray progress-ring technique) — static markup instead of
// a React component, since expo-print takes one HTML string with no runtime.
function donutSvg(percent: number): string {
  const size = 108;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(percent, 0), 100);
  const length = (clamped / 100) * circumference;

  return `
    <div class="donut">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)">
        <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${COLOR.slate200}" stroke-width="${strokeWidth}" />
        <circle
          cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none"
          stroke="${COLOR.brand600}" stroke-width="${strokeWidth}" stroke-linecap="round"
          stroke-dasharray="${length} ${circumference - length}"
        />
      </svg>
      <div class="donut-label">
        <span class="donut-percent">${clamped}%</span>
        <span class="donut-caption">fait</span>
      </div>
    </div>`;
}

// Direct port of web's PrintBarChart — bar heights computed here (in TS)
// instead of at render time, since there's no runtime JS in a printed page.
function barChartHtml(bars: { label: string; value: number; formatted: string }[]): string {
  const max = Math.max(...bars.map((b) => b.value), 1);
  const items = bars
    .map((b) => {
      const heightPercent = b.value > 0 ? Math.max((b.value / max) * 100, 4) : 0;
      return `
        <div class="bar-col">
          <span class="bar-value">${escapeHtml(b.formatted)}</span>
          <div class="bar-track"><div class="bar-fill" style="height:${heightPercent}%"></div></div>
          <span class="bar-label">${escapeHtml(b.label)}</span>
        </div>`;
    })
    .join("");
  return `<div class="bar-chart">${items}</div>`;
}

export function buildReportHtml(project: Project, report: Report): string {
  const { metrics } = report;
  const generatedAt = formatGeneratedAt(new Date());
  const location = [project.city, project.address].filter(Boolean).join(", ") || "—";
  const typeLabel = PROJECT_TYPE_LABELS.get(project.project_type) ?? project.project_type;

  const financialSection = metrics
    ? `
      <div class="metrics-row">
        ${donutSvg(metrics.progressPercent)}
        <div class="stats">
          <div class="stat"><p class="stat-label">Étapes terminées</p><p class="stat-value">${metrics.milestonesCompleted} / ${metrics.milestonesTotal}</p></div>
          <div class="stat ${metrics.documentsMissingCount > 0 ? "warn" : ""}"><p class="stat-label">Documents manquants</p><p class="stat-value">${metrics.documentsMissingCount}</p></div>
          <div class="stat ${metrics.toReviewCount > 0 ? "warn" : ""}"><p class="stat-label">Dépenses à vérifier</p><p class="stat-value">${metrics.toReviewCount}</p></div>
          <div class="stat"><p class="stat-label">Devise</p><p class="stat-value">${escapeHtml(metrics.currencyCode)}</p></div>
        </div>
      </div>

      <p class="section-label">Financier (${escapeHtml(metrics.currencyCode)})</p>
      ${barChartHtml([
        { label: "Budget", value: metrics.budgetMinor, formatted: formatMoney(metrics.budgetMinor, metrics.currencyCode, metrics.minorUnit) },
        { label: "Financé", value: metrics.fundedInPeriodMinor, formatted: formatMoney(metrics.fundedInPeriodMinor, metrics.currencyCode, metrics.minorUnit) },
        { label: "Dépensé", value: metrics.approvedInPeriodMinor, formatted: formatMoney(metrics.approvedInPeriodMinor, metrics.currencyCode, metrics.minorUnit) },
      ])}
    `
    : "";

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 36px;
    background: ${COLOR.white};
    color: ${COLOR.slate900};
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  .header { display: flex; align-items: center; justify-content: space-between; }
  .brand { display: flex; align-items: center; gap: 8px; }
  .brand-mark { width: 26px; height: 26px; }
  .brand-name { font-size: 15px; font-weight: 700; letter-spacing: -0.01em; color: ${COLOR.slate900}; }
  .pill {
    font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em;
    background: ${COLOR.slate100}; color: ${COLOR.slate500}; padding: 5px 12px; border-radius: 999px;
  }
  h1 { margin: 28px 0 4px; font-size: 24px; font-weight: 700; color: ${COLOR.slate900}; }
  .meta { margin: 0; font-size: 13px; color: ${COLOR.slate500}; }
  .meta span + span::before { content: "•"; margin: 0 8px; color: ${COLOR.slate300}; }
  hr { border: none; border-top: 1px solid ${COLOR.slate200}; margin: 20px 0; }
  .section-label {
    font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em;
    color: ${COLOR.slate500}; margin: 24px 0 10px;
  }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; }
  .info-row { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; border-top: 1px solid ${COLOR.slate100}; padding-top: 8px; }
  .info-row .label { color: ${COLOR.slate500}; }
  .info-row .value { font-weight: 600; text-align: right; color: ${COLOR.slate900}; }

  .metrics-row { display: flex; align-items: center; gap: 20px; margin-top: 6px; }
  .donut { position: relative; flex-shrink: 0; width: 108px; height: 108px; }
  .donut-label {
    position: absolute; inset: 0; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
  }
  .donut-percent { font-size: 18px; font-weight: 600; color: ${COLOR.slate900}; }
  .donut-caption { font-size: 10px; color: ${COLOR.slate500}; }

  .stats { flex: 1; display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .stat { background: ${COLOR.slate50}; border-radius: 12px; padding: 14px; }
  .stat.warn { background: ${COLOR.amber50}; }
  .stat-label { margin: 0; font-size: 12px; color: ${COLOR.slate500}; }
  .stat-value { margin: 2px 0 0; font-size: 16px; font-weight: 600; color: ${COLOR.slate900}; }
  .stat.warn .stat-value { color: ${COLOR.amber700}; }

  .bar-chart { display: flex; align-items: flex-end; gap: 16px; height: 128px; margin-top: 12px; }
  .bar-col { flex: 1; height: 100%; display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .bar-value { font-size: 12px; font-weight: 500; color: ${COLOR.slate700}; }
  .bar-track { flex: 1; width: 100%; display: flex; align-items: flex-end; }
  .bar-fill { width: 100%; background: ${COLOR.brand600}; border-radius: 6px 6px 0 0; }
  .bar-label { font-size: 12px; color: ${COLOR.slate500}; }

  .summary {
    margin-top: 10px; background: ${COLOR.slate50}; border-radius: 12px; padding: 16px;
    font-size: 13.5px; line-height: 1.6; color: ${COLOR.slate700}; white-space: pre-line;
  }
  .footer {
    margin-top: 32px; padding-top: 14px; border-top: 1px solid ${COLOR.slate200};
    display: flex; justify-content: space-between; font-size: 11px; color: ${COLOR.slate400};
  }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <svg class="brand-mark" viewBox="0 0 512 512" role="img" aria-label="KeurFlow">
        <defs>
          <linearGradient id="mark-bg" x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0%" stop-color="#5C35E0" />
            <stop offset="100%" stop-color="#1D2E86" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="512" height="512" rx="108" ry="108" fill="url(#mark-bg)" />
        <rect x="170" y="120" width="56" height="272" fill="#FFFFFF" />
        <path d="M226,256 L366,120" stroke="#FFFFFF" stroke-width="56" stroke-linecap="square" fill="none" />
        <path d="M226,256 L366,392" stroke="#FFFFFF" stroke-width="56" stroke-linecap="square" fill="none" />
        <circle cx="400" cy="304" r="26" fill="#16BEC7" />
      </svg>
      <span class="brand-name">KeurFlow</span>
    </div>
    <span class="pill">Rapport de chantier</span>
  </div>

  <h1>${escapeHtml(project.name)}</h1>
  <p class="meta">
    <span>Période : ${escapeHtml(report.period_start)} → ${escapeHtml(report.period_end)}</span>
    <span>Généré le ${escapeHtml(generatedAt)}</span>
  </p>

  <hr />

  <p class="section-label">Détails du chantier</p>
  <div class="info-grid">
    <div class="info-row"><span class="label">Type</span><span class="value">${escapeHtml(typeLabel)}</span></div>
    <div class="info-row"><span class="label">Pays</span><span class="value">${escapeHtml(project.countryName ?? "—")}</span></div>
    <div class="info-row"><span class="label">Localisation</span><span class="value">${escapeHtml(location)}</span></div>
    <div class="info-row"><span class="label">Superficie</span><span class="value">${project.surface_area != null ? `${project.surface_area} m²` : "—"}</span></div>
    <div class="info-row"><span class="label">Début</span><span class="value">${formatDate(project.start_date)}</span></div>
    <div class="info-row"><span class="label">Fin prévue</span><span class="value">${formatDate(project.expected_end_date)}</span></div>
  </div>

  ${financialSection}

  <p class="section-label">Résumé</p>
  <p class="summary">${escapeHtml(report.summary)}</p>

  <div class="footer">
    <span>Généré automatiquement par KeurFlow</span>
    <span>${escapeHtml(generatedAt)}</span>
  </div>
</body>
</html>`;
}
