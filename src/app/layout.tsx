import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TableLabels } from "@/components/TableLabels";

export const metadata: Metadata = { title: "StockPilot", description: "Stock, money and production costing", manifest: "/manifest.webmanifest" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#fafafa" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Geist (the Vercel typeface). Without internet the system font is used. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" />
      </head>
      <body>
        {children}
        <TableLabels />
      </body>
    </html>
  );
}
