"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function InspectorHistoryPage() {
  const { status } = useSession();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInspectorRequests = async () => {
    try {
      const res = await fetch("/api/maintenance");
      if (!res.ok) throw new Error("Failed to load requests");
      const data = await res.json();
      setRequests(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load assigned inspections.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchInspectorRequests();
    }
  }, [status]);

  const handleUpdateStatus = async (requestId: string, newStatus: string) => {
    toast.info(`Updating ticket status...`);
    try {
      const res = await fetch("/api/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status: newStatus }),
      });

      if (res.ok) {
        toast.success(`Ticket successfully updated to ${newStatus}`);
        fetchInspectorRequests();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update ticket status");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating ticket.");
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#3B82F6]"></div>
        <p className="text-slate-400 font-extrabold text-sm tracking-wider uppercase">Loading history logs...</p>
      </div>
    );
  }

  const completedTasks = requests.filter((r) => r.status === "RESOLVED" || r.status === "CLOSED");

  return (
    <div className="flex flex-col gap-8 max-w-[1200px] w-full pb-10 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#0F172A]">History Logs</h1>
          <p className="text-slate-500 font-semibold mt-1">A log of all your resolved and closed repair requests.</p>
        </div>
      </div>

      <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {completedTasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 font-semibold text-sm">No completed tickets in log yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-[#E2E8F0]">
                    <TableHead className="text-slate-500 font-bold text-[11px] uppercase tracking-wider h-10 px-6">Ticket Info</TableHead>
                    <TableHead className="text-slate-500 font-bold text-[11px] uppercase tracking-wider h-10">Property & Unit</TableHead>
                    <TableHead className="text-slate-500 font-bold text-[11px] uppercase tracking-wider h-10">Status</TableHead>
                    <TableHead className="text-right text-slate-500 font-bold text-[11px] uppercase tracking-wider h-10 pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedTasks.map((t) => (
                    <TableRow key={t.id} className="border-[#E2E8F0] hover:bg-slate-50/50 transition-colors">
                      <TableCell className="px-6 py-4">
                        <strong className="block font-bold text-[#0F172A]">{t.title}</strong>
                        <span className="text-xs text-slate-500 block max-w-xs truncate mt-0.5">{t.description}</span>
                      </TableCell>
                      <TableCell className="py-4">
                        <strong className="block font-bold text-[#0F172A]">{t.unit.property.name}</strong>
                        <span className="text-xs text-slate-500 mt-0.5 block">{t.unit.name}</span>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge className={`rounded-full font-bold px-3 py-0.5 text-[10px] uppercase tracking-wider ${
                          t.status === "CLOSED"
                            ? "bg-slate-100 text-slate-600 border-slate-200"
                            : "bg-green-50 text-green-600 border-green-200"
                        }`}>
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6 py-4">
                        {t.status === "RESOLVED" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(t.id, "CLOSED")}
                            className="border-slate-200 text-slate-700 hover:bg-slate-100 font-bold rounded-xl shadow-sm text-xs"
                          >
                            Mark Closed
                          </Button>
                        ) : (
                          <span className="text-slate-400 text-xs font-semibold">Archived</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
