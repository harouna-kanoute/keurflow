// Plain SVG stroke-dasharray donut — no charting library needed for a
// handful of static segments, and it stays themeable via currentColor.
export function DonutChart({
  segments,
  total: totalProp,
  size = 96,
  strokeWidth = 10,
  centerLabel,
  centerSublabel,
}: {
  segments: { value: number; colorClassName: string }[];
  /** Scale segments against this instead of their own sum — e.g. `100` for a
   * single percentage segment, so it doesn't render as a full ring. Defaults
   * to the sum of `segments` (a standard multi-part breakdown). */
  total?: number;
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerSublabel?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = totalProp ?? segments.reduce((sum, s) => sum + Math.max(s.value, 0), 0);

  let offset = 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-100 dark:text-slate-800"
        />
        {total > 0 &&
          segments.map((segment, index) => {
            const value = Math.max(segment.value, 0);
            const length = (value / total) * circumference;
            const dashoffset = -offset;
            offset += length;
            if (length <= 0) return null;
            return (
              <circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={dashoffset}
                className={segment.colorClassName}
              />
            );
          })}
      </svg>
      {(centerLabel || centerSublabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerLabel && (
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {centerLabel}
            </span>
          )}
          {centerSublabel && (
            <span className="text-[10px] text-slate-500 dark:text-slate-400">{centerSublabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
