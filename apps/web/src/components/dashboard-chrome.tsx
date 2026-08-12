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

  const navGroups = [
    {
      label: "Général",
      items: [
        { href: "/dashboard", label: "Tableau de bord", icon: HomeIcon },
        { href: "/dashboard/notifications", label: "Notifications", icon: BellIcon },
        { href: "/dashboard/billing", label: "Abonnement", icon: CreditCardIcon },
      ],
    },
    {
      label: "Compte",
      items: [
        ...(hasOrganization
          ? [{ href: "/dashboard/audit-log", label: "Journal d'activité", icon: ClockIcon }]
          : []),
      ],
    },
  ];

  return (
    <div className="flex flex-1">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-5">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white dark:bg-brand-500">
              K
            </span>
            <span className="text-sm font-semibold tracking-wide text-slate-900 dark:text-slate-50">
              KeurFlow
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Fermer le menu"
            className="text-slate-400 hover:text-slate-900 lg:hidden dark:hover:text-slate-100"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {organizationName && (
          <div className="mx-4 mb-3 flex items-center gap-2.5 rounded-xl bg-canvas px-3 py-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-300">
              {organizationName.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">
                {organizationName}
              </p>
              <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
                {organizationTypeLabel}
              </p>
            </div>
          </div>
        )}

        <nav className="flex flex-1 flex-col gap-4 px-3 py-2">
          {navGroups
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <div key={group.label}>
                <p className="px-3 text-[11px] font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">
                  {group.label}
                </p>
                <div className="mt-1 flex flex-col gap-1">
                  {group.items.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          active
                            ? "bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-300"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        }`}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {item.href === "/dashboard/notifications" && unreadNotificationCount > 0 && (
                          <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[11px] font-medium text-white dark:bg-brand-500">
                            {unreadNotificationCount}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                  {group.label === "Compte" && (
                    <Modal
                      triggerLabel="Paramètres"
                      triggerIcon={<SettingsIcon className="h-5 w-5 shrink-0" />}
                      title="Paramètres d'apparence"
                      variant="ghost"
                    >
                      <AppearanceSettings />
                    </Modal>
                  )}
                </div>
              </div>
            ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col lg:min-w-0">
        <div className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
            className="text-slate-600 lg:hidden dark:text-slate-300"
          >
            <MenuIcon className="h-6 w-6" />
          </button>
          <span className="text-sm font-medium tracking-wide text-slate-900 uppercase lg:hidden dark:text-slate-50">
            KeurFlow
          </span>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/dashboard/notifications"
              aria-label="Notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <BellIcon className="h-5 w-5" />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-brand-600 dark:bg-brand-500" />
              )}
            </Link>

            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-full py-1 pr-1 pl-1 hover:bg-slate-50 sm:pr-3 dark:hover:bg-slate-800">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                  {getInitials(displayName)}
                </span>
                <span className="hidden min-w-0 text-left sm:block">
                  <span className="block max-w-[10rem] truncate text-sm font-medium text-slate-900 dark:text-slate-50">
                    {displayName}
                  </span>
                  <span className="block max-w-[10rem] truncate text-xs text-slate-500 dark:text-slate-400">
                    {userEmail}
                  </span>
                </span>
              </summary>
              <div className="absolute top-full right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                <form action={signOut}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <LogoutIcon className="h-4 w-4" />
                    Se déconnecter
                  </button>
                </form>
              </div>
            </details>
          </div>
        </div>
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
