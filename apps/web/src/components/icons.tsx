// Hand-drawn line icons/illustrations for the landing page — flat, no
// gradients or photos (spec §92 "éviter les clichés visuels"), so no
// external assets or icon library are needed.

type IconProps = { className?: string };

export function BudgetIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4 20V14M10 20V10M16 20V6M22 20V12"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ReceiptIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 3v4h4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 13.5l2 2 4-4.5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FlagIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M5 3v18" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      <path
        d="M5 4h11l-2.2 3L16 10H5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GlobeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={1.5} />
      <path d="M3 12h18" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      <path
        d="M12 3c2.5 2.5 3.7 5.7 3.7 9s-1.2 6.5-3.7 9c-2.5-2.5-3.7-5.7-3.7-9s1.2-6.5 3.7-9Z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UsersIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth={1.5} />
      <path
        d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="17" cy="9" r="2.3" stroke="currentColor" strokeWidth={1.5} />
      <path
        d="M15.3 14.3c2.3 0.4 3.9 2 4.4 4.2"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={1.5} />
      <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HomeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4 11.5 12 5l8 6.5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 20v-5h4v5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BellIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10Z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export function CreditCardIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth={1.5} />
      <path d="M3 10.5h18" stroke="currentColor" strokeWidth={1.5} />
      <path d="M6.5 15h4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export function LogoutIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12H9" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={1.5} />
      <path
        d="M12 3.5v2.4M12 18.1v2.4M20.5 12h-2.4M5.9 12H3.5M17.7 6.3l-1.7 1.7M8 16l-1.7 1.7M17.7 17.7 16 16M8 8 6.3 6.3"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

// Hero illustration: a house under construction, tracked remotely from a
// phone — the whole product pitch in one flat, abstract scene. Deliberately
// not a literal photo/rendering, and not a regional stereotype: the same
// silhouette works for a build in Dakar, Abidjan or Douala.
export function HeroIllustration({ className }: IconProps) {
  return (
    <svg viewBox="0 0 480 360" fill="none" className={className} aria-hidden>
      <line x1="40" y1="288" x2="440" y2="288" stroke="currentColor" strokeWidth={1.5} className="text-stone-300 dark:text-stone-700" />

      <g className="text-clay-600 dark:text-clay-500">
        <path
          d="M70 288V190L145 130L220 190V288"
          stroke="currentColor"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="128" y="230" width="34" height="58" rx="2" stroke="currentColor" strokeWidth={3} />
        <rect x="88" y="205" width="26" height="26" rx="2" stroke="currentColor" strokeWidth={3} />
        <rect x="176" y="205" width="26" height="26" rx="2" stroke="currentColor" strokeWidth={3} />
      </g>

      <g className="text-stone-400 dark:text-stone-600">
        <path d="M250 288V150M250 150l24-14M250 150l-16-20" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
        <path d="M250 190h34M250 230h34" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
        <path d="M284 190v40" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
      </g>

      <path
        d="M225 140C300 70 340 60 372 78"
        stroke="currentColor"
        strokeWidth={2}
        strokeDasharray="2 8"
        strokeLinecap="round"
        className="text-stone-400 dark:text-stone-600"
      />

      <g>
        <rect
          x="356"
          y="56"
          width="84"
          height="140"
          rx="14"
          stroke="currentColor"
          strokeWidth={3}
          className="text-stone-700 dark:text-stone-300"
        />
        <rect x="372" y="80" width="52" height="8" rx="4" className="fill-stone-200 dark:fill-stone-700" />
        <rect x="372" y="96" width="34" height="8" rx="4" className="fill-stone-200 dark:fill-stone-700" />
        <rect x="372" y="118" width="52" height="30" rx="4" className="fill-clay-50 dark:fill-clay-900" />
        <path
          d="M380 133l7 7 14-15"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-clay-600 dark:text-clay-400"
        />
        <rect x="372" y="160" width="52" height="6" rx="3" className="fill-stone-100 dark:fill-stone-800" />
        <rect x="372" y="160" width="30" height="6" rx="3" className="fill-clay-600 dark:fill-clay-500" />
      </g>
    </svg>
  );
}
