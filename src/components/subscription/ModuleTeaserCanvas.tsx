"use client";

import React from "react";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Building2, 
  DollarSign, 
  Calendar, 
  MessageSquare, 
  ShieldCheck, 
  Briefcase, 
  Truck, 
  Wallet, 
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  FileText
} from "lucide-react";

export default function ModuleTeaserCanvas({ module }: { module: string }) {
  switch (module) {
    case "analytics":
      return <AnalyticsTeaser />;
    case "inspections":
      return <InspectionsTeaser />;
    case "team_management":
      return <TeamTeaser />;
    case "vendors":
      return <VendorsTeaser />;
    case "accounting":
    case "invoices":
    case "transactions":
      return <AccountingTeaser />;
    case "wallet":
    case "payouts":
      return <WalletTeaser />;
    case "messages":
      return <MessagesTeaser />;
    case "calendar":
    case "tours":
      return <CalendarTeaser />;
    default:
      return <DefaultTeaser />;
  }
}

function AnalyticsTeaser() {
  return (
    <div className="w-full space-y-6 select-none pointer-events-none opacity-85">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Annual Revenue</p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-slate-900">$184,200.00</span>
            <span className="inline-flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <ArrowUpRight size={12} className="mr-0.5" /> +14.2%
            </span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Occupancy</p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-slate-900">96.8%</span>
            <span className="inline-flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <ArrowUpRight size={12} className="mr-0.5" /> +2.1%
            </span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Operating Yield</p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-slate-900">8.45%</span>
            <span className="inline-flex items-center text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              Top Tier
            </span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Units</p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-slate-900">32 / 33</span>
            <span className="text-xs font-bold text-slate-500">1 Vacant</span>
          </div>
        </div>
      </div>

      {/* Main Chart Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Portfolio Income vs Expense Breakdown</h3>
            <p className="text-xs text-slate-500 font-medium">12-Month Rolling Comparative Cashflow</p>
          </div>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-700">2026 YTD</span>
          </div>
        </div>

        {/* CSS Chart Bar Graphic */}
        <div className="h-48 flex items-end justify-between gap-3 pt-6 px-4 border-b border-slate-100">
          {[
            { month: "Jan", inc: 85, exp: 25 },
            { month: "Feb", inc: 88, exp: 30 },
            { month: "Mar", inc: 92, exp: 20 },
            { month: "Apr", inc: 95, exp: 40 },
            { month: "May", inc: 90, exp: 22 },
            { month: "Jun", inc: 98, exp: 18 },
            { month: "Jul", inc: 100, exp: 28 },
            { month: "Aug", inc: 94, exp: 35 },
            { month: "Sep", inc: 96, exp: 24 },
            { month: "Oct", inc: 99, exp: 19 },
            { month: "Nov", inc: 91, exp: 31 },
            { month: "Dec", inc: 97, exp: 25 },
          ].map((bar, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <div className="w-full flex items-end justify-center gap-1 h-full">
                <div 
                  className="w-full bg-blue-600 rounded-t-sm transition-all" 
                  style={{ height: `${bar.inc}%` }}
                />
                <div 
                  className="w-full bg-slate-300 rounded-t-sm transition-all" 
                  style={{ height: `${bar.exp}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-400">{bar.month}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-6 pt-2 text-xs font-bold">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-blue-600" />
            <span className="text-slate-700">Gross Rental Income</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-slate-300" />
            <span className="text-slate-700">Operating Expenses</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function InspectionsTeaser() {
  return (
    <div className="w-full space-y-6 select-none pointer-events-none opacity-85">
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Inspection Management Portal</h3>
          <p className="text-xs text-slate-500 font-medium">Scheduled & Completed Property Walkthroughs</p>
        </div>
        <div className="h-9 px-4 bg-blue-600 text-white rounded-xl font-bold text-xs flex items-center">
          + Schedule Walkthrough
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: "Move-In Inspection — Unit 4B", prop: "Sunset Heights Apartments", date: "Jul 28, 2026", status: "COMPLETED", items: "24 items checked", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
          { title: "Routine Quarterly Audit — Suite 12", prop: "Oakridge Commercial Hub", date: "Jul 30, 2026", status: "SCHEDULED", items: "18 items pending", badge: "bg-blue-50 text-blue-700 border-blue-200" },
          { title: "Move-Out Walkthrough — Apt 2A", prop: "Maplewood Terrace", date: "Aug 02, 2026", status: "PENDING ASSIGNMENT", items: "30 items queued", badge: "bg-amber-50 text-amber-700 border-amber-200" },
          { title: "Pre-Lease Verification — Unit 101", prop: "Highland Residences", date: "Aug 05, 2026", status: "DRAFT", items: "12 items drafted", badge: "bg-slate-100 text-slate-700 border-slate-200" },
        ].map((item, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border ${item.badge}`}>
                  {item.status}
                </span>
                <h4 className="text-sm font-semibold text-slate-900 pt-1">{item.title}</h4>
                <p className="text-xs text-slate-500 font-medium">{item.prop}</p>
              </div>
              <ShieldCheck className="text-blue-500" size={24} />
            </div>
            <div className="flex items-center justify-between text-xs text-[#6E6E73] font-normal border-t border-slate-100 pt-3">
              <span>📅 {item.date}</span>
              <span>📷 14 Photos Attached</span>
              <span className="text-blue-600 font-bold">Export PDF →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamTeaser() {
  return (
    <div className="w-full space-y-6 select-none pointer-events-none opacity-85">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Property Team & Inspector Roster</h3>
            <p className="text-xs text-slate-500 font-medium">Assign inspections and manage staff roles</p>
          </div>
          <div className="h-9 px-4 bg-blue-600 text-white rounded-xl font-bold text-xs flex items-center">
            + Invite Team Member
          </div>
        </div>

        <div className="space-y-2">
          {[
            { name: "Marcus Vance", role: "Certified Lead Inspector", email: "marcus.vance@inspectpro.com", jobs: "14 Jobs Completed", status: "ACTIVE" },
            { name: "Sarah Jenkins", role: "Field Property Manager", email: "sarah.j@propertypro.com", jobs: "8 Active Properties", status: "ACTIVE" },
            { name: "David Sterling", role: "Maintenance Technician", email: "david.sterling@tech.org", jobs: "22 Tickets Resolved", status: "ACTIVE" },
          ].map((user, i) => (
            <div key={i} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {user.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{user.name}</h4>
                  <p className="text-xs text-slate-500">{user.role} • {user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold text-slate-600">{user.jobs}</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                  {user.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VendorsTeaser() {
  return (
    <div className="w-full space-y-6 select-none pointer-events-none opacity-85">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">External Vendor & Contractor Directory</h3>
            <p className="text-xs text-slate-500 font-medium">Compliance tracking, W9 records, and direct payouts</p>
          </div>
          <div className="h-9 px-4 bg-blue-600 text-white rounded-xl font-bold text-xs flex items-center">
            + Add Vendor
          </div>
        </div>

        <div className="space-y-2">
          {[
            { company: "Apex HVAC & Cooling LLC", trade: "HVAC Specialist", w9: "VERIFIED", insurance: "EXPIRES DEC 2026", paid: "$4,250.00" },
            { company: "Bay Area Plumbing Pros", trade: "Plumbing Services", w9: "VERIFIED", insurance: "VERIFIED", paid: "$2,890.00" },
            { company: "CleanCraft Janitorial", trade: "Turnover Cleaning", w9: "PENDING REVIEW", insurance: "VERIFIED", paid: "$1,120.00" },
          ].map((v, i) => (
            <div key={i} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center font-bold text-sm">
                  <Truck size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{v.company}</h4>
                  <p className="text-xs text-slate-500">{v.trade}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  W9: {v.w9}
                </span>
                <span className="font-bold text-slate-900">Paid YTD: {v.paid}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AccountingTeaser() {
  return (
    <div className="w-full space-y-6 select-none pointer-events-none opacity-85">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs font-bold text-slate-400 uppercase">Total Collected</p>
          <p className="text-2xl font-semibold text-emerald-600">$42,500.00</p>
          <p className="text-xs text-slate-500 font-medium">July 2026 Rental Income</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs font-bold text-slate-400 uppercase">Operating Expenses</p>
          <p className="text-2xl font-semibold text-rose-600">$6,840.00</p>
          <p className="text-xs text-slate-500 font-medium">Maintenance & Platform Fees</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs font-bold text-slate-400 uppercase">Net Owner Disbursement</p>
          <p className="text-2xl font-semibold text-slate-900">$35,660.00</p>
          <p className="text-xs text-slate-500 font-medium">Ready for Bank Deposit</p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <h4 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">Recent Transaction Ledger</h4>
        {[
          { desc: "Rent Collection — Apt 4B (Jul 2026)", cat: "Income", amount: "+$2,450.00", color: "text-emerald-600" },
          { desc: "Vendor Payout — Apex HVAC Repair", cat: "Maintenance Expense", amount: "-$380.00", color: "text-rose-600" },
          { desc: "Platform Subscription Fee", cat: "SaaS Charge", amount: "-$149.00", color: "text-slate-600" },
        ].map((t, i) => (
          <div key={i} className="flex items-center justify-between text-xs py-2 border-b border-slate-50 last:border-0">
            <div>
              <p className="font-bold text-slate-900">{t.desc}</p>
              <p className="text-slate-400">{t.cat}</p>
            </div>
            <span className={`font-black text-sm ${t.color}`}>{t.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WalletTeaser() {
  return (
    <div className="w-full space-y-6 select-none pointer-events-none opacity-85">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-400 uppercase">Available Payout Balance</p>
          <p className="text-3xl font-semibold text-slate-900">$18,420.50</p>
          <p className="text-xs text-emerald-600 font-bold">✓ Verified Bank Deposit Connected</p>
        </div>
        <div className="h-11 px-6 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center shadow-md">
          Request Payout →
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <h4 className="text-sm font-semibold text-slate-900">Linked Bank Accounts</h4>
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-bold">
              🏦
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">CHASE BUSINESS CHECKING (•••• 4821)</p>
              <p className="text-xs text-slate-500">Primary Direct Deposit Account • Routing 021000021</p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">ACTIVE</span>
        </div>
      </div>
    </div>
  );
}

function MessagesTeaser() {
  return (
    <div className="w-full space-y-4 select-none pointer-events-none opacity-85">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-semibold text-slate-900">Tenant & Team Messaging Center</h3>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">Real-Time SSE</span>
        </div>
        <div className="space-y-3 max-w-lg mx-auto">
          <div className="flex justify-start">
            <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-none text-xs text-slate-800 max-w-xs font-medium">
              Hi Mr. Patel! The sink pipe in Apt 3B was fixed today by Bay Area Plumbing.
            </div>
          </div>
          <div className="flex justify-end">
            <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-tr-none text-xs max-w-xs font-medium shadow-sm">
              Great news! I have logged the invoice receipt in accounting. Thanks for confirming!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarTeaser() {
  return (
    <div className="w-full space-y-6 select-none pointer-events-none opacity-85">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">July 2026 Operational Schedule</h3>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-700">Month View</span>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-2 h-36">
          {Array.from({ length: 28 }).map((_, i) => (
            <div key={i} className="bg-slate-50 rounded-xl p-1 border border-slate-100 text-[10px] text-slate-400 font-bold relative">
              {i + 1}
              {i === 3 && <div className="mt-1 bg-blue-500 text-white rounded p-0.5 text-[8px] truncate">Rent Due</div>}
              {i === 12 && <div className="mt-1 bg-emerald-500 text-white rounded p-0.5 text-[8px] truncate">Inspection</div>}
              {i === 20 && <div className="mt-1 bg-purple-500 text-white rounded p-0.5 text-[8px] truncate">Tour Booking</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DefaultTeaser() {
  return (
    <div className="w-full space-y-6 select-none pointer-events-none opacity-85">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="h-6 w-48 bg-slate-200 rounded-md animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
