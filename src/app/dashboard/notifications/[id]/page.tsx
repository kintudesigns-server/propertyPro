import React from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  AlertCircle,
  Info,
  FileText,
  Calendar,
  Clock,
  CheckCheck,
  ArrowRight,
  Wrench,
  CreditCard,
  ClipboardList,
  Building2,
  Users,
  Home,
} from "lucide-react";
import { NotificationActions } from "@/components/notifications/NotificationActions";

// ── Icon per notification type ──────────────────────────────────
const getIconForType = (type: string, priority: string) => {
  if (priority === "HIGH") return <AlertCircle className="h-8 w-8 text-red-500" />;
  switch (type) {
    case "PAYMENT":     return <CreditCard    className="h-8 w-8 text-green-500" />;
    case "MAINTENANCE": return <Wrench        className="h-8 w-8 text-orange-500" />;
    case "LEASE":       return <FileText      className="h-8 w-8 text-purple-500" />;
    case "APPLICATION": return <ClipboardList className="h-8 w-8 text-blue-500" />;
    default:            return <Bell          className="h-8 w-8 text-slate-500" />;
  }
};

// ── Priority badge ──────────────────────────────────────────────
const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case "HIGH":   return <span className="px-2.5 py-1 text-xs font-bold rounded bg-red-50 text-red-600 border border-red-100">HIGH PRIORITY</span>;
    case "MEDIUM": return <span className="px-2.5 py-1 text-xs font-bold rounded bg-yellow-50 text-yellow-600 border border-yellow-100">MEDIUM PRIORITY</span>;
    case "LOW":    return <span className="px-2.5 py-1 text-xs font-bold rounded bg-green-50 text-green-600 border border-green-100">LOW PRIORITY</span>;
    default: return null;
  }
};

// ── Smart deep-link resolver ────────────────────────────────────
type NavAction = {
  href: string;
  label: string;
  description: string;
  Icon: any;
  color: string;
  textColor: string;
};

