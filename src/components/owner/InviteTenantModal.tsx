"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

export default function InviteTenantModal({ unitId, unitName, propertyName, rentAmount }: { unitId: string, unitName: string, propertyName: string, rentAmount: number }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Please enter an email address");

    setLoading(true);
    try {
      const res = await fetch("/api/tenant-invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, unitId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to invite tenant");

      toast.success("Invitation sent successfully!");
      setOpen(false);
      setEmail("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 font-bold h-11 px-6 rounded-xl transition-all flex items-center gap-2">
          <Mail className="h-4 w-4" /> Invite Existing Tenant
        </Button>
      } />
      <DialogContent className="sm:max-w-md rounded-2xl overflow-hidden p-0 border-0 bg-white">
        <div className="bg-gradient-to-b from-blue-50 to-white p-6 pb-2 border-b border-blue-100">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Mail className="h-6 w-6 text-blue-600" /> Invite Tenant
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              Send a magic link to invite an existing tenant to {unitName} ({propertyName}). They will be able to set up their account and automatically link to this unit.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <form onSubmit={handleInvite} className="p-6 pt-4 space-y-5">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-2">
             <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-semibold">Monthly Rent</span>
                <span className="text-slate-900 font-black">${Number(rentAmount).toLocaleString()}</span>
             </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenantEmail" className="text-xs font-bold uppercase tracking-wider text-slate-600">Tenant Email Address</Label>
            <Input
              id="tenantEmail"
              type="email"
              placeholder="tenant@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-50 border-slate-200 h-12 rounded-xl focus-visible:ring-blue-500"
              required
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md transition-all flex items-center justify-center"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Send className="h-4 w-4 mr-2" /> Send Invitation Link</>}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
