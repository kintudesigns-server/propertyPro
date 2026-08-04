"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Building,
  Users,
  UserPlus,
  FileText,
  Wrench,
  Search,
  Bell,
  Settings,
  ChevronDown,
  LayoutDashboard,
  Wallet,
  Receipt,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Menu,
  Briefcase,
  MessageSquare,
  Calendar,
  DollarSign,
  CreditCard,
  X,
  ClipboardList,
  TrendingUp,
  Tag,
  BarChart2,
  Lock,
} from "lucide-react";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { MessageBadge } from "@/components/notifications/MessageBadge";
import { toast } from "sonner";
import { ModuleAccessProvider, useModuleAccessContext } from "@/contexts/ModuleAccessContext";
import { useBlockedFeatures } from "@/hooks/useBlockedFeatures";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-slate-900 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div>
        <p className="text-slate-400 font-extrabold text-sm tracking-wider uppercase">Loading...</p>
      </div>
    }>
      <ModuleAccessProvider>
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </ModuleAccessProvider>
    </React.Suspense>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const moduleAccess = useModuleAccessContext();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams ? searchParams.get("tab") || "overview" : "overview";
  const { data: session, status } = useSession();
  const role = (session?.user as any)?.role;
  const subscriptionStatus = (session?.user as any)?.subscriptionStatus;
  const isOwnerOrAdmin = role === "OWNER" || role === "SUPERADMIN";
  const isInspector = role === "INSPECTOR";
  const isAdmin = role === "SUPERADMIN";
  const isOwner = role === "OWNER";
  const isTenant = role === "TENANT";

  const isAllowed = (key: string) => (isOwner ? moduleAccess.isAllowed(key) : true);
  const { blockedFeatures } = useBlockedFeatures();
  const isFeatureLocked = (featureKey: string) => blockedFeatures.has(featureKey);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  React.useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [tenantsOpen, setTenantsOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [leasesOpen, setLeasesOpen] = useState(false);
  const [toursOpen, setToursOpen] = useState(false);
  const [inspectionsOpen, setInspectionsOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [financialsOpen, setFinancialsOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [expiringLeasesCount, setExpiringLeasesCount] = useState(0);

  // Smart route auto-expand
  React.useEffect(() => {
    setPropertiesOpen(pathname.includes("/dashboard/properties"));
    setTenantsOpen(pathname.includes("/dashboard/tenants"));
    setLeasesOpen(pathname.includes("/dashboard/leases"));
    setMaintenanceOpen(pathname.includes("/dashboard/maintenance"));
    setFinancialsOpen(pathname.includes("/dashboard/payments") || pathname.includes("/dashboard/accounting"));
    setToursOpen(pathname.includes("/dashboard/tours"));
    setInspectionsOpen(pathname.includes("/dashboard/inspections"));
    setActivityOpen(pathname.includes("/dashboard/messages") || pathname.includes("/dashboard/notifications"));
  }, [pathname]);

  const isTenantTabActive = (tab: string) => {
    if (tab === "overview") return pathname === "/dashboard" || (pathname === "/dashboard/tenant" && currentTab === "overview");
    if (tab === "my-leases") return pathname === "/dashboard/leases/my-leases";
    if (tab === "documents") return pathname === "/dashboard/leases/documents";
    if (tab === "submit-request") return pathname === "/dashboard/maintenance/new";
    if (tab === "my-requests") return pathname === "/dashboard/maintenance/my-requests";
    if (tab === "pay-rent") return pathname === "/dashboard/payments/pay-rent";
    if (tab === "add-card") return pathname === "/dashboard/payments/add-card";
    if (tab === "transactions") return pathname === "/dashboard/accounting/transactions";
    if (tab === "invoices") return pathname === "/dashboard/accounting/invoices";
    if (tab === "my-tours") return pathname === "/dashboard/tenant/tours";
    return pathname === "/dashboard/tenant" && currentTab === tab;
  };

  React.useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }

    if (isOwner && subscriptionStatus === "PendingPlanSelection" && !pathname.startsWith("/dashboard/subscribe")) {
      router.replace("/dashboard/subscribe");
      return;
    }

    if (isInspector && (pathname === "/dashboard" || pathname === "/dashboard/")) {
      router.push("/dashboard/inspector");
    }
  }, [status, isInspector, isOwner, subscriptionStatus, pathname, router]);

  // Global Real-Time SSE Listener
  React.useEffect(() => {
    if (status !== "authenticated") return;

    const eventSource = new EventSource("/api/notifications/sse");
    
    eventSource.addEventListener("message", (e) => {
      try {
        const newMessage = JSON.parse(e.data);
        // Only show toast if user is not already looking at the messages page
        if (!pathname.startsWith("/dashboard/messages")) {
          toast.success(`New Message from ${newMessage.sender?.name || "User"}`, {
            description: newMessage.messageType === "IMAGE" ? "Sent an image" : (newMessage.messageType === "FILE" ? "Sent a document" : newMessage.content),
            duration: 6000,
            action: {
              label: "Reply",
              onClick: () => router.push("/dashboard/messages")
            }
          });
        }
      } catch (err) {
        console.error("Error parsing incoming global message", err);
      }
    });

    return () => {
      eventSource.close();
    };
  }, [status, pathname, router]);

  React.useEffect(() => {
    if (!isOwnerOrAdmin) return;
    fetch("/api/leases")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const expiring = data.filter((l) => {
            if (l.status !== "ACTIVE") return false;
            const endDate = new Date(l.endDate);
            const today = new Date();
            const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return diffDays <= 30 && diffDays > 0;
          });
          setExpiringLeasesCount(expiring.length);
        }
      })
      .catch(() => {});
  }, []);

  // Helper to determine if a route is active
  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-slate-900 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        <p className="text-[#6E6E73] font-semibold text-xs tracking-wider uppercase">Loading PropertyPro...</p>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans flex text-slate-900">
      {/* Mobile Backdrop Overlay */}
      {mobileDrawerOpen && (
        <div 
          onClick={() => setMobileDrawerOpen(false)}
          className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar (Desktop + Mobile Drawer) */}
      <aside
        className={`fixed md:relative top-0 bottom-0 left-0 z-50 flex flex-col justify-between bg-white border-r border-slate-200 transition-all duration-300 h-screen ${
          mobileDrawerOpen ? "translate-x-0 w-72 shadow-2xl" : "-translate-x-full md:translate-x-0"
        } ${
          sidebarOpen ? "md:w-64" : "md:w-20"
        }`}
      >
        <div className="flex flex-col gap-6 w-full h-full overflow-y-auto">
          {/* Logo Section */}
          <div className="flex items-center gap-3 px-6 py-5 sticky top-0 bg-white z-10 border-b border-slate-100">
            <div className="bg-slate-900 text-white p-2 rounded-xl flex items-center justify-center shadow-xs">
              <Building className="h-5 w-5" />
            </div>
            {sidebarOpen && (
              <span className="font-semibold text-base tracking-tight text-[#1D1D1F] whitespace-nowrap">PropertyPro</span>
            )}
            {/* Mobile close button in sidebar */}
            <button
              onClick={() => setMobileDrawerOpen(false)}
              className="ml-auto p-1.5 text-[#6E6E73] hover:text-[#1D1D1F] rounded-lg md:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 px-4 pb-6">
            {isTenant ? (
              <>
                <Link
                  href="/dashboard"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isTenantTabActive("overview")
                      ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  }`}
                >
                  <LayoutDashboard className="h-5 w-5" />
                  {sidebarOpen && <span>Dashboard</span>}
                </Link>

                {sidebarOpen && (
                  <span className="px-3 pt-6 pb-2 text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest">
                    MANAGEMENT
                  </span>
                )}

                {/* Lease Details Accordion */}
                <div className="flex flex-col">
                  <button
                    onClick={() => {
                      if (!sidebarOpen) setSidebarOpen(true);
                      setLeasesOpen(!leasesOpen);
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all w-full ${
                      (isTenantTabActive("my-leases") || isTenantTabActive("documents")) && !leasesOpen
                        ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                        : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                    }`}
                  >
                    <ShieldCheck className="h-5 w-5" />
                    {sidebarOpen && <span className="flex-1 text-left">Lease Details</span>}
                    {sidebarOpen && (
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${leasesOpen ? "rotate-180" : ""}`}
                      />
                    )}
                  </button>

                  {sidebarOpen && leasesOpen && (
                    <div className="flex flex-col mt-1 ml-5 pl-4 border-l-2 border-[#E2E8F0] gap-1 relative">
                      <Link
                        href="/dashboard/leases/my-leases"
                        className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                          isTenantTabActive("my-leases")
                            ? "bg-slate-100 text-slate-900 font-extrabold"
                            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                        <span className="flex-1">My Leases</span>
                        {isFeatureLocked("view_lease") && <Lock className="h-3 w-3 ml-1 text-red-400 shrink-0" />}
                      </Link>
                      <Link
                        href="/dashboard/leases/documents"
                        className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                          isTenantTabActive("documents")
                            ? "bg-slate-100 text-slate-900 font-extrabold"
                            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                        <span className="flex-1">Documents</span>
                        {isFeatureLocked("view_documents") && <Lock className="h-3 w-3 ml-1 text-red-400 shrink-0" />}
                      </Link>
                    </div>
                  )}
                </div>

                {/* Maintenance Accordion */}
                <div className="flex flex-col">
                  <button
                    onClick={() => {
                      if (!sidebarOpen) setSidebarOpen(true);
                      setMaintenanceOpen(!maintenanceOpen);
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all w-full ${
                      (isTenantTabActive("submit-request") || isTenantTabActive("my-requests")) && !maintenanceOpen
                        ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                        : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                    }`}
                  >
                    <Wrench className="h-5 w-5" />
                    {sidebarOpen && <span className="flex-1 text-left">Maintenance</span>}
                    {sidebarOpen && (
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${maintenanceOpen ? "rotate-180" : ""}`}
                      />
                    )}
                  </button>

                  {sidebarOpen && maintenanceOpen && (
                    <div className="flex flex-col mt-1 ml-5 pl-4 border-l-2 border-[#E2E8F0] gap-1 relative">
                      <Link
                        href="/dashboard/maintenance/new"
                        className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                          isTenantTabActive("submit-request")
                            ? "bg-slate-100 text-slate-900 font-extrabold"
                            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                        <span className="flex-1">Submit Request</span>
                        {isFeatureLocked("submit_maintenance") && <Lock className="h-3 w-3 ml-1 text-red-400 shrink-0" />}
                      </Link>
                      <Link
                        href="/dashboard/maintenance/my-requests"
                        className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                          isTenantTabActive("my-requests")
                            ? "bg-slate-100 text-slate-900 font-extrabold"
                            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                        <span className="flex-1">My Requests</span>
                        {isFeatureLocked("view_maintenance") && <Lock className="h-3 w-3 ml-1 text-red-400 shrink-0" />}
                      </Link>
                    </div>
                  )}
                </div>

                {sidebarOpen && (
                  <span className="px-3 pt-6 pb-2 text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest">
                    FINANCIALS
                  </span>
                )}

                {/* Financials Accordion */}
                <div className="flex flex-col">
                  <button
                    onClick={() => {
                      if (!sidebarOpen) setSidebarOpen(true);
                      setFinancialsOpen(!financialsOpen);
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all w-full ${
                      (isTenantTabActive("pay-rent") || isTenantTabActive("add-card") || isTenantTabActive("transactions") || isTenantTabActive("invoices")) && !financialsOpen
                        ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                        : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                    }`}
                  >
                    <Wallet className="h-5 w-5" />
                    {sidebarOpen && <span className="flex-1 text-left">Financials</span>}
                    {sidebarOpen && (
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${financialsOpen ? "rotate-180" : ""}`}
                      />
                    )}
                  </button>

                  {sidebarOpen && financialsOpen && (
                    <div className="flex flex-col mt-1 ml-5 pl-4 border-l-2 border-[#E2E8F0] gap-1 relative">
                      <Link
                        href="/dashboard/payments/pay-rent"
                        className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                          isTenantTabActive("pay-rent")
                            ? "bg-slate-100 text-slate-900 font-extrabold"
                            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                        <span className="flex-1">Pay Rent</span>
                        {isFeatureLocked("make_payments") && <Lock className="h-3 w-3 ml-1 text-red-400 shrink-0" />}
                      </Link>
                      <Link
                        href="/dashboard/payments/add-card"
                        className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                          isTenantTabActive("add-card")
                            ? "bg-slate-100 text-slate-900 font-extrabold"
                            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                        <span className="flex-1">Add Card</span>
                        {isFeatureLocked("add_card") && <Lock className="h-3 w-3 ml-1 text-red-400 shrink-0" />}
                      </Link>
                      <Link
                        href="/dashboard/accounting/transactions"
                        className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                          isTenantTabActive("transactions")
                            ? "bg-slate-100 text-slate-900 font-extrabold"
                            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                        <span className="flex-1">Transactions</span>
                        {isFeatureLocked("view_transactions") && <Lock className="h-3 w-3 ml-1 text-red-400 shrink-0" />}
                      </Link>
                      <Link
                        href="/dashboard/accounting/invoices"
                        className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                          isTenantTabActive("invoices")
                            ? "bg-slate-100 text-slate-900 font-extrabold"
                            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                        <span className="flex-1">Invoices</span>
                        {isFeatureLocked("view_invoices") && <Lock className="h-3 w-3 ml-1 text-red-400 shrink-0" />}
                      </Link>
                    </div>
                  )}
                </div>

                {sidebarOpen && (
                  <span className="px-3 pt-6 pb-2 text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest">
                    EXPLORE
                  </span>
                )}
                
                <Link
                  href="/dashboard/tenant/applications"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    pathname === "/dashboard/tenant/applications"
                      ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  }`}
                >
                  <ClipboardList className="h-5 w-5" />
                  {sidebarOpen && <span className="flex-1">My Applications</span>}
                  {sidebarOpen && isFeatureLocked("tenant_applications") && <Lock className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                </Link>

                <Link
                  href="/dashboard/tenant/tours"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    pathname === "/dashboard/tenant/tours"
                      ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  }`}
                >
                  <Calendar className="h-5 w-5" />
                  {sidebarOpen && <span className="flex-1">My Showing Tours</span>}
                  {sidebarOpen && isFeatureLocked("tenant_tours") && <Lock className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                </Link>
                
                <Link
                  href="/listings"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]`}
                >
                  <Search className="h-5 w-5" />
                  {sidebarOpen && <span>Browse Listings</span>}
                </Link>

                {sidebarOpen && (
                  <span className="px-3 pt-6 pb-2 text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest">
                    ACTIVITY LOGS
                  </span>
                )}

                {/* Activity Accordion */}
                <div className="flex flex-col">
                  <button
                    onClick={() => {
                      if (!sidebarOpen) setSidebarOpen(true);
                      setActivityOpen(!activityOpen);
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all w-full ${
                      (isTenantTabActive("messages") || pathname === "/dashboard/calendar" || pathname === "/dashboard/notifications") && !activityOpen
                        ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                        : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                    }`}
                  >
                    <Bell className="h-5 w-5" />
                    {sidebarOpen && <span className="flex-1 text-left">Activity Logs</span>}
                    {sidebarOpen && (
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${activityOpen ? "rotate-180" : ""}`}
                      />
                    )}
                  </button>

                  {sidebarOpen && activityOpen && (
                    <div className="flex flex-col mt-1 ml-5 pl-4 border-l-2 border-[#E2E8F0] gap-1 relative">
                      <Link
                        href="/dashboard/messages"
                        className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                          pathname === "/dashboard/messages"
                            ? "bg-slate-100 text-slate-900 font-extrabold"
                            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                        <span className="flex-1">Inbox Messages</span>
                        {isFeatureLocked("message_owner") && <Lock className="h-3 w-3 ml-1 text-red-400 shrink-0" />}
                      </Link>
                      <Link
                        href="/dashboard/notifications"
                        className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                          pathname === "/dashboard/notifications"
                            ? "bg-slate-100 text-slate-900 font-extrabold"
                            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                        <span className="flex-1">System Notifications</span>
                      </Link>
                      <Link
                        href="/dashboard/calendar"
                        className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                          pathname === "/dashboard/calendar"
                            ? "bg-slate-100 text-slate-900 font-extrabold"
                            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                        <span className="flex-1">Calendar</span>
                        {isFeatureLocked("view_calendar") && <Lock className="h-3 w-3 ml-1 text-red-400 shrink-0" />}
                      </Link>
                    </div>
                  )}
                </div>

                {sidebarOpen && (
                  <span className="px-3 pt-6 pb-2 text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest">
                    ADMINISTRATION
                  </span>
                )}

                <Link
                  href="/dashboard/settings"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    pathname === "/dashboard/settings" || isTenantTabActive("settings")
                      ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  }`}
                >
                  <Settings className="h-5 w-5" />
                  {sidebarOpen && <span>Profile Settings</span>}
                </Link>
              </>
            ) : isInspector ? (
              <>
                <Link
                  href="/dashboard/inspector"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    pathname === "/dashboard/inspector"
                      ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  }`}
                >
                  <LayoutDashboard className="h-5 w-5" />
                  {sidebarOpen && <span className="flex-1">Dashboard Overview</span>}
                  {sidebarOpen && isFeatureLocked("view_inspector_dashboard") && <Lock className="h-3 w-3 ml-1 text-red-400 shrink-0" />}
                </Link>

                {sidebarOpen && (
                  <span className="px-3 pt-6 pb-2 text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest">
                    DIAGNOSTICS &amp; REPAIRS
                  </span>
                )}

                <Link
                  href="/dashboard/inspector/active"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive("/dashboard/inspector/active")
                      ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  }`}
                >
                  <Wrench className="h-5 w-5" />
                  {sidebarOpen && <span className="flex-1">Assigned Repairs</span>}
                  {sidebarOpen && isFeatureLocked("view_assignments") && <Lock className="h-3 w-3 ml-1 text-red-400 shrink-0" />}
                </Link>

                <Link
                  href="/dashboard/inspector/history"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive("/dashboard/inspector/history")
                      ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  }`}
                >
                  <FileText className="h-5 w-5" />
                  {sidebarOpen && <span className="flex-1">Closed Diagnostics</span>}
                  {sidebarOpen && isFeatureLocked("view_history") && <Lock className="h-3 w-3 ml-1 text-red-400 shrink-0" />}
                </Link>

                {sidebarOpen && (
                  <span className="px-3 pt-6 pb-2 text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest">
                    INSPECTIONS
                  </span>
                )}

                <Link
                  href="/dashboard/inspector/inspections"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive("/dashboard/inspector/inspections")
                      ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  }`}
                >
                  <ClipboardList className="h-5 w-5" />
                  {sidebarOpen && <span className="flex-1">Move-Out Walkthroughs</span>}
                  {sidebarOpen && isFeatureLocked("submit_reports") && <Lock className="h-3 w-3 ml-1 text-red-400 shrink-0" />}
                </Link>

                {sidebarOpen && (
                  <span className="px-3 pt-6 pb-2 text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest">
                    SYSTEM
                  </span>
                )}

                <Link
                  href="/dashboard/messages"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive("/dashboard/messages")
                      ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  }`}
                >
                  <MessageSquare className="h-5 w-5" />
                  {sidebarOpen && <span className="flex-1">Inbox Messages</span>}
                  {sidebarOpen && isFeatureLocked("message_owner") && <Lock className="h-3 w-3 ml-1 text-red-400 shrink-0" />}
                </Link>

                <Link
                  href="/dashboard/calendar"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive("/dashboard/calendar")
                      ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  }`}
                >
                  <Calendar className="h-5 w-5" />
                  {sidebarOpen && <span className="flex-1">Calendar</span>}
                  {sidebarOpen && isFeatureLocked("view_calendar") && <Lock className="h-3 w-3 ml-1 text-red-400 shrink-0" />}
                </Link>

                <Link
                  href="/dashboard/notifications"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive("/dashboard/notifications")
                      ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  }`}
                >
                  <Bell className="h-5 w-5" />
                  {sidebarOpen && <span>Notifications</span>}
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    pathname === "/dashboard"
                      ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  }`}
                >
                  <LayoutDashboard className="h-5 w-5" />
                  {sidebarOpen && <span>Dashboard</span>}
                </Link>

                {isAdmin && (
                  <>
                    {/* CORE ADMIN */}
                    {sidebarOpen && (
                      <span className="px-3 pt-6 pb-2 text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest">
                        ADMINISTRATION
                      </span>
                    )}
                    <Link
                      href="/dashboard/admin"
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        pathname === "/dashboard/admin"
                          ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      }`}
                    >
                      <ShieldCheck className="h-5 w-5" />
                      {sidebarOpen && <span>Admin Overview</span>}
                    </Link>
                    <Link
                      href="/dashboard/admin/audit-logs"
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        pathname === "/dashboard/admin/audit-logs"
                          ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      }`}
                    >
                      <FileText className="h-5 w-5" />
                      {sidebarOpen && <span>Audit Logs</span>}
                    </Link>

                    {/* FINANCIALS */}
                    {sidebarOpen && (
                      <span className="px-3 pt-6 pb-2 text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest">
                        FINANCIALS
                      </span>
                    )}
                    <Link
                      href="/dashboard/admin/profit"
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        pathname === "/dashboard/admin/profit"
                          ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      }`}
                    >
                      <DollarSign className="h-5 w-5" />
                      {sidebarOpen && <span>Platform Profit</span>}
                    </Link>
                    <Link
                      href="/dashboard/admin/payouts"
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        pathname === "/dashboard/admin/payouts"
                          ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      }`}
                    >
                      <CreditCard className="h-5 w-5" />
                      {sidebarOpen && <span>Payout Requests</span>}
                    </Link>

                    {/* APPROVALS & MODERATION */}
                    {sidebarOpen && (
                      <span className="px-3 pt-6 pb-2 text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest">
                        MODERATION
                      </span>
                    )}
                    <Link
                      href="/dashboard/admin/owner-applications"
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        pathname === "/dashboard/admin/owner-applications"
                          ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      }`}
                    >
                      <FileText className="h-5 w-5" />
                      {sidebarOpen && <span>Owner Applications</span>}
                    </Link>
                    <Link
                      href="/dashboard/admin/properties"
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        pathname === "/dashboard/admin/properties"
                          ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      }`}
                    >
                      <Building className="h-5 w-5" />
                      {sidebarOpen && <span>Approve Properties</span>}
                    </Link>

                    {/* PLATFORM SETTINGS */}
                    {sidebarOpen && (
                      <span className="px-3 pt-6 pb-2 text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest">
                        PLATFORM CONFIG
                      </span>
                    )}
                    <Link
                      href="/dashboard/admin/settings/pricing"
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        pathname === "/dashboard/admin/settings/pricing"
                          ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      }`}
                    >
                      <Settings className="h-5 w-5" />
                      {sidebarOpen && <span>Pricing Tiers & Fees</span>}
                    </Link>
                    <Link
                      href="/dashboard/admin/subscriptions"
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        pathname === "/dashboard/admin/subscriptions"
                          ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      }`}
                    >
                      <CreditCard className="h-5 w-5" />
                      {sidebarOpen && <span>Active Subscriptions</span>}
                    </Link>

                    <div className="flex flex-col">
                      <button
                        onClick={() => {
                          if (!sidebarOpen) setSidebarOpen(true);
                          setAdminOpen(!adminOpen);
                        }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all w-full ${
                          pathname.startsWith("/dashboard/admin/users") && !adminOpen
                            ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                            : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                        }`}
                      >
                        <Users className="h-5 w-5" />
                        {sidebarOpen && <span className="flex-1 text-left">User Management</span>}
                        {sidebarOpen && (
                          <ChevronDown
                            className={`h-4 w-4 transition-transform duration-200 ${adminOpen ? "rotate-180" : ""}`}
                          />
                        )}
                      </button>

                      {sidebarOpen && adminOpen && (
                        <div className="flex flex-col mt-1 ml-5 pl-4 border-l-2 border-[#E2E8F0] gap-1 relative">
                          <Link
                            href="/dashboard/admin/users"
                            className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                              pathname === "/dashboard/admin/users"
                                ? "bg-slate-100 text-slate-900 font-extrabold"
                                : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                            }`}
                          >
                            <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                            All Users
                          </Link>
                          <Link
                            href="/dashboard/admin/users/new"
                            className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                              pathname === "/dashboard/admin/users/new"
                                ? "bg-slate-100 text-slate-900 font-extrabold"
                                : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                            }`}
                          >
                            <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                            Add User
                          </Link>
                          <Link
                            href="/dashboard/admin#roles"
                            className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]`}
                          >
                            <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                            User Roles
                          </Link>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {sidebarOpen && (
                  <span className="px-3 pt-6 pb-2 text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest">
                    MANAGEMENT
                  </span>
                )}

                {/* Properties Accordion */}
                {isOwnerOrAdmin && (
                  <div className="flex flex-col">
                    <button
                      onClick={() => {
                        if (!sidebarOpen) setSidebarOpen(true);
                        if (isOwner && !isAllowed("properties")) {
                          router.push("/dashboard/properties");
                          return;
                        }
                        setPropertiesOpen(!propertiesOpen);
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all w-full ${
                        isActive("/dashboard/properties") && !propertiesOpen
                          ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      }`}
                    >
                      <Building className="h-5 w-5" />
                      {sidebarOpen && <span className="flex-1 text-left">Properties</span>}
                      {sidebarOpen && isOwner && !isAllowed("properties") && (
                        <Lock className="h-4 w-4 text-slate-400 stroke-[2] shrink-0 ml-auto select-none" />
                      )}
                      {sidebarOpen && (
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${propertiesOpen ? "rotate-180" : ""}`}
                        />
                      )}
                    </button>

                    {/* Sub-menu (Tree) */}
                    {sidebarOpen && propertiesOpen && isAllowed("properties") && (
                      <div className="flex flex-col mt-1 ml-5 pl-4 border-l-2 border-[#E2E8F0] gap-1 relative">
                        <Link
                          href="/dashboard/properties"
                          className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                            pathname === "/dashboard/properties"
                              ? "bg-slate-100 text-slate-900 font-extrabold"
                              : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                          All Properties
                        </Link>
                        <Link
                          href="/dashboard/properties/new"
                          className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                            pathname === "/dashboard/properties/new"
                              ? "bg-slate-100 text-slate-900 font-extrabold"
                              : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                          Add Property
                        </Link>
                        <Link
                          href="/dashboard/properties/available"
                          className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                            pathname === "/dashboard/properties/available"
                              ? "bg-slate-100 text-slate-900 font-extrabold"
                              : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                          Available Units
                        </Link>
                        <Link
                          href="/dashboard/properties/units"
                          className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                            pathname === "/dashboard/properties/units"
                              ? "bg-slate-100 text-slate-900 font-extrabold"
                              : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                          All Units
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* Tenants Accordion */}
                {isOwnerOrAdmin && (
                  <div className="flex flex-col">
                    <button
                      onClick={() => {
                        if (!sidebarOpen) setSidebarOpen(true);
                        if (isOwner && !isAllowed("tenants")) {
                          router.push("/dashboard/tenants");
                          return;
                        }
                        setTenantsOpen(!tenantsOpen);
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all w-full ${
                        isActive("/dashboard/tenants") && !tenantsOpen
                          ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      }`}
                    >
                      <Users className="h-5 w-5" />
                      {sidebarOpen && <span className="flex-1 text-left">Tenants</span>}
                      {sidebarOpen && isOwner && !isAllowed("tenants") && (
                        <Lock className="h-4 w-4 text-slate-400 stroke-[2] shrink-0 ml-auto select-none" />
                      )}
                      {sidebarOpen && (
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${tenantsOpen ? "rotate-180" : ""}`}
                        />
                      )}
                    </button>

                    {/* Sub-menu (Tree) */}
                    {sidebarOpen && tenantsOpen && isAllowed("tenants") && (
                      <div className="flex flex-col mt-1 ml-5 pl-4 border-l-2 border-[#E2E8F0] gap-1 relative">
                        <Link
                          href="/dashboard/tenants"
                          className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                            pathname === "/dashboard/tenants"
                              ? "bg-slate-100 text-slate-900 font-extrabold"
                              : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                          All Tenants
                        </Link>
                        <Link
                          href="/dashboard/tenants/new"
                          className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                            pathname === "/dashboard/tenants/new"
                              ? "bg-slate-100 text-slate-900 font-extrabold"
                              : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                          Add Tenant
                        </Link>
                        <Link
                          href="/dashboard/tenants/applications"
                          className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                            pathname === "/dashboard/tenants/applications"
                              ? "bg-slate-100 text-slate-900 font-extrabold"
                              : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                          Applications
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* Leases Accordion */}
                {isOwnerOrAdmin && (
                  <div className="flex flex-col">
                    <button
                      onClick={() => {
                        if (!sidebarOpen) setSidebarOpen(true);
                        if (isOwner && !isAllowed("leases")) {
                          router.push("/dashboard/leases");
                          return;
                        }
                        setLeasesOpen(!leasesOpen);
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all w-full ${
                        isActive("/dashboard/leases") && !leasesOpen
                          ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      }`}
                    >
                      <FileText className="h-5 w-5" />
                      {sidebarOpen && <span className="flex-1 text-left">Leases</span>}
                      {sidebarOpen && isOwner && !isAllowed("leases") && (
                        <Lock className="h-4 w-4 text-slate-400 stroke-[2] shrink-0 ml-auto select-none" />
                      )}
                      {sidebarOpen && (
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${leasesOpen ? "rotate-180" : ""}`}
                        />
                      )}
                    </button>

                    {/* Sub-menu */}
                    {sidebarOpen && leasesOpen && isAllowed("leases") && (
                      <div className="flex flex-col mt-1 ml-5 pl-4 border-l-2 border-[#E2E8F0] gap-1 relative">
                        <Link
                          href="/dashboard/leases"
                          className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                            pathname === "/dashboard/leases"
                              ? "bg-slate-100 text-slate-900 font-extrabold"
                              : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                          All Leases
                        </Link>
                        <Link
                          href="/dashboard/leases/new"
                          className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                            pathname === "/dashboard/leases/new"
                              ? "bg-slate-100 text-slate-900 font-extrabold"
                              : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                          Create Lease
                        </Link>
                        <Link
                          href="/dashboard/leases/active"
                          className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                            pathname === "/dashboard/leases/active"
                              ? "bg-slate-100 text-slate-900 font-extrabold"
                              : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                          Active Leases
                        </Link>
                        <Link
                          href="/dashboard/leases/expiring"
                          className={`relative flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                            pathname === "/dashboard/leases/expiring"
                              ? "bg-slate-100 text-slate-900 font-extrabold"
                              : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <div className="flex items-center">
                            <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                            Expiring Soon
                          </div>
                          {expiringLeasesCount > 0 && (
                            <span className="bg-[#DBEAFE] text-[#2563EB] text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                              {expiringLeasesCount}
                            </span>
                          )}
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* Tours Accordion */}
                {isOwnerOrAdmin && (
                  <div className="flex flex-col">
                    <button
                      onClick={() => {
                        if (!sidebarOpen) setSidebarOpen(true);
                        if (isOwner && !isAllowed("tours")) {
                          router.push("/dashboard/tours");
                          return;
                        }
                        setToursOpen(!toursOpen);
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all w-full ${
                        isActive("/dashboard/tours") && !toursOpen
                          ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      }`}
                    >
                      <Calendar className="h-5 w-5" />
                      {sidebarOpen && <span className="flex-1 text-left">Showing Tours</span>}
                      {sidebarOpen && isOwner && !isAllowed("tours") && (
                        <Lock className="h-4 w-4 text-slate-400 stroke-[2] shrink-0 ml-auto select-none" />
                      )}
                      {sidebarOpen && (
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${toursOpen ? "rotate-180" : ""}`}
                        />
                      )}
                    </button>

                    {/* Sub-menu */}
                    {sidebarOpen && toursOpen && isAllowed("tours") && (
                      <div className="flex flex-col mt-1 ml-5 pl-4 border-l-2 border-[#E2E8F0] gap-1 relative">
                        <Link
                          href="/dashboard/tours"
                          className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                            pathname === "/dashboard/tours"
                              ? "bg-slate-100 text-slate-900 font-extrabold"
                              : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                          Tour Schedules
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* Inspections Accordion */}
                {isOwnerOrAdmin && (
                  <div className="flex flex-col">
                    <button
                      onClick={() => {
                        if (!sidebarOpen) setSidebarOpen(true);
                        setInspectionsOpen(!inspectionsOpen);
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all w-full ${
                        (isActive("/dashboard/inspections") || isActive("/dashboard/team")) && !inspectionsOpen
                          ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      }`}
                    >
                      <ShieldCheck className="h-5 w-5" />
                      {sidebarOpen && <span className="flex-1 text-left">Inspections</span>}
                      {sidebarOpen && isOwner && (!isAllowed("inspections") || !isAllowed("vendors") || isFeatureLocked("inspector_management")) && (
                        <Lock className="h-4 w-4 text-slate-400 stroke-[2] shrink-0 ml-auto select-none" />
                      )}
                      {sidebarOpen && (
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${inspectionsOpen ? "rotate-180" : ""}`}
                        />
                      )}
                    </button>

                    {/* Sub-menu */}
                    {sidebarOpen && inspectionsOpen && (
                      <div className="flex flex-col mt-1 ml-5 pl-4 border-l-2 border-[#E2E8F0] gap-1 relative">
                        <Link
                          href="/dashboard/inspections"
                          className={`relative flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                            pathname === "/dashboard/inspections"
                              ? "bg-slate-100 text-slate-900 font-extrabold"
                              : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <div className="flex items-center">
                            <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                            Turnovers & Move-Outs
                          </div>
                          {isOwner && !isAllowed("inspections") && (
                            <Lock className="h-3.5 w-3.5 text-slate-400 stroke-[2] shrink-0 ml-auto select-none" />
                          )}
                        </Link>
                        <Link
                          href="/dashboard/team"
                          className={`relative flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                            pathname === "/dashboard/team"
                              ? "bg-slate-100 text-slate-900 font-extrabold"
                              : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <div className="flex items-center">
                            <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                            Inspectors & Vendors
                          </div>
                          {isOwner && (!isAllowed("vendors") || isFeatureLocked("inspector_management")) && (
                            <Lock className="h-3.5 w-3.5 text-slate-400 stroke-[2] shrink-0 ml-auto select-none" />
                          )}
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* Maintenance Accordion */}
                {(!isTenant) && (
                  <div className="flex flex-col">
                    <button
                      onClick={() => {
                        if (!sidebarOpen) setSidebarOpen(true);
                        if (isOwner && !isAllowed("maintenance")) {
                          router.push("/dashboard/maintenance");
                          return;
                        }
                        setMaintenanceOpen(!maintenanceOpen);
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all w-full ${
                        isActive("/dashboard/maintenance") && !maintenanceOpen
                          ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      }`}
                    >
                      <Wrench className="h-5 w-5" />
                      {sidebarOpen && <span className="flex-1 text-left">Maintenance</span>}
                      {sidebarOpen && isOwner && !isAllowed("maintenance") && (
                        <Lock className="h-4 w-4 text-slate-400 stroke-[2] shrink-0 ml-auto select-none" />
                      )}
                      {sidebarOpen && (
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${maintenanceOpen ? "rotate-180" : ""}`}
                        />
                      )}
                    </button>

                    {/* Sub-menu */}
                    {sidebarOpen && maintenanceOpen && isAllowed("maintenance") && (
                      <div className="flex flex-col mt-1 ml-5 pl-4 border-l-2 border-[#E2E8F0] gap-1 relative">
                        <Link
                          href="/dashboard/maintenance"
                          className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                            pathname === "/dashboard/maintenance"
                              ? "bg-slate-100 text-slate-900 font-extrabold"
                              : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                          All Requests
                        </Link>
                        <Link
                          href="/dashboard/maintenance/my-inspections"
                          className={`relative flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                            pathname === "/dashboard/maintenance/my-inspections"
                              ? "bg-slate-100 text-slate-900 font-extrabold"
                              : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <div className="flex items-center">
                            <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                            My Inspections
                          </div>
                        </Link>
                        <Link
                          href="/dashboard/maintenance/emergency"
                          className={`relative flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                            pathname === "/dashboard/maintenance/emergency"
                              ? "bg-rose-50 text-rose-700 font-extrabold border border-rose-200/80"
                              : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <div className="flex items-center">
                            <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                            Emergency
                          </div>
                        </Link>

                      </div>
                    )}
                  </div>
                )}



                {sidebarOpen && (
                  <span className="px-3 pt-6 pb-2 text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest">
                    ACTIVITY LOGS
                  </span>
                )}

                {/* Activity Accordion */}
                <div className="flex flex-col">
                  <button
                    onClick={() => {
                      if (!sidebarOpen) setSidebarOpen(true);
                      setActivityOpen(!activityOpen);
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all w-full ${
                      (pathname === "/dashboard/messages" || pathname === "/dashboard/calendar" || pathname === "/dashboard/notifications") && !activityOpen
                        ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                        : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                    }`}
                  >
                    <Bell className="h-5 w-5" />
                    {sidebarOpen && <span className="flex-1 text-left">Activity Logs</span>}
                    {sidebarOpen && (
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${activityOpen ? "rotate-180" : ""}`}
                      />
                    )}
                  </button>

                  {sidebarOpen && activityOpen && (
                    <div className="flex flex-col mt-1 ml-5 pl-4 border-l-2 border-[#E2E8F0] gap-1 relative">
                      <Link
                        href="/dashboard/messages"
                        className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                          pathname === "/dashboard/messages"
                            ? "bg-slate-100 text-slate-900 font-extrabold"
                            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                        <span className="flex-1">Inbox Messages</span>
                        {isOwner && (!isAllowed("messages") || isFeatureLocked("message_owner")) && (
                          <Lock className="h-4 w-4 text-slate-400 stroke-[2] shrink-0 ml-auto select-none" />
                        )}
                      </Link>
                      <Link
                        href="/dashboard/notifications"
                        className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                          pathname === "/dashboard/notifications"
                            ? "bg-slate-100 text-slate-900 font-extrabold"
                            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                        <span className="flex-1">System Notifications</span>
                      </Link>
                      <Link
                        href="/dashboard/calendar"
                        className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                          pathname === "/dashboard/calendar"
                            ? "bg-slate-100 text-slate-900 font-extrabold"
                            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                        <span className="flex-1">Calendar</span>
                        {isOwner && (!isAllowed("calendar") || isFeatureLocked("view_calendar")) && (
                          <Lock className="h-4 w-4 text-slate-400 stroke-[2] shrink-0 ml-auto select-none" />
                        )}
                      </Link>
                    </div>
                  )}
                </div>

                {sidebarOpen && (
                  <span className="px-3 pt-6 pb-2 text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest">
                    ACCOUNTING
                  </span>
                )}

                {isOwnerOrAdmin && (
                  <>
                    <Link
                      href="/dashboard/analytics"
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        isActive("/dashboard/analytics")
                          ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      }`}
                    >
                      <BarChart2 className="h-5 w-5" />
                      {sidebarOpen && <span className="flex-1">Portfolio Analytics</span>}
                      {sidebarOpen && isOwner && !isAllowed("analytics") && (
                        <Lock className="h-4 w-4 text-slate-400 stroke-[2] shrink-0 ml-auto select-none" />
                      )}
                    </Link>

                    <Link
                      href="/dashboard/accounting/overview"
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        isActive("/dashboard/accounting/overview")
                          ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      }`}
                    >
                      <TrendingUp className="h-5 w-5" />
                      {sidebarOpen && <span className="flex-1">Financial Overview</span>}
                      {sidebarOpen && isOwner && !isAllowed("accounting") && (
                        <Lock className="h-4 w-4 text-slate-400 stroke-[2] shrink-0 ml-auto select-none" />
                      )}
                    </Link>

                    <Link
                      href="/dashboard/accounting/wallet"
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        isActive("/dashboard/accounting/wallet")
                          ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      }`}
                    >
                      <DollarSign className="h-5 w-5" />
                      {sidebarOpen && <span className="flex-1">Wallet &amp; Payouts</span>}
                      {sidebarOpen && isOwner && !isAllowed("wallet") && (
                        <Lock className="h-4 w-4 text-slate-400 stroke-[2] shrink-0 ml-auto select-none" />
                      )}
                    </Link>
                  </>
                )}
                {isOwnerOrAdmin && (
                  <Link
                    href="/dashboard/accounting/transactions"
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      isActive("/dashboard/accounting/transactions")
                        ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                        : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                    }`}
                  >
                    <Wallet className="h-5 w-5" />
                    {sidebarOpen && <span className="flex-1">Transactions</span>}
                    {sidebarOpen && isOwner && !isAllowed("transactions") && (
                      <Lock className="h-4 w-4 text-slate-400 stroke-[2] shrink-0 ml-auto select-none" />
                    )}
                  </Link>
                )}

                <Link
                  href="/dashboard/accounting/invoices"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive("/dashboard/accounting/invoices")
                      ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  }`}
                >
                  <Receipt className="h-5 w-5" />
                  {sidebarOpen && <span className="flex-1">Invoices</span>}
                  {sidebarOpen && isOwner && !isAllowed("invoices") && (
                    <Lock className="h-4 w-4 text-slate-400 stroke-[2] shrink-0 ml-auto select-none" />
                  )}
                </Link>

                {sidebarOpen && (
                  <span className="px-3 pt-6 pb-2 text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest">
                    ACCOUNT SETTINGS
                  </span>
                )}
                
                <Link
                  href={isAdmin ? "/dashboard/admin/settings/profile" : "/dashboard/settings"}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    pathname === "/dashboard/settings" || pathname === "/dashboard/admin/settings/profile"
                      ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  }`}
                >
                  <Settings className="h-5 w-5" />
                  {sidebarOpen && <span>Profile Settings</span>}
                </Link>
                
                {isOwner && (
                  <Link
                    href="/dashboard/owner/billing"
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      pathname === "/dashboard/owner/billing"
                        ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                        : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                    }`}
                  >
                    <CreditCard className="h-5 w-5" />
                    {sidebarOpen && <span>Billing &amp; Subscription</span>}
                  </Link>
                )}

                {isAdmin && (
                  <>
                    <Link
                      href="/dashboard/admin/settings/pricing"
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        pathname === "/dashboard/admin/settings/pricing"
                          ? "bg-slate-100 text-slate-900 font-black border border-slate-200/80 shadow-2xs"
                          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      }`}
                    >
                      <Tag className="h-5 w-5" />
                      {sidebarOpen && <span>Pricing Tiers &amp; Plans</span>}
                    </Link>

                    <Link
                      href="/dashboard/admin/settings/financials"
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        pathname === "/dashboard/admin/settings/financials"
                          ? "bg-slate-100/90 text-slate-900 font-black border border-slate-200/80 shadow-2xs relative overflow-hidden before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1.5 before:bg-slate-900 before:rounded-r-full"
                          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      }`}
                    >
                      <ShieldCheck className="h-5 w-5" />
                      {sidebarOpen && <span>Financials &amp; Operations</span>}
                    </Link>
                  </>
                )}
              </>
            )}
          </nav>

          {/* User Profile & Logout at Bottom */}
          <div className="p-3.5 mt-auto border-t border-slate-200 bg-slate-50/60 font-sans">
            <div className={`flex items-center ${sidebarOpen ? "justify-between" : "justify-center"} gap-2`}>
              <div className="flex items-center gap-3 min-w-0">
                {(session?.user as any)?.avatar || (session?.user as any)?.image ? (
                  <img
                    src={(session?.user as any)?.avatar || (session?.user as any)?.image}
                    alt={session?.user?.name || "Profile"}
                    className="h-9 w-9 min-w-[36px] rounded-full object-cover shadow-2xs border border-slate-200"
                  />
                ) : (
                  <div className="h-9 w-9 min-w-[36px] rounded-full bg-slate-900 text-white flex items-center justify-center font-extrabold text-xs shadow-2xs">
                    {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
                {sidebarOpen && (
                  <div className="flex flex-col min-w-0 overflow-hidden">
                    <span className="font-extrabold text-xs text-slate-900 truncate">
                      {session?.user?.name || "User"}
                    </span>
                    <span className="text-[10px] text-slate-500 font-extrabold tracking-wider uppercase truncate">
                      {(session?.user as any)?.role || "Role"}
                    </span>
                  </div>
                )}
              </div>

              {sidebarOpen ? (
                <button
                  onClick={() => signOut({ callbackUrl: "/auth/login" })}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shrink-0 cursor-pointer border border-transparent hover:border-rose-100"
                  title="Sign Out of PropertyPro"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => signOut({ callbackUrl: "/auth/login" })}
                  className="mt-2 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Topbar */}
        <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-[#E5E5EA] flex items-center justify-between px-4 md:px-8 shrink-0 z-30 sticky top-0">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Drawer Trigger */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="p-2 text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F0F0F0] rounded-lg transition-colors md:hidden"
              title="Open Navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            {/* Desktop Sidebar Toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden md:flex p-2 text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F0F0F0] rounded-lg transition-colors"
              title="Toggle Sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            
            {/* Mobile Brand Label */}
            <div className="md:hidden flex items-center gap-2">
              <div className="bg-[#007AFF] text-white p-1.5 rounded-lg shadow-xs">
                <Building className="h-4 w-4" />
              </div>
              <span className="font-semibold text-base text-[#1D1D1F] tracking-tight">PropertyPro</span>
            </div>

            {/* Desktop Search bar */}
            <div className="hidden md:flex relative w-80 opacity-75" title="Search platform">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#AEAEB2]" />
              <input
                type="text"
                disabled
                placeholder="Search platform..."
                className="pl-9 pr-10 py-1.5 w-full bg-[#F0F0F0] border-0 rounded-lg text-xs text-[#1D1D1F] placeholder-[#C7C7CC] cursor-not-allowed shadow-none focus:bg-white transition-all"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-4 select-none items-center gap-0.5 rounded border border-[#E5E5EA] bg-white px-1.5 font-mono text-[9px] font-medium text-[#6E6E73]">
                ⌘K
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <MessageBadge />
            <NotificationDropdown />
            <Link
              href={isAdmin ? "/dashboard/admin/settings/profile" : "/dashboard/settings"}
              className="p-2 rounded-full text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F0F0F0] transition-colors hidden md:flex"
              title="Profile Settings"
            >
              <Settings className="h-5 w-5" />
            </Link>
            <div className="h-6 w-px bg-[#E5E5EA] hidden md:block" />
            <button 
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
              className="flex items-center gap-1.5 p-2 md:px-3 md:py-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors text-xs font-semibold"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4 text-slate-500" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-24 md:pb-10 bg-[#F5F5F7]">
          {children}
        </div>

        {/* Mobile iOS Bottom Tab Bar */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-xl border-t border-[#E5E5EA] z-40 flex items-center justify-around px-2 pb-safe md:hidden shadow-lg">
          {isTenant ? (
            <>
              <Link
                href="/dashboard"
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 ${
                  isTenantTabActive("overview") ? "text-[#007AFF]" : "text-[#AEAEB2]"
                }`}
              >
                <LayoutDashboard className="h-5 w-5" />
                <span className="text-[10px] font-medium">Home</span>
              </Link>
              <Link
                href="/dashboard/leases/my-leases"
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 ${
                  isTenantTabActive("my-leases") ? "text-[#007AFF]" : "text-[#AEAEB2]"
                }`}
              >
                <ShieldCheck className="h-5 w-5" />
                <span className="text-[10px] font-medium">Lease</span>
              </Link>
              <Link
                href="/dashboard/payments/pay-rent"
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 ${
                  isTenantTabActive("pay-rent") ? "text-[#007AFF]" : "text-[#AEAEB2]"
                }`}
              >
                <Wallet className="h-5 w-5" />
                <span className="text-[10px] font-medium">Pay Rent</span>
              </Link>
              <Link
                href="/dashboard/maintenance/my-requests"
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 ${
                  isTenantTabActive("my-requests") ? "text-[#007AFF]" : "text-[#AEAEB2]"
                }`}
              >
                <Wrench className="h-5 w-5" />
                <span className="text-[10px] font-medium">Requests</span>
              </Link>
              <button
                onClick={() => setMobileDrawerOpen(true)}
                className="flex flex-col items-center justify-center gap-0.5 py-1 px-3 text-[#AEAEB2]"
              >
                <Menu className="h-5 w-5" />
                <span className="text-[10px] font-medium">More</span>
              </button>
            </>
          ) : isInspector ? (
            <>
              <Link
                href="/dashboard/inspector"
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 ${
                  pathname === "/dashboard/inspector" ? "text-[#007AFF]" : "text-[#AEAEB2]"
                }`}
              >
                <LayoutDashboard className="h-5 w-5" />
                <span className="text-[10px] font-medium">Home</span>
              </Link>
              <Link
                href="/dashboard/inspector/active"
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 ${
                  isActive("/dashboard/inspector/active") ? "text-[#007AFF]" : "text-[#AEAEB2]"
                }`}
              >
                <Wrench className="h-5 w-5" />
                <span className="text-[10px] font-medium">Assigned</span>
              </Link>
              <Link
                href="/dashboard/inspector/inspections"
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 ${
                  isActive("/dashboard/inspector/inspections") ? "text-[#007AFF]" : "text-[#AEAEB2]"
                }`}
              >
                <ClipboardList className="h-5 w-5" />
                <span className="text-[10px] font-medium">Walkthroughs</span>
              </Link>
              <Link
                href="/dashboard/calendar"
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 ${
                  isActive("/dashboard/calendar") ? "text-[#007AFF]" : "text-[#AEAEB2]"
                }`}
              >
                <Calendar className="h-5 w-5" />
                <span className="text-[10px] font-medium">Calendar</span>
              </Link>
              <button
                onClick={() => setMobileDrawerOpen(true)}
                className="flex flex-col items-center justify-center gap-0.5 py-1 px-3 text-[#AEAEB2]"
              >
                <Menu className="h-5 w-5" />
                <span className="text-[10px] font-medium">More</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/dashboard"
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 ${
                  pathname === "/dashboard" ? "text-[#007AFF]" : "text-[#AEAEB2]"
                }`}
              >
                <LayoutDashboard className="h-5 w-5" />
                <span className="text-[10px] font-medium">Home</span>
              </Link>
              <Link
                href="/dashboard/properties"
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 ${
                  isActive("/dashboard/properties") ? "text-[#007AFF]" : "text-[#AEAEB2]"
                }`}
              >
                <Building className="h-5 w-5" />
                <span className="text-[10px] font-medium">Properties</span>
              </Link>
              <Link
                href="/dashboard/leases"
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 ${
                  isActive("/dashboard/leases") ? "text-[#007AFF]" : "text-[#AEAEB2]"
                }`}
              >
                <FileText className="h-5 w-5" />
                <span className="text-[10px] font-medium">Leases</span>
              </Link>
              <Link
                href={isOwner ? "/dashboard/accounting/wallet" : "/dashboard/admin/payouts"}
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 ${
                  isActive("/dashboard/accounting/wallet") || isActive("/dashboard/admin/payouts") ? "text-[#007AFF]" : "text-[#AEAEB2]"
                }`}
              >
                <Wallet className="h-5 w-5" />
                <span className="text-[10px] font-medium">{isOwner ? "Wallet" : "Payouts"}</span>
              </Link>
              <button
                onClick={() => setMobileDrawerOpen(true)}
                className="flex flex-col items-center justify-center gap-0.5 py-1 px-3 text-[#AEAEB2]"
              >
                <Menu className="h-5 w-5" />
                <span className="text-[10px] font-medium">More</span>
              </button>
            </>
          )}
        </nav>
      </main>
    </div>
  );
}
