"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Video,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { generateGoogleCalendarUrl } from "@/lib/ics";
import { getTimezoneForState, formatDateTimeInTimezone } from "@/lib/timezones";

export interface ScheduleTourModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: {
    id: string;
    name: string;
    property: {
      id: string;
      name: string;
      address: string;
      city?: string;
      state?: string;
    };
  };
  onSuccess?: () => void;
}

export function ScheduleTourModal({
  open,
  onOpenChange,
  unit,
  onSuccess,
}: ScheduleTourModalProps) {
  const { data: session } = useSession();

  const [tourStep, setTourStep] = useState<"FORM" | "OTP" | "SUCCESS">("FORM");
  const [tourName, setTourName] = useState("");
  const [tourEmail, setTourEmail] = useState("");
  const [tourPhone, setTourPhone] = useState("");
  const [tourType, setTourType] = useState<"IN_PERSON" | "VIDEO_CALL">("IN_PERSON");
  const [tourDate, setTourDate] = useState("");
  const [tourTime, setTourTime] = useState("09:00:00");
  const [tourMessage, setTourMessage] = useState("");
  const [tourHoneypot, setTourHoneypot] = useState("");
  const [tourOtpCode, setTourOtpCode] = useState("");

  const [schedulingTour, setSchedulingTour] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpDevFallbackCode, setOtpDevFallbackCode] = useState("");
  const [autoCloseSeconds, setAutoCloseSeconds] = useState(10);

  // Booked slots state
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isSlotConflicting, setIsSlotConflicting] = useState(false);

  // Populate user defaults
  useEffect(() => {
    if (session?.user) {
      setTourName((session.user as any).name || "");
      setTourEmail((session.user as any).email || "");
      if ((session.user as any).phone) setTourPhone((session.user as any).phone);
    }
  }, [session]);

  // Reset modal state when opened
  useEffect(() => {
    if (open) {
      setTourStep("FORM");
      setTourOtpCode("");
      setOtpDevFallbackCode("");
      setAutoCloseSeconds(10);
      
      // Default to tomorrow's date if empty
      if (!tourDate) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setTourDate(tomorrow.toISOString().split("T")[0]);
      }
    }
  }, [open]);

  // Countdown for Resend OTP
  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => setOtpCooldown(otpCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCooldown]);

  // Countdown for Auto-close on SUCCESS
  useEffect(() => {
    if (tourStep === "SUCCESS" && autoCloseSeconds > 0) {
      const timer = setTimeout(() => setAutoCloseSeconds(autoCloseSeconds - 1), 1000);
      return () => clearTimeout(timer);
    } else if (tourStep === "SUCCESS" && autoCloseSeconds === 0) {
      onOpenChange(false);
    }
  }, [tourStep, autoCloseSeconds]);

  // Fetch booked slots when date or property changes
  useEffect(() => {
    if (open && tourDate && unit?.property?.id) {
      setLoadingSlots(true);
      fetch(`/api/tours?propertyId=${unit.property.id}&date=${tourDate}`)
        .then((res) => (res.ok ? res.json() : []))
        .then((slots: string[]) => setBookedSlots(slots))
        .catch(() => setBookedSlots([]))
        .finally(() => setLoadingSlots(false));
    }
  }, [open, tourDate, unit?.property?.id]);

  // Check if chosen time conflicts with any booked slot (within ±30 min)
  useEffect(() => {
    if (tourDate && tourTime && bookedSlots.length > 0) {
      const selectedTime = new Date(`${tourDate}T${tourTime}`).getTime();
      const conflict = bookedSlots.some((slotStr) => {
        const bookedTime = new Date(slotStr).getTime();
        return Math.abs(selectedTime - bookedTime) < 30 * 60 * 1000;
      });
      setIsSlotConflicting(conflict);
    } else {
      setIsSlotConflicting(false);
    }
  }, [tourDate, tourTime, bookedSlots]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tourName || !tourEmail || !tourPhone || !tourDate) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (isSlotConflicting) {
      toast.error("The selected time slot is already booked. Please choose another time.");
      return;
    }

    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const cleanPhone = tourPhone.replace(/[\s\-\(\)]/g, "");
    if (!phoneRegex.test(cleanPhone)) {
      toast.error("Please enter a valid phone number (e.g. +15551234567).");
      return;
    }

    setSchedulingTour(true);
    setOtpDevFallbackCode("");

    try {
      const res = await fetch("/api/tours/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: tourEmail,
          propertyId: unit.property.id,
          unitId: unit.id,
          honeypot: tourHoneypot,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Verification code sent to your email!");
        setTourStep("OTP");
        setOtpCooldown(60);
        if (data.otpDevFallback) {
          setOtpDevFallbackCode(data.otpDevFallback);
        }
      } else {
        toast.error(data.error || "Failed to send verification code.");
      }
    } catch (err) {
      toast.error("Error connecting to server. Please try again.");
    } finally {
      setSchedulingTour(false);
    }
  };

  const handleTourSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tourOtpCode || tourOtpCode.length < 6) {
      toast.error("Please enter the 6-digit verification code.");
      return;
    }

    setSchedulingTour(true);
    try {
      const scheduledAt = `${tourDate}T${tourTime}`;
      const res = await fetch("/api/tours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: unit.property.id,
          unitId: unit.id,
          tenantName: tourName,
          tenantEmail: tourEmail,
          tenantPhone: tourPhone,
          tenantMessage: tourMessage,
          tourType,
          scheduledAt,
          otpCode: tourOtpCode,
        }),
      });

      if (res.ok) {
        toast.success("Verification successful! Tour request submitted.");
        setTourStep("SUCCESS");
        if (onSuccess) onSuccess();
      } else {
        const err = await res.json();
        toast.error(err.error || "Verification failed. Please try again.");
      }
    } catch (err) {
      toast.error("Error scheduling tour.");
    } finally {
      setSchedulingTour(false);
    }
  };

  const tz = getTimezoneForState(unit?.property?.state);
  const scheduledDateObj = tourDate && tourTime ? new Date(`${tourDate}T${tourTime}`) : new Date();
  const { dateStr, timeStr, tzAbbrev } = formatDateTimeInTimezone(scheduledDateObj, tz);

  const googleCalUrl = generateGoogleCalendarUrl({
    title: `Property Tour: ${unit?.property?.name || "PropertyPro Unit"}`,
    description: `Showing tour for ${unit?.property?.name} (${unit?.name}). Scheduled via PropertyPro.`,
    location: `${unit?.property?.address}, ${unit?.property?.city || ""}`,
    start: scheduledDateObj,
    durationMinutes: 45,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-[#E5E5EA] text-slate-800 rounded-3xl max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4">
            <DialogTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-blue-600" />
              Schedule a Showing
            </DialogTitle>
            <Badge variant="outline" className="text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border-blue-200">
              Verified Showing
            </Badge>
          </div>
          <DialogDescription className="text-xs text-[#8E8E93] font-semibold">
            {unit?.property?.name} {unit?.name ? `(${unit.name})` : ""} — {unit?.property?.address}
          </DialogDescription>
        </DialogHeader>

        {tourStep === "FORM" && (
          <form onSubmit={handleSendOtp} className="space-y-4 py-2">
            {/* Honeypot anti-spam field */}
            <input
              type="text"
              name="website_url_honeypot"
              value={tourHoneypot}
              onChange={(e) => setTourHoneypot(e.target.value)}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
            />

            {/* Tour Type Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Tour Type <span className="text-rose-500">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTourType("IN_PERSON")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-2xl border-2 font-bold text-xs transition-all ${
                    tourType === "IN_PERSON"
                      ? "border-blue-600 bg-blue-50 text-blue-900 shadow-xs"
                      : "border-slate-100 bg-white text-[#6E6E73] hover:border-slate-200"
                  }`}
                >
                  <MapPin className="h-4 w-4 text-blue-600" /> In-Person Showing
                </button>
                <button
                  type="button"
                  onClick={() => setTourType("VIDEO_CALL")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-2xl border-2 font-bold text-xs transition-all ${
                    tourType === "VIDEO_CALL"
                      ? "border-blue-600 bg-blue-50 text-blue-900 shadow-xs"
                      : "border-slate-100 bg-white text-[#6E6E73] hover:border-slate-200"
                  }`}
                >
                  <Video className="h-4 w-4 text-purple-600" /> Virtual Video Call
                </button>
              </div>
            </div>

            {/* Date and Time Pickers */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Preferred Date <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={tourDate}
                  onChange={(e) => setTourDate(e.target.value)}
                  className="bg-slate-50 border-slate-200 rounded-xl h-11 text-xs font-semibold"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Time Slot ({tzAbbrev || "Local"}) <span className="text-rose-500">*</span>
                </Label>
                <select
                  value={tourTime}
                  onChange={(e) => setTourTime(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                >
                  {[
                    "08:00:00", "09:00:00", "10:00:00", "11:00:00",
                    "12:00:00", "13:00:00", "14:00:00", "15:00:00",
                    "16:00:00", "17:00:00", "18:00:00"
                  ].map((t) => {
                    const display = new Date(`2026-01-01T${t}`).toLocaleTimeString("en-US", {
                      hour: "numeric", minute: "2-digit"
                    });
                    return (
                      <option key={t} value={t}>{display}</option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Slot Conflict Warning */}
            {isSlotConflicting && (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl flex items-center gap-2 text-rose-800 text-xs font-semibold">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                This time slot is already booked or conflicts with another showing. Please choose a different time.
              </div>
            )}

            {/* Contact Details */}
            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Full Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. Sarah Jenkins"
                  value={tourName}
                  onChange={(e) => setTourName(e.target.value)}
                  className="bg-slate-50 border-slate-200 rounded-xl h-11 text-xs font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Email <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    placeholder="sarah@example.com"
                    value={tourEmail}
                    onChange={(e) => setTourEmail(e.target.value)}
                    className="bg-slate-50 border-slate-200 rounded-xl h-11 text-xs font-semibold"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Phone Number <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="+1 (555) 000-0000"
                    value={tourPhone}
                    onChange={(e) => setTourPhone(e.target.value)}
                    className="bg-slate-50 border-slate-200 rounded-xl h-11 text-xs font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Message for Landlord (Optional)
                </Label>
                <textarea
                  placeholder="e.g. Looking to move in next month, have 1 cat..."
                  value={tourMessage}
                  onChange={(e) => setTourMessage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 h-20 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" className="rounded-xl font-bold" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={schedulingTour || isSlotConflicting}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold h-11 px-6 text-xs"
              >
                {schedulingTour ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending Code...
                  </>
                ) : (
                  "Verify & Request Tour"
                )}
              </Button>
            </div>
          </form>
        )}

        {tourStep === "OTP" && (
          <form onSubmit={handleTourSubmit} className="space-y-5 py-2">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl text-center space-y-1">
              <UserCheck className="h-8 w-8 text-blue-600 mx-auto mb-1" />
              <p className="text-xs font-bold text-blue-900">Enter Verification Code</p>
              <p className="text-[11px] text-blue-700 font-medium">
                We sent a 6-digit verification code to <strong>{tourEmail}</strong>.
              </p>
            </div>

            {otpDevFallbackCode && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-center">
                <p className="text-xs font-bold text-amber-800">
                  [DEV ONLY] Fallback Code: <span className="font-mono text-base tracking-widest text-amber-900">{otpDevFallbackCode}</span>
                </p>
              </div>
            )}

            <div className="space-y-2 text-center">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                6-Digit Security Code
              </Label>
              <Input
                type="text"
                maxLength={6}
                placeholder="123456"
                value={tourOtpCode}
                onChange={(e) => setTourOtpCode(e.target.value.replace(/\D/g, ""))}
                className="w-48 mx-auto text-center font-mono text-xl tracking-[8px] h-12 rounded-xl bg-slate-50 border-slate-300 font-bold focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="flex justify-between items-center text-xs font-semibold px-2">
              <button
                type="button"
                onClick={() => setTourStep("FORM")}
                className="text-[#6E6E73] hover:text-slate-800 font-bold"
              >
                ← Change Email
              </button>
              <button
                type="button"
                disabled={otpCooldown > 0 || schedulingTour}
                onClick={() => handleSendOtp()}
                className={`font-bold ${otpCooldown > 0 ? "text-slate-300 cursor-not-allowed" : "text-blue-600 hover:underline"}`}
              >
                {otpCooldown > 0 ? `Resend code in ${otpCooldown}s` : "Resend Code"}
              </button>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" className="rounded-xl font-bold" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={schedulingTour || tourOtpCode.length < 6}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold h-11 px-6 text-xs"
              >
                {schedulingTour ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Confirming...
                  </>
                ) : (
                  "Confirm Showing Request"
                )}
              </Button>
            </div>
          </form>
        )}

        {tourStep === "SUCCESS" && (
          <div className="space-y-6 py-4 text-center animate-in fade-in">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900">Tour Request Submitted!</h3>
              <p className="text-xs text-[#6E6E73] font-semibold mt-1">
                The landlord has been notified and will confirm your visit shortly.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl text-left space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="font-semibold text-[#6E6E73]">Property:</span>
                <span className="font-bold text-slate-800">{unit?.property?.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="font-semibold text-[#6E6E73]">Date & Time:</span>
                <span className="font-bold text-slate-800">{dateStr} at {timeStr} {tzAbbrev}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-[#6E6E73]">Showing Type:</span>
                <span className="font-bold text-blue-600">
                  {tourType === "VIDEO_CALL" ? "Virtual Video Call" : "In-Person Showing"}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <a href={googleCalUrl} target="_blank" rel="noopener noreferrer" className="block">
                <Button variant="outline" className="w-full h-11 rounded-xl font-bold text-xs border-slate-300 hover:bg-[#F2F2F7] flex items-center justify-center gap-2 text-slate-800">
                  <CalendarIcon className="h-4 w-4 text-blue-600" /> Add to Google Calendar <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </a>

              <Link href="/dashboard/tenant/tours" onClick={() => onOpenChange(false)} className="block">
                <Button className="w-full h-11 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-xs">
                  View My Scheduled Tours →
                </Button>
              </Link>
            </div>

            <p className="text-[10px] text-[#8E8E93] font-semibold">
              Closing automatically in {autoCloseSeconds} seconds...
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
