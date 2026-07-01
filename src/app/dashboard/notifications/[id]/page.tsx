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
  CheckCheck
} from "lucide-react";
import { NotificationActions } from "@/components/notifications/NotificationActions";

const getIconForType = (type: string, priority: string) => {
  if (priority === "HIGH") return <AlertCircle className="h-8 w-8 text-red-500" />;
  switch (type) {
    case "PAYMENT": return <CheckCircle2 className="h-8 w-8 text-green-500" />;
    case "MAINTENANCE": return <Info className="h-8 w-8 text-blue-500" />;
    case "LEASE": return <FileText className="h-8 w-8 text-purple-500" />;
    default: return <Bell className="h-8 w-8 text-slate-500" />;
  }
};

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case "HIGH": return <span className="px-2.5 py-1 text-xs font-bold rounded bg-red-50 text-red-600 border border-red-100">HIGH PRIORITY</span>;
    case "MEDIUM": return <span className="px-2.5 py-1 text-xs font-bold rounded bg-yellow-50 text-yellow-600 border border-yellow-100">MEDIUM PRIORITY</span>;
    case "LOW": return <span className="px-2.5 py-1 text-xs font-bold rounded bg-green-50 text-green-600 border border-green-100">LOW PRIORITY</span>;
    default: return null;
  }
};

const formatDate = (dateStr: Date) => {
  return dateStr.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

const formatTime = (dateStr: Date) => {
  return dateStr.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
};

export default async function NotificationDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/login");
  }

  const userId = (session.user as any).id;
  const { id } = await params;

  const db = prisma as any;
  const notification = await db.notification.findUnique({
    where: { id }
  });

  if (!notification || notification.userId !== userId) {
    redirect("/dashboard/notifications");
  }

  // Mark as read if not already
  if (!notification.isRead) {
    await (prisma as any).notification.update({
      where: { id },
      data: { isRead: true }
    });
    notification.isRead = true; // Update local state for rendering
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      {/* Header Navigation */}
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard/notifications"
          className="p-2.5 bg-white border border-[#E2E8F0] rounded-xl text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-[#0F172A] tracking-tight">Notification Details</h1>
          <p className="text-sm text-[#64748B] font-medium mt-0.5">View alert contents and metadata</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content (Left Column) */}
        <div className="flex-1 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 flex flex-col items-center text-center border-b border-[#E2E8F0] bg-[#F8FAFC]/50 relative">
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
          
          <div className="p-8 flex-1">
            <h3 className="text-xs font-extrabold text-[#94A3B8] uppercase tracking-wider mb-4">Message Content</h3>
            <div className="prose prose-sm max-w-none text-[#0F172A] bg-slate-50 p-6 rounded-xl border border-[#E2E8F0]">
              <p className="whitespace-pre-wrap leading-relaxed text-base">{notification.message}</p>
            </div>
          </div>
        </div>

        {/* Sidebar (Right Column) */}
        <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
          {/* Status & Timestamps */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <h3 className="font-bold text-[#0F172A] text-sm">Overview</h3>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <span className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <CheckCheck className="h-3.5 w-3.5" /> Status
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${notification.isRead ? "bg-slate-100 text-slate-600" : "bg-blue-50 text-blue-600"}`}>
                  {notification.isRead ? "Read" : "Unread"}
                </span>
              </div>
              
              <div className="h-px bg-[#E2E8F0]"></div>

              <div>
                <span className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Date Received
                </span>
                <p className="text-sm font-semibold text-[#0F172A]">{formatDate(notification.createdAt)}</p>
              </div>

              <div>
                <span className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Clock className="h-3.5 w-3.5" /> Time
                </span>
                <p className="text-sm font-semibold text-[#0F172A]">{formatTime(notification.createdAt)}</p>
              </div>

              {notification.relatedEntityId && (
                <>
                  <div className="h-px bg-[#E2E8F0]"></div>
                  <div>
                    <span className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                      <FileText className="h-3.5 w-3.5" /> Related Entity Link
                    </span>
                    <Link 
                      href={
                        notification.type === "MAINTENANCE" ? `/dashboard/maintenance/${notification.relatedEntityId}` :
                        notification.type === "LEASE" ? `/dashboard/leases` :
                        "#"
                      }
                      className="block text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline break-all bg-slate-50 p-2 rounded-md border border-slate-200"
                    >
                      View Details (ID: {notification.relatedEntityId.split("-")[0]}...)
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Quick Actions (Client Component) */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden p-5">
            <h3 className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider mb-4">Quick Actions</h3>
            <NotificationActions id={notification.id} isRead={notification.isRead} />
          </div>
        </div>
      </div>
    </div>
  );
}
