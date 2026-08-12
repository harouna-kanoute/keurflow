// Plain flexbox bar chart — same "no charting library" approach as
// DonutChart, sized by flex so it never forces horizontal overflow.
export function BarChart({
  data,
  formatValue,
  barClassName = "bg-brand-600 dark:bg-brand-500",
}: {
  data: { label: string; value: number }[];
  formatValue?: (value: number) => string;
  barClassName?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex h-40 items-end gap-3">
      {data.map((d, index) => (
        <div key={`${d.label}-${index}`} className="flex h-full flex-1 flex-col items-center gap-1.5">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {formatValue ? formatValue(d.value) : d.value}
          </span>
          <div className="flex w-full flex-1 items-end">
            <div
              className={`w-full rounded-t-md ${barClassName}`}
              style={{ height: `${d.value > 0 ? Math.max((d.value / max) * 100, 4) : 0}%` }}
            />
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
