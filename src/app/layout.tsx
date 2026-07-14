import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "greek"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Synchroline CRM",
  description: "CRM ιατρικών επισκεπτών — CPO Greece",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3B3B8F",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="el" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
