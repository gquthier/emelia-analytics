import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Emelia Mini-Hub",
  description: "Gestionnaire de campagnes Emelia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-white">
        {children}
      </body>
    </html>
  );
}