function resolveNavActions(notification: any, userRole: string): NavAction[] {
  const { title, type, relatedEntityId } = notification;
  const id = relatedEntityId;
  const actions: NavAction[] = [];

  const t = (title as string).toLowerCase();
  const isAdmin = userRole === "SUPERADMIN";

  // ── Applications ───────────────────────────
  if (t.includes("owner application")) {
    if (isAdmin) {
      actions.push({
        href: `/dashboard/admin/owner-applications`,
        label: "View Owner Applications",
        description: "Review pending owner requests, approve access, and assign limits.",
        Icon: Building2,
        color: "bg-blue-50",
        textColor: "text-blue-600",
      });
    }
  } else if (type === "APPLICATION" || t.includes("application")) {
    if (id) {
      actions.push({
        href: `/dashboard/applications/${id}`,
        label: "View Application Details",
        description: "Open the full tenant application, review submitted documents, and approve or reject.",
        Icon: ClipboardList,
        color: "bg-blue-50",
        textColor: "text-blue-600",
      });
    }
    actions.push({
      href: `/dashboard/tenants/applications`,
      label: "Go to Applications Ledger",
      description: "Browse all pending, approved, and rejected applications in one place.",
      Icon: Users,
      color: "bg-slate-50",
      textColor: "text-slate-600",
    });
  }

  // ── Maintenance ────────────────────────────
  else if (type === "MAINTENANCE" || t.includes("maintenance") || t.includes("repair")) {
    if (id) {
      actions.push({
        href: `/dashboard/maintenance/${id}`,
        label: "View Maintenance Request",
        description: "Inspect the full maintenance ticket, update status, or assign an inspector.",
        Icon: Wrench,
        color: "bg-orange-50",
        textColor: "text-orange-600",
      });
    }
    actions.push({
      href: `/dashboard/maintenance`,
      label: "All Maintenance Requests",
      description: "View the full maintenance ledger and dispatch team.",
      Icon: Wrench,
      color: "bg-slate-50",
      textColor: "text-slate-600",
    });
  }

  // ── Mediation & Disputes ───────────────────
  else if (t.includes("mediation") || t.includes("dispute")) {
    if (isAdmin) {
      actions.push({
        href: `/dashboard/admin/payouts`, // Or any mediation ledger if exists
        label: "View Mediation Dashboard",
        description: "Review disputes, inspect tenant move-out notes, and resolve conflicts.",
        Icon: AlertCircle,
        color: "bg-red-50",
        textColor: "text-red-600",
      });
    }
  }

  // ── Payouts ────────────────────────────────
  else if (t.includes("payout")) {
    if (isAdmin) {
      actions.push({
        href: `/dashboard/admin/payouts`,
        label: "View Payout Requests",
        description: "Review pending payouts, process disbursements, and check owner balances.",
        Icon: CreditCard,
        color: "bg-emerald-50",
        textColor: "text-emerald-600",
      });
    } else {
      actions.push({
        href: `/dashboard/accounting/wallet`,
        label: "Go to Owner Wallet",
        description: "Check your current balance and view your payout history.",
        Icon: FileText,
        color: "bg-slate-50",
        textColor: "text-slate-600",
      });
    }
  }

  // ── Payments / Invoices / Transactions / Refunds / Billing ──
  else if (type === "PAYMENT" || type === "BILLING" || t.includes("payment") || t.includes("invoice") || t.includes("transaction") || t.includes("refund") || t.includes("chargeback") || t.includes("billing") || t.includes("deposit")) {
    if (userRole === "TENANT") {
      actions.push({
        href: `/dashboard/accounting/invoices`,
        label: "Go to Invoices",
        description: "View your outstanding statements, download invoice PDFs, and verify your account balance.",
        Icon: CreditCard,
        color: "bg-green-50",
        textColor: "text-green-600",
      });
      actions.push({
        href: `/dashboard/payments/pay-rent`,
        label: "Pay Rent Online",
        description: "Directly checkout and pay your current outstanding invoices via credit card.",
        Icon: Home,
        color: "bg-blue-50",
        textColor: "text-blue-600",
      });
    } else {
      const isDepositEvent = t.includes("deposit") || t.includes("refund");
      if (id && isDepositEvent) {
        actions.push({
          href: `/dashboard/leases/${id}`,
          label: "View Security Deposit Ledger",
          description: "Open the linked lease details to view the Security Deposit Ledger and mid-tenancy deductions.",
          Icon: Home,
          color: "bg-purple-50",
          textColor: "text-purple-600",
        });
      }
      actions.push({
        href: `/dashboard/accounting/invoices`,
        label: "Go to Invoices",
        description: "View the invoice ledger, download PDFs, and confirm payment status.",
        Icon: CreditCard,
        color: "bg-green-50",
        textColor: "text-green-600",
      });
      actions.push({
        href: `/dashboard/accounting/transactions`,
        label: "View Transactions",
        description: "Review the full transaction history and Stripe payment records.",
        Icon: FileText,
        color: "bg-emerald-50",
        textColor: "text-emerald-600",
      });
    }
  }

  // ── Lease ──────────────────────────────────
  else if (type === "LEASE" || t.includes("lease")) {
    if (id) {
      actions.push({
        href: `/dashboard/leases/${id}`,
        label: "Open Lease",
        description: "View lease details, renewal dates, and linked tenant information.",
        Icon: FileText,
        color: "bg-purple-50",
        textColor: "text-purple-600",
      });
    }
    actions.push({
      href: `/dashboard/leases`,
      label: "All Leases",
      description: "Browse all active, expiring, and expired leases on the platform.",
      Icon: Home,
      color: "bg-slate-50",
      textColor: "text-slate-600",
    });
  }

  // ── Property approval ──────────────────────
  else if (t.includes("propert")) {
    if (id) {
      actions.push({
        href: `/dashboard/properties/${id}`,
        label: "View Property",
        description: "Open the property listing, manage units, and review approval status.",
        Icon: Building2,
        color: "bg-indigo-50",
        textColor: "text-indigo-600",
      });
    }
    if (isAdmin) {
      actions.push({
        href: `/dashboard/admin/properties`,
        label: "Property Approvals",
        description: "Review pending property listings waiting for admin approval.",
        Icon: CheckCircle2,
        color: "bg-slate-50",
        textColor: "text-slate-600",
      });
    }
  }

  // ── Generic SYSTEM fallback ────────────────
  else {
    actions.push({
      href: `/dashboard`,
      label: "Go to Dashboard",
      description: "Return to the main dashboard to see an overview of platform activity.",
      Icon: Home,
      color: "bg-slate-50",
      textColor: "text-slate-600",
    });
  }

  return actions;
}

const formatDate = (dateStr: Date) =>
  dateStr.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

const formatTime = (dateStr: Date) =>
  dateStr.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

