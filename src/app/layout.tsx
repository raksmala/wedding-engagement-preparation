import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rendy & Dinar",
  description: "Pencatat persiapan pernikahan Rendy & Dinar",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#80172c",
  width: "device-width",
  initialScale: 1,
  // Supaya env(safe-area-inset-bottom) terisi dan navigasi bawah tidak tertutup indikator home di iPhone.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${cormorant.variable} ${sourceSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
