import { formatMoney } from "@keurflow/business";
import { PROJECT_TYPES } from "@keurflow/config";
import type { Project, Report } from "./types";

const PROJECT_TYPE_LABELS = new Map(PROJECT_TYPES.map((t) => [t.code, t.label]));

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

export function buildReportHtml(project: Project, report: Report): string {
  const { metrics } = report;
  const generatedAt = formatGeneratedAt(new Date());
  const location = [project.city, project.address].filter(Boolean).join(", ") || "—";
  const typeLabel = PROJECT_TYPE_LABELS.get(project.project_type) ?? project.project_type;

  const statTiles = metrics
    ? `
      <div class="stats">
        <div class="stat"><p class="stat-label">Progression</p><p class="stat-value">${metrics.progressPercent}%</p></div>
        <div class="stat"><p class="stat-label">Étapes terminées</p><p class="stat-value">${metrics.milestonesCompleted} / ${metrics.milestonesTotal}</p></div>
        <div class="stat ${metrics.documentsMissingCount > 0 ? "warn" : ""}"><p class="stat-label">Documents manquants</p><p class="stat-value">${metrics.documentsMissingCount}</p></div>
        <div class="stat ${metrics.toReviewCount > 0 ? "warn" : ""}"><p class="stat-label">Dépenses à vérifier</p><p class="stat-value">${metrics.toReviewCount}</p></div>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${Math.min(Math.max(metrics.progressPercent, 0), 100)}%"></div></div>

      <p class="section-label">Financier (${escapeHtml(metrics.currencyCode)})</p>
      <table class="financials">
        <tr><td>Budget total</td><td class="amount">${formatMoney(metrics.budgetMinor, metrics.currencyCode, metrics.minorUnit)}</td></tr>
        <tr><td>Financé sur la période</td><td class="amount">${formatMoney(metrics.fundedInPeriodMinor, metrics.currencyCode, metrics.minorUnit)}</td></tr>
        <tr><td>Dépensé (approuvé) sur la période</td><td class="amount">${formatMoney(metrics.approvedInPeriodMinor, metrics.currencyCode, metrics.minorUnit)}</td></tr>
      </table>
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
    background: #ffffff;
    color: #0f172a;
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  .header { display: flex; align-items: center; justify-content: space-between; }
  .brand { display: flex; align-items: center; gap: 8px; }
  .brand-mark {
    width: 26px; height: 26px; border-radius: 8px;
    background: linear-gradient(135deg, #5443c4, #7c6cf0);
  }
  .brand-name { font-size: 15px; font-weight: 700; letter-spacing: -0.01em; }
  .pill {
    font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
    background: #f1f5f9; color: #64748b; padding: 5px 12px; border-radius: 999px;
  }
  h1 { margin: 28px 0 4px; font-size: 24px; font-weight: 700; }
  .meta { margin: 0; font-size: 13px; color: #64748b; }
  .meta span + span::before { content: "•"; margin: 0 8px; color: #cbd5e1; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }
  .section-label {
    font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
    color: #64748b; margin: 24px 0 10px;
  }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; }
  .info-row { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; border-top: 1px solid #f1f5f9; padding-top: 8px; }
  .info-row .label { color: #64748b; }
  .info-row .value { font-weight: 600; text-align: right; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 6px; }
  .stat { background: #f8fafc; border-radius: 12px; padding: 12px; }
  .stat.warn { background: #fffbeb; }
  .stat-label { margin: 0; font-size: 11px; color: #64748b; }
  .stat-value { margin: 3px 0 0; font-size: 17px; font-weight: 700; }
  .stat.warn .stat-value { color: #b45309; }
  .progress-track { height: 8px; border-radius: 999px; background: #e2e8f0; margin-top: 14px; overflow: hidden; }
  .progress-fill { height: 100%; background: #5443c4; border-radius: 999px; }
  table.financials { width: 100%; border-collapse: collapse; }
  table.financials td { padding: 9px 0; font-size: 14px; border-top: 1px solid #f1f5f9; }
  table.financials td.amount { text-align: right; font-weight: 700; }
  .summary {
    margin-top: 10px; background: #f8fafc; border-radius: 12px; padding: 16px;
    font-size: 13.5px; line-height: 1.6; color: #334155; white-space: pre-line;
  }
  .footer {
    margin-top: 32px; padding-top: 14px; border-top: 1px solid #e2e8f0;
    display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="brand"><div class="brand-mark"></div><span class="brand-name">KeurFlow</span></div>
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

  ${statTiles}

  <p class="section-label">Résumé</p>
  <p class="summary">${escapeHtml(report.summary)}</p>

  <div class="footer">
    <span>Généré automatiquement par KeurFlow</span>
    <span>${escapeHtml(generatedAt)}</span>
  </div>
</body>
</html>`;
}
