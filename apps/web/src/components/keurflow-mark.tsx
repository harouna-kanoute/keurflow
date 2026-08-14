export function KeurFlowMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} role="img" aria-label="KeurFlow">
      <defs>
        <linearGradient id="keurflow-mark-bg" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#5C35E0" />
          <stop offset="100%" stopColor="#1D2E86" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="512" height="512" rx="108" ry="108" fill="url(#keurflow-mark-bg)" />
      <rect x="170" y="120" width="56" height="272" fill="#FFFFFF" />
      <path d="M226,256 L366,120" stroke="#FFFFFF" strokeWidth="56" strokeLinecap="square" fill="none" />
      <path d="M226,256 L366,392" stroke="#FFFFFF" strokeWidth="56" strokeLinecap="square" fill="none" />
      <circle cx="400" cy="304" r="26" fill="#16BEC7" />
    </svg>
  );
}
