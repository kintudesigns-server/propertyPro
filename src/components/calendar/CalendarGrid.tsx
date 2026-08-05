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
  Clock,
  Building,
  CheckCircle2,
  ArrowRight,
  Plus,
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
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
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

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDay(today);
  };

  // Filter events based on activeCategory
  const filteredEvents = events.filter((e) => {
    if (activeCategory === "ALL") return true;
    return e.type === activeCategory;
  });

  const getEventsForDay = (day: Date) => {
    return filteredEvents.filter((e) => isSameDay(new Date(e.date), day));
  };

  const selectedDayEvents = getEventsForDay(selectedDay);

  const getCategoryStyle = (type: string) => {
    switch (type) {
      case "PAYMENT":
        return {
          bg: "bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border-emerald-200/90",
          dot: "bg-emerald-500",
          badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
        };
      case "MAINTENANCE":
        return {
          bg: "bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-200/90",
          dot: "bg-amber-500",
          badge: "bg-amber-50 text-amber-900 border-amber-200",
        };
      case "INSPECTION":
        return {
          bg: "bg-purple-50 hover:bg-purple-100 text-purple-950 border-purple-200/90",
          dot: "bg-purple-500",
          badge: "bg-purple-50 text-purple-800 border-purple-200",
        };
      case "LEASE":
        return {
          bg: "bg-rose-50 hover:bg-rose-100 text-rose-950 border-rose-200/90",
          dot: "bg-rose-500",
          badge: "bg-rose-50 text-rose-800 border-rose-200",
        };
      case "TOUR":
        return {
          bg: "bg-blue-50 hover:bg-blue-100 text-blue-950 border-blue-200/90",
          dot: "bg-blue-500",
          badge: "bg-blue-50 text-blue-800 border-blue-200",
        };
      default:
        return {
          bg: "bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300",
          dot: "bg-slate-600",
          badge: "bg-slate-100 text-slate-800 border-slate-200",
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
    <div className="w-full max-w-7xl mx-auto pt-4 space-y-6 pb-20 px-2 sm:px-6 font-sans">
      
      {/* ── iOS HEADER CONTROL BAR ── */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-normal text-[#6E6E73] mb-1">
            <CalendarIcon className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-[#1D1D1F] font-semibold">Calendar</span>
            <span>&bull;</span>
            <span className="text-[#6E6E73] font-medium uppercase tracking-wider">{userRole} Scope</span>
          </div>
          <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">
            {format(currentDate, "MMMM yyyy")}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Today Button & Month Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-4 h-9 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-all cursor-pointer border-none"
            >
              Today
            </button>
            <div className="flex items-center gap-1 bg-slate-100/80 border border-slate-200/30 p-1 rounded-xl shadow-2xs">
              <button
                onClick={navigateBack}
                className="h-7 w-7 rounded-lg bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors shadow-2xs cursor-pointer border-none"
                title="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 text-xs font-semibold text-[#1D1D1F] min-w-[110px] text-center">
                {format(currentDate, viewMode === "WEEK" ? "'Week of' MMM d" : "MMMM yyyy")}
              </span>
              <button
                onClick={navigateForward}
                className="h-7 w-7 rounded-lg bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors shadow-2xs cursor-pointer border-none"
                title="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* View Control Switcher */}
          <div className="flex items-center gap-1 bg-slate-100/80 border border-slate-200/30 p-1 rounded-xl shadow-2xs">
            <button
              onClick={() => setViewMode("MONTH")}
              className={`px-3 h-7 text-xs font-medium rounded-lg transition-all cursor-pointer border-none ${
                viewMode === "MONTH" ? "bg-white text-[#1D1D1F] shadow-2xs" : "text-[#6E6E73] hover:text-[#1D1D1F]"
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode("WEEK")}
              className={`px-3 h-7 text-xs font-medium rounded-lg transition-all cursor-pointer border-none ${
                viewMode === "WEEK" ? "bg-white text-[#1D1D1F] shadow-2xs" : "text-[#6E6E73] hover:text-[#1D1D1F]"
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode("AGENDA")}
              className={`px-3 h-7 text-xs font-medium rounded-lg transition-all cursor-pointer border-none ${
                viewMode === "AGENDA" ? "bg-white text-[#1D1D1F] shadow-2xs" : "text-[#6E6E73] hover:text-[#1D1D1F]"
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
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
                isActiveCat
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                  : "bg-white text-[#6E6E73] border-slate-200 hover:bg-slate-100"
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
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Weekday Labels */}
            <div className="grid grid-cols-7 border-b border-slate-100 text-center py-2.5">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <span key={day} className="text-xs font-normal text-[#6E6E73]">
                  {day}
                </span>
              ))}
            </div>

            {/* Month Days Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
              {days.map((day) => {
                const dayEvents = getEventsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isDayToday = isToday(day);
                const isDaySelected = isSameDay(day, selectedDay);

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(day)}
                    className={`min-h-[125px] p-2 flex flex-col justify-between transition-all cursor-pointer ${
                      !isCurrentMonth ? "bg-slate-50/30 text-slate-400" : "bg-white hover:bg-slate-50/70"
                    } ${isDaySelected ? "bg-slate-50/80 border-2 border-slate-900 rounded-2xl shadow-xs z-10" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`h-7 w-7 rounded-lg text-xs flex items-center justify-center transition-all ${
                          isDayToday
                            ? "bg-emerald-600 text-white font-semibold shadow-xs"
                            : isDaySelected
                            ? "bg-slate-900 text-white font-semibold shadow-xs"
                            : isCurrentMonth
                            ? "text-[#1D1D1F] font-semibold"
                            : "text-slate-400 font-normal"
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                      {dayEvents.length > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="flex items-center gap-0.5">
                            {dayEvents.slice(0, 3).map((ev) => {
                              const style = getCategoryStyle(ev.type);
                              return (
                                <span key={ev.id} className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                              );
                            })}
                          </div>
                          {dayEvents.length > 3 && (
                            <span className="text-[9px] font-normal text-[#6E6E73]">
                              +{dayEvents.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Day Events Pills */}
                    <div className="space-y-1 flex-1 flex flex-col justify-start">
                      {dayEvents.slice(0, 2).map((event) => {
                        const style = getCategoryStyle(event.type);
                        return (
                          <button
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(event);
                            }}
                            className={`w-full text-left px-2 py-1 rounded-lg border text-xs font-medium transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 truncate ${style.bg}`}
                          >
                            <span className={`h-2 w-2 rounded-full shrink-0 ${style.dot}`} />
                            <span className="truncate">{event.title}</span>
                          </button>
                        );
                      })}

                      {dayEvents.length > 2 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDayModalDate(day);
                          }}
                          className="w-full text-left px-2 py-0.5 rounded-md text-xs font-normal text-[#6E6E73] hover:underline mt-auto cursor-pointer"
                        >
                          + {dayEvents.length - 2} more events
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── SELECTED DAY AGENDA PANEL ── */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-normal text-[#6E6E73] block mb-0.5">
                  Selected Day Schedule
                </span>
                <h3 className="text-base font-semibold text-[#1D1D1F] tracking-tight">
                  {format(selectedDay, "EEEE, MMMM d, yyyy")}
                </h3>
              </div>
              <span className="text-xs font-medium px-3 py-1 bg-slate-50 border border-slate-200/80 rounded-xl text-[#1D1D1F] shadow-2xs">
                {selectedDayEvents.length} Events
              </span>
            </div>

            {selectedDayEvents.length === 0 ? (
              <div className="py-8 text-center text-[#6E6E73] space-y-1">
                <p className="text-xs font-normal text-[#6E6E73]">No events scheduled for this day</p>
                <p className="text-xs text-[#6E6E73] font-normal">Select another date on the calendar above to view events.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedDayEvents.map((event) => {
                  const style = getCategoryStyle(event.type);
                  return (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className={`p-4 rounded-2xl border transition-all hover:shadow-xs cursor-pointer flex items-center justify-between gap-3 ${style.bg}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`h-3 w-3 rounded-full shrink-0 ${style.dot}`} />
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-normal text-[#6E6E73]">
                              {format(new Date(event.date), "h:mm a")}
                            </span>
                            <span className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-md border ${style.badge}`}>
                              {event.type}
                            </span>
                          </div>
                          <h4 className="text-xs font-semibold text-[#1D1D1F] leading-snug">{event.title}</h4>
                          {event.metadata?.propertyName && (
                            <p className="text-xs font-normal text-[#6E6E73] flex items-center gap-1">
                              <Building className="h-3.5 w-3.5 text-[#6E6E73]" />
                              {event.metadata.propertyName}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" className="h-8 w-8 p-0 rounded-xl hover:bg-slate-200/60 text-[#1D1D1F] shrink-0">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── VIEW 2: WEEK TIMETABLE VIEW ── */}
      {viewMode === "WEEK" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Weekday Header */}
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50 text-center py-3.5">
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="space-y-1">
                <span className="text-xs font-normal text-[#6E6E73] block">
                  {format(day, "EEE")}
                </span>
                <span
                  className={`inline-flex h-7 w-7 rounded-lg text-xs font-semibold items-center justify-center ${
                    isToday(day) ? "bg-emerald-600 text-white shadow-2xs" : "text-[#1D1D1F]"
                  }`}
                >
                  {format(day, "d")}
                </span>
              </div>
            ))}
          </div>

          {/* Timetable Body */}
          <div className="grid grid-cols-7 divide-x divide-slate-100 min-h-[420px] bg-white">
            {weekDays.map((day) => {
              const dayEvents = getEventsForDay(day);
              return (
                <div key={day.toISOString()} className="p-2 space-y-2.5">
                  {dayEvents.length === 0 ? (
                    <div className="h-full min-h-[200px] flex items-center justify-center text-[#6E6E73] text-xs font-normal italic">
                      No Events
                    </div>
                  ) : (
                    dayEvents.map((event) => {
                      const style = getCategoryStyle(event.type);
                      return (
                        <div
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all hover:shadow-xs ${style.bg}`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-xs font-normal text-[#6E6E73] flex items-center gap-1">
                              <Clock className="h-3 w-3 text-[#6E6E73]" />
                              {format(new Date(event.date), "h:mm a")}
                            </span>
                          </div>
                          <p className="font-semibold text-xs text-[#1D1D1F] leading-snug line-clamp-2">{event.title}</p>
                          {event.metadata?.propertyName && (
                            <p className="text-xs font-normal text-[#6E6E73] mt-1 truncate">
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
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden space-y-4">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-[#1D1D1F] tracking-tight">Agenda Feed</h3>
              <p className="text-xs font-normal text-[#6E6E73]">Chronological schedule of upcoming events and tasks.</p>
            </div>
            <span className="text-xs font-medium px-3 py-1 bg-white text-[#1D1D1F] border border-slate-200 rounded-xl shadow-2xs">
              {filteredEvents.length} Scheduled Items
            </span>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="p-16 text-center text-[#6E6E73] space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
              <p className="text-xs font-semibold text-[#1D1D1F]">No scheduled events found</p>
              <p className="text-xs text-[#6E6E73] font-normal">Try selecting a different date range or event filter.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredEvents.map((event) => {
                const style = getCategoryStyle(event.type);
                return (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className="p-5 hover:bg-slate-50/50 transition-colors flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[50px] p-2 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs">
                        <span className="text-[10px] font-medium text-[#6E6E73] uppercase tracking-wider block">
                          {format(new Date(event.date), "MMM")}
                        </span>
                        <span className="text-xl font-semibold text-[#1D1D1F]">
                          {format(new Date(event.date), "d")}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <span className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-md border ${style.badge}`}>
                          {event.type}
                        </span>
                        <h4 className="text-xs font-semibold text-[#1D1D1F]">{event.title}</h4>
                        {event.metadata?.propertyName && (
                          <p className="text-xs font-normal text-[#6E6E73] flex items-center gap-1">
                            <Building className="h-3.5 w-3.5 text-[#6E6E73]" />
                            {event.metadata.propertyName} {event.metadata.unitNumber ? `&bull; Unit ${event.metadata.unitNumber}` : ""}
                          </p>
                        )}
                      </div>
                    </div>

                    <Button variant="ghost" className="h-9 px-4 text-xs font-medium text-[#1D1D1F] hover:bg-slate-100 rounded-xl border border-slate-200/80 cursor-pointer">
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
        <DialogContent className="max-w-md bg-white rounded-3xl border border-slate-200 p-6 shadow-2xl font-sans">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900 tracking-tight">
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
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md border shadow-2xs ${style.badge}`}>
                      {event.type}
                    </span>
                    <span className="text-[11px] font-semibold opacity-80">
                      {format(new Date(event.date), "h:mm a")}
                    </span>
                  </div>
                  <p className="font-extrabold leading-snug">{event.title}</p>
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

