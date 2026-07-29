import type { Metadata } from "next";
import React from "react";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = {
  variable: "font-sans",
};

const geistMono = {
  variable: "font-mono",
};

export const metadata: Metadata = {
  title: "PropertyPro | Premium Property Management Platform",
  description: "Modern, decentralized property management SaaS with multi-owner control, automatic invoicing, and regional maintenance routing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.variable} ${geistMono.variable} h-full antialiased font-sans bg-[#F5F5F7] text-[#1D1D1F]`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

