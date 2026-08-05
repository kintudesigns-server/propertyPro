"use client";

import React from "react";
import { 
  FileText, 
  Wrench, 
  Wallet, 
  CreditCard, 
  Receipt, 
  FileCheck, 
  FolderOpen, 
  Calendar, 
  ClipboardList, 
  MessageSquare, 
  LogOut, 
  ShieldCheck, 
  ArrowUpRight, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Building2, 
  Tag, 
  Search,
  Eye
} from "lucide-react";

export default function TenantTeaserCanvas({ featureKey }: { featureKey?: string }) {
  switch (featureKey) {
    case "view_lease":
      return <ViewLeaseTeaser />;
    case "request_move_out":
      return <RequestMoveOutTeaser />;
    case "view_documents":
      return <ViewDocumentsTeaser />;
    case "submit_maintenance":
      return <SubmitMaintenanceTeaser />;
    case "view_maintenance":
      return <ViewMaintenanceTeaser />;
    case "maintenance_detail":
      return <MaintenanceDetailTeaser />;
    case "make_payments":
      return <MakePaymentsTeaser />;
    case "add_card":
      return <AddCardTeaser />;
    case "view_invoices":
      return <ViewInvoicesTeaser />;
    case "view_transactions":
      return <ViewTransactionsTeaser />;
    case "tenant_applications":
      return <TenantApplicationsTeaser />;
    case "tenant_tours":
      return <TenantToursTeaser />;
    case "message_owner":
      return <MessageOwnerTeaser />;
    case "view_calendar":
      return <ViewCalendarTeaser />;
    default:
      return <DefaultTenantTeaser />;
  }
}

// 📄 Lease & Tenancy Module Teasers
function ViewLeaseTeaser() {
  return (
    <div className="w-full space-y-6 select-none pointer-events-none opacity-85 p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            ACTIVE TENANCY
          </span>
          <h3 className="text-xl font-black text-slate-900 pt-1">Residential Lease Agreement — Unit 4B</h3>
          <p className="text-xs text-slate-500 font-medium">Sunset Heights Apartments • 742 Evergreen Terrace</p>
        </div>
        <div className="h-10 px-5 bg-blue-600 text-white rounded-xl font-bold text-xs flex items-center shadow-xs">
          Download Signed Agreement (PDF)
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monthly Base Rent</p>
          <p className="text-2xl font-semibold text-slate-900">$2,450.00</p>
          <p className="text-xs text-slate-500 font-medium">Due on the 1st of each month</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lease Duration</p>
          <p className="text-2xl font-semibold text-blue-600">12 Months</p>
          <p className="text-xs text-slate-500 font-medium">Aug 01, 2025 — Jul 31, 2026</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Security Deposit Held</p>
          <p className="text-2xl font-semibold text-emerald-600">$2,450.00</p>
          <p className="text-xs text-slate-500 font-medium">Escrow Account Verified</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h4 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3">Tenancy Terms & Inclusions</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-slate-700">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">✓ Water & Trash Included</div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">✓ Assigned Parking Spot #4B</div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">✓ Pet Deposit Paid ($300)</div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">✓ 60-Day Move-Out Notice</div>
        </div>
      </div>
    </div>
  );
}

function RequestMoveOutTeaser() {
  return (
    <div className="w-full space-y-6 select-none pointer-events-none opacity-85 p-6 max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-lg font-black text-slate-900">Formal Notice of Intent to Vacate</h3>
          <p className="text-xs text-slate-500 font-medium">Submit formal move-out notice per your lease terms</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Intended Departure Date</label>
            <div className="h-11 bg-slate-50 rounded-xl border border-slate-200 px-4 flex items-center text-sm font-medium text-slate-600">
              Select date (Requires 60 days advance notice)
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Reason for Move-Out</label>
            <div className="h-11 bg-slate-50 rounded-xl border border-slate-200 px-4 flex items-center text-sm font-medium text-slate-600">
              Relocation / Job Change
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Forwarding Address for Deposit Return</label>
            <div className="h-20 bg-slate-50 rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-600">
              Enter your future mailing address...
            </div>
          </div>
        </div>

        <div className="h-11 bg-red-600 text-white font-bold text-sm rounded-xl flex items-center justify-center">
          Submit Formal Move-Out Notice
        </div>
      </div>
    </div>
  );
}