// ── Page ────────────────────────────────────────────────────────
export default async function NotificationDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");

  const userId = (session.user as any).id;
  const userRole = (session.user as any).role || "";
  const { id } = await params;

  const db = prisma as any;
  const notification = await db.notification.findUnique({ where: { id } });

  if (!notification || notification.userId !== userId) redirect("/dashboard/notifications");

  if (!notification.isRead) {
    await (prisma as any).notification.update({ where: { id }, data: { isRead: true } });
    notification.isRead = true;
  }

  const navActions = resolveNavActions(notification, userRole);

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      {/* Back + Title */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/notifications"
          className="p-2.5 bg-white border border-[#E2E8F0] rounded-xl text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-[#0F172A] tracking-tight">Notification Details</h1>
          <p className="text-sm text-[#64748B] font-medium mt-0.5">View alert contents, metadata, and related actions</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Left: main content ── */}
        <div className="flex-1 flex flex-col gap-5">
          {/* Hero card */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="p-8 flex flex-col items-center text-center border-b border-[#E2E8F0] bg-[#F8FAFC]/50">
              <div className="mb-4 p-4 bg-white rounded-2xl shadow-sm border border-[#E2E8F0]">
                {getIconForType(notification.type, notification.priority)}
              </div>
              <div className="flex flex-wrap justify-center gap-2 mb-3">
                {getPriorityBadge(notification.priority)}
                <span className="px-2.5 py-1 text-xs font-bold rounded bg-slate-100 text-slate-600 border border-slate-200">
                  {notification.type} ALERT
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-[#0F172A] max-w-2xl">{notification.title}</h2>
            </div>
            <div className="p-8">
              <h3 className="text-xs font-extrabold text-[#94A3B8] uppercase tracking-wider mb-4">Message Content</h3>
              <div className="bg-slate-50 p-6 rounded-xl border border-[#E2E8F0]">
                <p className="whitespace-pre-wrap leading-relaxed text-base text-[#0F172A]">{notification.message}</p>
              </div>
            </div>
          </div>

          {/* ── Smart Navigation Actions ── */}
          {navActions.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <h3 className="font-extrabold text-[#0F172A] text-sm">Related Actions</h3>
                <p className="text-xs text-[#64748B] mt-0.5 font-medium">Jump directly to the page related to this notification</p>
              </div>
              <div className="p-5 flex flex-col gap-3">
                {navActions.map((action, i) => (
                  <Link
                    key={i}
                    href={action.href}
                    className="flex items-center gap-4 p-4 rounded-xl border border-[#E2E8F0] hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
                  >
                    <div className={`h-11 w-11 rounded-xl ${action.color} flex items-center justify-center shrink-0 transition-transform group-hover:scale-105`}>
                      <action.Icon className={`h-5 w-5 ${action.textColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm ${action.textColor} group-hover:underline`}>{action.label}</p>
                      <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">{action.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[#94A3B8] shrink-0 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div className="w-full lg:w-80 flex flex-col gap-5 shrink-0">
          {/* Overview card */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <h3 className="font-bold text-[#0F172A] text-sm">Overview</h3>
            </div>
            <div className="p-5 space-y-5">
              {/* Status */}
              <div>
                <span className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <CheckCheck className="h-3.5 w-3.5" /> Status
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${notification.isRead ? "bg-slate-100 text-slate-600" : "bg-blue-50 text-blue-600"}`}>
                  {notification.isRead ? "Read" : "Unread"}
                </span>
              </div>

              <div className="h-px bg-[#E2E8F0]" />

              {/* Date */}
              <div>
                <span className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Date Received
                </span>
                <p className="text-sm font-semibold text-[#0F172A]">{formatDate(notification.createdAt)}</p>
              </div>

              {/* Time */}
              <div>
                <span className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Clock className="h-3.5 w-3.5" /> Time
                </span>
                <p className="text-sm font-semibold text-[#0F172A]">{formatTime(notification.createdAt)}</p>
              </div>

              {/* Raw entity ID */}
              {notification.relatedEntityId && (
                <>
                  <div className="h-px bg-[#E2E8F0]" />
                  <div>
                    <span className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                      <FileText className="h-3.5 w-3.5" /> Entity ID
                    </span>
                    <p className="text-[11px] font-mono text-[#64748B] bg-slate-50 border border-slate-200 p-2 rounded-lg break-all">
                      {notification.relatedEntityId}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden p-5">
            <h3 className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider mb-4">Quick Actions</h3>
            <NotificationActions id={notification.id} isRead={notification.isRead} />
          </div>
        </div>
      </div>
    </div>
  );
}
