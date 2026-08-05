"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { 
  Lock, 
  Sparkles, 
  MessageSquare, 
  Wrench, 
  ShieldCheck, 
  Truck, 
  Receipt, 
  DollarSign, 
  BarChart2, 
  CalendarCheck, 
  FolderOpen, 
  Briefcase, 
  Wallet, 
  ArrowDownLeft,
  TrendingUp,
  ShieldAlert,
  HelpCircle,
  ExternalLink,
  Building2,
  FileText,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ModuleTeaserCanvas from "./ModuleTeaserCanvas";

interface ModuleDetails {
  title: string;
  description: string;
  bullet1: string;
  bullet2: string;
  bullet3: string;
  icon: any;
  requiredTier: string;
  roiMetric: string;
}

const MODULE_DETAILS: Record<string, ModuleDetails> = {
  properties: {
    title: "Properties",
    description: "Add, manage, and track all your rental properties and units in one centralized hub.",
    bullet1: "Onboard unlimited properties and unit configurations",
    bullet2: "Track occupancy status, lease assignments, and maintenance history per unit",
    bullet3: "Upload property photos, floor plans, and compliance documents",
    icon: Building2,
    requiredTier: "Essentials",
    roiMetric: "Centralized property management reduces manual tracking time by 60% for landlords with 5+ units."
  },
  leases: {
    title: "Lease Management",
    description: "Create, track, and manage digital lease agreements for all your tenants.",
    bullet1: "Generate and send digital leases with e-signature capture",
    bullet2: "Track lease expiry, auto-renewal terms, and rent escalation schedules",
    bullet3: "Attach inspection reports, move-in notes, and addendums per lease",
    icon: FileText,
    requiredTier: "Essentials",
    roiMetric: "Digital lease management reduces tenant onboarding time by 50% and improves compliance traceability."
  },
  tenants: {
    title: "Tenant Management",
    description: "Manage your tenant roster, applications, and account status across all properties.",
    bullet1: "View and manage tenant profiles, contact details, and payment history",
    bullet2: "Process rental applications and background checks in one workflow",
    bullet3: "Track tenant portal activity and communication logs",
    icon: Users,
    requiredTier: "Essentials",
    roiMetric: "Centralized tenant management reduces turnover disputes by 42% through complete audit trails."
  },
  maintenance: {
    title: "Maintenance Tickets",
    description: "Manage and track all tenant maintenance requests in one centralized portal.",
    bullet1: "Real-time ticket status updates for tenants and inspectors",
    bullet2: "Upload photos, receipts, and invoices directly to requests",
    bullet3: "Assign internal technicians or track external contractor expenses",
    icon: Wrench,
    requiredTier: "Essentials",
    roiMetric: "Centralized maintenance workflows cut emergency repair turnaround times by up to 35%."
  },
  inspections: {
    title: "Inspections",
    description: "Conduct professional move-in, move-out, and routine inspections.",
    bullet1: "Detailed checklists and signature captures for tenants",
    bullet2: "High-resolution photo logs linked directly to properties",
    bullet3: "Auto-generate compliance reports in PDF format",
    icon: ShieldCheck,
    requiredTier: "Professional",
    roiMetric: "Documented digital inspections reduce deposit disputes by 67% and protect property values."
  },
  team_management: {
    title: "Inspector & Team Management",
    description: "Invite inspectors, assign walkthroughs, and manage your property team roster.",
    bullet1: "Add licensed inspectors to your team with direct portal access",
    bullet2: "Assign move-in/move-out walkthroughs to specific inspectors",
    bullet3: "Track inspector activity, job history, and compliance status",
    icon: Briefcase,
    requiredTier: "Professional",
    roiMetric: "Portfolios managing dedicated inspectors complete 40% more walkthrough audits per month."
  },
  vendors: {
    title: "External Vendors",
    description: "Seamlessly coordinate jobs and compliance with external contractors.",
    bullet1: "Compliance tracking including W9 and liability insurance",
    bullet2: "Assign direct deposit accounts for automated vendor payouts",
    bullet3: "Secure magic link portals for vendors to submit invoices",
    icon: Truck,
    requiredTier: "Professional",
    roiMetric: "Automated vendor tracking cuts invoice payout processing from 5 days to under 24 hours."
  },
  invoices: {
    title: "Invoice Management",
    description: "Automate and keep track of all rental and late fee invoices.",
    bullet1: "Auto-generate recurring rent invoices on the 1st of every month",
    bullet2: "Automatic late fee calculation and enforcement rules",
    bullet3: "Prorated rent invoice generators for mid-month move-ins",
    icon: Receipt,
    requiredTier: "Essentials",
    roiMetric: "Automated invoicing improves on-time rent collections by 22% in the first 60 days."
  },
  transactions: {
    title: "Transaction History",
    description: "View a complete ledger of all rent payments, payouts, and platform fees.",
    bullet1: "Full payment-by-payment breakdown across all your properties",
    bullet2: "Filter by date range, property, unit, or transaction type",
    bullet3: "Export IRS-ready transaction history logs to CSV",
    icon: ArrowDownLeft,
    requiredTier: "Essentials",
    roiMetric: "Tax-ready digital transaction ledgers save landlords an average of 8 hours during annual tax filing."
  },
  wallet: {
    title: "Wallet & Bank Management",
    description: "Manage your payout bank account and request disbursements of net rental income.",
    bullet1: "Securely add and verify your bank account for direct deposit",
    bullet2: "Request payout disbursements with full audit trail",
    bullet3: "Track pending, completed, and rejected payout requests in real-time",
    icon: Wallet,
    requiredTier: "Professional",
    roiMetric: "Direct bank disbursements eliminate payment delay risks and ensure automated cashflow settlement."
  },
  payouts: {
    title: "Owner Payouts",
    description: "Disburse net rental income securely and quickly directly to your bank account.",
    bullet1: "Direct deposit integrations with real-time transfer tracking",
    bullet2: "Net-to-owner summaries deducting platform fees automatically",
    bullet3: "Fully encrypted secure bank account verification flows",
    icon: DollarSign,
    requiredTier: "Professional",
    roiMetric: "Automated owner disbursements eliminate paper checks and speed up rental yield availability."
  },
  accounting: {
    title: "Accounting & Reports",
    description: "Gain complete transparency over your portfolio financials.",
    bullet1: "Interactive Profit & Loss statement summaries",
    bullet2: "Export IRS-ready transaction history logs to CSV",
    bullet3: "Platform fee and processing cost transaction breakdown reports",
    icon: BarChart2,
    requiredTier: "Professional",
    roiMetric: "Real-time P&L reporting gives landlords instant visibility into net operating yields."
  },
  analytics: {
    title: "Portfolio Analytics",
    description: "Gain executive business intelligence, occupancy rate trends, and asset yield metrics.",
    bullet1: "Interactive 12-month revenue vs expense comparison charts",
    bullet2: "Portfolio occupancy and vacancy rate tracking metrics",
    bullet3: "Individual property ROI and monthly potential yield leaderboard",
    icon: BarChart2,
    requiredTier: "Professional",
    roiMetric: "Landlords using Portfolio Analytics identify underperforming assets 3× faster and increase net yields by 14%."
  },
  messages: {
    title: "Chat / Messaging",
    description: "Connect instantly with your tenants, property team, and inspectors.",
    bullet1: "Real-time instant chat threads linked to leases and properties",
    bullet2: "Send attachments, lease drafts, and payment receipts inside chat",
    bullet3: "Read receipts and push notifications for tenant communications",
    icon: MessageSquare,
    requiredTier: "Professional",
    roiMetric: "Direct tenant messaging improves communication speed and increases tenant renewal rates."
  },
  tours: {
    title: "Property Tours",
    description: "Automate prospect inquiries and schedule tour bookings online.",
    bullet1: "Self-service tour calendar embeds for public listings",
    bullet2: "Secure OTP-verification gates to prevent spam requests",
    bullet3: "Collect automated feedback from prospects after tour completion",
    icon: CalendarCheck,
    requiredTier: "Professional",
    roiMetric: "Self-service tour scheduling fills vacant units 40% faster than manual scheduling."
  },
  documents: {
    title: "Document Storage",
    description: "Securely store and share lease agreements, IDs, and disclosures.",
    bullet1: "Categorized search and tag organization for all files",
    bullet2: "Lease signing integration saving signed PDFs automatically",
    bullet3: "Safe, encrypted tenant file access logs",
    icon: FolderOpen,
    requiredTier: "Essentials",
    roiMetric: "Encrypted cloud document storage ensures 100% lease agreement compliance and audit safety."
  },
  calendar: {
    title: "Availability Calendar",
    description: "Get a centralized visual schedule of all property operations.",
    bullet1: "Interactive visual calendar showing payment due dates",
    bullet2: "Track scheduled inspections and maintenance requests on a timeline",
    bullet3: "Synchronize events across your team and tenants in real-time",
    icon: CalendarCheck,
    requiredTier: "Professional",
    roiMetric: "Centralized calendar tracking eliminates scheduling conflicts and prevents missed inspection deadlines."
  }
};