function ViewDocumentsTeaser() {
  return (
    <div className="w-full space-y-6 select-none pointer-events-none opacity-85 p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Tenant Document Vault</h3>
          <p className="text-xs text-slate-500 font-medium">Signed agreements, move-in checklists, and disclosures</p>
        </div>
        <div className="h-9 px-4 bg-blue-600 text-white rounded-xl font-bold text-xs flex items-center">
          + Upload Document
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { name: "Signed_Lease_Agreement_Unit4B.pdf", cat: "LEASE", date: "Aug 01, 2025", size: "2.4 MB" },
          { name: "Move_In_Condition_Report_Photos.pdf", cat: "INSPECTION", date: "Aug 02, 2025", size: "8.1 MB" },
          { name: "Lead_Paint_Disclosure_Addendum.pdf", cat: "DISCLOSURE", date: "Aug 01, 2025", size: "1.1 MB" },
          { name: "Pet_Policy_Agreement_Signed.pdf", cat: "ADDENDUM", date: "Aug 01, 2025", size: "850 KB" },
          { name: "Renter_Insurance_Policy_Dec2026.pdf", cat: "INSURANCE", date: "Dec 15, 2025", size: "3.2 MB" },
          { name: "Parking_Spot_Permit_Pass.pdf", cat: "GENERAL", date: "Jan 10, 2026", size: "520 KB" },
        ].map((doc, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <FileText size={20} />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                {doc.cat}
              </span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 truncate">{doc.name}</h4>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">{doc.date} • {doc.size}</p>
            </div>
            <div className="flex justify-between items-center text-xs font-bold text-blue-600 pt-2 border-t border-slate-100">
              <span>View Preview</span>
              <span>Download ↓</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 🔧 Maintenance Teasers
function SubmitMaintenanceTeaser() {
  return (
    <div className="w-full space-y-6 select-none pointer-events-none opacity-85 p-6 max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-lg font-black text-slate-900">Log New Maintenance Ticket</h3>
          <p className="text-xs text-slate-500 font-medium">Report repairs or emergency maintenance for your unit</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Issue Category</label>
            <div className="h-11 bg-slate-50 rounded-xl border border-slate-200 px-4 flex items-center text-sm font-medium text-slate-600">
              Plumbing / Sink Leak
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Short Summary</label>
            <div className="h-11 bg-slate-50 rounded-xl border border-slate-200 px-4 flex items-center text-sm font-medium text-slate-600">
              Kitchen sink leaking under the cabinet
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Detailed Description & Access Notes</label>
            <div className="h-24 bg-slate-50 rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-600">
              Water drips whenever the faucet is turned on. Permission to enter given.
            </div>
          </div>
          <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 font-bold">
            📷 Drag & drop photos of the issue here
          </div>
        </div>

        <div className="h-11 bg-blue-600 text-white font-bold text-sm rounded-xl flex items-center justify-center">
          Submit Maintenance Request
        </div>
      </div>
    </div>
  );
}

function ViewMaintenanceTeaser() {
  return (
    <div className="w-full space-y-6 select-none pointer-events-none opacity-85 p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-base font-semibold text-slate-900">My Maintenance Requests</h3>
          <p className="text-xs text-slate-500 font-medium">Track repair progress and scheduled technician visits</p>
        </div>
        <div className="h-9 px-4 bg-blue-600 text-white rounded-xl font-bold text-xs flex items-center">
          + New Request
        </div>
      </div>

      <div className="space-y-3">
        {[
          { id: "TICK-4821", title: "Kitchen Sink Pipe Leak", cat: "Plumbing", date: "Jul 28, 2026", status: "IN PROGRESS", badge: "bg-blue-50 text-blue-700 border-blue-200" },
          { id: "TICK-3910", title: "AC Unit Filter Replacement", cat: "HVAC", date: "Jul 15, 2026", status: "COMPLETED", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
          { id: "TICK-2804", title: "Hallway Light Fixture Flickering", cat: "Electrical", date: "Jun 30, 2026", status: "RESOLVED", badge: "bg-slate-100 text-slate-700 border-slate-200" },
        ].map((t, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                <Wrench size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">{t.id}</span>
                  <h4 className="text-sm font-semibold text-slate-900">{t.title}</h4>
                </div>
                <p className="text-xs text-slate-500">{t.cat} • Submitted {t.date}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border ${t.badge}`}>
                {t.status}
              </span>
              <span className="text-xs font-bold text-blue-600">View Details →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MaintenanceDetailTeaser() {
  return (
    <div className="w-full space-y-6 select-none pointer-events-none opacity-85 p-6 max-w-5xl mx-auto">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-bold text-slate-400">TICK-4821</span>
            <h3 className="text-xl font-black text-slate-900">Kitchen Sink Pipe Leak Repair</h3>
            <p className="text-xs text-slate-500 font-medium">Submitted Jul 28, 2026 • Assigned to Bay Area Plumbing</p>
          </div>
          <span className="text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            IN PROGRESS
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="font-bold text-slate-400 uppercase text-[10px]">Technician</p>
            <p className="font-bold text-slate-900 text-sm mt-0.5">David Sterling</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="font-bold text-slate-400 uppercase text-[10px]">Scheduled Visit</p>
            <p className="font-bold text-slate-900 text-sm mt-0.5">Today at 2:00 PM</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="font-bold text-slate-400 uppercase text-[10px]">Unit Entry Granted</p>
            <p className="font-bold text-emerald-600 text-sm mt-0.5">✓ Yes (Keybox)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 💳 Financials Teasers
function MakePaymentsTeaser() {
  return (
    <div className="w-full space-y-6 select-none pointer-events-none opacity-85 p-6 max-w-5xl mx-auto">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">August 2026 Rent Balance</p>
          <p className="text-3xl font-semibold text-slate-900">$2,450.00</p>
          <p className="text-xs text-amber-600 font-bold">Due on Aug 01, 2026 (In 2 Days)</p>
        </div>
        <div className="h-11 px-6 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center shadow-md">
          Pay Rent Now →
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h4 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3">Saved Payment Methods</h4>
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <CreditCard size={24} className="text-slate-700" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Visa ending in •••• 4242</p>
              <p className="text-xs text-slate-500">Expires 12/28 • Default Payment Method</p>
            </div>
          </div>
          <span className="text-xs font-bold text-blue-600">Change</span>
        </div>
      </div>
    </div>
  );
}

function AddCardTeaser() {
  return (
    <div className="w-full space-y-6 select-none pointer-events-none opacity-85 p-6 max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-lg font-black text-slate-900">Payment Method Storage</h3>
          <p className="text-xs text-slate-500 font-medium">Add saved credit cards or bank ACH accounts</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Cardholder Name</label>
            <div className="h-11 bg-slate-50 rounded-xl border border-slate-200 px-4 flex items-center text-sm font-medium text-slate-600">
              Raj Patel
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Card Number</label>
            <div className="h-11 bg-slate-50 rounded-xl border border-slate-200 px-4 flex items-center text-sm font-medium text-slate-600">
              •••• •••• •••• 4242
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-11 bg-slate-50 rounded-xl border border-slate-200 px-4 flex items-center text-sm font-medium text-slate-600">
              12 / 28
            </div>
            <div className="h-11 bg-slate-50 rounded-xl border border-slate-200 px-4 flex items-center text-sm font-medium text-slate-600">
              •••
            </div>
          </div>
        </div>

        <div className="h-11 bg-blue-600 text-white font-bold text-sm rounded-xl flex items-center justify-center">
          Save Payment Method securely
        </div>
      </div>
    </div>
  );
}

function ViewInvoicesTeaser() {
  return (
    <div className="w-full space-y-6 select-none pointer-events-none opacity-85 p-6 max-w-6xl mx-auto">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-base font-semibold text-slate-900">Rent Invoices & Payment Receipts</h3>
        <div className="space-y-2">
          {[
            { inv: "INV-2026-07", period: "July 2026 Monthly Rent", amount: "$2,450.00", status: "PAID", date: "Jul 01, 2026" },
            { inv: "INV-2026-06", period: "June 2026 Monthly Rent", amount: "$2,450.00", status: "PAID", date: "Jun 01, 2026" },
            { inv: "INV-2026-05", period: "May 2026 Monthly Rent", amount: "$2,450.00", status: "PAID", date: "May 01, 2026" },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-400">{item.inv}</p>
                <p className="text-sm font-semibold text-slate-900">{item.period}</p>
                <p className="text-xs text-slate-500">Paid on {item.date}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-base font-black text-slate-900">{item.amount}</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                  {item.status}
                </span>
                <span className="text-xs font-bold text-blue-600">PDF ↓</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ViewTransactionsTeaser() {
  return (
    <div className="w-full space-y-6 select-none pointer-events-none opacity-85 p-6 max-w-6xl mx-auto">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-base font-semibold text-slate-900">Payment Transactions & History Ledger</h3>
        <div className="space-y-2">
          {[
            { desc: "Rent Payment — Visa •••• 4242", cat: "Rent Payment", amount: "-$2,450.00", date: "Jul 01, 2026 09:14 AM" },
            { desc: "Pet Deposit Charge", cat: "Fee", amount: "-$300.00", date: "Aug 01, 2025 02:30 PM" },
            { desc: "Security Deposit Settlement", cat: "Escrow Deposit", amount: "-$2,450.00", date: "Aug 01, 2025 10:00 AM" },
          ].map((t, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <div>
                <p className="font-bold text-slate-900">{t.desc}</p>
                <p className="text-slate-400">{t.cat} • {t.date}</p>
              </div>
              <span className="font-semibold text-sm text-slate-900">{t.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 📝 Applications & Tours Teasers
function TenantApplicationsTeaser() {
  return (
    <div className="w-full space-y-6 select-none pointer-events-none opacity-85 p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-base font-semibold text-slate-900">My Rental Applications</h3>
          <p className="text-xs text-slate-500 font-medium">Track application screening status and lease offers</p>
        </div>
        <div className="h-9 px-4 bg-blue-600 text-white rounded-xl font-bold text-xs flex items-center">
          + New Application
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            APPROVED & SIGNED
          </span>
          <h4 className="text-base font-semibold text-slate-900 pt-1">Sunset Heights Apartments — Unit 4B</h4>
          <p className="text-xs text-slate-500">Submitted Jul 20, 2025 • Screening Cleared</p>
        </div>
        <span className="text-xs font-bold text-blue-600">View Application →</span>
      </div>
    </div>
  );
}

function TenantToursTeaser() {
  return (
    <div className="w-full space-y-6 select-none pointer-events-none opacity-85 p-6 max-w-6xl mx-auto">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Scheduled Showing Tours & Unit Walkthroughs</h3>
          <div className="h-9 px-4 bg-blue-600 text-white rounded-xl font-bold text-xs flex items-center">
            + Schedule Tour
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
              CONFIRMED TOUR
            </span>
            <h4 className="text-sm font-semibold text-slate-900 pt-1">Oakridge Luxury Suites — Unit 12</h4>
            <p className="text-xs text-slate-500 font-medium">📅 Aug 05, 2026 at 10:30 AM</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 💬 Communication Teasers
function MessageOwnerTeaser() {
  return (
    <div className="w-full space-y-4 select-none pointer-events-none opacity-85 p-6 max-w-5xl mx-auto">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-semibold text-slate-900">Direct Landlord & Property Manager Chat</h3>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">Real-Time Messaging</span>
        </div>
        <div className="space-y-3 max-w-lg mx-auto py-4">
          <div className="flex justify-start">
            <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-none text-xs text-slate-800 max-w-xs font-medium">
              Hello Raj! Reminding you that property inspection is scheduled for tomorrow at 2 PM.
            </div>
          </div>
          <div className="flex justify-end">
            <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-tr-none text-xs max-w-xs font-medium shadow-xs">
              Thank you! Keybox permission is granted.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 📅 Calendar Teaser
function ViewCalendarTeaser() {
  return (
    <div className="w-full space-y-6 select-none pointer-events-none opacity-85 p-6 max-w-6xl mx-auto">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-base font-semibold text-slate-900">Activity Calendar & Due Dates</h3>
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-2 h-36">
          {Array.from({ length: 28 }).map((_, i) => (
            <div key={i} className="bg-slate-50 rounded-xl p-1 border border-slate-100 text-[10px] text-slate-400 font-bold">
              {i + 1}
              {i === 0 && <div className="mt-1 bg-amber-500 text-white rounded p-0.5 text-[8px] truncate">Rent Due</div>}
              {i === 14 && <div className="mt-1 bg-blue-500 text-white rounded p-0.5 text-[8px] truncate">Inspection</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DefaultTenantTeaser() {
  return (
    <div className="w-full space-y-6 select-none pointer-events-none opacity-85 p-6 max-w-5xl mx-auto">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
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
