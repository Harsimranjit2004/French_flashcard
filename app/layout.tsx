import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lexique — Apprenez le français pour de bon",
  description: "Cartes de vocabulaire français avec FSRS, audio et révision vocale.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Lexique", statusBarStyle: "default" },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
