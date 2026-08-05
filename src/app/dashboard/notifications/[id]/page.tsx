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
import { GATABLE_MODULES } from "@/lib/modules-registry";

// ── Icon per notification type ──────────────────────────────────
const getIconForType = (type: string, priority: string) => {
  if (priority === "HIGH") return <AlertCircle className="h-8 w-8 text-red-500" />;
  switch (type) {
    case "PAYMENT":     return <CreditCard    className="h-8 w-8 text-green-500" />;
    case "MAINTENANCE": return <Wrench        className="h-8 w-8 text-orange-500" />;
    case "LEASE":       return <FileText      className="h-8 w-8 text-purple-500" />;
    case "APPLICATION": return <ClipboardList className="h-8 w-8 text-blue-500" />;
    default:            return <Bell          className="h-8 w-8 text-[#6E6E73]" />;
  }
};

// ── Priority badge ──────────────────────────────────────────────
const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case "HIGH":   return <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wider">High Priority</span>;
    case "MEDIUM": return <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">Medium Priority</span>;
    case "LOW":    return <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider">Low Priority</span>;
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
  const isTenant = userRole === "TENANT";

  // ── 1. Tours / Showings / Tour Ratings / Nudges ──────────
  if (
    type === "TOUR" ||
    t.includes("tour") ||
    t.includes("showing") ||
    t.includes("how was your tour") ||
    t.includes("great news from property owner")
  ) {
    if (isTenant) {
      actions.push({
        href: `/dashboard/tenant/tours`,
        label: "View My Showing Tours & Rate Visit",
        description: "Review your tour schedule, meeting links, or rate your visit experience.",
        Icon: Calendar,
        color: "bg-blue-50",
        textColor: "text-blue-600",
      });
      actions.push({
        href: `/listings`,
        label: "Submit Rental Application",
        description: "Browse available property listings and submit your rental application.",
        Icon: ClipboardList,
        color: "bg-emerald-50",
        textColor: "text-emerald-600",
      });
    } else {
      actions.push({
        href: `/dashboard/tours`,
        label: "Manage Showing Tours",
        description: "Review prospect showing requests, confirm visit slots, provide video meeting links, or rate prospects.",
        Icon: Calendar,
        color: "bg-blue-50",
        textColor: "text-blue-600",
      });
    }
  }

  // ── 2. Applications ───────────────────────────
  else if (t.includes("owner application")) {
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
    if (isTenant) {
      actions.push({
        href: `/dashboard/tenant/applications`,
        label: "View My Applications",
        description: "Track the status of your submitted rental applications.",
        Icon: ClipboardList,
        color: "bg-blue-50",
        textColor: "text-blue-600",
      });
    } else {
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
        href: `/dashboard/applications`,
        label: "Go to Applications Ledger",
        description: "Browse all pending, approved, and rejected applications in one place.",
        Icon: Users,
        color: "bg-[#F5F5F7]",
        textColor: "text-slate-600",
      });
    }
  }

  // ── 3. Maintenance ────────────────────────────
  else if (type === "MAINTENANCE" || t.includes("maintenance") || t.includes("repair")) {
    if (id) {
      let maintenanceDesc = "Inspect the full maintenance ticket, update status, or assign an inspector.";
      if (isTenant) {
        maintenanceDesc = "View the status, scheduled date, and details of your request.";
      } else if (userRole === "INSPECTOR") {
        maintenanceDesc = "View details of this task, submit estimates, and update status.";
      }

      actions.push({
        href: `/dashboard/maintenance/${id}`,
        label: "View Maintenance Request",
        description: maintenanceDesc,
        Icon: Wrench,
        color: "bg-orange-50",
        textColor: "text-orange-600",
      });
    }

    if (isTenant) {
      actions.push({
        href: `/dashboard/maintenance/my-requests`,
        label: "My Maintenance Requests",
        description: "View all your submitted maintenance requests.",
        Icon: Wrench,
        color: "bg-[#F5F5F7]",
        textColor: "text-slate-600",
      });
    } else if (userRole === "INSPECTOR") {
      actions.push({
        href: `/dashboard/inspector/active`,
        label: "My Active Tasks",
        description: "Manage and progress all repair tickets assigned to you.",
        Icon: Wrench,
        color: "bg-[#F5F5F7]",
        textColor: "text-slate-600",
      });
    } else {
      actions.push({
        href: `/dashboard/maintenance`,
        label: "All Maintenance Requests",
        description: "View the full maintenance ledger and dispatch team.",
        Icon: Wrench,
        color: "bg-[#F5F5F7]",
        textColor: "text-slate-600",
      });
    }
  }

  // ── 4. Mediation & Disputes ───────────────────
  else if (t.includes("mediation") || t.includes("dispute")) {
    if (isAdmin) {
      actions.push({
        href: `/dashboard/admin/payouts`,
        label: "View Mediation Dashboard",
        description: "Review disputes, inspect tenant move-out notes, and resolve conflicts.",
        Icon: AlertCircle,
        color: "bg-red-50",
        textColor: "text-red-600",
      });
    }
  }

  // ── 5. Payouts ────────────────────────────────
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
        color: "bg-[#F5F5F7]",
        textColor: "text-slate-600",
      });
    }
  }

  // ── 6. Payments / Invoices / Transactions / Refunds / Billing ──
  else if (type === "PAYMENT" || type === "BILLING" || t.includes("payment") || t.includes("invoice") || t.includes("transaction") || t.includes("refund") || t.includes("chargeback") || t.includes("billing") || t.includes("deposit")) {
    if (isTenant) {
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

  // ── 7. Lease ──────────────────────────────────
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
      color: "bg-[#F5F5F7]",
      textColor: "text-slate-600",
    });
  }

  // ── 8. Property Listing / Approval ────────────────
  else if (t.includes("propert") || t.includes("unit")) {
    if (isTenant) {
      actions.push({
        href: `/listings`,
        label: "Browse Property Listings",
        description: "View available properties and rental units.",
        Icon: Building2,
        color: "bg-blue-50",
        textColor: "text-blue-600",
      });
    } else {
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
          color: "bg-[#F5F5F7]",
          textColor: "text-slate-600",
        });
      }
    }
  }
  // ── 8.5 Subscription / Billing / Plan / Overlimits / Access Restrictions / Module Grants ──────────
  else if (
    type === "SUBSCRIPTION" ||
    type === "BILLING" ||
    t.includes("subscription") ||
    t.includes("plan") ||
    t.includes("grace period") ||
    t.includes("payouts blocked") ||
    t.includes("paused by admin") ||
    t.includes("account re-activated") ||
    t.includes("account reactivated") ||
    t.includes("billing") ||
    t.includes("restricted") ||
    t.includes("access") ||
    t.includes("module") ||
    t.includes("feature") ||
    t.includes("grant")
  ) {
    const fullText = `${t} ${(notification.message || "").toLowerCase()}`;

    // 1. Direct Module Action (if notification mentions a specific module)
    if (fullText.includes("lease management") || fullText.includes("lease")) {
      actions.push({
        href: `/dashboard/leases`,
        label: "Open Lease Management",
        description: "Jump directly to your Lease Management workspace.",
        Icon: FileText,
        color: "bg-purple-50",
        textColor: "text-purple-600",
      });
    } else if (fullText.includes("properties & units") || fullText.includes("propert")) {
      actions.push({
        href: `/dashboard/properties`,
        label: "Open Properties Portfolio",
        description: "Jump directly to your Property Portfolio workspace.",
        Icon: Building2,
        color: "bg-indigo-50",
        textColor: "text-indigo-600",
      });
    } else if (fullText.includes("tenant portal") || fullText.includes("tenant")) {
      actions.push({
        href: `/dashboard/tenants`,
        label: "Open Tenant Directory",
        description: "Jump directly to your Tenant Directory workspace.",
        Icon: Users,
        color: "bg-blue-50",
        textColor: "text-blue-600",
      });
    } else if (fullText.includes("maintenance tickets") || fullText.includes("maintenance") || fullText.includes("repair")) {
      actions.push({
        href: `/dashboard/maintenance`,
        label: "Open Maintenance Requests",
        description: "Jump directly to your Maintenance Requests workspace.",
        Icon: Wrench,
        color: "bg-orange-50",
        textColor: "text-orange-600",
      });
    } else if (fullText.includes("property tours") || fullText.includes("tour")) {
      actions.push({
        href: `/dashboard/tours`,
        label: "Open Property Tours",
        description: "Jump directly to your Showing Tours schedule.",
        Icon: Calendar,
        color: "bg-sky-50",
        textColor: "text-sky-600",
      });
    } else if (fullText.includes("inspections")) {
      actions.push({
        href: `/dashboard/inspections`,
        label: "Open Inspections & Turnovers",
        description: "Jump directly to your Turnovers & Inspections workspace.",
        Icon: CheckCircle2,
        color: "bg-emerald-50",
        textColor: "text-emerald-600",
      });
    } else if (fullText.includes("inspector & team management") || fullText.includes("team")) {
      actions.push({
        href: `/dashboard/team`,
        label: "Open Team & Inspectors",
        description: "Jump directly to your Team & Inspector directory.",
        Icon: Users,
        color: "bg-purple-50",
        textColor: "text-purple-600",
      });
    } else if (fullText.includes("rent payments") || fullText.includes("rent") || fullText.includes("payment")) {
      actions.push({
        href: isTenant ? `/dashboard/payments/pay-rent` : `/dashboard/accounting/transactions`,
        label: isTenant ? "Pay Rent Online" : "Open Payment Transactions",
        description: isTenant ? "Pay outstanding rent invoices via credit card or Stripe." : "Jump directly to your Payment Transactions history.",
        Icon: CreditCard,
        color: "bg-emerald-50",
        textColor: "text-emerald-600",
      });
    } else if (fullText.includes("invoice management") || fullText.includes("invoice")) {
      actions.push({
        href: `/dashboard/accounting/invoices`,
        label: "Open Invoice Management",
        description: "Jump directly to your Invoice Ledger.",
        Icon: CreditCard,
        color: "bg-green-50",
        textColor: "text-green-600",
      });
    } else if (fullText.includes("transaction history") || fullText.includes("transaction")) {
      actions.push({
        href: `/dashboard/accounting/transactions`,
        label: "Open Transactions History",
        description: "Jump directly to your Transactions Ledger.",
        Icon: FileText,
        color: "bg-emerald-50",
        textColor: "text-emerald-600",
      });
    } else if (fullText.includes("wallet & bank management") || fullText.includes("wallet")) {
      actions.push({
        href: `/dashboard/accounting/wallet`,
        label: "Open Wallet & Payouts",
        description: "Jump directly to your Owner Wallet.",
        Icon: CreditCard,
        color: "bg-blue-50",
        textColor: "text-blue-600",
      });
    } else if (fullText.includes("accounting & reports") || fullText.includes("accounting")) {
      actions.push({
        href: `/dashboard/accounting/overview`,
        label: "Open Financial Overview",
        description: "Jump directly to your Financial Overview.",
        Icon: CreditCard,
        color: "bg-blue-50",
        textColor: "text-blue-600",
      });
    } else if (fullText.includes("document storage") || fullText.includes("document")) {
      actions.push({
        href: `/dashboard/leases/documents`,
        label: "Open Document Vault",
        description: "Jump directly to your Document Storage Vault.",
        Icon: FileText,
        color: "bg-indigo-50",
        textColor: "text-indigo-600",
      });
    } else if (fullText.includes("portfolio analytics") || fullText.includes("analytics")) {
      actions.push({
        href: `/dashboard/analytics`,
        label: "Open Portfolio Analytics",
        description: "Jump directly to your Portfolio Analytics workspace.",
        Icon: CreditCard,
        color: "bg-purple-50",
        textColor: "text-purple-600",
      });
    }

    // 2. Secondary Billing / Admin Action
    if (isAdmin) {
      actions.push({
        href: `/dashboard/admin/subscriptions`,
        label: "Manage Owner Subscriptions",
        description: "Open the admin dashboard to inspect owner subscription status, override locks, or review MRR.",
        Icon: ClipboardList,
        color: "bg-purple-50",
        textColor: "text-purple-600",
      });
    } else if (userRole === "OWNER") {
      actions.push({
        href: `/dashboard/owner/billing`,
        label: "Subscription & Feature Access",
        description: "Go to your billing overview to update cards, check plan limits, and review active module grants.",
        Icon: CreditCard,
        color: "bg-blue-50",
        textColor: "text-blue-600",
      });
    } else {
      actions.push({
        href: `/dashboard`,
        label: "View Account Overview",
        description: "Return to your dashboard to view active tools and permissions.",
        Icon: Home,
        color: "bg-blue-50",
        textColor: "text-blue-600",
      });
    }
  }

  // ── 9. Generic SYSTEM fallback ────────────────
  else {
    actions.push({
      href: isTenant ? `/listings` : `/dashboard`,
      label: isTenant ? "Browse Properties" : "Go to Dashboard",
      description: isTenant ? "Explore available rental listings." : "Return to the main dashboard to see an overview of platform activity.",
      Icon: isTenant ? Building2 : Home,
      color: "bg-[#F5F5F7]",
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

  let overrideDetail: any = null;
  const lowerTitle = notification.title.toLowerCase();
  const lowerMessage = notification.message.toLowerCase();

  if (
    lowerTitle.includes("restricted") ||
    lowerTitle.includes("access") ||
    lowerTitle.includes("granted") ||
    lowerTitle.includes("revoked") ||
    lowerTitle.includes("feature") ||
    lowerTitle.includes("module") ||
    lowerMessage.includes("restricted your access") ||
    lowerMessage.includes("granted you access")
  ) {
    // Extract feature/module name from message (e.g. 'Admin has restricted your access to "Document Storage".')
    const match = notification.message.match(/"([^"]+)"/);
    const targetLabel = match ? match[1] : null;

    if (targetLabel) {
      // 1. Try ownerModuleGrant (matching label or key in GATABLE_MODULES)
      const matchedModule = GATABLE_MODULES.find(
        (m: any) => m.label.toLowerCase() === targetLabel.toLowerCase() || m.key.toLowerCase() === targetLabel.toLowerCase()
      );
      const moduleKey = matchedModule ? matchedModule.key : targetLabel;

      const moduleGrant = await db.ownerModuleGrant.findFirst({
        where: { userId, module: moduleKey },
        orderBy: { createdAt: "desc" }
      });

      if (moduleGrant) {
        overrideDetail = {
          overrideType: moduleGrant.overrideType,
          reason: moduleGrant.reason,
          expiresAt: moduleGrant.expiresAt,
          isModuleGrant: true,
          label: matchedModule?.label || targetLabel
        };
      } else {
        // 2. Try userAccessOverride
        const userOverride = await db.userAccessOverride.findFirst({
          where: { userId, feature: targetLabel },
          orderBy: { createdAt: "desc" }
        });
        if (userOverride) {
          overrideDetail = {
            overrideType: userOverride.overrideType,
            reason: userOverride.reason,
            expiresAt: userOverride.expiresAt,
            isModuleGrant: false,
            label: targetLabel
          };
        }
      }
    }
  }

  const navActions = resolveNavActions(notification, userRole);

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6 font-sans">
      {/* Back + Title */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/notifications"
          className="h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">Notification Details</h1>
          <p className="text-xs font-normal text-[#6E6E73] mt-0.5">View alert contents, metadata, and related actions</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Left: main content ── */}
        <div className="flex-1 flex flex-col gap-5">
          {/* Hero card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-8 flex flex-col items-center text-center border-b border-slate-100 bg-slate-50/50">
              <div className="mb-4 p-3.5 bg-white rounded-2xl shadow-2xs border border-slate-200/80">
                {getIconForType(notification.type, notification.priority)}
              </div>
              <div className="flex flex-wrap justify-center gap-2 mb-3">
                {getPriorityBadge(notification.priority)}
                <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider shadow-2xs">
                  {notification.type} ALERT
                </span>
              </div>
              <h2 className="text-2xl font-semibold text-[#1D1D1F] max-w-2xl tracking-tight">{notification.title}</h2>
            </div>
            <div className="p-6 md:p-8 space-y-6">
              <div>
                <h3 className="text-xs font-normal text-[#6E6E73] mb-2">Message Content</h3>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <p className="whitespace-pre-wrap leading-relaxed text-xs font-normal text-[#1D1D1F]">{notification.message}</p>
                </div>
              </div>

              {/* Rich Block Policy Card for Feature Restrictions */}
              {overrideDetail && (
                <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-purple-200/60 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
                        <AlertCircle className="h-4 w-4" />
                      </div>
                      <h4 className="text-xs font-semibold text-purple-950">Administrative Authorization Policy Record</h4>
                    </div>
                    <span className="text-[9px] font-medium px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-wider shadow-2xs">
                      {overrideDetail.overrideType === "BLOCK" ? "🔒 Active Block" : "🔑 Granted Access"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-xs font-normal text-purple-800/80 block">Admin Audit Reason Note</span>
                      <p className="text-xs font-medium text-purple-950 bg-white p-3 rounded-xl border border-purple-200/60 italic shadow-2xs">
                        "{overrideDetail.reason}"
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs font-normal text-purple-800/80 block">Restriction Timeline</span>
                      <div className="bg-white p-3 rounded-xl border border-purple-200/60 space-y-1 shadow-2xs">
                        <p className="text-xs font-semibold text-purple-950">
                          {overrideDetail.expiresAt
                            ? `Auto-restores on ${new Date(overrideDetail.expiresAt).toLocaleDateString()}`
                            : "Permanent restriction (manual admin unlock)"}
                        </p>
                        {overrideDetail.expiresAt && (
                          <p className="text-[11px] font-normal text-purple-700">
                            ~{Math.max(1, Math.ceil((new Date(overrideDetail.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days remaining
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Smart Navigation Actions ── */}
          {navActions.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-semibold text-[#1D1D1F] text-xs tracking-tight">Related Actions</h3>
                <p className="text-xs text-[#6E6E73] font-normal mt-0.5">Jump directly to the page related to this notification</p>
              </div>
              <div className="p-5 flex flex-col gap-3">
                {navActions.map((action, i) => (
                  <Link
                    key={i}
                    href={action.href}
                    className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/80 transition-all group shadow-2xs"
                  >
                    <div className={`h-10 w-10 rounded-xl ${action.color} flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-2xs`}>
                      <action.Icon className={`h-4 w-4 ${action.textColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-xs text-[#1D1D1F] group-hover:underline`}>{action.label}</p>
                      <p className="text-xs text-[#6E6E73] font-normal mt-0.5 leading-relaxed">{action.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 shrink-0 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div className="w-full lg:w-80 flex flex-col gap-5 shrink-0">
          {/* Overview card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-[#1D1D1F] text-xs">Overview</h3>
            </div>
            <div className="p-5 space-y-4">
              {/* Status */}
              <div>
                <span className="text-xs font-normal text-[#6E6E73] flex items-center gap-1.5 mb-1">
                  <CheckCheck className="h-3.5 w-3.5" /> Status
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider ${notification.isRead ? "bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs" : "bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs"}`}>
                  {notification.isRead ? "Read" : "Unread"}
                </span>
              </div>

              <div className="h-px bg-slate-100" />

              {/* Date */}
              <div>
                <span className="text-xs font-normal text-[#6E6E73] flex items-center gap-1.5 mb-1">
                  <Calendar className="h-3.5 w-3.5" /> Date Received
                </span>
                <p className="text-xs font-semibold text-[#1D1D1F]">{formatDate(notification.createdAt)}</p>
              </div>

              {/* Time */}
              <div>
                <span className="text-xs font-normal text-[#6E6E73] flex items-center gap-1.5 mb-1">
                  <Clock className="h-3.5 w-3.5" /> Time
                </span>
                <p className="text-xs font-semibold text-[#1D1D1F]">{formatTime(notification.createdAt)}</p>
              </div>

              {/* Raw entity ID */}
              {notification.relatedEntityId && (
                <>
                  <div className="h-px bg-slate-100" />
                  <div>
                    <span className="text-xs font-normal text-[#6E6E73] flex items-center gap-1.5 mb-1">
                      <FileText className="h-3.5 w-3.5" /> Entity ID
                    </span>
                    <p className="text-[10px] font-mono text-[#6E6E73] bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl break-all shadow-2xs">
                      {notification.relatedEntityId}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden p-5">
            <h3 className="font-semibold text-[#1D1D1F] text-xs mb-3">Quick Actions</h3>
            <NotificationActions id={notification.id} isRead={notification.isRead} />
          </div>
        </div>
      </div>
    </div>
  );
}
