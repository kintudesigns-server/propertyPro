"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Bell, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  FileText, 
  ChevronLeft, 
  ChevronRight,
  MoreVertical,
  CheckCheck,
  ShieldAlert,
  Inbox,
  Filter,
  Wrench,
  DollarSign
} from "lucide-react";
import { toast } from "sonner";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const pageParam = parseInt(searchParams?.get("page") || "1");
  const [page, setPage] = useState(pageParam);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [highPriorityCount, setHighPriorityCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [tabFilter, setTabFilter] = useState<"ALL" | "UNREAD" | "HIGH">("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "PAYMENT" | "MAINTENANCE" | "LEASE" | "SYSTEM">("ALL");

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      query.append("page", page.toString());
      query.append("limit", limit.toString());
      if (search) query.append("search", search);
      if (tabFilter === "UNREAD") query.append("unreadOnly", "true");
      if (tabFilter === "HIGH") query.append("priority", "HIGH");
      if (typeFilter !== "ALL") query.append("type", typeFilter);

      const res = await fetch(`/api/notifications?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setTotal(data.total || 0);
        setUnreadCount(data.unreadCount || 0);
        setHighPriorityCount(data.highPriorityCount || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error("Error fetching notifications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    router.replace(`/dashboard/notifications?page=${page}`, { scroll: false });
  }, [page, search, tabFilter, typeFilter]);

  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markAllAsRead" }),
      });
      if (res.ok) {
        toast.success("All notifications marked as read");
        fetchNotifications();
      }
    } catch (err) {
      toast.error("Failed to mark notifications as read");
    }
  };

  const getIconForType = (type: string, priority: string) => {
    if (priority === "HIGH") {
      return (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 shrink-0 shadow-2xs">
          <AlertCircle className="h-4 w-4" />
        </div>
      );
    }
    switch (type) {
      case "PAYMENT":
        return (
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 shrink-0 shadow-2xs">
            <DollarSign className="h-4 w-4" />
          </div>
        );
      case "MAINTENANCE":
        return (
          <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 shrink-0 shadow-2xs">
            <Wrench className="h-4 w-4" />
          </div>
        );
      case "LEASE":
        return (
          <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 shrink-0 shadow-2xs">
            <FileText className="h-4 w-4" />
          </div>
        );
      default:
        return (
          <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 shrink-0 shadow-2xs">
            <Bell className="h-4 w-4" />
          </div>
        );
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
            High
          </span>
        );
      case "MEDIUM":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
            Medium
          </span>
        );
      case "LOW":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
            Low
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric", 
      year: "numeric", 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto pt-4 space-y-6 pb-20 px-2 sm:px-6 font-sans">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">
            System Alerts &amp; Notifications
          </h1>
          <p className="text-xs font-normal text-[#6E6E73] mt-1">
            Review real-time lease updates, payment receipts, and maintenance logs.
          </p>
        </div>

        <button 
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium shadow-xs transition-all disabled:opacity-40 shrink-0 cursor-pointer h-9"
        >
          <CheckCheck className="h-4 w-4" />
          <span>Mark All as Read</span>
        </button>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-normal text-[#6E6E73]">Total Alerts</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200/60">
              <Bell className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-[#1D1D1F] tracking-tight mt-2">{total}</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-normal text-[#6E6E73]">Unread</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200/60">
              <Info className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-[#1D1D1F] tracking-tight mt-2">{unreadCount}</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-normal text-[#6E6E73]">High Priority</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/60">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-rose-600 tracking-tight mt-2">{highPriorityCount}</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-normal text-[#6E6E73]">Read Alerts</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-[#1D1D1F] tracking-tight mt-2">{Math.max(0, total - unreadCount)}</div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row gap-3 justify-between items-center bg-slate-50/50">
          <div className="flex gap-1.5 p-1 bg-slate-100/80 rounded-xl w-fit border border-slate-200/30">
            <button 
              onClick={() => { setTabFilter("ALL"); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                tabFilter === "ALL" 
                  ? "bg-white text-[#1D1D1F] shadow-2xs" 
                  : "text-[#6E6E73] hover:text-[#1D1D1F]"
              }`}
            >
              All
            </button>
            <button 
              onClick={() => { setTabFilter("UNREAD"); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                tabFilter === "UNREAD" 
                  ? "bg-white text-[#1D1D1F] shadow-2xs" 
                  : "text-[#6E6E73] hover:text-[#1D1D1F]"
              }`}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </button>
            <button 
              onClick={() => { setTabFilter("HIGH"); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                tabFilter === "HIGH" 
                  ? "bg-white text-[#1D1D1F] shadow-2xs" 
                  : "text-[#6E6E73] hover:text-[#1D1D1F]"
              }`}
            >
              High Priority
            </button>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6E6E73]" />
              <input
                type="text"
                placeholder="Search alerts..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 pr-4 h-9 w-full bg-white border border-slate-200 rounded-xl text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-slate-400 shadow-2xs"
              />
            </div>
            <select 
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value as any); setPage(1); }}
              className="bg-white border border-slate-200 rounded-xl text-xs font-normal text-[#1D1D1F] px-3.5 h-9 outline-none shadow-2xs cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="PAYMENT">Payments</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="LEASE">Leases</option>
              <option value="SYSTEM">System</option>
            </select>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto min-h-[350px]">
          {loading ? (
            <div className="flex justify-center items-center py-24">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-24 text-[#6E6E73] space-y-3">
              <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200">
                <Inbox className="h-8 w-8 text-[#6E6E73]" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-[#1D1D1F] text-xs">No notifications found</p>
                <p className="text-xs text-[#6E6E73] font-normal mt-0.5">Try clearing filters or search criteria</p>
              </div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[#6E6E73] font-normal text-xs">
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Notification</th>
                  <th className="px-6 py-3">Priority</th>
                  <th className="px-6 py-3">Received</th>
                  <th className="px-6 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {notifications.map((notif) => (
                  <tr 
                    key={notif.id} 
                    onClick={() => router.push(`/dashboard/notifications/${notif.id}`)}
                    className={`hover:bg-slate-50/50 transition-colors cursor-pointer group ${!notif.isRead ? "bg-slate-50/30" : ""}`}
                  >
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      {!notif.isRead ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-normal text-[#1D1D1F]">
                          <span className="h-2 w-2 bg-slate-900 rounded-full"></span>
                          <span>Unread</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-normal text-[#6E6E73]">
                          <CheckCheck className="h-3.5 w-3.5 text-[#6E6E73]" />
                          <span>Read</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-start gap-3">
                        {getIconForType(notif.type, notif.priority)}
                        <div className="space-y-0.5">
                          <p className="font-semibold text-xs text-[#1D1D1F] group-hover:text-slate-600 transition-colors line-clamp-1">
                            {notif.title}
                          </p>
                          <p className="text-xs text-[#6E6E73] font-normal line-clamp-1">{notif.message}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      {getPriorityBadge(notif.priority)}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-xs font-normal text-[#6E6E73]">
                      {formatDate(notif.createdAt)}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-right">
                      <button className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-white transition-colors opacity-0 group-hover:opacity-100 cursor-pointer">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
          <span className="text-xs font-semibold text-slate-500">
            Showing <span className="font-semibold text-slate-900">{(page - 1) * limit + 1}</span> to <span className="font-semibold text-slate-900">{Math.min(page * limit, total)}</span> of <span className="font-semibold text-slate-900">{total}</span> notifications
          </span>
          <div className="flex items-center gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-extrabold text-slate-800 px-2">Page {page} of {totalPages}</span>
            <button 
              disabled={page === totalPages || totalPages === 0}
              onClick={() => setPage(page + 1)}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

