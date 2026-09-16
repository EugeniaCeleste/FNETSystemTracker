import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FNET System Tracker",
  description: "Plataforma interna de planificación y coordinación de operaciones FNET.",
  applicationName: "FNET System Tracker",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#25243a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
