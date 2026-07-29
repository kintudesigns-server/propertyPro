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
    <div className="overflow-hidden border border-[#E5E5EA] rounded-2xl bg-white shadow-xs">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/70 border-b border-slate-100 text-[#8E8E93] text-[10px] font-extrabold tracking-wider uppercase">
            <th className="py-3 px-4">Policy Settings</th>
            <th className="py-3 px-3 text-center w-28">Platform Default</th>
            <th className="py-3 px-3 text-center w-28">Force Allow</th>
            <th className="py-3 px-3 text-center w-28">Force Block</th>
            <th className="py-3 px-4 text-center w-64">Override Expiration</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-sm">
          {rows.map((row) => {
            const Icon = row.icon;
            const isModified = row.value !== "default";
            const customVal = customDaysMap[row.key] || "";
            const daysRemainingText = row.expiresAt ? getDaysRemaining(row.expiresAt) : "";

            return (
              <tr key={row.key} className="hover:bg-slate-50/20 transition-colors">
                <td className="py-4 px-4 align-middle">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 bg-[#F2F2F7] rounded-lg text-[#6E6E73] mt-0.5 shrink-0">
                      <Icon size={15} />
                    </div>
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-800 text-xs">{row.label}</div>
                      <div className="text-[10px] text-[#8E8E93] font-semibold leading-normal max-w-xs sm:max-w-sm">
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
                    className={`w-full py-1.5 px-2.5 rounded-xl text-[10px] font-extrabold border transition-all ${
                      row.value === "default"
                        ? "bg-[#1D1D1F] border-[#1D1D1F] text-white shadow-xs"
                        : "bg-white text-[#6E6E73] hover:text-[#1D1D1F] border-[#E5E5EA] hover:bg-[#F2F2F7]"
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
                    className={`w-full py-1.5 px-2.5 rounded-xl text-[10px] font-extrabold border transition-all ${
                      row.value === "allow"
                        ? "bg-purple-600 border-purple-600 text-white shadow-xs"
                        : "bg-white text-[#6E6E73] hover:text-[#1D1D1F] border-[#E5E5EA] hover:bg-[#F2F2F7]"
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
                    className={`w-full py-1.5 px-2.5 rounded-xl text-[10px] font-extrabold border transition-all ${
                      row.value === "block"
                        ? "bg-rose-600 border-rose-600 text-white shadow-xs"
                        : "bg-white text-[#6E6E73] hover:text-[#1D1D1F] border-[#E5E5EA] hover:bg-[#F2F2F7]"
                    }`}
                  >
                    Force Block
                  </button>
                </td>

                {/* Expiry Column (per-policy controls) */}
                <td className="py-4 px-4 text-center align-middle">
                  {!isModified ? (
                    <span className="text-[11px] font-bold text-slate-300 italic">—</span>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      {/* Presets and Custom Input row */}
                      <div className="flex items-center gap-1 flex-wrap justify-center">
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
                              className={`text-[9px] px-1.5 py-1 rounded-md font-bold transition-all border ${
                                isSelected
                                  ? "bg-purple-900 border-purple-900 text-white shadow-xs"
                                  : "bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50"
                              }`}
                              title={`Expires in ${days} days (${dateStr})`}
                            >
                              {days}d
                            </button>
                          );
                        })}

                        {/* Custom Days Input */}
                        <div className="flex items-center gap-0.5 ml-1">
                          <input
                            type="number"
                            min="1"
                            max="365"
                            placeholder="Custom"
                            value={customVal}
                            onChange={(e) => handleCustomDaysChange(row.key, e.target.value, row.onExpiryChange)}
                            className="w-12 h-6 text-[10px] font-bold text-center border border-slate-200 rounded-md bg-white focus:outline-none focus:border-purple-500"
                            title="Enter custom duration in days"
                          />
                          <span className="text-[9px] font-bold text-slate-400">d</span>
                        </div>
                      </div>

                      {/* Expiration Active Badge or Indefinite Indicator */}
                      {row.expiresAt ? (
                        <div className="flex items-center gap-1 text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full">
                          <Clock size={10} className="text-purple-600 shrink-0" />
                          <span>{daysRemainingText} ({row.expiresAt})</span>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomDaysMap(prev => ({ ...prev, [row.key]: "" }));
                              if (row.onExpiryChange) row.onExpiryChange("");
                            }}
                            className="hover:text-rose-600 ml-0.5 p-0.5"
                            title="Remove expiry (make permanent)"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400">Permanent Exception</span>
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
