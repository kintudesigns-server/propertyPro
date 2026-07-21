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
    return <div className="py-12 text-center text-slate-400 font-medium">Loading availability settings...</div>;
  }

  return (
    <div className="flex-1 space-y-8 p-8 pt-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900">Showing Availability Settings</h2>
          <p className="text-slate-500 text-sm mt-1">
            Configure your showing working hours and blackout dates for prospect tour requests.
          </p>
        </div>
        <Button
          disabled={saving}
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-6 font-bold text-xs flex items-center gap-2 shadow-sm"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Availability
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Weekly Schedule */}
        <Card className="md:col-span-2 border border-slate-100 shadow-sm bg-white rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 px-6 py-4">
            <CardTitle className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" /> Weekly Showing Schedule
            </CardTitle>
            <CardDescription className="text-xs text-slate-400 font-semibold">
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
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
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
                    <span className="text-xs font-bold text-slate-400 italic">Unavailable</span>
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
              <CardDescription className="text-xs text-slate-400 font-semibold">
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
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-10 px-3 font-bold text-xs shrink-0 flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>

              {blackoutDates.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-2">No blackout dates added.</p>
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
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
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
