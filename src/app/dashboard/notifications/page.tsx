"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Bell, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  FileText, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  MoreVertical,
  CheckCheck
} from "lucide-react";

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
        setNotifications(data.notifications);
        setTotal(data.total);
        setUnreadCount(data.unreadCount);
        setHighPriorityCount(data.highPriorityCount);
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
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markAllAsRead" }),
      });
      fetchNotifications();
    } catch (err) {
      console.error("Error marking all as read", err);
    }
  };

  const getIconForType = (type: string, priority: string) => {
    if (priority === "HIGH") return <AlertCircle className="h-5 w-5 text-red-500" />;
    switch (type) {
      case "PAYMENT": return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "MAINTENANCE": return <Info className="h-5 w-5 text-blue-500" />;
      case "LEASE": return <FileText className="h-5 w-5 text-purple-500" />;
      default: return <Bell className="h-5 w-5 text-slate-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "HIGH": return <span className="px-2 py-1 text-[10px] font-bold rounded bg-red-50 text-red-600">HIGH</span>;
      case "MEDIUM": return <span className="px-2 py-1 text-[10px] font-bold rounded bg-yellow-50 text-yellow-600">MEDIUM</span>;
      case "LOW": return <span className="px-2 py-1 text-[10px] font-bold rounded bg-green-50 text-green-600">LOW</span>;
      default: return null;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">Notifications</h1>
          <p className="text-sm text-[#64748B] font-medium mt-1">Review your system alerts and activity logs.</p>
        </div>
        <button 
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-bold text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50 shadow-sm transition-colors disabled:opacity-50"
        >
          <CheckCheck className="h-4 w-4" />
          Mark all as read
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-[#64748B]">
            <Bell className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Total</span>
          </div>
          <div className="text-2xl font-extrabold text-[#0F172A]">{total}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-[#3B82F6]">
            <Info className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Unread</span>
          </div>
          <div className="text-2xl font-extrabold text-[#0F172A]">{unreadCount}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-red-500">
            <AlertCircle className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">High Priority</span>
          </div>
          <div className="text-2xl font-extrabold text-[#0F172A]">{highPriorityCount}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-emerald-500">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Actionable</span>
          </div>
          <div className="text-2xl font-extrabold text-[#0F172A]">{Math.floor(total * 0.4)}</div>
        </div>
      </div>

      {/* Filters and List */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col overflow-hidden">
        {/* Controls */}
        <div className="p-4 border-b border-[#E2E8F0] flex flex-col md:flex-row gap-4 justify-between items-center bg-[#F8FAFC]">
          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={() => { setTabFilter("ALL"); setPage(1); }}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all border ${tabFilter === "ALL" ? "bg-[#3B82F6] text-white border-[#3B82F6]" : "bg-white text-[#64748B] border-[#E2E8F0] hover:bg-slate-50"}`}
            >
              All
            </button>
            <button 
              onClick={() => { setTabFilter("UNREAD"); setPage(1); }}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all border ${tabFilter === "UNREAD" ? "bg-[#3B82F6] text-white border-[#3B82F6]" : "bg-white text-[#64748B] border-[#E2E8F0] hover:bg-slate-50"}`}
            >
              Unread
            </button>
            <button 
              onClick={() => { setTabFilter("HIGH"); setPage(1); }}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all border ${tabFilter === "HIGH" ? "bg-[#3B82F6] text-white border-[#3B82F6]" : "bg-white text-[#64748B] border-[#E2E8F0] hover:bg-slate-50"}`}
            >
              High Priority
            </button>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10 pr-4 py-2 w-full bg-white border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
            <select 
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value as any); setPage(1); }}
              className="bg-white border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] px-3 py-2 focus:outline-none focus:border-[#3B82F6]"
            >
              <option value="ALL">All Categories</option>
              <option value="PAYMENT">Payments</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="LEASE">Leases</option>
              <option value="SYSTEM">System</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px]">
          {loading ? (
            <div className="flex justify-center items-center h-full py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6]"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-20 text-[#64748B]">
              <Bell className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-semibold text-sm">No notifications found</p>
              <p className="text-xs mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  <th className="px-6 py-4 text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider">Notification</th>
                  <th className="px-6 py-4 text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-4 text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider">Received</th>
                  <th className="px-6 py-4 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((notif) => (
                  <tr 
                    key={notif.id} 
                    onClick={() => router.push(`/dashboard/notifications/${notif.id}`)}
                    className={`border-b border-slate-50 hover:bg-[#F8FAFC] transition-colors cursor-pointer group ${!notif.isRead ? "bg-slate-50/50" : ""}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {notif.isRead ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                          <CheckCheck className="h-4 w-4" /> Read
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-blue-600">
                          <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div> Unread
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-2.5 rounded-xl shrink-0 ${!notif.isRead ? "bg-white shadow-sm border border-slate-200" : "bg-slate-100"}`}>
                          {getIconForType(notif.type, notif.priority)}
                        </div>
                        <div>
                          <p className={`text-sm ${!notif.isRead ? "font-bold text-[#0F172A]" : "font-semibold text-slate-700"} group-hover:text-[#3B82F6] transition-colors line-clamp-1`}>
                            {notif.title}
                          </p>
                          <p className="text-xs text-[#64748B] mt-1 line-clamp-1">{notif.message}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPriorityBadge(notif.priority)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-[#64748B] font-medium">
                      {formatDate(notif.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button className="p-2 text-[#94A3B8] hover:text-[#0F172A] rounded-lg hover:bg-white transition-colors opacity-0 group-hover:opacity-100">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
          <span className="text-xs font-semibold text-[#64748B]">
            Showing <span className="text-[#0F172A]">{(page - 1) * limit + 1}</span> to <span className="text-[#0F172A]">{Math.min(page * limit, total)}</span> of <span className="text-[#0F172A]">{total}</span> notifications
          </span>
          <div className="flex items-center gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="p-2 rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:text-[#0F172A] disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold text-[#0F172A] px-2">Page {page} of {totalPages}</span>
            <button 
              disabled={page === totalPages || totalPages === 0}
              onClick={() => setPage(page + 1)}
              className="p-2 rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:text-[#0F172A] disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