interface ModuleLockedBannerProps {
  module: string;
  source?: string;
  reason?: string;
  children?: React.ReactNode;
}

export default function ModuleLockedBanner({ module, source, reason, children }: ModuleLockedBannerProps) {
  const router = useRouter();
  const isAdminBlock = source === "admin_block";

  const details = MODULE_DETAILS[module] || {
    title: "Premium Feature",
    description: "Unlock advanced capabilities for your property management portfolio.",
    bullet1: "Streamline daily management tasks",
    bullet2: "Improve tenant retention and communications",
    bullet3: "Get deeper insight into financial performance",
    icon: Sparkles,
    requiredTier: "Professional",
    roiMetric: "Upgrading your plan unlocks portfolio growth tools and operational automation."
  };

  const IconComponent = details.icon;

  return (
    <div className="relative w-full min-h-screen">
      {/* Background Page Content — Full 100% Width & Height of real page, blurred */}
      <div className="w-full pointer-events-none select-none filter blur-[2.5px] opacity-75">
        {children ? children : <ModuleTeaserCanvas module={module} />}
      </div>

      {/* Fixed Overlay Container — Perfectly Centered relative to Main Workspace */}
      <div className="fixed inset-0 pl-0 md:pl-64 w-full h-full backdrop-blur-[2px] flex items-center justify-center p-4 sm:p-6 z-30 pointer-events-none"
        style={{ background: isAdminBlock 
          ? "linear-gradient(135deg, rgba(15,23,42,0.25) 0%, rgba(30,27,75,0.18) 100%)"
          : "linear-gradient(135deg, rgba(15,23,42,0.12) 0%, rgba(30,58,138,0.15) 100%)"
        }}
      >
        
        {isAdminBlock ? (
          /* ─── ADMIN BLOCK CARD — Clean Single-Surface Production Card ─── */
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-[0_8px_40px_-4px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/8 animate-in fade-in zoom-in-95 duration-300 pointer-events-auto overflow-hidden">

            {/* Thin red top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-red-500 via-red-400 to-orange-400" />

            <div className="p-6 space-y-5">

              {/* Icon + Badge row */}
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                  <ShieldAlert size={22} className="text-red-500 stroke-[1.8]" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-red-50 border border-red-100 rounded-full mb-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    <span className="text-[9px] font-black text-red-600 uppercase tracking-widest">Restricted</span>
                  </div>
                  <h2 className="text-[15px] font-bold text-[#111111] tracking-tight leading-tight">
                    Access Restricted by Administrator
                  </h2>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-slate-100" />

              {/* Reason */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reason</p>
                <p className="text-[13px] text-slate-700 leading-relaxed">
                  {reason || `Access to ${details.title} has been restricted by the platform administrator.`}
                </p>
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-center">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Status</p>
                  <span className="text-[12px] font-bold text-red-500">Restricted</span>
                </div>
                <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-center">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Issued By</p>
                  <span className="text-[12px] font-bold text-slate-800">Super Admin</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2.5 pt-1">
                <Button
                  onClick={() => window.open(`mailto:support@propertypro.com?subject=Access%20Restriction%20Inquiry%20-%20${details.title}`)}
                  className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-[13px] shadow-sm hover:shadow-md transition-all"
                >
                  Contact Support
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/dashboard/settings")}
                  className="flex-1 h-10 border-slate-200 text-slate-700 rounded-xl font-semibold text-[13px] bg-white hover:bg-slate-50 transition-all"
                >
                  Settings
                </Button>
              </div>

            </div>
          </div>

        ) : (
          /* ─── SUBSCRIPTION TIER LOCK CARD — Clean Platform Aesthetic ─── */
          <div className="w-full max-w-md bg-white/95 backdrop-blur-2xl rounded-3xl border border-slate-200 shadow-2xl ring-1 ring-slate-900/5 p-5 sm:p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-400 pointer-events-auto font-sans">
          
            {/* Header Badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-[10px] font-medium text-slate-700 uppercase tracking-wider shadow-2xs">
              <Sparkles size={11} className="text-slate-600" />
              Available on {details.requiredTier} Plan
            </div>

            {/* Icon Header */}
            <div className="relative inline-flex items-center justify-center">
              <div className="relative">
                <div className="h-10 w-10 bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-center text-slate-700 shadow-2xs">
                  <IconComponent size={20} className="stroke-[1.8]" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-slate-900 rounded-full flex items-center justify-center ring-2 ring-white shadow-2xs">
                  <Lock size={9} className="text-white stroke-[2.2]" />
                </div>
              </div>
            </div>

            {/* Title & Description */}
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-[#1D1D1F] tracking-tight">
                {`${details.title} is locked`}
              </h2>
              <p className="text-xs text-[#6E6E73] font-normal max-w-xs mx-auto leading-relaxed">
                {details.description}
              </p>
            </div>

            {/* Tier Lock Content */}
            <div className="space-y-2.5">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-left flex items-start gap-2.5 shadow-2xs">
                <TrendingUp size={15} className="text-slate-700 shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-[#1D1D1F] leading-snug">
                  {details.roiMetric}
                </p>
              </div>

              <div className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-3 text-left space-y-2">
                <h4 className="text-xs font-normal text-[#6E6E73]">
                  What you get when you unlock:
                </h4>
                <ul className="space-y-1.5 text-xs text-[#1D1D1F] font-normal">
                  <li className="flex items-start gap-2">
                    <ShieldCheck size={14} className="text-slate-700 shrink-0 mt-0.5" />
                    <span className="leading-snug">{details.bullet1}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldCheck size={14} className="text-slate-700 shrink-0 mt-0.5" />
                    <span className="leading-snug">{details.bullet2}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldCheck size={14} className="text-slate-700 shrink-0 mt-0.5" />
                    <span className="leading-snug">{details.bullet3}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <Button
                onClick={() => router.push("/dashboard/owner/billing")}
                className="flex-1 h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-4 rounded-xl shadow-xs border-none cursor-pointer flex items-center justify-center gap-2 transition-all"
              >
                Upgrade to {details.requiredTier} &rarr;
              </Button>
              <Button
                onClick={() => window.open("mailto:support@propertypro.com?subject=Plan%20Upgrade%20Inquiry")}
                className="flex-1 h-9 border border-slate-200 bg-white text-[#1D1D1F] hover:bg-slate-50 font-medium text-xs px-4 rounded-xl shadow-2xs cursor-pointer flex items-center justify-center"
              >
                Contact Support
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
