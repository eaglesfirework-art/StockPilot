import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "StockPilot", description: "Stock, money and production costing", manifest: "/manifest.webmanifest" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0b6a85" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
