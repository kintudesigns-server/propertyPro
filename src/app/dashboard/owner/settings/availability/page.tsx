"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  Globe,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

export default function OwnerAvailabilitySettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [blockTourSlots, setBlockTourSlots] = useState(false);
  const [pausedAt, setPausedAt] = useState<string | null>(null);

  const [timezone, setTimezone] = useState("America/New_York");
  const [workingHours, setWorkingHours] = useState<Record<string, { start: string; end: string; enabled: boolean }>>({
    monday: { start: "09:00", end: "18:00", enabled: true },
    tuesday: { start: "09:00", end: "18:00", enabled: true },
    wednesday: { start: "09:00", end: "18:00", enabled: true },
    thursday: { start: "09:00", end: "18:00", enabled: true },
    friday: { start: "09:00", end: "18:00", enabled: true },
    saturday: { start: "10:00", end: "16:00", enabled: true },
    sunday: { start: "10:00", end: "16:00", enabled: false },
  });
  const [blackoutDates, setBlackoutDates] = useState<string[]>([]);
  const [newBlackoutDate, setNewBlackoutDate] = useState("");

  useEffect(() => {
    fetch("/api/owner-availability")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          if (data.timezone) setTimezone(data.timezone);
          if (data.workingHours && Object.keys(data.workingHours).length > 0) {
            setWorkingHours((prev) => ({ ...prev, ...data.workingHours }));
          }
          if (Array.isArray(data.blackoutDates)) {
            setBlackoutDates(data.blackoutDates);
          }
        }
      })
      .catch((err) => toast.error("Failed to load availability settings"))
      .finally(() => setLoading(false));

    fetch("/api/subscription/rules")
      .then((res) => (res.ok ? res.json() : null))
      .then((rules) => {
        if (rules) {
          setIsPaused(!!rules.isPaused);
          setBlockTourSlots(!!rules.blockTourSlots);
          setPausedAt(rules.pausedAt || null);
        }
      })
      .catch(() => {});
  }, []);

  const handleDayToggle = (dayKey: string) => {
    setWorkingHours((prev) => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], enabled: !prev[dayKey].enabled },
    }));
  };

  const handleTimeChange = (dayKey: string, field: "start" | "end", val: string) => {
    setWorkingHours((prev) => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], [field]: val },
    }));
  };

  const handleAddBlackoutDate = () => {
    if (!newBlackoutDate) return;
    if (blackoutDates.includes(newBlackoutDate)) {
      toast.error("This date is already blocked.");
      return;
    }
    setBlackoutDates((prev) => [...prev, newBlackoutDate].sort());
    setNewBlackoutDate("");
    toast.success("Blackout date added!");
  };

  const handleRemoveBlackoutDate = (dateStr: string) => {
    setBlackoutDates((prev) => prev.filter((d) => d !== dateStr));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/owner-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timezone,
          workingHours,
          blackoutDates,
        }),
      });

      if (res.ok) {
        toast.success("Availability schedule saved successfully!");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save availability");
      }
    } catch (err) {
      toast.error("Error saving availability settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-[#8E8E93] font-medium">Loading availability settings...</div>;
  }

  return (
    <div className="flex-1 space-y-8 p-8 pt-6 max-w-5xl mx-auto">

      {isPaused && (
        <div className="bg-[#FFF9E6] border border-[#FFE0A3] rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-900">
                Tour scheduling is paused. Reactivate to update your showing availability.
              </p>
              {(() => {
                if (!pausedAt) return null;
                const pausedDate = new Date(pausedAt);
                const archivalDate = new Date(pausedDate.getTime() + 60 * 24 * 60 * 60 * 1000);
                const now = new Date();
                const diffTime = archivalDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays < 0) {
                  return <p className="text-xs font-semibold text-red-600 mt-0.5">Flagged for manual database archival review due to prolonged inactivity.</p>;
                } else {
                  return <p className="text-xs font-semibold text-amber-700 mt-0.5">{diffDays} days remaining before database archival review.</p>;
                }
              })()}
            </div>
          </div>
          <a href="/dashboard/owner/billing" className="inline-flex items-center justify-center font-bold bg-[#B25E00] hover:bg-[#804400] text-white rounded-xl text-xs px-4 py-2 shadow-xs transition-colors shrink-0">
            Reactivate Subscription
          </a>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900">Showing Availability Settings</h2>
          <p className="text-[#6E6E73] text-sm mt-1">
            Configure your showing working hours and blackout dates for prospect tour requests.
          </p>
        </div>
        <Button
          disabled={saving || blockTourSlots}
          onClick={handleSave}
          className={`rounded-xl h-11 px-6 font-bold text-xs flex items-center gap-2 shadow-sm transition-all ${
            blockTourSlots 
              ? "bg-[#D1D1D6] text-[#8E8E93] cursor-not-allowed hover:bg-[#D1D1D6]" 
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
          title={blockTourSlots ? "Tour scheduling is paused while account is suspended" : undefined}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : blockTourSlots ? (
            <Lock className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {blockTourSlots ? "Scheduling Paused" : "Save Availability"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Weekly Schedule */}
        <Card className="md:col-span-2 border border-slate-100 shadow-sm bg-white rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 px-6 py-4">
            <CardTitle className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" /> Weekly Showing Schedule
            </CardTitle>
            <CardDescription className="text-xs text-[#8E8E93] font-semibold">
              Set the time windows when you are available to conduct showings. Unchecked days are hidden from prospects.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {DAYS_OF_WEEK.map((day) => {
              const schedule = workingHours[day.key] || { start: "09:00", end: "18:00", enabled: false };
              return (
                <div
                  key={day.key}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-2xl border transition-all gap-3 ${
                    schedule.enabled ? "bg-white border-slate-200 shadow-xs" : "bg-slate-50 border-slate-100 opacity-60"
                  }`}
                >
                  <label className="flex items-center gap-3 cursor-pointer min-w-[130px]">
                    <input
                      type="checkbox"
                      checked={schedule.enabled}
                      onChange={() => handleDayToggle(day.key)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{day.label}</span>
                  </label>

                  {schedule.enabled ? (
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#6E6E73]">
                      <Input
                        type="time"
                        value={schedule.start}
                        onChange={(e) => handleTimeChange(day.key, "start", e.target.value)}
                        className="bg-slate-50 border-slate-200 rounded-xl h-9 text-xs font-semibold w-28"
                      />
                      <span>to</span>
                      <Input
                        type="time"
                        value={schedule.end}
                        onChange={(e) => handleTimeChange(day.key, "end", e.target.value)}
                        className="bg-slate-50 border-slate-200 rounded-xl h-9 text-xs font-semibold w-28"
                      />
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-[#8E8E93] italic">Unavailable</span>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Right Column: Timezone & Blackouts */}
        <div className="space-y-6">
          {/* Timezone Card */}
          <Card className="border border-slate-100 shadow-sm bg-white rounded-2xl">
            <CardHeader className="px-6 py-4 border-b border-slate-100">
              <CardTitle className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Globe className="h-4 w-4 text-purple-600" /> Showing Timezone
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Default Timezone</Label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Phoenix">Arizona (MST - no DST)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="America/Anchorage">Alaska Time (AKT)</option>
                <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
              </select>
            </CardContent>
          </Card>

          {/* Blackout Dates Card */}
          <Card className="border border-slate-100 shadow-sm bg-white rounded-2xl">
            <CardHeader className="px-6 py-4 border-b border-slate-100">
              <CardTitle className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-rose-600" /> Blackout Dates
              </CardTitle>
              <CardDescription className="text-xs text-[#8E8E93] font-semibold">
                Block specific holidays or vacation days from being booked.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex gap-2">
                <Input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={newBlackoutDate}
                  onChange={(e) => setNewBlackoutDate(e.target.value)}
                  className="bg-slate-50 border-slate-200 rounded-xl h-10 text-xs font-semibold"
                />
                <Button
                  onClick={handleAddBlackoutDate}
                  disabled={!newBlackoutDate}
                  className="bg-slate-900 hover:bg-[#007AFF] text-white rounded-xl h-10 px-3 font-bold text-xs shrink-0 flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>

              {blackoutDates.length === 0 ? (
                <p className="text-xs text-[#8E8E93] italic text-center py-2">No blackout dates added.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {blackoutDates.map((dateStr) => (
                    <div
                      key={dateStr}
                      className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-700"
                    >
                      <span>{new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>
                      <button
                        onClick={() => handleRemoveBlackoutDate(dateStr)}
                        className="text-[#8E8E93] hover:text-rose-600 transition-colors p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
