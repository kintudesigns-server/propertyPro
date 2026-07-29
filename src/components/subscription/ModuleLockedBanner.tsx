"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Lock, Sparkles, MessageSquare, Wrench, ShieldCheck, Truck, Receipt, DollarSign, BarChart2, CalendarCheck, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

const MODULE_DETAILS: Record<string, { title: string; description: string; bullet1: string; bullet2: string; bullet3: string; icon: any }> = {
  maintenance: {
    title: "Maintenance Tickets",
    description: "Manage and track all tenant maintenance requests in one centralized portal.",
    bullet1: "Real-time ticket status updates for tenants and inspectors",
    bullet2: "Upload photos, receipts, and invoices directly to requests",
    bullet3: "Assign internal technicians or track external contractor expenses",
    icon: Wrench
  },
  inspections: {
    title: "Inspections",
    description: "Conduct professional move-in, move-out, and routine inspections.",
    bullet1: "Detailed checklists and signature captures for tenants",
    bullet2: "High-resolution photo logs linked directly to properties",
    bullet3: "Auto-generate compliance reports in PDF format",
    icon: ShieldCheck
  },
  vendors: {
    title: "External Vendors",
    description: "Seamlessly coordinate jobs and compliance with external contractors.",
    bullet1: "Compliance tracking including W9 and liability insurance",
    bullet2: "Assign direct deposit accounts for automated vendor payouts",
    bullet3: "Secure magic link portals for vendors to submit invoices",
    icon: Truck
  },
  invoices: {
    title: "Invoice Management",
    description: "Automate and keep track of all rental and late fee invoices.",
    bullet1: "Auto-generate recurring rent invoices on the 1st of every month",
    bullet2: "Automatic late fee calculation and enforcement rules",
    bullet3: "Prorated rent invoice generators for mid-month move-ins",
    icon: Receipt
  },
  payouts: {
    title: "Owner Payouts",
    description: "Disburse net rental income securely and quickly directly to your bank account.",
    bullet1: "Direct deposit integrations with real-time transfer tracking",
    bullet2: "Net-to-owner summaries deducting platform fees automatically",
    bullet3: "Fully encrypted secure bank account verification flows",
    icon: DollarSign
  },
  accounting: {
    title: "Accounting & Reports",
    description: "Gain complete transparency over your portfolio financials.",
    bullet1: "Interactive Profit & Loss statement summaries",
    bullet2: "Export IRS-ready transaction history logs to CSV",
    bullet3: "Platform fee and processing cost transaction breakdown reports",
    icon: BarChart2
  },
  analytics: {
    title: "Portfolio Analytics",
    description: "Gain executive business intelligence, occupancy rate trends, and asset yield metrics.",
    bullet1: "Interactive 12-month revenue vs expense comparison charts",
    bullet2: "Portfolio occupancy and vacancy rate tracking metrics",
    bullet3: "Individual property ROI and monthly potential yield leaderboard",
    icon: BarChart2
  },
  messages: {
    title: "Chat / Messaging",
    description: "Connect instantly with your tenants, property team, and inspectors.",
    bullet1: "Real-time instant chat threads linked to leases and properties",
    bullet2: "Send attachments, lease drafts, and payment receipts inside chat",
    bullet3: "Read receipts and push notifications for tenant communications",
    icon: MessageSquare
  },
  tours: {
    title: "Property Tours",
    description: "Automate prospect inquiries and schedule tour bookings online.",
    bullet1: "Self-service tour calendar embeds for public listings",
    bullet2: "Secure OTP-verification gates to prevent spam requests",
    bullet3: "Collect automated feedback from prospects after tour completion",
    icon: CalendarCheck
  },
  documents: {
    title: "Document Storage",
    description: "Securely store and share lease agreements, IDs, and disclosures.",
    bullet1: "Categorized search and tag organization for all files",
    bullet2: "Lease signing integration saving signed PDFs automatically",
    bullet3: "Safe, encrypted tenant file access logs",
    icon: FolderOpen
  },
  calendar: {
    title: "Availability Calendar",
    description: "Get a centralized visual schedule of all property operations.",
    bullet1: "Interactive visual calendar showing payment due dates",
    bullet2: "Track scheduled inspections and maintenance requests on a timeline",
    bullet3: "Synchronize events across your team and tenants in real-time",
    icon: CalendarCheck
  }
};

export default function ModuleLockedBanner({ module }: { module: string }) {
  const router = useRouter();
  const details = MODULE_DETAILS[module] || {
    title: "Premium Feature",
    description: "Unlock advanced capabilities for your property management portfolio.",
    bullet1: "Streamline daily management tasks",
    bullet2: "Improve tenant retention and communications",
    bullet3: "Get deeper insight into financial performance",
    icon: Sparkles
  };

  const IconComponent = details.icon;

  return (
    <div className="max-w-xl mx-auto my-12 bg-white border border-slate-100 rounded-3xl p-8 text-center space-y-6 shadow-xl relative overflow-hidden animate-fade-in">
      {/* Decorative gradient background */}
      <div className="absolute inset-0 bg-radial-gradient from-blue-50/20 via-transparent to-transparent -z-10" />
      
      {/* Lock and Feature Icon Header */}
      <div className="relative inline-flex items-center justify-center">
        <div className="h-16 w-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
          <IconComponent size={32} />
        </div>
        <div className="absolute -bottom-1.5 -right-1.5 h-7 w-7 bg-white rounded-full flex items-center justify-center shadow-md">
          <div className="h-5 w-5 bg-rose-500 rounded-full flex items-center justify-center text-white">
            <Lock size={11} className="stroke-[3]" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-black text-slate-900 tracking-tight">
          {details.title} is locked
        </h2>
        <p className="text-sm text-[#6E6E73] font-medium max-w-sm mx-auto leading-relaxed">
          {details.description}
        </p>
      </div>

      {/* Bullet Features Checklist */}
      <div className="bg-slate-50 border border-slate-100/50 rounded-2xl p-5 text-left max-w-md mx-auto space-y-3">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">What you get when you unlock:</h4>
        <ul className="space-y-2.5 text-xs text-slate-700 font-bold">
          <li className="flex items-start gap-2.5">
            <Sparkles size={14} className="text-blue-500 shrink-0 mt-0.5" />
            <span className="leading-snug">{details.bullet1}</span>
          </li>
          <li className="flex items-start gap-2.5">
            <Sparkles size={14} className="text-blue-500 shrink-0 mt-0.5" />
            <span className="leading-snug">{details.bullet2}</span>
          </li>
          <li className="flex items-start gap-2.5">
            <Sparkles size={14} className="text-blue-500 shrink-0 mt-0.5" />
            <span className="leading-snug">{details.bullet3}</span>
          </li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-2">
        <Button 
          onClick={() => router.push("/dashboard/owner/billing")}
          className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
        >
          View Plans & Upgrade
        </Button>
        <Button 
          variant="outline"
          onClick={() => window.open("mailto:support@propertypro.com?subject=Plan%20Upgrade%20Inquiry")}
          className="flex-1 h-12 border-slate-200 text-slate-800 rounded-xl font-bold bg-white hover:bg-slate-50"
        >
          Contact Support
        </Button>
      </div>
    </div>
  );
}
