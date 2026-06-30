"use client";

import React, { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Shield, Check, FileText, ChevronDown, ChevronRight, LogOut, Loader2, Search, Bell, User, ClipboardList, Hammer, Clock, Wrench, Settings } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

export default function InspectorDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Accordion Sidebar state
  const [inspectionsExpanded, setInspectionsExpanded] = useState(true);
  const [activeTabState, setActiveTabState] = useState("active-tasks");

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash) {
        setActiveTabState(hash);
      }
    };
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const activeTab = activeTabState;
  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    window.history.pushState(null, "", `#${tab}`);
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

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
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center text-[#111111] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-slate-400 font-extrabold text-sm tracking-wider uppercase">Loading inspector dashboard...</p>
      </div>
    );
  }

  const activeTasks = requests.filter((r) => r.status === "ASSIGNED" || r.status === "SUBMITTED");
  const completedTasks = requests.filter((r) => r.status === "RESOLVED" || r.status === "CLOSED");

  const isInspectionsActive = ["active-tasks", "history"].includes(activeTab);

  return (
    <div className="min-h-screen bg-slate-50/50 text-[#111111] font-sans flex relative">
      {/* 260px Collapsible/Accordion Left Sidebar */}
      <aside className="hidden md:flex w-64 bg-white border border-slate-100 rounded-3xl my-6 ml-6 py-6 px-4 flex-col justify-between shadow-sm z-30">
        <div className="flex flex-col gap-6">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-2">
            <div className="bg-primary text-white p-2.5 rounded-2xl flex items-center justify-center shadow-md shadow-primary/20">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight block">PropertyPro</span>
              <span className="text-[10px] text-slate-400 font-extrabold tracking-widest uppercase">Inspector Portal</span>
            </div>
          </div>

          {/* Navigation Accordion Menu */}
          <nav className="flex flex-col gap-4 mt-4">
            <span className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Inspections</span>

            {/* Inspections Accordion Group */}
            <div className="flex flex-col">
              <button
                onClick={() => setInspectionsExpanded(!inspectionsExpanded)}
                className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                  isInspectionsActive ? "text-primary" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${isInspectionsActive ? "bg-primary/10 text-primary" : "bg-slate-50 text-slate-500"}`}>
                    <Wrench className="h-3.5 w-3.5" />
                  </div>
                  <span>Tasks List</span>
                </div>
                {inspectionsExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>

              {inspectionsExpanded && (
                <div className="tree-container flex flex-col gap-1 mt-1 ml-4.5">
                  <button
                    onClick={() => setActiveTab("active-tasks")}
                    className={`tree-item flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                      activeTab === "active-tasks" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    Active Tasks ({activeTasks.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("history")}
                    className={`tree-item flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                      activeTab === "history" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    History logs ({completedTasks.length})
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* User profile card at bottom */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-extrabold text-sm uppercase">
              {session?.user?.name ? session.user.name.charAt(0) : "I"}
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xs text-slate-800 truncate max-w-[110px]">{session?.user?.name || "Inspector"}</span>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Inspector</span>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            title="Sign Out"
            className="p-2 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Main Panel Viewport */}
      <div className="flex-1 flex flex-col p-6 md:p-8 overflow-y-auto max-w-[1600px] mx-auto w-full">
        {/* Top Navbar */}
        <header className="flex items-center justify-between gap-4 mb-8 bg-white border border-slate-100 rounded-2xl px-6 py-3.5 shadow-sm">
          <div className="flex items-center gap-4">
            <button className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
              <Shield className="h-4 w-4 text-primary" />
            </button>
            <div className="relative w-64 md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search ticket..."
                className="pl-10 pr-12 py-2 w-full bg-slate-50 border-0 rounded-full text-xs text-slate-800 placeholder-slate-400 focus-visible:ring-1 focus-visible:ring-primary/20 h-9"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 font-mono text-[9px] font-medium text-slate-400">
                <span className="text-[10px]">⌘</span>K
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-full text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors">
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute top-1 right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[7px] font-bold text-white">8</span>
            </button>
            <button className="p-2 rounded-full text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors">
              <Settings className="h-4.5 w-4.5" />
            </button>
            <div className="h-6 w-px bg-slate-200 mx-2" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-extrabold text-xs uppercase border border-primary/20 shadow-sm">
                {session?.user?.name ? session.user.name.charAt(0) : "I"}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-extrabold text-slate-800 leading-tight">{session?.user?.name || "Inspector"}</span>
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider leading-none">Inspector</span>
              </div>
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white border-0 rounded-[28px] shadow-sm p-6 flex flex-col justify-between min-h-[120px]">
            <CardHeader className="p-0">
              <CardDescription className="text-[#7F817F] text-xs font-bold uppercase tracking-wider">Assigned Active Jobs</CardDescription>
              <CardTitle className="text-3xl font-black mt-2 text-[#111111] flex items-center gap-2">
                <Wrench className="h-7 w-7 text-[#496E5C]" />
                {activeTasks.length}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-[#496E5C] text-white border-0 rounded-[28px] shadow-sm p-6 flex flex-col justify-between min-h-[120px]">
            <CardHeader className="p-0">
              <CardDescription className="text-[#ECECE9] text-xs font-bold uppercase tracking-wider">Resolved Inspections</CardDescription>
              <CardTitle className="text-3xl font-black mt-2 flex items-center gap-2">
                <Check className="h-7 w-7 text-[#ECECE9]" />
                {requests.filter((r) => r.status === "RESOLVED").length}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-white border-0 rounded-[28px] shadow-sm p-6 flex flex-col justify-between min-h-[120px]">
            <CardHeader className="p-0">
              <CardDescription className="text-[#7F817F] text-xs font-bold uppercase tracking-wider">Closed Jobs History</CardDescription>
              <CardTitle className="text-3xl font-black mt-2 text-[#111111] flex items-center gap-2">
                <Clock className="h-7 w-7 text-[#7F817F]" />
                {requests.filter((r) => r.status === "CLOSED").length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Tabs Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Active Tasks View */}
          <TabsContent value="active-tasks" className="outline-none">
            <Card className="bg-white border-0 rounded-[28px] shadow-sm p-6">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-lg font-extrabold text-[#111111]">Active Maintenance Requests</CardTitle>
                <CardDescription className="text-[#7F817F] text-xs">Verify issues, carry out repairs, and mark tasks as resolved.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {activeTasks.length === 0 ? (
                  <div className="text-center py-8 text-[#7F817F]">No active tasks assigned to you.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="border-[#E2E3E0]/60">
                        <TableRow className="hover:bg-transparent border-[#E2E3E0]/60">
                          <TableHead className="text-[#7F817F] font-bold text-xs uppercase tracking-wider">Ticket Info</TableHead>
                          <TableHead className="text-[#7F817F] font-bold text-xs uppercase tracking-wider">Property & Unit</TableHead>
                          <TableHead className="text-[#7F817F] font-bold text-xs uppercase tracking-wider">Tenant Info</TableHead>
                          <TableHead className="text-[#7F817F] font-bold text-xs uppercase tracking-wider">Priority</TableHead>
                          <TableHead className="text-right text-[#7F817F] font-bold text-xs uppercase tracking-wider">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeTasks.map((t) => (
                          <TableRow key={t.id} className="border-[#E2E3E0]/40 hover:bg-[#F5F5F3]/30">
                            <TableCell className="py-4">
                              <strong className="block font-extrabold text-[#111111]">{t.title}</strong>
                              <span className="text-xs text-[#7F817F] block max-w-xs truncate">{t.description}</span>
                            </TableCell>
                            <TableCell>
                              <strong className="block text-[#111111]">{t.unit.property.name}</strong>
                              <span className="text-xs text-[#7F817F]">{t.unit.name} ({t.unit.property.city})</span>
                            </TableCell>
                            <TableCell>
                              <strong className="block text-[#111111]">{t.tenant.name}</strong>
                              <span className="text-xs text-[#7F817F]">{t.tenant.phone || "No phone"}</span>
                            </TableCell>
                            <TableCell>
                              <Badge className={`rounded-full font-bold px-3 py-1 text-[10px] ${
                                t.priority === "HIGH" || t.priority === "EMERGENCY"
                                  ? "bg-[#E05A47]/10 text-[#E05A47] border border-[#E05A47]/20"
                                  : "bg-orange-500/10 text-orange-500 border border-orange-500/20"
                              }`}>
                                {t.priority}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {t.status === "ASSIGNED" || t.status === "SUBMITTED" ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateStatus(t.id, "RESOLVED")}
                                  className="bg-[#496E5C] hover:bg-[#3E5C4E] text-white font-bold rounded-full px-4"
                                >
                                  Mark Resolved
                                </Button>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History View */}
          <TabsContent value="history" className="outline-none">
            <Card className="bg-white border-0 rounded-[28px] shadow-sm p-6">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-lg font-extrabold text-[#111111]">Inspection History</CardTitle>
                <CardDescription className="text-[#7F817F] text-xs">A log of all resolved and closed repair requests.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {completedTasks.length === 0 ? (
                  <div className="text-center py-8 text-[#7F817F]">No completed tickets in log.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="border-[#E2E3E0]/60">
                        <TableRow className="hover:bg-transparent border-[#E2E3E0]/60">
                          <TableHead className="text-[#7F817F] font-bold text-xs uppercase tracking-wider">Ticket Info</TableHead>
                          <TableHead className="text-[#7F817F] font-bold text-xs uppercase tracking-wider">Property & Unit</TableHead>
                          <TableHead className="text-[#7F817F] font-bold text-xs uppercase tracking-wider">Status</TableHead>
                          <TableHead className="text-right text-[#7F817F] font-bold text-xs uppercase tracking-wider">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {completedTasks.map((t) => (
                          <TableRow key={t.id} className="border-[#E2E3E0]/40 hover:bg-[#F5F5F3]/30">
                            <TableCell className="py-4">
                              <strong className="block font-extrabold text-[#111111]">{t.title}</strong>
                              <span className="text-xs text-[#7F817F] block max-w-xs truncate">{t.description}</span>
                            </TableCell>
                            <TableCell>
                              <strong className="block text-[#111111]">{t.unit.property.name}</strong>
                              <span className="text-xs text-[#7F817F]">{t.unit.name}</span>
                            </TableCell>
                            <TableCell>
                              <Badge className={`rounded-full font-bold px-3 py-1 text-[10px] ${
                                t.status === "CLOSED"
                                  ? "bg-[#7F817F]/10 text-[#7F817F] border border-[#7F817F]/20"
                                  : "bg-green-500/10 text-green-500 border border-green-500/20"
                              }`}>
                                {t.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {t.status === "RESOLVED" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateStatus(t.id, "CLOSED")}
                                  className="border-[#E2E3E0] text-[#111111] hover:bg-[#ECECE9] font-bold rounded-full px-4"
                                >
                                  Mark Closed
                                </Button>
                              ) : (
                                <span className="text-[#7F817F] text-xs font-semibold">Archive Logged</span>
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
