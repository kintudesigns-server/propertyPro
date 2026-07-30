"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  eachDayOfInterval,
  isToday,
  addDays,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Wrench,
  FileText,
  ClipboardCheck,
  Eye,
  Calendar as CalendarIcon,
  Filter,
  Grid,
  List,
  CalendarDays,
  ArrowRight,
  Clock,
  MapPin,
  Building,
  User,
  CheckCircle2,
  X,
  Loader2,
} from "lucide-react";
import { CalendarEvent } from "@/app/api/calendar/events/route";
import { CalendarEventDrawer } from "@/components/calendar/CalendarEventDrawer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CalendarGrid() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "TENANT";

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [dayModalDate, setDayModalDate] = useState<Date | null>(null);

  // View Modes: "MONTH" | "WEEK" | "AGENDA"
  const [viewMode, setViewMode] = useState<"MONTH" | "WEEK" | "AGENDA">("MONTH");

  // Category Filters
  const [activeCategory, setActiveCategory] = useState<string>("ALL");

  const fetchEvents = async (date: Date) => {
    setLoading(true);
    try {
      const monthStart = startOfWeek(startOfMonth(date));
      const monthEnd = endOfWeek(endOfMonth(date));

      const res = await fetch(
        `/api/calendar/events?start=${monthStart.toISOString()}&end=${monthEnd.toISOString()}`
      );
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
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

  const navigateForward = () => {
    if (viewMode === "WEEK") setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addMonths(currentDate, 1));
  };

  const navigateBack = () => {
    if (viewMode === "WEEK") setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subMonths(currentDate, 1));
  };

  const goToToday = () => setCurrentDate(new Date());

  // Filter events based on activeCategory
  const filteredEvents = events.filter((e) => {
    if (activeCategory === "ALL") return true;
    return e.type === activeCategory;
  });

  const getEventsForDay = (day: Date) => {
    return filteredEvents.filter((e) => isSameDay(new Date(e.date), day));
  };

  const getCategoryStyle = (type: string) => {
    switch (type) {
      case "PAYMENT":
        return {
          bg: "bg-[#22C55E]/10 hover:bg-[#22C55E]/20 text-[#15803D] border-[#22C55E]/20 border-l-[4px] border-l-[#22C55E]",
          dot: "bg-[#22C55E]",
          pill: "bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]",
          badge: "bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]",
        };
      case "MAINTENANCE":
        return {
          bg: "bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 text-[#B45309] border-[#F59E0B]/20 border-l-[4px] border-l-[#F59E0B]",
          dot: "bg-[#F59E0B]",
          pill: "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]",
          badge: "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]",
        };
      case "INSPECTION":
        return {
          bg: "bg-[#8B5CF6]/10 hover:bg-[#8B5CF6]/20 text-[#6D28D9] border-[#8B5CF6]/20 border-l-[4px] border-l-[#8B5CF6]",
          dot: "bg-[#8B5CF6]",
          pill: "bg-[#EDE9FE] text-[#6D28D9] border-[#DDD6FE]",
          badge: "bg-[#EDE9FE] text-[#6D28D9] border-[#DDD6FE]",
        };
      case "LEASE":
        return {
          bg: "bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#B91C1C] border-[#EF4444]/20 border-l-[4px] border-l-[#EF4444]",
          dot: "bg-[#EF4444]",
          pill: "bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]",
          badge: "bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]",
        };
      case "TOUR":
        return {
          bg: "bg-[#007AFF]/10 hover:bg-[#007AFF]/20 text-[#007AFF] border-[#007AFF]/20 border-l-[4px] border-l-[#007AFF]",
          dot: "bg-[#007AFF]",
          pill: "bg-[#DBEAFE] text-[#1D4ED8] border-[#BFDBFE]",
          badge: "bg-[#DBEAFE] text-[#1D4ED8] border-[#BFDBFE]",
        };
      default:
        return {
          bg: "bg-[#64748B]/10 hover:bg-[#64748B]/20 text-[#334155] border-[#64748B]/20 border-l-[4px] border-l-[#64748B]",
          dot: "bg-[#64748B]",
          pill: "bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]",
          badge: "bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]",
        };
    }
  };

  // Grid Calculation
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  // Week View Calculation
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <div className="space-y-6 pb-24 font-sans">
      {/* ── HEADER CONTROL BAR ── */}
      <div className="bg-white rounded-3xl p-6 border border-[#E5E5EA] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#6E6E73] mb-1">
            <CalendarIcon className="h-3.5 w-3.5 text-[#007AFF]" />
            <span className="text-[#1D1D1F] font-bold">Activity Calendar</span>
            <span>&bull;</span>
            <span className="text-[#007AFF] font-bold uppercase tracking-wider">{userRole} Scope</span>
          </div>
          <h1 className="text-2xl font-black text-[#1D1D1F] tracking-tight">
            {format(currentDate, "MMMM yyyy")}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-3.5 h-9 text-xs font-bold text-[#1D1D1F] bg-white hover:bg-[#F2F2F7] rounded-xl border border-[#E5E5EA] shadow-2xs transition-colors"
            >
              Today
            </button>
            <div className="flex items-center gap-1 bg-[#F2F2F7] p-1 rounded-2xl border border-[#E5E5EA]">
              <button
                onClick={navigateBack}
                className="h-8 w-8 rounded-xl bg-white hover:bg-slate-50 text-[#1D1D1F] flex items-center justify-center transition-colors shadow-2xs"
                title="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 text-xs font-extrabold text-[#1D1D1F] min-w-[110px] text-center">
                {format(currentDate, viewMode === "WEEK" ? "'Week of' MMM d" : "MMMM yyyy")}
              </span>
              <button
                onClick={navigateForward}
                className="h-8 w-8 rounded-xl bg-white hover:bg-slate-50 text-[#1D1D1F] flex items-center justify-center transition-colors shadow-2xs"
                title="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-[#F2F2F7] p-1 rounded-2xl border border-[#E5E5EA]">
            <button
              onClick={() => setViewMode("MONTH")}
              className={`px-3 h-8 text-xs font-bold rounded-xl transition-all ${
                viewMode === "MONTH" ? "bg-white text-[#007AFF] shadow-2xs font-extrabold" : "text-[#6E6E73] hover:text-[#1D1D1F]"
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode("WEEK")}
              className={`px-3 h-8 text-xs font-bold rounded-xl transition-all ${
                viewMode === "WEEK" ? "bg-white text-[#007AFF] shadow-2xs font-extrabold" : "text-[#6E6E73] hover:text-[#1D1D1F]"
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode("AGENDA")}
              className={`px-3 h-8 text-xs font-bold rounded-xl transition-all ${
                viewMode === "AGENDA" ? "bg-white text-[#007AFF] shadow-2xs font-extrabold" : "text-[#6E6E73] hover:text-[#1D1D1F]"
              }`}
            >
              Agenda
            </button>
          </div>
        </div>
      </div>

      {/* ── CATEGORY LEGEND FILTERS ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: "ALL", label: "All Events", icon: CalendarIcon },
          ...(userRole !== "INSPECTOR" ? [{ key: "PAYMENT", label: "Payments & Rent", icon: CreditCard }] : []),
          { key: "MAINTENANCE", label: "Repairs & Maintenance", icon: Wrench },
          { key: "INSPECTION", label: "Walkthrough Inspections", icon: ClipboardCheck },
          ...(userRole !== "INSPECTOR" ? [{ key: "LEASE", label: "Lease Expirations", icon: FileText }] : []),
          ...(userRole !== "INSPECTOR" && userRole !== "TENANT" ? [{ key: "TOUR", label: "Prospect Tours", icon: Eye }] : []),
        ].map((cat) => {
          const Icon = cat.icon;
          const isActiveCat = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold border flex items-center gap-2 shrink-0 transition-all ${
                isActiveCat
                  ? "bg-[#1D1D1F] text-white border-[#1D1D1F] shadow-sm"
                  : "bg-white text-[#6E6E73] border-[#E5E5EA] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* ── VIEW 1: MONTH GRID VIEW ── */}
      {viewMode === "MONTH" && (
        <div className="bg-white rounded-3xl border border-[#E5E5EA] shadow-xs overflow-hidden">
          {/* Weekday Labels */}
          <div className="grid grid-cols-7 border-b border-[#E5E5EA] bg-[#F2F2F7] text-center py-3">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span key={day} className="text-[11px] font-bold text-[#6E6E73] uppercase tracking-wider">
                {day}
              </span>
            ))}
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-[#E5E5EA]">
            {days.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isDayToday = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[135px] p-2 flex flex-col justify-between transition-colors ${
                    !isCurrentMonth ? "bg-[#FAFAFC] text-[#8E8E93]" : "bg-white hover:bg-[#F8FAFC]"
                  } ${isDayToday ? "bg-blue-50/20" : ""}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`h-7 w-7 rounded-full text-xs font-bold flex items-center justify-center ${
                        isDayToday
                          ? "bg-[#007AFF] text-white shadow-2xs font-extrabold"
                          : isCurrentMonth
                          ? "text-[#1D1D1F]"
                          : "text-[#8E8E93]"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-bold text-[#8E8E93] px-1.5 py-0.5 bg-[#F2F2F7] rounded-md">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Day Events List (Max 2 visible, +X more button) */}
                  <div className="space-y-1.5 flex-1 flex flex-col justify-start">
                    {dayEvents.slice(0, 2).map((event) => {
                      const style = getCategoryStyle(event.type);
                      return (
                        <button
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className={`w-full text-left px-2 py-1.5 rounded-lg border text-xs font-semibold truncate block transition-all shadow-2xs ${style.bg}`}
                        >
                          <div className="truncate font-semibold text-[#1D1D1F] text-[11px]">
                            {event.title}
                          </div>
                        </button>
                      );
                    })}

                    {dayEvents.length > 2 && (
                      <button
                        onClick={() => setDayModalDate(day)}
                        className="w-full text-left px-2 py-0.5 rounded-md text-[11px] font-bold text-[#007AFF] hover:underline mt-auto"
                      >
                        + {dayEvents.length - 2} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── VIEW 2: WEEK TIMETABLE VIEW ── */}
      {viewMode === "WEEK" && (
        <div className="bg-white rounded-3xl border border-[#E5E5EA] shadow-xs overflow-hidden">
          {/* Weekday Header */}
          <div className="grid grid-cols-7 border-b border-[#E5E5EA] bg-[#F2F2F7] text-center py-3.5">
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="space-y-1">
                <span className="text-[11px] font-bold text-[#6E6E73] uppercase tracking-wider block">
                  {format(day, "EEE")}
                </span>
                <span
                  className={`inline-flex h-8 w-8 rounded-full text-xs font-black items-center justify-center ${
                    isToday(day) ? "bg-[#007AFF] text-white shadow-sm" : "text-[#1D1D1F]"
                  }`}
                >
                  {format(day, "d")}
                </span>
              </div>
            ))}
          </div>

          {/* Timetable Body */}
          <div className="grid grid-cols-7 divide-x divide-[#E5E5EA] min-h-[420px] bg-white">
            {weekDays.map((day) => {
              const dayEvents = getEventsForDay(day);
              return (
                <div key={day.toISOString()} className="p-2 space-y-2.5">
                  {dayEvents.length === 0 ? (
                    <div className="h-full min-h-[200px] flex items-center justify-center text-[#8E8E93] text-xs font-medium italic">
                      No Events
                    </div>
                  ) : (
                    dayEvents.map((event) => {
                      const style = getCategoryStyle(event.type);
                      return (
                        <div
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all hover:shadow-md ${style.bg}`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] font-extrabold text-[#6E6E73] flex items-center gap-1 uppercase tracking-wider">
                              <Clock className="h-3 w-3 text-[#007AFF]" />
                              {format(new Date(event.date), "h:mm a")}
                            </span>
                          </div>
                          <p className="font-bold text-[#1D1D1F] text-xs leading-snug line-clamp-2">{event.title}</p>
                          {event.metadata?.propertyName && (
                            <p className="text-[11px] font-medium text-[#6E6E73] mt-1 truncate">
                              {event.metadata.propertyName}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── VIEW 3: AGENDA CHRONOLOGICAL LIST VIEW ── */}
      {viewMode === "AGENDA" && (
        <div className="bg-white rounded-3xl border border-[#E5E5EA] shadow-xs overflow-hidden space-y-4">
          <div className="p-6 border-b border-[#E5E5EA] bg-[#F2F2F7] flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-[#1D1D1F] tracking-tight">Agenda Feed</h3>
              <p className="text-xs font-semibold text-[#6E6E73]">Chronological schedule of upcoming events and tasks.</p>
            </div>
            <span className="text-xs font-extrabold px-3.5 py-1 bg-white text-[#1D1D1F] border border-[#E5E5EA] rounded-xl shadow-2xs">
              {filteredEvents.length} Scheduled Items
            </span>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="p-16 text-center text-[#8E8E93] space-y-2">
              <CheckCircle2 className="h-10 w-10 text-[#34C759] mx-auto" />
              <p className="text-sm font-bold text-[#1D1D1F]">No scheduled events found</p>
              <p className="text-xs text-[#8E8E93]">Try selecting a different date range or event filter.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E5EA]">
              {filteredEvents.map((event) => {
                const style = getCategoryStyle(event.type);
                return (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className="p-5 hover:bg-[#F2F2F7]/50 transition-colors flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[50px] p-2 bg-[#F2F2F7] rounded-2xl border border-[#E5E5EA]">
                        <span className="text-[10px] font-bold text-[#6E6E73] uppercase tracking-wider block">
                          {format(new Date(event.date), "MMM")}
                        </span>
                        <span className="text-xl font-black text-[#1D1D1F]">
                          {format(new Date(event.date), "d")}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${style.badge}`}>
                          {event.type}
                        </span>
                        <h4 className="text-sm font-extrabold text-[#1D1D1F]">{event.title}</h4>
                        {event.metadata?.propertyName && (
                          <p className="text-xs font-medium text-[#6E6E73] flex items-center gap-1">
                            <Building className="h-3.5 w-3.5 text-[#8E8E93]" />
                            {event.metadata.propertyName} {event.metadata.unitNumber ? `&bull; Unit ${event.metadata.unitNumber}` : ""}
                          </p>
                        )}
                      </div>
                    </div>

                    <Button variant="ghost" className="h-9 px-4 text-xs font-bold text-[#007AFF] hover:text-[#0056B3] hover:bg-[#EFF6FF] rounded-xl border border-transparent hover:border-[#DBEAFE]">
                      Inspect <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── DAY EVENTS OVERFLOW MODAL (+X MORE) ── */}
      <Dialog open={Boolean(dayModalDate)} onOpenChange={(open) => !open && setDayModalDate(null)}>
        <DialogContent className="max-w-md bg-white rounded-3xl border-[#E5E5EA] p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-[#1D1D1F] tracking-tight">
              {dayModalDate ? format(dayModalDate, "EEEE, MMMM d, yyyy") : "Scheduled Events"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-3 max-h-[380px] overflow-y-auto pr-1">
            {dayModalDate && getEventsForDay(dayModalDate).map((event) => {
              const style = getCategoryStyle(event.type);
              return (
                <div
                  key={event.id}
                  onClick={() => {
                    setDayModalDate(null);
                    setSelectedEvent(event);
                  }}
                  className={`p-3.5 rounded-2xl border text-xs font-semibold cursor-pointer transition-all hover:shadow-md ${style.bg}`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${style.badge}`}>
                      {event.type}
                    </span>
                    <span className="text-[11px] font-semibold text-[#6E6E73]">
                      {format(new Date(event.date), "h:mm a")}
                    </span>
                  </div>
                  <p className="font-extrabold text-[#1D1D1F] leading-snug">{event.title}</p>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── SLIDE-IN EVENT DETAIL DRAWER ── */}
      <CalendarEventDrawer
        event={selectedEvent}
        open={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        userRole={userRole}
      />
    </div>
  );
}
