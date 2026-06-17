import type { Metadata, Viewport } from "next";
import "./globals.css";
import { themeInitScript } from "@/components/useTheme";

export const metadata: Metadata = {
  title: "trixig",
  description: "trixig redesigns",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Match the page field per theme (light grey / Trixig matte black).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eeeeee" },
    { media: "(prefers-color-scheme: dark)", color: "#141414" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Set data-theme before paint so dark mode never flashes light. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
