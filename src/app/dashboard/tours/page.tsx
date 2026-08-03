"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  Clock,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  Video,
  Star,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  RotateCcw,
  ExternalLink,
  Search,
  Building2,
  Home,
  AlertTriangle,
  ChevronRight,
  Settings,
  Copy,
  X,
  User,
  Eye,
  ArrowUpDown,
  Filter,
  MoreVertical,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { getTimezoneForState, formatDateTimeInTimezone } from "@/lib/timezones";

interface Tour {
  id: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  tenantMessage?: string | null;
  tourType: "IN_PERSON" | "VIDEO_CALL";
  scheduledAt: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  rescheduledAt?: string | null;
  meetingLink?: string | null;
  ownerNotes?: string | null;
  ownerProspectRating?: number | null;
  ownerProspectNotes?: string | null;
  feedbackRating: number | null;
  feedbackComments: string | null;
  feedbackCategories?: {
    propertyCondition?: number;
    photoAccuracy?: number;
    landlordPunctuality?: number;
    neighborhoodSafety?: number;
  } | null;
  verifiedEmail?: boolean;
  createdAt: string;
  property: { name: string; address: string; city?: string; state?: string };
  unit?: { name: string } | null;
}

const STATUS_THEMES = {
  PENDING: {
    label: "Pending Review",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  CONFIRMED: {
    label: "Confirmed",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  COMPLETED: {
    label: "Completed",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  CANCELLED: {
    label: "Cancelled",
    badge: "bg-slate-100 text-[#6E6E73] border-slate-200",
    dot: "bg-slate-400",
  },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${
            star <= rating
              ? "fill-amber-400 text-amber-400"
              : "fill-slate-200 text-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

export default function ShowingToursPage() {
  const { data: session } = useSession();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Sorting & Pagination
  const [activeTab, setActiveTab] = useState<
    "ALL" | "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED"
  >("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState<"ALL" | "IN_PERSON" | "VIDEO_CALL">("ALL");
  const [sortOption, setSortOption] = useState<"NEWEST_REQUESTED" | "OLDEST_REQUESTED" | "SCHEDULED_DATE">("NEWEST_REQUESTED");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selected tour for detail drawer
  const [detailTour, setDetailTour] = useState<Tour | null>(null);

  // Action states inside detail drawer
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelReasonInput, setCancelReasonInput] = useState("");
  const [meetingLinkInput, setMeetingLinkInput] = useState("");
  const [rescheduleDateInput, setRescheduleDateInput] = useState("");
  const [prospectNotesInput, setProspectNotesInput] = useState("");
  const [prospectRatingInput, setProspectRatingInput] = useState<number | 0>(0);
  const [sendApplicationInvite, setSendApplicationInvite] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Availability Settings modal
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [workingHours, setWorkingHours] = useState<any>({
    MON: { active: true, start: "09:00", end: "17:00" },
    TUE: { active: true, start: "09:00", end: "17:00" },
    WED: { active: true, start: "09:00", end: "17:00" },
    THU: { active: true, start: "09:00", end: "17:00" },
    FRI: { active: true, start: "09:00", end: "17:00" },
    SAT: { active: false, start: "10:00", end: "15:00" },
    SUN: { active: false, start: "10:00", end: "15:00" },
  });
  const [savingAvailability, setSavingAvailability] = useState(false);

  // Fetch Availability Hours
  useEffect(() => {
    async function fetchAvailability() {
      try {
        const res = await fetch("/api/tours/availability");
        if (res.ok) {
          const data = await res.json();
          if (data?.workingHours && Object.keys(data.workingHours).length > 0) {
            setWorkingHours(data.workingHours);
          }
        }
      } catch (err) {
        // Fallback to default state
      }
    }
    fetchAvailability();
  }, []);

  async function handleSaveAvailability() {
    setSavingAvailability(true);
    try {
      const res = await fetch("/api/tours/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workingHours }),
      });
      if (res.ok) {
        toast.success("Availability hours saved successfully.");
        setAvailabilityOpen(false);
      } else {
        toast.error("Failed to save availability hours.");
      }
    } catch (err) {
      toast.error("Error saving availability hours.");
    } finally {
      setSavingAvailability(false);
    }
  }

  // Fetch Tours
  async function fetchTours() {
    setLoading(true);
    try {
      const res = await fetch("/api/tours");
      if (res.ok) {
        const data = await res.json();
        setTours(data);
      } else {
        toast.error("Failed to load tours.");
      }
    } catch (err) {
      toast.error("Error loading tours.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTours();
  }, []);

  // Reset pagination on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, formatFilter, sortOption]);

  // Sync inputs when detail tour changes
  useEffect(() => {
    if (detailTour) {
      setMeetingLinkInput(detailTour.meetingLink || "");
      setProspectNotesInput(detailTour.ownerProspectNotes || "");
      setProspectRatingInput(detailTour.ownerProspectRating || 0);
      setRescheduleDateInput(
        detailTour.scheduledAt ? new Date(detailTour.scheduledAt).toISOString().slice(0, 16) : ""
      );
    }
  }, [detailTour]);

  // Handle tour confirmation
  async function handleConfirm(tour: Tour) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tours/${tour.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CONFIRMED",
          meetingLink: meetingLinkInput,
          rescheduledAt: rescheduleDateInput || undefined,
        }),
      });
      if (res.ok) {
        toast.success("Tour request confirmed & prospect notified via email.");
        setDetailTour(null);
        fetchTours();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to confirm tour");
      }
    } catch (err) {
      toast.error("Error updating tour status");
    } finally {
      setActionLoading(false);
    }
  }

  // Handle tour cancellation
  async function handleCancel(tour: Tour) {
    if (!cancelReasonInput.trim()) {
      toast.error("Please enter a reason for cancellation.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tours/${tour.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CANCELLED",
          cancellationReason: cancelReasonInput,
        }),
      });
      if (res.ok) {
        toast.success("Tour cancelled and prospect notified.");
        setShowCancelDialog(false);
        setDetailTour(null);
        setCancelReasonInput("");
        fetchTours();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to cancel tour");
      }
    } catch (err) {
      toast.error("Error cancelling tour");
    } finally {
      setActionLoading(false);
    }
  }

  // Handle tour completion
  async function handleComplete(tour: Tour) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tours/${tour.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
          sendApplicationInvite,
          ownerProspectNotes: prospectNotesInput,
          ownerProspectRating: prospectRatingInput,
        }),
      });
      if (res.ok) {
        if (sendApplicationInvite) {
          toast.success("Tour completed & application invite sent to prospect!");
        } else {
          toast.success("Tour marked as completed.");
        }
        setDetailTour(null);
        fetchTours();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to complete tour");
      }
    } catch (err) {
      toast.error("Error updating tour status");
    } finally {
      setActionLoading(false);
    }
  }

  // Statistics
  const counts = {
    ALL: tours.length,
    PENDING: tours.filter((t) => t.status === "PENDING").length,
    CONFIRMED: tours.filter((t) => t.status === "CONFIRMED").length,
    COMPLETED: tours.filter((t) => t.status === "COMPLETED").length,
    CANCELLED: tours.filter((t) => t.status === "CANCELLED").length,
  };

  // Filtered & Sorted tours (Default: Newest Requested First)
  const filteredTours = useMemo(() => {
    return tours
      .filter((t) => {
        const matchesTab = activeTab === "ALL" || t.status === activeTab;
        const matchesFormat = formatFilter === "ALL" || t.tourType === formatFilter;
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          !q ||
          t.tenantName.toLowerCase().includes(q) ||
          t.tenantEmail.toLowerCase().includes(q) ||
          t.tenantPhone.toLowerCase().includes(q) ||
          t.property.name.toLowerCase().includes(q) ||
          (t.unit?.name && t.unit.name.toLowerCase().includes(q));
        return matchesTab && matchesFormat && matchesQuery;
      })
      .sort((a, b) => {
        if (sortOption === "NEWEST_REQUESTED") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else if (sortOption === "OLDEST_REQUESTED") {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        } else {
          return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
        }
      });
  }, [tours, activeTab, formatFilter, searchQuery, sortOption]);

  const emailCounts: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    tours.forEach((t) => {
      map[t.tenantEmail] = (map[t.tenantEmail] || 0) + 1;
    });
    return map;
  }, [tours]);

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 relative">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
              Showings &amp; Tours
            </h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
              Review prospect tour requests, send meeting details, and manage your property showing schedule.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setAvailabilityOpen(true)}
              className="h-9 px-3 text-xs font-bold rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <Settings className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
              Availability Hours
            </Button>
            <Button
              onClick={fetchTours}
              variant="outline"
              className="h-9 px-3 text-xs font-bold rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Sleek White KPI Cards with Border Accents */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              title: "Pending Approval",
              count: counts.PENDING,
              text: "Action required",
              borderAccent: "border-l-4 border-l-amber-500 bg-white",
              titleColor: "text-amber-800",
            },
            {
              title: "Confirmed Visits",
              count: counts.CONFIRMED,
              text: "Upcoming tours",
              borderAccent: "border-l-4 border-l-blue-500 bg-white",
              titleColor: "text-blue-800",
            },
            {
              title: "Completed",
              count: counts.COMPLETED,
              text: "Past showings",
              borderAccent: "border-l-4 border-l-emerald-500 bg-white",
              titleColor: "text-emerald-800",
            },
            {
              title: "Cancelled",
              count: counts.CANCELLED,
              text: "Inactive requests",
              borderAccent: "border-l-4 border-l-slate-400 bg-white",
              titleColor: "text-slate-600",
            },
          ].map((m) => (
            <Card
              key={m.title}
              className={`rounded-2xl border border-slate-200 shadow-xs transition-all ${m.borderAccent}`}
            >
              <CardContent className="p-4">
                <p className={`text-[10px] font-extrabold uppercase tracking-wider ${m.titleColor}`}>
                  {m.title}
                </p>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {m.count}
                </p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {m.text}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter & Control Bar (Clean 2-row layout) */}
        <Card className="bg-white border border-slate-200 shadow-xs rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/40 space-y-3">
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Status Segment Filter Tabs */}
              <div className="flex bg-slate-200/70 p-1 rounded-xl gap-1 overflow-x-auto">
                {(
                  [
                    { key: "ALL", label: "All Showings" },
                    { key: "PENDING", label: "Pending" },
                    { key: "CONFIRMED", label: "Confirmed" },
                    { key: "COMPLETED", label: "Completed" },
                    { key: "CANCELLED", label: "Cancelled" },
                  ] as const
                ).map((tab) => {
                  const active = activeTab === tab.key;
                  const count = counts[tab.key];
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                        active
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {tab.label}
                      {count > 0 && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                            active
                              ? "bg-slate-100 text-slate-700"
                              : "bg-slate-300/70 text-slate-700"
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Secondary Controls: Format Filter, Sort Selector, Search Input */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={formatFilter}
                  onChange={(e) => setFormatFilter(e.target.value as any)}
                  className="h-9 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-bold px-3 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer"
                >
                  <option value="ALL">All Formats</option>
                  <option value="IN_PERSON">In-Person</option>
                  <option value="VIDEO_CALL">Video Call</option>
                </select>

                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as any)}
                  className="h-9 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-bold px-3 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer"
                >
                  <option value="NEWEST_REQUESTED">⚡ Newest First</option>
                  <option value="OLDEST_REQUESTED">Oldest First</option>
                  <option value="SCHEDULED_DATE">Upcoming Scheduled Date</option>
                </select>

                <div className="relative w-full sm:w-52">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search prospect, property..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs rounded-xl bg-white border-slate-200 focus:bg-white font-medium"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Consolidated 5-Column High-Density Table Ledger */}
          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-slate-400 font-bold text-xs">
                Loading showing requests...
              </div>
            ) : filteredTours.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <CalendarIcon className="h-10 w-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No tour requests found</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  When prospective renters schedule property visits, their booking requests will appear here.
                </p>
              </div>
            ) : (
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="border-slate-200 bg-slate-50/60 hover:bg-transparent">
                    <TableHead className="text-slate-500 font-extrabold text-[10px] uppercase tracking-wider pl-6 py-3.5 w-[30%]">
                      Prospect Details
                    </TableHead>
                    <TableHead className="text-slate-500 font-extrabold text-[10px] uppercase tracking-wider py-3.5 w-[22%]">
                      Property &amp; Unit
                    </TableHead>
                    <TableHead className="text-slate-500 font-extrabold text-[10px] uppercase tracking-wider py-3.5 w-[24%]">
                      Showing Time &amp; Request Date
                    </TableHead>
                    <TableHead className="text-slate-500 font-extrabold text-[10px] uppercase tracking-wider py-3.5 w-[14%]">
                      Format &amp; Status
                    </TableHead>
                    <TableHead className="text-right text-slate-500 font-extrabold text-[10px] uppercase tracking-wider pr-6 py-3.5 w-[10%]">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const start = (currentPage - 1) * itemsPerPage;
                    const paginated = filteredTours.slice(start, start + itemsPerPage);
                    return paginated.map((tour) => {
                      const tz = getTimezoneForState(tour.property?.state);
                      const { dateStr, timeStr, tzAbbrev } = formatDateTimeInTimezone(
                        tour.scheduledAt,
                        tz
                      );
                      const theme = STATUS_THEMES[tour.status];
                      const isMultiBooker = (emailCounts[tour.tenantEmail] || 0) > 1;
                      const isSelected = detailTour?.id === tour.id;

                      const createdDate = new Date(tour.createdAt);
                      const daysAgo = Math.floor(
                        (Date.now() - createdDate.getTime()) / (1000 * 3600 * 24)
                      );

                      // Fix duplicate "Unit Unit X" string bug
                      const formattedUnitName = tour.unit?.name
                        ? tour.unit.name.toLowerCase().startsWith("unit")
                          ? tour.unit.name
                          : `Unit ${tour.unit.name}`
                        : null;

                      return (
                        <TableRow
                          key={tour.id}
                          onClick={() => setDetailTour(tour)}
                          className={`border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${
                            isSelected ? "bg-blue-50/40" : ""
                          }`}
                        >
                          {/* 1. Prospect Details */}
                          <TableCell className="font-bold text-slate-900 pl-6 py-3.5">
                            <div className="flex items-start gap-3">
                              <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 font-black text-sm flex items-center justify-center shrink-0 mt-0.5">
                                {tour.tenantName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-900 text-sm hover:text-blue-600 transition-colors">
                                    {tour.tenantName}
                                  </span>
                                  {tour.verifiedEmail && (
                                    <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[9px] font-bold px-1.5 py-0 rounded-full">
                                      <ShieldCheck className="h-2.5 w-2.5 mr-0.5 text-blue-600" /> Verified
                                    </Badge>
                                  )}
                                  {isMultiBooker && (
                                    <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[9px] font-bold px-1.5 py-0 rounded-full">
                                      <ShieldAlert className="h-2.5 w-2.5 mr-0.5 text-amber-600" /> Multi
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs font-semibold text-slate-500 truncate mt-0.5">
                                  {tour.tenantEmail}
                                </p>
                                <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                                  {tour.tenantPhone}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          {/* 2. Property & Unit */}
                          <TableCell className="py-3.5">
                            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                              <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{tour.property.name}</span>
                            </div>
                            <p className="text-[11px] font-medium text-slate-500 pl-5 mt-0.5">
                              {formattedUnitName || tour.property.address}
                            </p>
                          </TableCell>

                          {/* 3. Showing Time & Request Date (Combined Column!) */}
                          <TableCell className="py-3.5">
                            <p className="font-bold text-slate-900 text-xs">{dateStr}</p>
                            <p className="text-xs font-semibold text-slate-600 flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3 text-slate-400" />
                              {timeStr} <span className="text-[10px] font-extrabold text-slate-400">{tzAbbrev}</span>
                            </p>
                            <p className="text-[10px] font-semibold text-slate-400 mt-1">
                              Requested {createdDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ({daysAgo === 0 ? "Today" : `${daysAgo}d ago`})
                            </p>
                          </TableCell>

                          {/* 4. Format & Status (Stacked Badges) */}
                          <TableCell className="py-3.5">
                            <div className="space-y-1.5">
                              <div>
                                {tour.tourType === "VIDEO_CALL" ? (
                                  <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[11px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 w-fit">
                                    <Video className="h-3 w-3" /> Video Call
                                  </Badge>
                                ) : (
                                  <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[11px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 w-fit">
                                    <MapPin className="h-3 w-3 text-slate-400" /> In-Person
                                  </Badge>
                                )}
                              </div>
                              <Badge className={`${theme.badge} border text-[11px] font-extrabold px-2 py-0.5 rounded-lg flex items-center gap-1 w-fit`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                                {theme.label}
                              </Badge>
                            </div>
                          </TableCell>

                          {/* 5. 3-Dot Action Dropdown Menu */}
                          <TableCell className="text-right pr-6 py-3.5" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900 hover:bg-slate-100 inline-flex items-center justify-center rounded-xl transition-colors cursor-pointer outline-none">
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Open action menu</span>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52 rounded-2xl border-slate-200 p-1.5 shadow-xl bg-white space-y-0.5">
                                {tour.status === "PENDING" && (
                                  <DropdownMenuItem
                                    onClick={() => setDetailTour(tour)}
                                    className="cursor-pointer font-bold text-slate-900 py-2 px-3 rounded-xl focus:bg-slate-100 flex items-center gap-2"
                                  >
                                    <Eye className="h-4 w-4 text-blue-600" />
                                    Review Request
                                  </DropdownMenuItem>
                                )}

                                {tour.status === "CONFIRMED" && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => setDetailTour(tour)}
                                      className="cursor-pointer font-bold text-slate-900 py-2 px-3 rounded-xl focus:bg-slate-100 flex items-center gap-2"
                                    >
                                      <Eye className="h-4 w-4 text-slate-600" />
                                      Manage Showing
                                    </DropdownMenuItem>
                                    {tour.meetingLink && tour.tourType === "VIDEO_CALL" && (
                                      <DropdownMenuItem
                                        onClick={() => window.open(tour.meetingLink!, "_blank")}
                                        className="cursor-pointer font-bold text-purple-700 py-2 px-3 rounded-xl focus:bg-purple-50 flex items-center gap-2"
                                      >
                                        <Video className="h-4 w-4 text-purple-600" />
                                        Join Video Call
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                )}

                                {(tour.status === "COMPLETED" || tour.status === "CANCELLED") && (
                                  <DropdownMenuItem
                                    onClick={() => setDetailTour(tour)}
                                    className="cursor-pointer font-bold text-slate-900 py-2 px-3 rounded-xl focus:bg-slate-100 flex items-center gap-2"
                                  >
                                    <Eye className="h-4 w-4 text-slate-600" />
                                    View Details &amp; Feedback
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator className="bg-slate-100 my-1" />

                                <DropdownMenuItem
                                  onClick={() => window.open(`mailto:${tour.tenantEmail}`)}
                                  className="cursor-pointer font-semibold text-slate-700 py-1.5 px-3 rounded-xl focus:bg-slate-50 flex items-center gap-2 text-xs"
                                >
                                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                                  Email Prospect
                                </DropdownMenuItem>

                                {tour.tenantPhone && (
                                  <DropdownMenuItem
                                    onClick={() => window.open(`tel:${tour.tenantPhone}`)}
                                    className="cursor-pointer font-semibold text-slate-700 py-1.5 px-3 rounded-xl focus:bg-slate-50 flex items-center gap-2 text-xs"
                                  >
                                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                                    Call Prospect
                                  </DropdownMenuItem>
                                )}

                                {tour.meetingLink && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      navigator.clipboard.writeText(tour.meetingLink!);
                                      toast.success("Meeting link copied to clipboard!");
                                    }}
                                    className="cursor-pointer font-semibold text-slate-700 py-1.5 px-3 rounded-xl focus:bg-slate-50 flex items-center gap-2 text-xs"
                                  >
                                    <Copy className="h-3.5 w-3.5 text-slate-400" />
                                    Copy Meeting Link
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })()}
                </TableBody>
              </Table>
            )}

            {/* Pagination Bar */}
            <PaginationBar
              currentPage={currentPage}
              totalPages={Math.ceil(filteredTours.length / itemsPerPage) || 1}
              totalItems={filteredTours.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              itemLabel="tours"
            />
          </CardContent>
        </Card>

        {/* SLIDE-OVER SIDE DRAWER FOR TOUR DETAILS & ACTIONS */}
        {detailTour && (() => {
          const tz = getTimezoneForState(detailTour.property?.state);
          const { dateStr, timeStr, tzAbbrev } = formatDateTimeInTimezone(
            detailTour.scheduledAt,
            tz
          );

          return (
            <div className="fixed inset-0 z-50 overflow-hidden">
              <div
                onClick={() => setDetailTour(null)}
                className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
              />

              <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
                <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">

                  {/* Drawer Header */}
                  <div className="bg-slate-950 text-white p-6 shrink-0 relative">
                    <button
                      onClick={() => setDetailTour(null)}
                      className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[10px] font-mono uppercase px-2 py-0.5">
                          Ref #{detailTour.id.slice(-6).toUpperCase()}
                        </Badge>
                        <Badge className={`rounded-full text-xs font-bold px-3 py-0.5 border ${STATUS_THEMES[detailTour.status].badge}`}>
                          {STATUS_THEMES[detailTour.status].label}
                        </Badge>
                      </div>

                      <div>
                        <h2 className="text-xl font-black text-white">{detailTour.tenantName}</h2>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {detailTour.tenantEmail}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {detailTour.tenantPhone}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Drawer Body */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Schedule & Property Cards */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-1">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Schedule</p>
                        <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5 pt-0.5">
                          <CalendarIcon className="h-3.5 w-3.5 text-slate-500" />
                          {dateStr}
                        </p>
                        <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-500" />
                          {timeStr} <span className="text-slate-400 text-[10px]">{tzAbbrev}</span>
                        </p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-1">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Property</p>
                        <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5 pt-0.5 truncate">
                          <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{detailTour.property.name}</span>
                        </p>
                        <p className="text-xs font-semibold text-slate-600 truncate">
                          {detailTour.unit ? `Unit ${detailTour.unit.name.replace(/^unit\s+/i, "")}` : detailTour.property.address}
                        </p>
                      </div>
                    </div>

                    {/* Format Badge */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-1">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tour Format</p>
                      <div className="pt-1">
                        {detailTour.tourType === "VIDEO_CALL" ? (
                          <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs font-bold px-3 py-1 rounded-xl">
                            <Video className="h-3.5 w-3.5 mr-1.5" /> Virtual Video Call
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-xs font-bold px-3 py-1 rounded-xl">
                            <MapPin className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> In-Person Visit
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Prospect Message */}
                    {detailTour.tenantMessage && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Prospect Note</p>
                        <p className="text-xs font-medium text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200/80 italic">
                          "{detailTour.tenantMessage}"
                        </p>
                      </div>
                    )}

                    {/* Actions Panel */}
                    {detailTour.status === "PENDING" && (
                      <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 space-y-3">
                        <p className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Confirm Showing Request
                        </p>
                        {detailTour.tourType === "VIDEO_CALL" && (
                          <div className="space-y-1">
                            <Label className="text-[11px] font-bold text-slate-700">Video Call Link (Google Meet / Zoom)</Label>
                            <Input
                              placeholder="https://meet.google.com/xyz-abc"
                              value={meetingLinkInput}
                              onChange={(e) => setMeetingLinkInput(e.target.value)}
                              className="h-9 text-xs rounded-xl bg-white"
                            />
                          </div>
                        )}
                        <div className="flex gap-2 pt-1">
                          <Button
                            onClick={() => handleConfirm(detailTour)}
                            disabled={actionLoading}
                            className="flex-1 h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                          >
                            Confirm Tour &amp; Email Prospect
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setShowCancelDialog(true)}
                            className="h-9 text-xs font-bold text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl"
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    )}

                    {detailTour.status === "CONFIRMED" && (
                      <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4 space-y-3">
                        <p className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-blue-600" /> Complete or Manage Visit
                        </p>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="inviteCheck"
                            checked={sendApplicationInvite}
                            onChange={(e) => setSendApplicationInvite(e.target.checked)}
                            className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                          />
                          <label htmlFor="inviteCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
                            Send rental application invite link via email
                          </label>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <Button
                            onClick={() => handleComplete(detailTour)}
                            disabled={actionLoading}
                            className="flex-1 h-9 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                          >
                            Mark Completed
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setShowCancelDialog(true)}
                            className="h-9 text-xs font-bold text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Feedback Rating if Completed */}
                    {detailTour.status === "COMPLETED" && detailTour.feedbackRating && (
                      <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 space-y-2">
                        <p className="text-xs font-bold text-amber-900">Prospect Tour Feedback</p>
                        <StarRating rating={detailTour.feedbackRating} />
                        {detailTour.feedbackComments && (
                          <p className="text-xs text-slate-700 italic">"{detailTour.feedbackComments}"</p>
                        )}
                      </div>
                    )}

                  </div>

                </div>
              </div>
            </div>
          );
        })()}

        {/* Cancellation Reason Modal */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">Cancel Tour Request</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Please provide a cancellation reason. An email notification will be sent to the prospect.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <Label className="text-xs font-bold text-slate-700">Reason for cancellation *</Label>
              <Input
                placeholder="e.g. Unit currently under unexpected maintenance..."
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                className="text-xs rounded-xl"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setShowCancelDialog(false)}
                className="rounded-xl text-xs font-bold"
              >
                Keep Request
              </Button>
              <Button
                onClick={() => detailTour && handleCancel(detailTour)}
                disabled={actionLoading}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                Confirm Cancellation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Availability Settings Dialog */}
        <Dialog open={availabilityOpen} onOpenChange={setAvailabilityOpen}>
          <DialogContent className="sm:max-w-lg rounded-3xl p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">Configure Showing Availability</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Set active days and working hours for prospective renters booking showing slots.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {Object.keys(workingHours).map((day) => {
                const config = workingHours[day];
                return (
                  <div key={day} className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={config.active}
                        onChange={(e) =>
                          setWorkingHours({
                            ...workingHours,
                            [day]: { ...config, active: e.target.checked },
                          })
                        }
                        className="rounded text-blue-600 h-4 w-4"
                      />
                      <span className="text-xs font-extrabold text-slate-800 w-12">{day}</span>
                    </div>

                    {config.active ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={config.start}
                          onChange={(e) =>
                            setWorkingHours({
                              ...workingHours,
                              [day]: { ...config, start: e.target.value },
                            })
                          }
                          className="h-8 text-xs w-24 rounded-lg bg-white"
                        />
                        <span className="text-xs font-bold text-slate-400">to</span>
                        <Input
                          type="time"
                          value={config.end}
                          onChange={(e) =>
                            setWorkingHours({
                              ...workingHours,
                              [day]: { ...config, end: e.target.value },
                            })
                          }
                          className="h-8 text-xs w-24 rounded-lg bg-white"
                        />
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-slate-400 italic">Off</span>
                    )}
                  </div>
                );
              })}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAvailabilityOpen(false)}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAvailability}
                disabled={savingAvailability}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
              >
                Save Availability
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
