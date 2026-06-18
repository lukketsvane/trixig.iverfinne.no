import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://trixig.iverfinne.no"),
  title: "trixig",
  description: "trixig redesigns",
  manifest: "/site.webmanifest",
  openGraph: {
    title: "trixig",
    description: "trixig redesigns",
    url: "https://trixig.iverfinne.no",
    siteName: "trixig",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1731,
        height: 909,
        alt: "trixig.iverfinne.no",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "trixig",
    description: "trixig redesigns",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-48x48.png", type: "image/png", sizes: "48x48" },
      { url: "/trixig-icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Match the page field (light grey).
  themeColor: "#eeeeee",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
