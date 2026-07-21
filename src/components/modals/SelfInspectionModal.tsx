"use client";

import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Camera, CheckCircle2, XCircle, AlertTriangle, ChevronRight, ChevronLeft, Loader2, Trash2 } from "lucide-react";

interface SelfInspectionModalProps {
  leaseId: string;
  unit?: any; // unit object with rooms, bathrooms fields
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  isPreliminary?: boolean;
  preliminaryDeductions?: any;
}

type Condition = "GOOD" | "FAIR" | "DAMAGED";

interface RoomFinding {
  description: string;
  category: string;
  photoUrl: string;
  uploading: boolean;
}

interface RoomState {
  name: string;
  condition: Condition | null;
  findings: RoomFinding[];
}

const CATEGORIES = [
  { value: "DAMAGE", label: "Physical Damage" },
  { value: "CLEANING", label: "Cleaning Required" },
  { value: "OTHER", label: "Other" },
];

function buildRoomList(unit?: any): string[] {
  const rooms: string[] = ["Kitchen", "Living Room"];
  const bedrooms = Number(unit?.rooms || 2);
  const bathrooms = Number(unit?.bathrooms || 1);
  if (bedrooms === 1) {
    rooms.push("Bedroom");
  } else {
    for (let i = 1; i <= Math.min(bedrooms, 5); i++) {
      rooms.push(i === 1 ? "Master Bedroom" : `Bedroom ${i}`);
    }
  }
  if (bathrooms === 1) {
    rooms.push("Bathroom");
  } else {
    for (let i = 1; i <= Math.min(bathrooms, 3); i++) {
      rooms.push(i === 1 ? "Master Bathroom" : `Bathroom ${i}`);
    }
  }
  rooms.push("Hallway / Entry");
  if (unit?.hasParking) rooms.push("Garage / Parking");
  return rooms;
}

const conditionConfig: Record<Condition, { label: string; color: string; border: string; icon: React.ReactNode; bg: string }> = {
  GOOD: {
    label: "Good",
    color: "text-emerald-700",
    border: "border-emerald-500",
    bg: "bg-emerald-50",
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
  },
  FAIR: {
    label: "Needs Attention",
    color: "text-amber-700",
    border: "border-amber-500",
    bg: "bg-amber-50",
    icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  },
  DAMAGED: {
    label: "Damaged",
    color: "text-red-700",
    border: "border-red-500",
    bg: "bg-red-50",
    icon: <XCircle className="h-4 w-4 text-red-500" />,
  },
};

