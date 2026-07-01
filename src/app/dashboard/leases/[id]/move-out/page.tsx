"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ShieldCheck, Receipt, DollarSign, UploadCloud, Trash2, ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { generatePDF } from "@/lib/pdfGenerator";

export default function MoveOutPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { data: session, status } = useSession();

  const [lease, setLease] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Deductions State
  const [deductions, setDeductions] = useState<{ amount: string; description: string; photoUrl: string }[]>([]);
  const [newDeduction, setNewDeduction] = useState({ amount: "", description: "", photoUrl: "" });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated") fetchLease();
  }, [status]);

  const fetchLease = async () => {
    try {
      const res = await fetch(`/api/leases/${id}`);
      if (!res.ok) throw new Error("Failed to load lease");
      const data = await res.json();
      setLease(data);
      if (data.deductions) {
        setDeductions(data.deductions);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDeduction = () => {
    if (!newDeduction.amount || !newDeduction.description) {
      toast.error("Amount and description are required.");
      return;
    }
    setDeductions([...deductions, { ...newDeduction }]);
    setNewDeduction({ amount: "", description: "", photoUrl: "" });
  };

  const handleRemoveDeduction = (index: number) => {
    setDeductions(deductions.filter((_, i) => i !== index));
  };

  const handleProcessMoveOut = async () => {
    setProcessing(true);
    try {
      const totalDeducted = deductions.reduce((sum, d) => sum + Number(d.amount), 0);
      const originalDeposit = Number(lease.securityDeposit || 0);
      const refundAmount = originalDeposit - totalDeducted;

      if (refundAmount < 0) {
        toast.error("Deductions cannot exceed the original security deposit.");
        setProcessing(false);
        return;
      }

      const res = await fetch(`/api/leases/${id}/move-out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deductions }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to process move out");
      }

      toast.success("Move-out processed successfully!");
      fetchLease(); // Refresh to see updated state
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const downloadDisposition = () => {
    if (!lease) return;
    const totalDeducted = deductions.reduce((sum, d) => sum + Number(d.amount), 0);
    const originalDeposit = Number(lease.securityDeposit || 0);
    const refundAmount = originalDeposit - totalDeducted;

    const htmlContent = `
      <div style="font-family: Helvetica, Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; padding: 40px; background: #fff;">
        <div style="text-align: center; margin-bottom: 40px; border-bottom: 2px solid #3B82F6; padding-bottom: 20px;">
          <h1 style="color: #1e3a8a; font-size: 28px; margin-bottom: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Security Deposit Disposition</h1>
          <p style="color: #64748B; font-size: 14px; margin: 0;">PropertyPro Management System</p>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 40px; background: #F8FAFC; padding: 20px; border-radius: 12px; border: 1px solid #E2E8F0;">
          <div>
            <h3 style="color: #64748B; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Tenant Info</h3>
            <p style="font-size: 16px; font-weight: 600; margin: 0; color: #0F172A;">${lease.tenant?.name}</p>
            <p style="font-size: 14px; color: #475569; margin: 4px 0 0;">${lease.tenant?.email}</p>
          </div>
          <div style="text-align: right;">
            <h3 style="color: #64748B; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Property Info</h3>
            <p style="font-size: 16px; font-weight: 600; margin: 0; color: #0F172A;">${lease.unit?.property?.name}</p>
            <p style="font-size: 14px; color: #475569; margin: 4px 0 0;">Unit ${lease.unit?.name}</p>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
          <thead>
            <tr style="background: #F1F5F9; border-bottom: 2px solid #E2E8F0;">
              <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">Description</th>
              <th style="padding: 12px 16px; text-align: right; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">Amount Deducted</th>
            </tr>
          </thead>
          <tbody>
            ${deductions.map(d => `
              <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="padding: 16px; font-size: 14px; color: #1E293B;">${d.description}</td>
                <td style="padding: 16px; text-align: right; font-size: 14px; font-weight: 600; color: #EF4444;">-$${Number(d.amount).toFixed(2)}</td>
              </tr>
            `).join('')}
            ${deductions.length === 0 ? `
              <tr><td colspan="2" style="padding: 16px; text-align: center; color: #64748B; font-style: italic;">No deductions recorded.</td></tr>
            ` : ''}
          </tbody>
        </table>

        <div style="display: flex; justify-content: flex-end;">
          <div style="width: 300px; background: #F8FAFC; padding: 24px; border-radius: 12px; border: 1px solid #E2E8F0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="color: #64748B; font-size: 14px;">Original Deposit:</span>
              <span style="font-weight: 600; color: #0F172A;">$${originalDeposit.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="color: #64748B; font-size: 14px;">Total Deductions:</span>
              <span style="font-weight: 600; color: #EF4444;">-$${totalDeducted.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 16px; padding-top: 16px; border-top: 2px solid #E2E8F0;">
              <span style="color: #0F172A; font-size: 16px; font-weight: 700;">Final Refund:</span>
              <span style="font-size: 20px; font-weight: 800; color: #10B981;">$${refundAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    generatePDF(htmlContent, `Deposit_Disposition_${lease.tenant?.name.replace(/\s+/g, '_')}.pdf`);
  };

  if (loading || status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <p className="text-slate-400 font-extrabold text-sm tracking-wider uppercase">Loading move-out dashboard...</p>
      </div>
    );
  }

  if (!lease) {
    return <div className="p-8 text-center text-slate-500">Lease not found.</div>;
  }

  const originalDeposit = Number(lease.securityDeposit || 0);
  const totalDeducted = deductions.reduce((sum, d) => sum + Number(d.amount), 0);
  const refundAmount = originalDeposit - totalDeducted;
  const isProcessed = lease.depositStatus !== "HELD";

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/leases/${id}`}>
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-full border-slate-200">
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Move-Out Processing</h1>
            <p className="text-slate-500 font-semibold mt-1 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> {lease.tenant?.name} • {lease.unit?.property?.name} Unit {lease.unit?.name}
            </p>
          </div>
        </div>
        {isProcessed && (
          <Button onClick={downloadDisposition} className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl h-10 shadow-sm shadow-primary/20">
            <Download className="mr-2 h-4 w-4" /> Disposition PDF
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl md:col-span-2">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 rounded-t-2xl pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" /> Itemized Deductions
            </CardTitle>
            <CardDescription>Record damages requiring deposit deductions. Photos are recommended for legal compliance.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {!isProcessed && (
              <div className="p-6 border-b border-slate-100 bg-slate-50">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="space-y-1.5 flex-1">
                    <Label className="text-xs font-bold text-slate-600">Damage Description</Label>
                    <Input
                      placeholder="e.g. Broken blinds in living room"
                      value={newDeduction.description}
                      onChange={(e) => setNewDeduction({ ...newDeduction, description: e.target.value })}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-1.5 w-full md:w-32">
                    <Label className="text-xs font-bold text-slate-600">Amount ($)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={newDeduction.amount}
                      onChange={(e) => setNewDeduction({ ...newDeduction, amount: e.target.value })}
                      className="bg-white"
                    />
                  </div>
                  <Button onClick={handleAddDeduction} className="w-full md:w-auto font-bold rounded-xl h-10">
                    Add Item
                  </Button>
                </div>
              </div>
            )}

            <Table>
              <TableHeader className="bg-white">
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider">Description</TableHead>
                  <TableHead className="text-right text-slate-500 font-bold text-xs uppercase tracking-wider">Amount</TableHead>
                  {!isProcessed && <TableHead className="w-16"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {deductions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-slate-500 font-medium">
                      No deductions recorded. Full deposit will be refunded.
                    </TableCell>
                  </TableRow>
                ) : (
                  deductions.map((d, index) => (
                    <TableRow key={index} className="border-slate-100">
                      <TableCell className="font-semibold text-slate-800">{d.description}</TableCell>
                      <TableCell className="text-right font-bold text-red-500">-${Number(d.amount).toFixed(2)}</TableCell>
                      {!isProcessed && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveDeduction(index)} className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl h-fit">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 rounded-t-2xl pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-500" /> Refund Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-semibold">Original Deposit:</span>
              <span className="font-bold text-slate-900">${originalDeposit.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-semibold">Total Deductions:</span>
              <span className="font-bold text-red-500">-${totalDeducted.toFixed(2)}</span>
            </div>
            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
              <span className="font-bold text-slate-900">Final Refund:</span>
              <span className="text-2xl font-black text-emerald-500">${refundAmount.toFixed(2)}</span>
            </div>
          </CardContent>
          <CardFooter className="p-6 pt-0">
            {isProcessed ? (
              <div className="w-full bg-emerald-50 text-emerald-600 text-sm font-bold p-3 rounded-xl text-center border border-emerald-100">
                Deposit Processed ({lease.depositStatus})
              </div>
            ) : (
              <Button 
                onClick={handleProcessMoveOut} 
                disabled={processing || refundAmount < 0}
                className="w-full font-bold rounded-xl h-11 text-sm bg-primary hover:bg-primary/90 shadow-sm shadow-primary/20"
              >
                {processing ? "Processing..." : "Process Move-Out & Refund"}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
