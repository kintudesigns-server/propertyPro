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
} from "lucide-react";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { MessageBadge } from "@/components/notifications/MessageBadge";
import { toast } from "sonner";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-[#F0F4F8] flex flex-col items-center justify-center text-[#111111] gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#3B82F6]"></div>
        <p className="text-slate-400 font-extrabold text-sm tracking-wider uppercase">Loading...</p>
      </div>
    }>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </React.Suspense>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams ? searchParams.get("tab") || "overview" : "overview";
  const { data: session, status } = useSession();
  const role = (session?.user as any)?.role;
  const isOwnerOrAdmin = role === "OWNER" || role === "SUPERADMIN";
  const isInspector = role === "INSPECTOR";
  const isAdmin = role === "SUPERADMIN";
  const isOwner = role === "OWNER";
  const isTenant = role === "TENANT";
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(true);
  const [propertiesOpen, setPropertiesOpen] = useState(true);
  const [tenantsOpen, setTenantsOpen] = useState(true);
  const [teamOpen, setTeamOpen] = useState(false);
  const [leasesOpen, setLeasesOpen] = useState(true);
  const [toursOpen, setToursOpen] = useState(true);
  const [inspectionsOpen, setInspectionsOpen] = useState(true);
  const [maintenanceOpen, setMaintenanceOpen] = useState(true);
  const [financialsOpen, setFinancialsOpen] = useState(true);
  const [activityOpen, setActivityOpen] = useState(true);
  const [expiringLeasesCount, setExpiringLeasesCount] = useState(0);

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
    return pathname === "/dashboard/tenant" && currentTab === tab;
  };

  React.useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }

    if (isInspector && (pathname === "/dashboard" || pathname === "/dashboard/")) {
      router.push("/dashboard/inspector");
    }
  }, [status, isInspector, pathname, router]);

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
      <div className="min-h-screen bg-[#F0F4F8] flex flex-col items-center justify-center text-[#111111] gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#3B82F6]"></div>
        <p className="text-slate-400 font-extrabold text-sm tracking-wider uppercase">Loading...</p>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-[#F0F4F8] font-sans flex text-[#111111]">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0 hidden md:flex md:w-20"
        } flex-col justify-between bg-white border-r border-[#E2E8F0] shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300 z-30 fixed md:relative h-screen`}
      >
        <div className="flex flex-col gap-6 w-full h-full overflow-y-auto">
          {/* Logo Section */}
          <div className="flex items-center gap-3 px-6 py-6 sticky top-0 bg-white z-10">
            <div className="bg-[#3B82F6] text-white p-2 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
              <Building className="h-5 w-5" />
            </div>
            {sidebarOpen && (
              <span className="font-extrabold text-lg tracking-tight whitespace-nowrap">PropertyPro</span>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 px-4 pb-6">
            {isTenant ? (
              <>
                <Link
                  href="/dashboard"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isTenantTabActive("overview")
                      ? "bg-[#EFF6FF] text-[#3B82F6]"
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
                        ? "bg-[#EFF6FF] text-[#3B82F6]"
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
                            ? "bg-[#EFF6FF] text-[#3B82F6]"
                            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                        My Leases
                      </Link>
                      <Link
                        href="/dashboard/leases/documents"
                        className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                          isTenantTabActive("documents")
                            ? "bg-[#EFF6FF] text-[#3B82F6]"
                            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                        Documents
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
                        ? "bg-[#EFF6FF] text-[#3B82F6]"
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
                            ? "bg-[#EFF6FF] text-[#3B82F6]"
                            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                        Submit Request
                      </Link>
                      <Link
                        href="/dashboard/maintenance/my-requests"
                        className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                          isTenantTabActive("my-requests")
                            ? "bg-[#EFF6FF] text-[#3B82F6]"
                            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                        My Requests
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
                        ? "bg-[#EFF6FF] text-[#3B82F6]"
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
                            ? "bg-[#EFF6FF] text-[#3B82F6]"
                            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                        Pay Rent
                      </Link>
                      <Link
                        href="/dashboard/payments/add-card"
                        className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                          isTenantTabActive("add-card")
                            ? "bg-[#EFF6FF] text-[#3B82F6]"
                            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                        Add Card
                      </Link>
                      <Link
                        href="/dashboard/accounting/transactions"
                        className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                          isTenantTabActive("transactions")
                            ? "bg-[#EFF6FF] text-[#3B82F6]"
                            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                        Transactions
                      </Link>
                      <Link
                        href="/dashboard/accounting/invoices"
                        className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                          isTenantTabActive("invoices")
                            ? "bg-[#EFF6FF] text-[#3B82F6]"
                            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                        Invoices
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
                      ? "bg-[#EFF6FF] text-[#3B82F6]"
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  }`}
                >
                  <ClipboardList className="h-5 w-5" />
                  {sidebarOpen && <span>My Applications</span>}
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
                        ? "bg-[#EFF6FF] text-[#3B82F6]"
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
                            ? "bg-[#EFF6FF] text-[#3B82F6]"
                            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                        Inbox Messages
                      </Link>
                      <Link
                        href="/dashboard/notifications"
                        className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                          pathname === "/dashboard/notifications"
                            ? "bg-[#EFF6FF] text-[#3B82F6]"
                            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                        System Notifications
                      </Link>
                      <Link
                        href="/dashboard/calendar"
                        className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                          pathname === "/dashboard/calendar"
                            ? "bg-[#EFF6FF] text-[#3B82F6]"
                            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                        Calendar
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
                  href="/dashboard/tenant?tab=settings"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isTenantTabActive("settings")
                      ? "bg-[#EFF6FF] text-[#3B82F6]"
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
                      ? "bg-[#EFF6FF] text-[#3B82F6]"
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  }`}
                >
                  <LayoutDashboard className="h-5 w-5" />
                  {sidebarOpen && <span>Dashboard Overview</span>}
                </Link>

                {sidebarOpen && (
                  <span className="px-3 pt-6 pb-2 text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest">
                    DIAGNOSTICS & REPAIRS
                  </span>
                )}

                <Link
                  href="/dashboard/inspector/active"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive("/dashboard/inspector/active")
                      ? "bg-[#EFF6FF] text-[#3B82F6]"
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  }`}
                >
                  <Wrench className="h-5 w-5" />
                  {sidebarOpen && <span>Assigned Repairs</span>}
                </Link>

                <Link
                  href="/dashboard/inspector/history"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive("/dashboard/inspector/history")
                      ? "bg-[#EFF6FF] text-[#3B82F6]"
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  }`}
                >
                  <FileText className="h-5 w-5" />
                  {sidebarOpen && <span>Closed Diagnostics</span>}
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
                      ? "bg-[#EEF2FF] text-[#4F46E5]"
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  }`}
                >
                  <ClipboardList className="h-5 w-5" />
                  {sidebarOpen && <span>Move-Out Walkthroughs</span>}
                </Link>

                {sidebarOpen && (
                  <span className="px-3 pt-6 pb-2 text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest">
                    SYSTEM
                  </span>
                )}

                <Link
                  href="/dashboard/calendar"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive("/dashboard/calendar")
                      ? "bg-[#EFF6FF] text-[#3B82F6]"
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  }`}
                >
                  <Calendar className="h-5 w-5" />
                  {sidebarOpen && <span>Calendar</span>}
                </Link>

                <Link
                  href="/dashboard/notifications"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive("/dashboard/notifications")
                      ? "bg-[#EFF6FF] text-[#3B82F6]"
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
                      ? "bg-[#EFF6FF] text-[#3B82F6]"
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
                          ? "bg-[#FEF2F2] text-[#EF4444]"
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
                          ? "bg-[#FEF2F2] text-[#EF4444]"
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
                          ? "bg-[#FEF2F2] text-[#EF4444]"
                          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      }`}
                    >
                      <DollarSign className="h-5 w-5 text-green-600" />
                      {sidebarOpen && <span className="text-green-700">Platform Profit</span>}
                    </Link>
                    <Link
                      href="/dashboard/admin/payouts"
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        pathname === "/dashboard/admin/payouts"
                          ? "bg-[#FEF2F2] text-[#EF4444]"
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
                          ? "bg-[#FEF2F2] text-[#EF4444]"
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
                          ? "bg-[#FEF2F2] text-[#EF4444]"
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
                          ? "bg-[#FEF2F2] text-[#EF4444]"
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
                          ? "bg-[#FEF2F2] text-[#EF4444]"
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
                            ? "bg-[#FEF2F2] text-[#EF4444]"
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
                                ? "bg-[#FEF2F2] text-[#EF4444]"
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
                                ? "bg-[#FEF2F2] text-[#EF4444]"
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
                        setPropertiesOpen(!propertiesOpen);
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all w-full ${
                        isActive("/dashboard/properties") && !propertiesOpen
                          ? "bg-[#EFF6FF] text-[#3B82F6]"
                          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      }`}
                    >
                      <Building className="h-5 w-5" />
                      {sidebarOpen && <span className="flex-1 text-left">Properties</span>}
                      {sidebarOpen && (
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${propertiesOpen ? "rotate-180" : ""}`}
                        />
                      )}
                    </button>

                    {/* Sub-menu (Tree) */}
                    {sidebarOpen && propertiesOpen && (
                      <div className="flex flex-col mt-1 ml-5 pl-4 border-l-2 border-[#E2E8F0] gap-1 relative">
                        <Link
                          href="/dashboard/properties"
                          className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                            pathname === "/dashboard/properties"
                              ? "bg-[#EFF6FF] text-[#3B82F6]"
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
                              ? "bg-[#EFF6FF] text-[#3B82F6]"
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
                              ? "bg-[#EFF6FF] text-[#3B82F6]"
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
                              ? "bg-[#EFF6FF] text-[#3B82F6]"
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
                        setTenantsOpen(!tenantsOpen);
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all w-full ${
                        isActive("/dashboard/tenants") && !tenantsOpen
                          ? "bg-[#EFF6FF] text-[#3B82F6]"
                          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      }`}
                    >
                      <Users className="h-5 w-5" />
                      {sidebarOpen && <span className="flex-1 text-left">Tenants</span>}
                      {sidebarOpen && (
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${tenantsOpen ? "rotate-180" : ""}`}
                        />
                      )}
                    </button>

                    {/* Sub-menu (Tree) */}
                    {sidebarOpen && tenantsOpen && (
                      <div className="flex flex-col mt-1 ml-5 pl-4 border-l-2 border-[#E2E8F0] gap-1 relative">
                        <Link
                          href="/dashboard/tenants"
                          className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                            pathname === "/dashboard/tenants"
                              ? "bg-[#EFF6FF] text-[#3B82F6]"
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
                              ? "bg-[#EFF6FF] text-[#3B82F6]"
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
                              ? "bg-[#EFF6FF] text-[#3B82F6]"
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
                        setLeasesOpen(!leasesOpen);
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all w-full ${
                        isActive("/dashboard/leases") && !leasesOpen
                          ? "bg-[#EFF6FF] text-[#3B82F6]"
                          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      }`}
                    >
                      <FileText className="h-5 w-5" />
                      {sidebarOpen && <span className="flex-1 text-left">Leases</span>}
                      {sidebarOpen && (
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${leasesOpen ? "rotate-180" : ""}`}
                        />
                      )}
                    </button>

                    {/* Sub-menu */}
                    {sidebarOpen && leasesOpen && (
                      <div className="flex flex-col mt-1 ml-5 pl-4 border-l-2 border-[#E2E8F0] gap-1 relative">
                        <Link
                          href="/dashboard/leases"
                          className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                            pathname === "/dashboard/leases"
                              ? "bg-[#EFF6FF] text-[#3B82F6]"
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
                              ? "bg-[#EFF6FF] text-[#3B82F6]"
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
                              ? "bg-[#EFF6FF] text-[#3B82F6]"
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
                              ? "bg-[#EFF6FF] text-[#3B82F6]"
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
                        setToursOpen(!toursOpen);
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all w-full ${
                        isActive("/dashboard/tours") && !toursOpen
                          ? "bg-[#EFF6FF] text-[#3B82F6]"
                          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      }`}
                    >
                      <Calendar className="h-5 w-5" />
                      {sidebarOpen && <span className="flex-1 text-left">Showing Tours</span>}
                      {sidebarOpen && (
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${toursOpen ? "rotate-180" : ""}`}
                        />
                      )}
                    </button>

                    {/* Sub-menu */}
                    {sidebarOpen && toursOpen && (
                      <div className="flex flex-col mt-1 ml-5 pl-4 border-l-2 border-[#E2E8F0] gap-1 relative">
                        <Link
                          href="/dashboard/tours"
                          className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                            pathname === "/dashboard/tours"
                              ? "bg-[#EFF6FF] text-[#3B82F6]"
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
                          ? "bg-[#EFF6FF] text-[#3B82F6]"
                          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      }`}
                    >
                      <ShieldCheck className="h-5 w-5" />
                      {sidebarOpen && <span className="flex-1 text-left">Inspections</span>}
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
                          className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                            pathname === "/dashboard/inspections"
                              ? "bg-[#EFF6FF] text-[#3B82F6]"
                              : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                          Turnovers & Move-Outs
                        </Link>
                        <Link
                          href="/dashboard/team"
                          className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                            pathname === "/dashboard/team"
                              ? "bg-[#EFF6FF] text-[#3B82F6]"
                              : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                          Inspectors & Vendors
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
                        setMaintenanceOpen(!maintenanceOpen);
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all w-full ${
                        isActive("/dashboard/maintenance") && !maintenanceOpen
                          ? "bg-[#EFF6FF] text-[#3B82F6]"
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

                    {/* Sub-menu */}
                    {sidebarOpen && maintenanceOpen && (
                      <div className="flex flex-col mt-1 ml-5 pl-4 border-l-2 border-[#E2E8F0] gap-1 relative">
                        <Link
                          href="/dashboard/maintenance"
                          className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                            pathname === "/dashboard/maintenance"
                              ? "bg-[#EFF6FF] text-[#3B82F6]"
                              : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                          All Requests
                        </Link>
                        <Link
                          href="/dashboard/maintenance/emergency"
                          className={`relative flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                            pathname === "/dashboard/maintenance/emergency"
                              ? "bg-[#FEF2F2] text-[#EF4444]"
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
                        ? "bg-[#EFF6FF] text-[#3B82F6]"
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
                            ? "bg-[#EFF6FF] text-[#3B82F6]"
                            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                        Inbox Messages
                      </Link>
                      <Link
                        href="/dashboard/notifications"
                        className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                          pathname === "/dashboard/notifications"
                            ? "bg-[#EFF6FF] text-[#3B82F6]"
                            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                        System Notifications
                      </Link>
                      <Link
                        href="/dashboard/calendar"
                        className={`relative flex items-center px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                          pathname === "/dashboard/calendar"
                            ? "bg-[#EFF6FF] text-[#3B82F6]"
                            : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="absolute -left-[18px] top-1/2 w-4 h-[2px] bg-[#E2E8F0] rounded-r" />
                        Calendar
                      </Link>
                    </div>
                  )}
                </div>

                {sidebarOpen && (
                  <span className="px-3 pt-6 pb-2 text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest">
                    ACCOUNTING
                  </span>
                )}

                {isOwner && (
                  <>
                    <Link
                      href="/dashboard/accounting/overview"
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        isActive("/dashboard/accounting/overview")
                          ? "bg-[#EFF6FF] text-[#3B82F6]"
                          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      }`}
                    >
                      <TrendingUp className="h-5 w-5" />
                      {sidebarOpen && <span>Financial Overview</span>}
                    </Link>

                    <Link
                      href="/dashboard/accounting/wallet"
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        isActive("/dashboard/accounting/wallet")
                          ? "bg-[#EFF6FF] text-[#3B82F6]"
                          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      }`}
                    >
                      <DollarSign className="h-5 w-5" />
                      {sidebarOpen && <span>Wallet & Payouts</span>}
                    </Link>
                  </>
                )}
                {isOwnerOrAdmin && (
                  <Link
                    href="/dashboard/accounting/transactions"
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      isActive("/dashboard/accounting/transactions")
                        ? "bg-[#EFF6FF] text-[#3B82F6]"
                        : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                    }`}
                  >
                    <Wallet className="h-5 w-5" />
                    {sidebarOpen && <span>Transactions</span>}
                  </Link>
                )}

                <Link
                  href="/dashboard/accounting/invoices"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive("/dashboard/accounting/invoices")
                      ? "bg-[#EFF6FF] text-[#3B82F6]"
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  }`}
                >
                  <Receipt className="h-5 w-5" />
                  {sidebarOpen && <span>Invoices</span>}
                </Link>

                {sidebarOpen && (
                  <span className="px-3 pt-6 pb-2 text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest">
                    ACCOUNT SETTINGS
                  </span>
                )}
                
                <Link
                  href={isOwner ? "/dashboard/owner?tab=settings" : "/dashboard/admin/settings/pricing"}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    (pathname === "/dashboard/owner" && currentTab === "settings") || pathname.startsWith("/dashboard/admin/settings")
                      ? "bg-[#EFF6FF] text-[#3B82F6]"
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  }`}
                >
                  <Settings className="h-5 w-5" />
                  {sidebarOpen && <span>Profile Settings</span>}
                </Link>
                
                {isOwner && (
                  <Link
                    href="/dashboard/owner?tab=subscription"
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      pathname === "/dashboard/owner" && currentTab === "subscription"
                        ? "bg-[#EFF6FF] text-[#3B82F6]"
                        : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                    }`}
                  >
                    <CreditCard className="h-5 w-5" />
                    {sidebarOpen && <span>Subscription Plan</span>}
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* User Profile at Bottom */}
          <div className="p-4 mt-auto border-t border-[#E2E8F0] bg-[#F8FAFC]/50">
            <div className={`flex items-center ${sidebarOpen ? "justify-between" : "justify-center"} gap-3`}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 min-w-[40px] rounded-full bg-slate-800 text-white flex items-center justify-center font-extrabold text-sm shadow-sm">
                  {session?.user?.name ? session.user.name.charAt(0) : "U"}
                </div>
                {sidebarOpen && (
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-extrabold text-xs text-[#0F172A] truncate">
                      {session?.user?.name || "User"}
                    </span>
                    <span className="text-[10px] text-[#64748B] font-extrabold tracking-wider truncate">
                      {(session?.user as any)?.role || "Role"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-20 bg-[#F0F4F8] flex items-center justify-between px-6 md:px-10 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 bg-white rounded-xl text-[#64748B] hover:text-[#0F172A] shadow-sm border border-[#E2E8F0] transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden md:flex relative w-80 opacity-60 cursor-not-allowed" title="Search coming soon">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
              <input
                type="text"
                disabled
                placeholder="Search coming soon..."
                className="pl-10 pr-12 py-2.5 w-full bg-white border border-[#E2E8F0] rounded-xl text-sm text-[#94A3B8] placeholder-[#94A3B8] cursor-not-allowed shadow-sm transition-all"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 font-mono text-[9px] font-medium text-[#64748B]">
                <span className="text-[10px]">⌘</span>K
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <MessageBadge />
            <NotificationDropdown />
            <Link
              href={isOwner ? "/dashboard/owner?tab=settings" : isTenant ? "/dashboard/tenant?tab=settings" : "/dashboard/admin/settings/pricing"}
              className="p-2.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm text-[#64748B] hover:text-[#0F172A] transition-colors hidden md:block"
              title="Profile Settings"
            >
              <Settings className="h-5 w-5" />
            </Link>
            <div className="h-8 w-px bg-[#E2E8F0] hidden md:block" />
            <button 
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
              className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm text-red-500 hover:bg-red-50 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-10">
          {children}
        </div>
      </main>
    </div>
  );
}
