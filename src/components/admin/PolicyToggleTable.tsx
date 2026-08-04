"use client";

import React, { useState } from "react";
import { LucideIcon, Clock, X } from "lucide-react";

export interface PolicyRowData {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  value: string; // "default" | "allow" | "block"
  onChange: (val: string) => void;
  expiresAt?: string; // ISO date string "YYYY-MM-DD" or ""
  onExpiryChange?: (val: string) => void;
}

interface PolicyToggleTableProps {
  rows: PolicyRowData[];
}

function getFutureDateString(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function getDaysRemaining(dateStr: string): string {
  if (!dateStr) return "";
  const target = new Date(dateStr).getTime();
  const now = new Date().getTime();
  const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Expires today";
  if (diffDays === 1) return "Expires tomorrow";
  return `Expires in ${diffDays}d`;
}

export function PolicyToggleTable({ rows }: PolicyToggleTableProps) {
  const [customDaysMap, setCustomDaysMap] = useState<Record<string, string>>({});

  const handleCustomDaysChange = (key: string, numStr: string, onExpiryChange?: (val: string) => void) => {
    setCustomDaysMap(prev => ({ ...prev, [key]: numStr }));
    const num = parseInt(numStr, 10);
    if (!isNaN(num) && num > 0 && onExpiryChange) {
      onExpiryChange(getFutureDateString(num));
    }
  };

  return (
    <div className="overflow-hidden border border-slate-200 rounded-3xl bg-white shadow-xs font-sans">
      <table className="w-full text-left border-collapse font-sans">
        <thead>
          <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 text-[10px] font-extrabold tracking-wider uppercase">
            <th className="py-3.5 px-5">Policy Settings</th>
            <th className="py-3.5 px-3 text-center w-28">Platform Default</th>
            <th className="py-3.5 px-3 text-center w-28">Force Allow</th>
            <th className="py-3.5 px-3 text-center w-28">Force Block</th>
            <th className="py-3.5 px-5 text-center w-64">Override Expiration</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-xs font-sans">
          {rows.map((row) => {
            const Icon = row.icon;
            const isModified = row.value !== "default";
            const customVal = customDaysMap[row.key] || "";
            const daysRemainingText = row.expiresAt ? getDaysRemaining(row.expiresAt) : "";

            return (
              <tr key={row.key} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-5 align-middle">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-100 rounded-xl text-slate-700 mt-0.5 shrink-0 border border-slate-200/60 shadow-2xs">
                      <Icon size={14} />
                    </div>
                    <div className="space-y-0.5">
                      <div className="font-extrabold text-slate-900 text-xs">{row.label}</div>
                      <div className="text-[11px] text-slate-500 font-semibold leading-normal max-w-xs sm:max-w-sm">
                        {row.description}
                      </div>
                    </div>
                  </div>
                </td>
                
                {/* Platform Default Toggle option */}
                <td className="py-4 px-3 text-center align-middle">
                  <button
                    type="button"
                    onClick={() => {
                      row.onChange("default");
                      if (row.onExpiryChange) row.onExpiryChange("");
                    }}
                    className={`w-full py-1.5 px-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                      row.value === "default"
                        ? "bg-slate-900 border-slate-900 text-white shadow-2xs"
                        : "bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Default
                  </button>
                </td>

                {/* Force Allow Toggle option */}
                <td className="py-4 px-3 text-center align-middle">
                  <button
                    type="button"
                    onClick={() => row.onChange("allow")}
                    className={`w-full py-1.5 px-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                      row.value === "allow"
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-2xs"
                        : "bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Force Allow
                  </button>
                </td>

                {/* Force Block Toggle option */}
                <td className="py-4 px-3 text-center align-middle">
                  <button
                    type="button"
                    onClick={() => row.onChange("block")}
                    className={`w-full py-1.5 px-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                      row.value === "block"
                        ? "bg-rose-600 border-rose-600 text-white shadow-2xs"
                        : "bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Force Block
                  </button>
                </td>

                {/* Expiry Column (per-policy controls) */}
                <td className="py-4 px-5 text-center align-middle">
                  {!isModified ? (
                    <span className="text-xs font-semibold text-slate-300 italic">—</span>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      {/* Presets and Custom Input row */}
                      <div className="flex items-center gap-1.5 flex-wrap justify-center">
                        {[1, 3, 7, 14, 30].map((days) => {
                          const dateStr = getFutureDateString(days);
                          const isSelected = row.expiresAt === dateStr;
                          return (
                            <button
                              key={days}
                              type="button"
                              onClick={() => {
                                setCustomDaysMap(prev => ({ ...prev, [row.key]: "" }));
                                if (row.onExpiryChange) row.onExpiryChange(dateStr);
                              }}
                              className={`text-[9px] px-2 py-1 rounded-lg font-black transition-all border cursor-pointer ${
                                isSelected
                                  ? "bg-slate-900 border-slate-900 text-white shadow-2xs"
                                  : "bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50"
                              }`}
                              title={`Expires in ${days} days (${dateStr})`}
                            >
                              {days}d
                            </button>
                          );
                        })}

                        {/* Custom Days Input */}
                        <div className="flex items-center gap-1 ml-0.5">
                          <input
                            type="number"
                            min="1"
                            max="365"
                            placeholder="Custom"
                            value={customVal}
                            onChange={(e) => handleCustomDaysChange(row.key, e.target.value, row.onExpiryChange)}
                            className="w-14 h-7 text-[10px] font-extrabold text-center border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-900 text-slate-900 shadow-2xs"
                            title="Enter custom duration in days"
                          />
                          <span className="text-[10px] font-extrabold text-slate-400">d</span>
                        </div>
                      </div>

                      {/* Expiration Active Badge or Indefinite Indicator */}
                      {row.expiresAt ? (
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-900 border border-slate-200 px-2.5 py-0.5 rounded-md shadow-2xs">
                          <Clock size={10} className="text-slate-500 shrink-0" />
                          <span>{daysRemainingText} ({row.expiresAt})</span>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomDaysMap(prev => ({ ...prev, [row.key]: "" }));
                              if (row.onExpiryChange) row.onExpiryChange("");
                            }}
                            className="hover:text-rose-600 ml-1 p-0.5 cursor-pointer"
                            title="Remove expiry (make permanent)"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Permanent Exception</span>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
