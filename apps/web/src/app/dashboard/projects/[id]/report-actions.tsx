"use client";

import { DownloadIcon, PrintIcon } from "@/components/icons";

function slugify(text: string): string {
  const slug = text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // strips accents split out by NFD, e.g. "Chantier Été"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || "rapport";
}

export function ReportActions({
  projectName,
  periodStart,
  periodEnd,
  summary,
}: {
  projectName: string;
  periodStart: string;
  periodEnd: string;
  summary: string;
}) {
  const filenameBase = `rapport-${slugify(projectName)}-${periodStart}-${periodEnd}`;

  const handleDownload = () => {
    const blob = new Blob([summary], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filenameBase}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=800,height=1000");
    if (!printWindow) return;

    const escaped = summary.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    printWindow.document.write(
      `<!doctype html><html lang="fr"><head><meta charset="utf-8" /><title>${filenameBase}</title>` +
        "<style>body{font-family:system-ui,sans-serif;white-space:pre-wrap;padding:2rem;color:#0f172a;line-height:1.6;}</style>" +
        `</head><body><pre>${escaped}</pre></body></html>`,
    );
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={handleDownload}
        aria-label="Télécharger le rapport"
        title="Télécharger"
        className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        <DownloadIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={handlePrint}
        aria-label="Imprimer le rapport"
        title="Imprimer"
        className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        <PrintIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
