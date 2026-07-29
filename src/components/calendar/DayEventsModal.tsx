"use client";

import React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { X, Calendar, Wrench, Receipt, FileText, ChevronRight } from "lucide-react";
import { CalendarEvent } from "@/app/api/calendar/events/route";

interface DayEventsModalProps {
  date: Date | null;
  events: CalendarEvent[];
  onClose: () => void;
}

export function DayEventsModal({ date, events, onClose }: DayEventsModalProps) {
  if (!date) return null;

  const getEventIcon = (type: string) => {
    switch (type) {
      case "PAYMENT":
        return <Receipt className="h-5 w-5 text-red-500" />;
      case "MAINTENANCE":
        return <Wrench className="h-5 w-5 text-blue-500" />;
      case "LEASE":
        return <FileText className="h-5 w-5 text-purple-500" />;
      default:
        return <Calendar className="h-5 w-5 text-[#6E6E73]" />;
    }
  };

  const getEventActionLink = (event: CalendarEvent) => {
    switch (event.type) {
      case "PAYMENT":
        return `/dashboard/accounting/invoices`;
      case "MAINTENANCE":
        return `/dashboard/maintenance/${event.metadata?.requestId || "my-requests"}`;
      case "LEASE":
        return `/dashboard/leases/${event.metadata?.leaseId || "my-leases"}`;
      default:
        return "#";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div 
        className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#E5E5EA] bg-[#F2F2F7]">
          <div>
            <h2 className="text-xl font-extrabold text-[#1D1D1F] tracking-tight">
              {format(date, "MMMM d, yyyy")}
            </h2>
            <p className="text-sm font-medium text-[#6E6E73] mt-1">
              {events.length} {events.length === 1 ? "event" : "events"} scheduled
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-white rounded-xl text-[#6E6E73] hover:text-[#1D1D1F] border border-[#E5E5EA] shadow-sm hover:bg-[#F5F5F7] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Event List */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {events.length === 0 ? (
            <div className="text-center py-10">
              <Calendar className="h-12 w-12 text-[#E5E5EA] mx-auto mb-4" />
              <p className="text-sm font-bold text-[#6E6E73]">No events on this day.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div 
                  key={event.id}
                  className="flex flex-col gap-3 p-4 rounded-2xl border border-[#E5E5EA] bg-white hover:border-[#CBD5E1] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-[#E5E5EA] shrink-0">
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider">
                          {event.type}
                        </span>
                        {event.priority === "HIGH" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600">
                            HIGH PRIORITY
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-[#1D1D1F] text-sm leading-tight mb-1">
                        {event.title}
                      </h4>
                      {event.metadata?.propertyName && (
                        <p className="text-xs font-medium text-[#6E6E73] truncate">
                          {event.metadata.propertyName} {event.metadata.unitNumber ? `— Unit ${event.metadata.unitNumber}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-[#E5E5EA] flex justify-end">
                    <Link 
                      href={getEventActionLink(event)}
                      className="flex items-center gap-1.5 text-xs font-bold text-[#007AFF] hover:text-[#0062CC] transition-colors"
                    >
                      View Details <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
