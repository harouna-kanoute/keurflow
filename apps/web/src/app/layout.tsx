import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import { ThemeWatcher } from "@/components/theme-watcher";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-serif",
  subsets: ["latin"],
});

const TITLE = "KeurFlow — Votre projet en Afrique. Votre visibilité, où que vous soyez.";
const DESCRIPTION =
  "KeurFlow aide la diaspora africaine à suivre à distance ses projets de construction et d'investissement en Afrique : budget, dépenses, documents et avancement, centralisés en un seul espace.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "suivi chantier Afrique",
    "gérer un projet immobilier à distance",
    "diaspora africaine",
    "suivi budget construction",
    "chantier depuis l'étranger",
  ],
  manifest: "/site.webmanifest",
  openGraph: { title: TITLE, description: DESCRIPTION, locale: "fr_FR", type: "website" },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeWatcher />
        {children}
      </body>
    </html>
  );
}
