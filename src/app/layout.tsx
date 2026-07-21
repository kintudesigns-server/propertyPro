import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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

