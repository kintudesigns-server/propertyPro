"use client";

import React, { useState, useEffect } from "react";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  eachDayOfInterval,
  isToday,
  endOfDay
} from "date-fns";
import { ChevronLeft, ChevronRight, Settings2, Receipt, Wrench, FileText, Bell } from "lucide-react";
import Link from "next/link";
import { CalendarEvent } from "@/app/api/calendar/events/route";

export function CalendarGrid() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [globalUpcoming, setGlobalUpcoming] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const fetchEvents = async (date: Date) => {
    setLoading(true);
    try {
      // Fetch for the visible grid (which includes overflow days from prev/next months)
      const monthStart = startOfWeek(startOfMonth(date));
      const monthEnd = endOfWeek(endOfMonth(date));
      
      const res = await fetch(`/api/calendar/events?start=${monthStart.toISOString()}&end=${monthEnd.toISOString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events);
      }
    } catch (err) {
      console.error("Error fetching calendar events:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents(currentDate);
  }, [currentDate]);

  useEffect(() => {
    // Fetch global upcoming events once to power the top banner
    fetch(`/api/calendar/events?upcoming=true`)
      .then(res => res.json())
      .then(data => {
        if (data.events) {
          setGlobalUpcoming(data.events);
        }
      })
      .catch(err => console.error("Error fetching upcoming events", err));
  }, []);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const getEventsForDay = (day: Date) => {
    return events.filter(e => isSameDay(new Date(e.date), day));
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

  // Find today's events from the globally fetched upcoming list
  const todayEvents = globalUpcoming.filter(e => isSameDay(new Date(e.date), new Date()));
  
  // Find the next upcoming events if there are none today
  const futureEvents = globalUpcoming.filter(e => new Date(e.date) > endOfDay(new Date()));
  const nextEvents = futureEvents.length > 0 
    ? futureEvents.filter(e => isSameDay(new Date(e.date), new Date(futureEvents[0].date)))
    : [];

  // Determine what to show in the top banner
  let bannerTitle = "Today's Schedule";
  let displayEvents = todayEvents;
  let isShowingNext = false;
  let isShowingSelected = false;

  if (selectedDate) {
    displayEvents = getEventsForDay(selectedDate);
    bannerTitle = `Events for ${format(selectedDate, "MMMM d, yyyy")}`;
    isShowingSelected = true;
  } else if (todayEvents.length === 0 && nextEvents.length > 0) {
    displayEvents = nextEvents;
    bannerTitle = "Next Upcoming Event";
    isShowingNext = true;
  } else if (todayEvents.length === 0 && nextEvents.length === 0) {
    bannerTitle = "Upcoming Schedule";
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Events Banner (Always at the very top) */}
      <div className={`border rounded-2xl p-5 shadow-sm transition-all ${
        isShowingSelected ? "bg-purple-50 border-purple-200" :
        isShowingNext ? "bg-slate-50 border-slate-200" : "bg-[#EFF6FF] border-[#3B82F6]/20"
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className={`h-5 w-5 ${
              isShowingSelected ? "text-purple-600" :
              isShowingNext ? "text-[#64748B]" : "text-[#3B82F6]"
            }`} />
            <h3 className={`text-base font-extrabold ${
              isShowingSelected ? "text-purple-900" :
              isShowingNext ? "text-[#0F172A]" : "text-[#1E3A8A]"
            }`}>
              {bannerTitle}
            </h3>
            {(isShowingNext || isShowingSelected) && displayEvents[0] && (
              <span className="text-xs font-bold text-[#64748B] ml-2">
                • {format(new Date(displayEvents[0].date), "MMM d, yyyy")}
              </span>
            )}
            {!isShowingNext && !isShowingSelected && displayEvents.length > 0 && (
              <span className="bg-[#3B82F6] text-white text-xs font-bold px-2 py-0.5 rounded-full ml-2">
                {displayEvents.length}
              </span>
            )}
          </div>
          
          {/* Clear selection button */}
          {isShowingSelected && (
            <button 
              onClick={() => setSelectedDate(null)}
              className="text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-100 hover:bg-purple-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              Clear Selection
            </button>
          )}
        </div>
        
        {displayEvents.length === 0 ? (
           <div className={`text-sm font-bold py-4 text-center bg-white/50 rounded-xl border ${
             isShowingSelected ? "text-purple-700/70 border-purple-100" : "text-slate-500 border-slate-200"
           }`}>
             {isShowingSelected 
               ? "No events scheduled for this day." 
               : "No upcoming events scheduled."}
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayEvents.map(event => (
              <div 
                key={event.id}
                className={`bg-white p-4 rounded-xl border transition-colors shadow-sm flex items-start gap-3 ${
                  isShowingSelected ? "border-purple-200 hover:border-purple-400" :
                  isShowingNext ? "border-[#E2E8F0] hover:border-[#CBD5E1]" : "border-[#BFDBFE] hover:border-[#3B82F6]"
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${
                  event.type === "PAYMENT" ? "bg-red-50 text-red-500" :
                  event.type === "MAINTENANCE" ? "bg-blue-50 text-blue-500" :
                  "bg-purple-50 text-purple-500"
                }`}>
                  {event.type === "PAYMENT" ? <Receipt className="h-5 w-5" /> :
                   event.type === "MAINTENANCE" ? <Wrench className="h-5 w-5" /> :
                   <FileText className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">
                      {event.type}
                    </span>
                    {event.priority === "HIGH" && (
                      <span className="h-2 w-2 rounded-full bg-red-500" title="High Priority" />
                    )}
                  </div>
                  <p className="font-bold text-[#0F172A] text-sm truncate mb-1">{event.title}</p>
                  
                  {event.metadata?.propertyName && (
                    <p className="text-xs font-medium text-[#64748B] truncate mb-2">
                      {event.metadata.propertyName} {event.metadata.unitNumber ? `— Unit ${event.metadata.unitNumber}` : ""}
                    </p>
                  )}
                  
                  <div className="pt-2 mt-2 border-t border-slate-100 flex justify-end">
                    <Link 
                      href={getEventActionLink(event)}
                      className="flex items-center gap-1 text-[11px] font-bold text-[#3B82F6] hover:text-[#2563EB] transition-colors"
                    >
                      View Details <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Header / Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">Calendar</h1>
          <p className="text-sm text-[#64748B] font-medium mt-1">Manage your property events, appointments, and schedules</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={goToToday}
            className="px-4 py-2 text-sm font-bold text-[#64748B] bg-white border border-[#E2E8F0] rounded-xl shadow-sm hover:bg-slate-50 hover:text-[#0F172A] transition-colors"
          >
            Today
          </button>

          <div className="flex items-center bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
            <button 
              onClick={prevMonth}
              className="p-2 text-[#64748B] hover:bg-slate-50 hover:text-[#0F172A] transition-colors border-r border-[#E2E8F0]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="px-4 py-2 text-sm font-bold text-[#0F172A] min-w-[120px] text-center">
              {format(currentDate, "MMMM yyyy")}
            </div>
            <button 
              onClick={nextMonth}
              className="p-2 text-[#64748B] hover:bg-slate-50 hover:text-[#0F172A] transition-colors border-l border-[#E2E8F0]"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden flex flex-col relative">
        {loading && (
          <div className="absolute top-0 left-0 w-full h-1">
            <div className="h-full bg-[#3B82F6] animate-pulse"></div>
          </div>
        )}

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-[#E2E8F0] bg-white">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="py-3 text-center text-xs font-extrabold text-[#94A3B8] uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 auto-rows-fr bg-[#E2E8F0] gap-px border-b border-[#E2E8F0]">
          {days.map((day, idx) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isTodayDate = isToday(day);

            return (
              <div 
                key={day.toString()} 
                onClick={() => dayEvents.length > 0 && setSelectedDate(day)}
                className={`min-h-[120px] bg-white p-2 transition-colors relative flex flex-col ${
                  !isCurrentMonth ? "bg-slate-50/50" : ""
                } ${dayEvents.length > 0 ? "cursor-pointer hover:bg-slate-50" : ""}`}
              >
                {/* Date Number */}
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${
                    isTodayDate 
                      ? "bg-[#3B82F6] text-white" 
                      : !isCurrentMonth 
                        ? "text-[#CBD5E1]" 
                        : "text-[#0F172A]"
                  }`}>
                    {format(day, "d")}
                  </span>
                  
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] font-bold text-[#64748B] bg-slate-100 px-1.5 py-0.5 rounded">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                {/* Event Indicators */}
                <div className="flex flex-col gap-1 overflow-hidden mt-auto pb-1">
                  {dayEvents.slice(0, 3).map((e) => (
                    <div 
                      key={e.id}
                      className={`text-[10px] font-bold truncate px-1.5 py-1 rounded-md w-full border ${
                        e.type === "PAYMENT" ? "bg-red-50 text-red-700 border-red-100" :
                        e.type === "MAINTENANCE" ? "bg-blue-50 text-blue-700 border-blue-100" :
                        e.type === "LEASE" ? "bg-purple-50 text-purple-700 border-purple-100" :
                        "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                      title={e.title}
                    >
                      {e.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] font-bold text-[#64748B] px-1.5">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
