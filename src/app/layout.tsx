import type { Metadata } from "next";
import React from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "PropertyPro | Premium Property Management Platform",
  description:
    "Automate rent collection, digital leases, and maintenance — one cohesive platform built for modern landlords, property managers, and tenants.",
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  openGraph: {
    title: "PropertyPro | Premium Property Management Platform",
    description:
      "Replace fragmented property tools with one cohesive operating system. Stripe rent collection, digital leases, automated maintenance.",
    url: "/",
    siteName: "PropertyPro",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PropertyPro — The Smarter Way to Manage Real Estate",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PropertyPro | Premium Property Management Platform",
    description:
      "Automate rent, leases & maintenance — one platform built for modern landlords.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full ${inter.variable}`}>
      <body className="h-full antialiased font-sans bg-[#F5F5F7] text-[#1D1D1F]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
