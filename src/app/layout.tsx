import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const plusJakartaSans = Plus_Jakarta_Sans({
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
      <body className={`${plusJakartaSans.variable} ${geistMono.variable} h-full antialiased font-sans bg-[#F5F5F3] text-[#111111]`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
