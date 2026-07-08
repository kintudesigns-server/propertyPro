"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Loader2 } from "lucide-react";

export function DispatchVendorModal({ ticketId, onDispatched, isReassign = false }: { ticketId: string, onDispatched: () => void, isReassign?: boolean }) {
  const [open, setOpen] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"select" | "create">("select");
  
  // New Vendor Form
  const [newVendor, setNewVendor] = useState({ name: "", email: "", phone: "", specialty: "General", w9OnFile: false, insuranceOnFile: false, baseCallOutFee: "0" });

  const fetchVendors = () => {
    fetch("/api/external-vendors")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setVendors(data);
      });
  };

  useEffect(() => {
    if (open) fetchVendors();
  }, [open]);

  const handleCreateVendor = async () => {
    if (!newVendor.name || !newVendor.email) return toast.error("Name and email are required");
    setLoading(true);
    try {
      const res = await fetch("/api/external-vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newVendor),
      });
      if (!res.ok) throw new Error("Failed to create vendor");
      const created = await res.json();
      toast.success("Vendor created successfully!");
      setVendors([created, ...vendors]);
      setSelectedVendorId(created.id);
      setMode("select");
      setNewVendor({ name: "", email: "", phone: "", specialty: "General", w9OnFile: false, insuranceOnFile: false, baseCallOutFee: "0" });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDispatch = async () => {
    if (!selectedVendorId) return toast.error("Please select a vendor");
    setLoading(true);
    try {
      const res = await fetch("/api/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: ticketId, 
          externalVendorId: selectedVendorId,
          status: "ASSIGNED",
          action: "DISPATCH_VENDOR"
        }),
      });

      if (!res.ok) throw new Error("Failed to dispatch to vendor");
      
      toast.success("Vendor dispatched successfully! They have been notified.");
      setOpen(false);
      onDispatched();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center bg-[#3B82F6] hover:bg-blue-600 text-white font-bold gap-2 rounded-xl h-11 px-5 shadow-sm text-sm transition-colors">
        <Send className="h-4 w-4" /> {isReassign ? "Reassign Vendor" : "Dispatch Vendor"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{mode === "select" ? "Dispatch External Vendor" : "Add New Vendor"}</DialogTitle>
        </DialogHeader>

        {mode === "select" ? (
          <>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="font-bold text-[#0F172A] uppercase text-[12px] tracking-wide">Select Vendor</Label>
                  <button onClick={() => setMode("create")} className="text-xs font-bold text-[#3B82F6] hover:underline">+ New Vendor</button>
                </div>
                <Select value={selectedVendorId} onValueChange={(val) => setSelectedVendorId(val || "")}>
                  <SelectTrigger className="w-full h-11 rounded-xl bg-slate-50 border-[#E2E8F0] focus:ring-[#3B82F6] font-semibold text-[#0F172A]">
                    <SelectValue placeholder="Select a vendor from your directory">
                      {selectedVendorId ? vendors.find(v => v.id === selectedVendorId)?.name : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {vendors.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.name} ({v.specialty})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-[#64748B] font-medium mt-2">
                  This vendor will automatically receive an email with the Magic Link to access the job details and submit an estimate.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl font-bold border-[#E2E8F0]">
                Cancel
              </Button>
              <Button onClick={handleDispatch} disabled={loading || !selectedVendorId} className="bg-[#3B82F6] hover:bg-blue-600 text-white font-bold rounded-xl px-8 shadow-sm">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Dispatch Job"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label className="font-bold text-[12px] text-[#0F172A] uppercase">Company Name</Label>
                <Input value={newVendor.name} onChange={e => setNewVendor({...newVendor, name: e.target.value})} className="h-11 rounded-xl bg-slate-50" placeholder="e.g. Bob's Plumbing" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-[12px] text-[#0F172A] uppercase">Email</Label>
                <Input value={newVendor.email} onChange={e => setNewVendor({...newVendor, email: e.target.value})} type="email" className="h-11 rounded-xl bg-slate-50" placeholder="bob@example.com" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-[12px] text-[#0F172A] uppercase">Specialty *</Label>
                <Select value={newVendor.specialty} onValueChange={v => setNewVendor({...newVendor, specialty: v || "General"})}>
                  <SelectTrigger className="w-full h-11 rounded-xl bg-slate-50 border-[#E2E8F0]">
                    <SelectValue placeholder="Select specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Plumbing">Plumbing</SelectItem>
                    <SelectItem value="Electrical">Electrical</SelectItem>
                    <SelectItem value="HVAC">HVAC</SelectItem>
                    <SelectItem value="Appliance Repair">Appliance Repair</SelectItem>
                    <SelectItem value="Handyman">Handyman</SelectItem>
                    <SelectItem value="Pest Control">Pest Control</SelectItem>
                    <SelectItem value="Landscaping">Landscaping</SelectItem>
                    <SelectItem value="Cleaning">Cleaning</SelectItem>
                    <SelectItem value="General">General Construction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-[12px] text-[#0F172A] uppercase">Base Fee ($)</Label>
                <Input value={newVendor.baseCallOutFee} onChange={e => setNewVendor({...newVendor, baseCallOutFee: e.target.value})} type="number" min="0" step="0.01" className="h-11 rounded-xl bg-slate-50" placeholder="e.g. 75" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button type="button" variant="outline" onClick={() => setMode("select")} className="rounded-xl font-bold border-[#E2E8F0]">
                Back
              </Button>
              <Button onClick={handleCreateVendor} disabled={loading || !newVendor.name || !newVendor.email} className="bg-[#10B981] hover:bg-emerald-600 text-white font-bold rounded-xl px-8 shadow-sm">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Vendor"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
