"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { ReportData } from "@keurflow/business";
import { DownloadIcon, PrintIcon } from "@/components/icons";
import { ReportPrintLayout } from "./report-print-layout";

// projectName is free text (up to 120 chars, no character restrictions) and
// ends up inside an HTML string passed to document.write() below — escape it
// so a project renamed to something like `x" onload="…` can't execute in the
// print popup, which shares the app's origin (and thus its non-httpOnly
// session cookie) with window.open("", "_blank").
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugify(text: string): string {
  const slug = text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // strips accents split out by NFD, e.g. "Chantier Été"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || "rapport";
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

export function ReportActions({
  projectName,
  periodStart,
  periodEnd,
  summary,
  metrics,
}: {
  projectName: string;
  periodStart: string;
  periodEnd: string;
  summary: string;
  metrics: ReportData | null;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState<"download" | "print" | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Starts empty (not `new Date()`) so the server-rendered and hydrated
  // client markup match exactly — this off-screen layout is never shown to
  // the user before a click anyway, and each action sets the real value
  // itself right before capturing.
  const [generatedAt, setGeneratedAt] = useState("");

  const filenameBase = `rapport-${slugify(projectName)}-${periodStart}-${periodEnd}`;

  // Snapshot the hidden <ReportPrintLayout> below into a high-resolution
  // canvas — shared by both actions so the PDF and the printed page always
  // match pixel-for-pixel, and neither has to fight Tailwind classes not
  // being available in the target document (a downloaded file / a blank
  // popup window respectively).
  async function captureCanvas(): Promise<HTMLCanvasElement | null> {
    if (!printRef.current) return null;
    const { default: html2canvas } = await import("html2canvas");
    return html2canvas(printRef.current, { scale: 2, backgroundColor: "#ffffff" });
  }

  const handleDownload = async () => {
    setError(null);
    // flushSync so the off-screen layout re-renders with the real timestamp
    // before captureCanvas() reads the DOM — a plain setState wouldn't be
    // guaranteed to land before that read.
    flushSync(() => {
      setGeneratedAt(formatGeneratedAt(new Date()));
      setIsGenerating("download");
    });
    try {
      const canvas = await captureCanvas();
      if (!canvas) throw new Error("capture failed");
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;

      const canvasRatio = canvas.height / canvas.width;
      let imgWidth = maxWidth;
      let imgHeight = imgWidth * canvasRatio;
      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = imgHeight / canvasRatio;
      }
      const x = (pageWidth - imgWidth) / 2;

      pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, margin, imgWidth, imgHeight);
      pdf.save(`${filenameBase}.pdf`);
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsGenerating(null);
    }
  };

  const handlePrint = async () => {
    setError(null);
    flushSync(() => {
      setGeneratedAt(formatGeneratedAt(new Date()));
      setIsGenerating("print");
    });
    try {
      const canvas = await captureCanvas();
      if (!canvas) throw new Error("capture failed");
      const printWindow = window.open("", "_blank", "width=900,height=1200");
      if (!printWindow) throw new Error("popup blocked");
      const dataUrl = canvas.toDataURL("image/png");
      printWindow.document.write(
        `<!doctype html><html lang="fr"><head><meta charset="utf-8" /><title>${filenameBase}</title>` +
          "<style>@page{margin:12mm;}body{margin:0;display:flex;justify-content:center;background:#fff;}img{width:100%;max-width:800px;height:auto;}</style>" +
          `</head><body><img src="${dataUrl}" alt="${escapeHtml(projectName)}" /></body></html>`,
      );
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsGenerating(null);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleDownload}
          disabled={isGenerating !== null}
          aria-label="Télécharger le rapport en PDF"
          title="Télécharger en PDF"
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <DownloadIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handlePrint}
          disabled={isGenerating !== null}
          aria-label="Imprimer le rapport"
          title="Imprimer"
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <PrintIcon className="h-4 w-4" />
        </button>
      </div>
      {isGenerating && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {isGenerating === "download" ? "Génération du PDF…" : "Préparation de l'impression…"}
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Off-screen — snapshotted by captureCanvas(), never shown on the page itself.
          Deliberately not `fixed; left: -10000px`: html2canvas computes its capture
          bounds from the element's position in the full document, and an extreme
          offset like that makes it hang trying to render a canvas sized to match —
          a zero-height clipped container keeps it in normal flow instead. */}
      <div className="pointer-events-none h-0 overflow-hidden" aria-hidden>
        <div ref={printRef}>
          <ReportPrintLayout
            projectName={projectName}
            periodStart={periodStart}
            periodEnd={periodEnd}
            summary={summary}
            metrics={metrics}
            generatedAt={generatedAt}
          />
        </div>
      </div>
    </div>
  );
}
