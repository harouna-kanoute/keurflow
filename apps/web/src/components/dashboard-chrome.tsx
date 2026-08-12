"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/app/(auth)/actions";
import {
  BellIcon,
  ClockIcon,
  CloseIcon,
  CreditCardIcon,
  HomeIcon,
  LogoutIcon,
  MenuIcon,
  SettingsIcon,
} from "@/components/icons";
import { Modal } from "@/components/modal";
import { AppearanceSettings } from "@/components/appearance-settings";

function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function DashboardChrome({
  userName,
  userEmail,
  organizationName,
  organizationTypeLabel,
  unreadNotificationCount,
  hasOrganization,
  children,
}: {
  userName: string | null;
  userEmail: string;
  organizationName: string | null;
  organizationTypeLabel: string | null;
  unreadNotificationCount: number;
  hasOrganization: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const displayName = userName || userEmail;
  const navItems = [
    { href: "/dashboard", label: "Tableau de bord", icon: HomeIcon },
    { href: "/dashboard/notifications", label: "Notifications", icon: BellIcon },
    { href: "/dashboard/billing", label: "Abonnement", icon: CreditCardIcon },
    ...(hasOrganization
      ? [{ href: "/dashboard/audit-log", label: "Journal d'activité", icon: ClockIcon }]
      : []),
  ];

  return (
    <div className="flex flex-1">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-stone-900/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-stone-200 bg-white transition-transform duration-200 dark:border-stone-800 dark:bg-stone-900 lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-5">
          <Link
            href="/dashboard"
            className="text-sm font-medium tracking-wide text-stone-900 uppercase dark:text-stone-50"
          >
            KeurFlow
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Fermer le menu"
            className="text-stone-400 hover:text-stone-900 lg:hidden dark:hover:text-stone-100"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {organizationName && (
          <div className="mx-4 mb-2 rounded-xl bg-cream px-3 py-2 dark:bg-stone-950">
            <p className="text-[11px] font-medium tracking-wide text-stone-500 uppercase dark:text-stone-400">
              {organizationTypeLabel}
            </p>
            <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-50">
              {organizationName}
            </p>
          </div>
        )}

        <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-clay-50 text-clay-700 dark:bg-clay-900 dark:text-clay-300"
                    : "text-stone-600 hover:bg-stone-50 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                }`}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.href === "/dashboard/notifications" && unreadNotificationCount > 0 && (
                  <span className="rounded-full bg-clay-600 px-1.5 py-0.5 text-[11px] font-medium text-white dark:bg-clay-500">
                    {unreadNotificationCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-stone-200 p-3 dark:border-stone-800">
          <Modal
            triggerLabel="Paramètres"
            triggerIcon={<SettingsIcon className="h-5 w-5 shrink-0" />}
            title="Paramètres d'apparence"
            variant="ghost"
          >
            <AppearanceSettings />
          </Modal>

          <details className="group relative mt-1">
            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg px-2 py-2 hover:bg-stone-50 dark:hover:bg-stone-800">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-clay-100 text-sm font-semibold text-clay-700 dark:bg-clay-900 dark:text-clay-300">
                {getInitials(displayName)}
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-medium text-stone-900 dark:text-stone-50">
                  {displayName}
                </span>
                <span className="block truncate text-xs text-stone-500 dark:text-stone-400">{userEmail}</span>
              </span>
            </summary>
            <div className="absolute bottom-full left-0 mb-2 w-full rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg dark:border-stone-800 dark:bg-stone-900">
              <form action={signOut}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  <LogoutIcon className="h-4 w-4" />
                  Se déconnecter
                </button>
              </form>
            </div>
          </details>
        </div>
      </aside>

      <div className="flex flex-1 flex-col lg:min-w-0">
        <div className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-stone-200 bg-white px-4 dark:border-stone-800 dark:bg-stone-900 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
            className="text-stone-600 dark:text-stone-300"
          >
            <MenuIcon className="h-6 w-6" />
          </button>
          <span className="text-sm font-medium tracking-wide text-stone-900 uppercase dark:text-stone-50">
            KeurFlow
          </span>
        </div>
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
