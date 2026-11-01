import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StockPilot", short_name: "StockPilot", start_url: "/", display: "standalone",
    background_color: "#f2f4f6", theme_color: "#0b6a85",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
