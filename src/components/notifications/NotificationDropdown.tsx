"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, CheckCheck, RefreshCw, AlertCircle, Info, FileText, CheckCircle2 } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [highPriorityCount, setHighPriorityCount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=5");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
        setHighPriorityCount(data.highPriorityCount);
      }
    } catch (err) {
      console.error("Error fetching notifications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Set up Server-Sent Events (SSE) for real-time notification delivery
    const eventSource = new EventSource("/api/notifications/sse");

    eventSource.addEventListener("notification", (event) => {
      fetchNotifications();
    });

    eventSource.onerror = () => {
      // Silent fail – EventSource automatically retries connection
    };

    return () => {
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    if (priority === "HIGH") return <AlertCircle className="h-4 w-4 text-red-500" />;
    switch (type) {
      case "PAYMENT": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "MAINTENANCE": return <Info className="h-4 w-4 text-blue-500" />;
      case "LEASE": return <FileText className="h-4 w-4 text-purple-500" />;
      default: return <Bell className="h-4 w-4 text-[#6E6E73]" />;
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className={`relative p-2 rounded-xl border transition-colors cursor-pointer ${
          isOpen 
            ? "bg-slate-100 border-slate-300 text-slate-900 shadow-2xs" 
            : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs"
        }`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-lg border border-slate-200/80 z-[1000] overflow-hidden flex flex-col font-sans animate-in fade-in zoom-in-95 duration-200 origin-top-right">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm tracking-tight">Notifications</h3>
              <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                {unreadCount} unread &middot; {highPriorityCount} high priority
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={fetchNotifications}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                title="Refresh"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button 
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                title="Mark all as read"
              >
                <CheckCheck className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[320px] overflow-y-auto flex flex-col divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Bell className="h-7 w-7 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-medium text-slate-700">No notifications</p>
                <p className="text-[11px] text-slate-400 mt-0.5">You're all caught up!</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <Link 
                  href={`/dashboard/notifications/${notif.id}`}
                  key={notif.id}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-start gap-3 p-4 transition-colors ${
                    !notif.isRead ? "bg-slate-50/60 hover:bg-slate-100/70" : "bg-white hover:bg-slate-50/80"
                  }`}
                >
                  <div className={`mt-0.5 p-1.5 rounded-xl shrink-0 ${!notif.isRead ? "bg-white shadow-2xs border border-slate-200/80" : "bg-slate-100"}`}>
                    {getIconForType(notif.type, notif.priority)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5 gap-2">
                      <h4 className={`text-xs truncate ${!notif.isRead ? "font-semibold text-slate-900" : "font-normal text-slate-600"}`}>
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0">
                        {getTimeAgo(notif.createdAt)}
                      </span>
                    </div>
                    <p className={`text-[11px] leading-relaxed line-clamp-2 ${!notif.isRead ? "text-slate-600 font-normal" : "text-slate-400 font-normal"}`}>
                      {notif.message}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <div className="h-1.5 w-1.5 bg-slate-900 rounded-full shrink-0 mt-2"></div>
                  )}
                </Link>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-100 bg-slate-50/50">
            <Link 
              href="/dashboard/notifications" 
              onClick={() => setIsOpen(false)}
              className="block w-full text-center py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100/80 rounded-xl transition-colors"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
