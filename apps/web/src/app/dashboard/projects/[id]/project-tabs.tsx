"use client";

import { useState } from "react";
import { TABS, type ProjectTabId } from "./project-tab-ids";

export type { ProjectTabId } from "./project-tab-ids";

// Groups the six project sub-sections behind tabs instead of one long
// two-column scroll (user request: "trop de detail... rendre simple") —
// each panel is already fully server-rendered by the caller, this just
// shows one at a time.
export function ProjectTabs({
  counts,
  panels,
  initialTab = "apercu",
}: {
  counts: Record<ProjectTabId, number>;
  panels: Record<ProjectTabId, React.ReactNode>;
  initialTab?: ProjectTabId;
}) {
  const [active, setActive] = useState<ProjectTabId>(initialTab);

  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex gap-1 overflow-x-auto px-2 pt-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              active === tab.id
                ? "border-brand-600 text-brand-700 dark:border-brand-500 dark:text-brand-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            {tab.label}
            {counts[tab.id] > 0 && (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {counts[tab.id]}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="border-t border-slate-200 p-6 dark:border-slate-800">{panels[active]}</div>
    </div>
  );
}