export function SelfInspectionModal({ leaseId, unit, open, onOpenChange, onSuccess, isPreliminary = false, preliminaryDeductions }: SelfInspectionModalProps) {
  const roomNames = useMemo(() => buildRoomList(unit), [unit]);

  const initialRooms: RoomState[] = useMemo(() => {
    return roomNames.map((name) => {
      // If we are doing a FINAL inspection and have preliminary deductions, auto-map them!
      let findings: RoomFinding[] = [];
      let condition: Condition | null = null;
      
      if (!isPreliminary && preliminaryDeductions && Array.isArray(preliminaryDeductions)) {
        // Filter deductions that start with `[RoomName] `
        const roomPrefix = `[${name}] `;
        const roomDeductions = preliminaryDeductions.filter((d: any) => d.description?.startsWith(roomPrefix));
        
        if (roomDeductions.length > 0) {
          condition = "DAMAGED";
          findings = roomDeductions.map((d: any) => ({
            description: d.description.replace(roomPrefix, ""),
            category: d.category || "DAMAGE",
            photoUrl: d.photoUrl || "",
            uploading: false
          }));
        }
      }
      
      return {
        name,
        condition,
        findings
      };
    });
  }, [roomNames, isPreliminary, preliminaryDeductions]);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [rooms, setRooms] = useState<RoomState[]>(initialRooms);
  const [generalNotes, setGeneralNotes] = useState("");
  const [declared, setDeclared] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Sync rooms when modal opens
  React.useEffect(() => {
    if (open) {
      setRooms(initialRooms);
    }
  }, [open, initialRooms]);

  // Reset on close
  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setStep(1);
      setRooms(initialRooms);
      setGeneralNotes("");
      setDeclared(false);
    }
    onOpenChange(v);
  };

  // ── Room condition setter ──
  const setCondition = (idx: number, cond: Condition) => {
    setRooms((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], condition: cond, findings: cond === "GOOD" ? [] : next[idx].findings };
      return next;
    });
  };

  // ── Finding helpers ──
  const addFinding = (roomIdx: number) => {
    setRooms((prev) => {
      const next = [...prev];
      next[roomIdx] = {
        ...next[roomIdx],
        findings: [...next[roomIdx].findings, { description: "", category: "DAMAGE", photoUrl: "", uploading: false }],
      };
      return next;
    });
  };

  const updateFinding = (roomIdx: number, findingIdx: number, patch: Partial<RoomFinding>) => {
    setRooms((prev) => {
      const next = [...prev];
      const findings = [...next[roomIdx].findings];
      findings[findingIdx] = { ...findings[findingIdx], ...patch };
      next[roomIdx] = { ...next[roomIdx], findings };
      return next;
    });
  };

  const removeFinding = (roomIdx: number, findingIdx: number) => {
    setRooms((prev) => {
      const next = [...prev];
      next[roomIdx] = {
        ...next[roomIdx],
        findings: next[roomIdx].findings.filter((_, i) => i !== findingIdx),
      };
      return next;
    });
  };

  // ── Photo upload (Cloudinary via /api/upload) ──
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, roomIdx: number, findingIdx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    updateFinding(roomIdx, findingIdx, { uploading: true });
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      const { url } = await res.json();
      updateFinding(roomIdx, findingIdx, { photoUrl: url, uploading: false });
      toast.success("Photo uploaded.");
    } catch (err: any) {
      toast.error(err.message);
      updateFinding(roomIdx, findingIdx, { uploading: false });
    }
    // reset input
    e.target.value = "";
  };

  // ── Step validation ──
  const step1Valid = rooms.every((r) => r.condition !== null);
  const flaggedRooms = rooms.filter((r) => r.condition !== "GOOD");
  const step2Valid = flaggedRooms.every(
    (r) => r.findings.length > 0 && r.findings.every((f) => f.description.trim().length > 0)
  );

  // ── Submit → POST /api/leases/[id]/inspection (fixes PUT→POST bug) ──
  const handleSubmit = async () => {
    if (!declared) {
      toast.error("Please confirm the declaration before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      // Flatten room findings into a deductions array with amount: "0.00"
      // Owner will price them on the Final Statement page (move-out page)
      const deductions = flaggedRooms.flatMap((room) =>
        room.findings.map((f) => ({
          description: `[${room.name}] ${f.description}`,
          category: f.category,
          amount: "0.00",
          photoUrl: f.photoUrl,
        }))
      );

      const res = await fetch(`/api/leases/${leaseId}/inspection`, {
        method: "POST", // was PUT — fixed: POST submits results and sets moveOutStatus to INSPECTION_COMPLETED
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deductions,
          inspectionNotes: generalNotes || `Self-inspection completed by owner. ${flaggedRooms.length} room(s) flagged.`,
          inspectionType: isPreliminary ? "PRELIMINARY" : "FINAL",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit inspection");
      }

      toast.success(isPreliminary ? "Preliminary self-inspection submitted!" : "Self-inspection submitted! Now price the deductions on the Final Statement page.");
      handleOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-white border-0 text-slate-800 rounded-3xl max-w-2xl w-full p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              Self-Inspection Checklist
              <span className="ml-auto text-xs font-bold text-[#8E8E93] bg-slate-100 px-2.5 py-1 rounded-full">
                Step {step} of 3
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-[#8E8E93] mt-1">
              {step === 1 && "Rate the condition of each room — this becomes your official inspection record."}
              {step === 2 && "Describe the issues found and attach photo evidence for each flagged room."}
              {step === 3 && "Review your findings, confirm the declaration, and submit."}
            </DialogDescription>
          </DialogHeader>

          {/* Step Progress Bar */}
          <div className="flex gap-1.5 mt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  s < step ? "bg-indigo-500" : s === step ? "bg-indigo-400" : "bg-[#E5E5EA]"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* ── STEP 1: Room Condition Ratings ── */}
          {step === 1 && (
            <div className="space-y-2.5">
              {rooms.map((room, idx) => (
                <div
                  key={room.name}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                    room.condition
                      ? `${conditionConfig[room.condition].bg} ${conditionConfig[room.condition].border}`
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {room.condition ? conditionConfig[room.condition].icon : (
                      <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
                    )}
                    <span className={`text-sm font-bold ${room.condition ? conditionConfig[room.condition].color : "text-[#6E6E73]"}`}>
                      {room.name}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {(["GOOD", "FAIR", "DAMAGED"] as Condition[]).map((cond) => (
                      <button
                        key={cond}
                        onClick={() => setCondition(idx, cond)}
                        className={`text-[10px] font-black px-2.5 py-1.5 rounded-lg border transition-all ${
                          room.condition === cond
                            ? `${conditionConfig[cond].border} ${conditionConfig[cond].bg} ${conditionConfig[cond].color} shadow-sm`
                            : "border-slate-200 bg-white text-[#6E6E73] hover:border-slate-300"
                        }`}
                      >
                        {conditionConfig[cond].label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Summary hint */}
              {step1Valid && (
                <div className={`mt-2 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  flaggedRooms.length === 0
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}>
                  {flaggedRooms.length === 0 ? (
                    <><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> All rooms in good condition — you can submit directly on the next step.</>
                  ) : (
                    <><AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" /> {flaggedRooms.length} room(s) flagged. Add details and photos in Step 2.</>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Per-Room Details + Photos ── */}
          {step === 2 && (
            <div className="space-y-5">
              {flaggedRooms.length === 0 ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-bold text-emerald-800">All rooms rated Good</p>
                  <p className="text-xs text-emerald-600 mt-1">No issues to document. Proceed to Step 3 to review and submit.</p>
                </div>
              ) : (
                flaggedRooms.map((room) => {
                  const roomIdx = rooms.findIndex((r) => r.name === room.name);
                  const cfg = conditionConfig[room.condition!];
                  return (
                    <div key={room.name} className={`rounded-2xl border overflow-hidden ${cfg.border}`}>
                      {/* Room header */}
                      <div className={`flex items-center gap-2 px-4 py-3 ${cfg.bg}`}>
                        {cfg.icon}
                        <span className={`text-sm font-black ${cfg.color}`}>{room.name}</span>
                        <span className={`ml-auto text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                          {cfg.label}
                        </span>
                      </div>

                      {/* Findings list */}
                      <div className="bg-white p-4 space-y-3">
                        {room.findings.map((finding, fIdx) => (
                          <div key={fIdx} className="bg-slate-50 rounded-xl p-3 space-y-2.5 border border-slate-200">
                            <div className="flex items-start gap-2">
                              <textarea
                                placeholder={`Describe the issue (e.g. Broken cabinet hinge, stained carpet...)`}
                                value={finding.description}
                                onChange={(e) => updateFinding(roomIdx, fIdx, { description: e.target.value })}
                                rows={2}
                                className="flex-1 w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                              />
                              <button
                                onClick={() => removeFinding(roomIdx, fIdx)}
                                className="text-red-400 hover:text-red-600 transition-colors mt-0.5 shrink-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Category */}
                              <select
                                value={finding.category}
                                onChange={(e) => updateFinding(roomIdx, fIdx, { category: e.target.value })}
                                className="h-9 flex-1 bg-white border border-slate-200 rounded-xl px-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                              >
                                {CATEGORIES.map((c) => (
                                  <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                              </select>

                              {/* Photo upload */}
                              <label className={`flex items-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-bold cursor-pointer transition-all shrink-0 ${
                                finding.photoUrl
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                                  : "bg-slate-100 border-slate-200 text-[#6E6E73] hover:bg-slate-200"
                              }`}>
                                {finding.uploading ? (
                                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</>
                                ) : finding.photoUrl ? (
                                  <><Camera className="h-3.5 w-3.5" /> Photo ✓</>
                                ) : (
                                  <><Camera className="h-3.5 w-3.5" /> Add Photo</>
                                )}
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  disabled={finding.uploading}
                                  onChange={(e) => handlePhotoUpload(e, roomIdx, fIdx)}
                                  className="hidden"
                                />
                              </label>

                              {/* Photo thumbnail */}
                              {finding.photoUrl && (
                                <div className="relative h-9 w-9 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                                  <img src={finding.photoUrl} alt="Evidence" className="h-full w-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => updateFinding(roomIdx, fIdx, { photoUrl: "" })}
                                    className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"
                                  >
                                    <Trash2 className="h-3 w-3 text-white" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Add finding button */}
                        <button
                          onClick={() => addFinding(roomIdx)}
                          className="w-full h-9 rounded-xl border-2 border-dashed border-slate-300 text-xs font-bold text-[#6E6E73] hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-1.5"
                        >
                          + Add Finding for {room.name}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}

              {/* General notes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider">
                  General Notes (Optional)
                </Label>
                <textarea
                  placeholder="Overall condition assessment, any other observations..."
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
              </div>
            </div>
          )}

          {/* ── STEP 3: Summary + Declaration ── */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Room summary */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
                  <p className="text-xs font-black text-slate-700 uppercase tracking-wider">Inspection Summary</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {rooms.map((room) => {
                    const cfg = room.condition ? conditionConfig[room.condition] : null;
                    return (
                      <div key={room.name} className="flex items-start gap-3 px-4 py-3">
                        <div className="mt-0.5 shrink-0">
                          {cfg ? cfg.icon : <div className="h-4 w-4 rounded-full bg-slate-200" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-slate-800">{room.name}</p>
                            {cfg && (
                              <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-md ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                                {cfg.label}
                              </span>
                            )}
                          </div>
                          {room.findings.length > 0 && (
                            <div className="mt-1.5 space-y-1">
                              {room.findings.map((f, fi) => (
                                <div key={fi} className="flex items-center gap-2 text-xs text-[#6E6E73] font-medium">
                                  <span className="text-[#8E8E93]">•</span>
                                  <span className="flex-1">{f.description || <em className="text-[#8E8E93]">No description</em>}</span>
                                  {f.photoUrl && (
                                    <a href={f.photoUrl} target="_blank" rel="noreferrer">
                                      <img src={f.photoUrl} alt="" className="h-6 w-6 rounded object-cover border border-slate-200" />
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Amounts note */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 font-semibold flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <span>Deduction amounts are set to $0 — you'll price each item on the Final Statement page after submitting this inspection.</span>
              </div>

              {/* Declaration */}
              <label className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 cursor-pointer hover:bg-[#F2F2F7] transition-colors">
                <input
                  type="checkbox"
                  checked={declared}
                  onChange={(e) => setDeclared(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 mt-0.5 cursor-pointer shrink-0"
                />
                <span className="text-xs font-semibold text-slate-700 leading-relaxed">
                  I declare that I have personally inspected this unit and the findings above represent a true and accurate assessment of the property's condition at move-out.
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Footer — always visible */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-white">
          <Button
            variant="ghost"
            onClick={() => {
              if (step === 1) handleOpenChange(false);
              else setStep((s) => (s - 1) as 1 | 2 | 3);
            }}
            className="flex items-center gap-1.5 border border-slate-200 rounded-xl h-10 px-4 text-xs font-bold text-[#6E6E73] hover:bg-[#F5F5F7]"
          >
            <ChevronLeft className="h-4 w-4" />
            {step === 1 ? "Cancel" : "Back"}
          </Button>

          <div className="text-xs font-semibold text-[#8E8E93]">
            {step === 1 && `${rooms.filter((r) => r.condition !== null).length} / ${rooms.length} rooms rated`}
            {step === 2 && flaggedRooms.length > 0 && `${flaggedRooms.filter((r) => r.findings.length > 0).length} / ${flaggedRooms.length} rooms detailed`}
          </div>

          {step < 3 ? (
            <Button
              onClick={() => {
                if (step === 1) {
                  if (!step1Valid) { toast.error("Please rate all rooms before continuing."); return; }
                  setStep(2);
                } else if (step === 2) {
                  if (flaggedRooms.length > 0 && !step2Valid) {
                    toast.error("Please describe at least one issue for each flagged room.");
                    return;
                  }
                  setStep(3);
                }
              }}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-5 text-xs font-bold"
            >
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting || !declared}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-5 text-xs font-bold disabled:opacity-50"
            >
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : "Submit Inspection"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
