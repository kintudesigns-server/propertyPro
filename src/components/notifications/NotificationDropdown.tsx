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
        className={`relative p-2.5 rounded-xl border shadow-sm transition-colors ${isOpen ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-white border-[#E5E5EA] text-[#6E6E73] hover:text-[#1D1D1F]"}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-2 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#E5E5EA] z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 origin-top-right">
          {/* Header */}
          <div className="p-4 border-b border-[#E5E5EA] bg-[#F2F2F7] flex justify-between items-center">
            <div>
              <h3 className="font-bold text-[#1D1D1F] text-sm">Notifications</h3>
              <p className="text-[10px] text-[#6E6E73] font-semibold mt-0.5">
                {unreadCount} unread &middot; {highPriorityCount} high priority
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={fetchNotifications}
                className="p-1.5 text-[#6E6E73] hover:text-[#007AFF] hover:bg-blue-50 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button 
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="p-1.5 text-[#6E6E73] hover:text-[#10B981] hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                title="Mark all as read"
              >
                <CheckCheck className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[320px] overflow-y-auto flex flex-col">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-[#6E6E73]">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm font-semibold">No notifications</p>
                <p className="text-xs mt-1">You're all caught up!</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <Link 
                  href={`/dashboard/notifications/${notif.id}`}
                  key={notif.id}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-start gap-3 p-4 border-b border-slate-50 hover:bg-[#F2F2F7] transition-colors ${!notif.isRead ? "bg-slate-50/50" : ""}`}
                >
                  <div className={`mt-0.5 p-2 rounded-full shrink-0 ${!notif.isRead ? "bg-white shadow-sm border border-slate-100" : "bg-transparent"}`}>
                    {getIconForType(notif.type, notif.priority)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`text-sm truncate pr-2 ${!notif.isRead ? "font-bold text-[#1D1D1F]" : "font-semibold text-slate-700"}`}>
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-[#94A3B8] whitespace-nowrap shrink-0 pt-0.5">
                        {getTimeAgo(notif.createdAt)}
                      </span>
                    </div>
                    <p className={`text-xs line-clamp-2 ${!notif.isRead ? "text-[#6E6E73] font-medium" : "text-[#6E6E73]"}`}>
                      {notif.message}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <div className="h-2 w-2 bg-blue-500 rounded-full shrink-0 mt-2"></div>
                  )}
                </Link>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-[#E5E5EA] bg-white">
            <Link 
              href="/dashboard/notifications" 
              onClick={() => setIsOpen(false)}
              className="block w-full text-center py-2 text-sm font-bold text-[#007AFF] hover:text-[#0062CC] hover:bg-blue-50 rounded-xl transition-colors"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
