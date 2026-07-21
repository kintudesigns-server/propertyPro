"use client";

import React, { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { PropertyForm } from "@/components/PropertyForm";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuGroup } from "@/components/ui/dropdown-menu";
import { Home, Building, Users, Calendar, Wrench, Wallet, ArrowUpRight, LogOut, Loader2, Plus, DollarSign, CheckCircle, Search, Bell, User, ChevronDown, ChevronRight, ClipboardList, Settings, Shield, TrendingUp, Percent, Briefcase, Clock, ArrowDownRight, AlertTriangle, Activity, FileText, RefreshCw, BarChart2, Target, LayoutGrid, List, Table2, MapPin, Eye, Edit2, MoreVertical, CheckCircle2, Trash2, Bed, Bath, Maximize2, Building2, ArrowLeft, Star, Image, Square, PanelLeft, Download, Lock } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import SecuritySettings from "@/components/settings/SecuritySettings";
import OwnerOnboardingChecklist from "@/components/owner/OwnerOnboardingChecklist";
import InviteTenantModal from "@/components/owner/InviteTenantModal";
import EmbeddedSubscribeModal from "@/components/subscription/EmbeddedSubscribeModal";

export default function OwnerDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [properties, setProperties] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [inspectors, setInspectors] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  // Sub-filter tab states
  const [leaseSubTab, setLeaseSubTab] = useState("all"); // "all", "active", "expiring", "new"
  const [leaseViewLayout, setLeaseViewLayout] = useState<"list" | "grid">("list");
  const [leaseSearch, setLeaseSearch] = useState("");
  const [maintSubTab, setMaintSubTab] = useState("all"); // "all", "emergency", "inspections"
  const [financialsTab, setFinancialsTab] = useState("transactions"); // "transactions", "invoices", "revenues", "expenses", "reports"
  const [activeSettingsTab, setActiveSettingsTab] = useState("profile");
  
  // Inbox & Chat States
  const [chats, setChats] = useState<any[]>([
    { id: "1", sender: "John Doe (Tenant)", lastMsg: "Hi, I sent the rent payment for this month.", time: "10:30 AM", unread: true, messages: [{ sender: "tenant", text: "Hi, I sent the rent payment for this month.", time: "10:30 AM" }] },
    { id: "2", sender: "Arthur (Inspector)", lastMsg: "The inspection for Flat 101 is scheduled for tomorrow.", time: "Yesterday", unread: false, messages: [{ sender: "inspector", text: "The inspection for Flat 101 is scheduled for tomorrow.", time: "Yesterday" }] },
    { id: "3", sender: "Jane Smith (Tenant)", lastMsg: "Is it okay if I pay the deposit in installments?", time: "2 days ago", unread: false, messages: [{ sender: "tenant", text: "Is it okay if I pay the deposit in installments?", time: "2 days ago" }] }
  ]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>("1");
  const [newMessage, setNewMessage] = useState("");
  const [inboxSearch, setInboxSearch] = useState("");

  // Inspections list
  const [inspections, setInspections] = useState<any[]>([
    { id: "i1", property: "London Grand Apartments", unit: "Flat 101", inspector: "Inspector Arthur", date: "2026-06-24", status: "SCHEDULED", notes: "Routine safety inspection." },
    { id: "i2", property: "Paddington Mews", unit: "Mews 1", inspector: "Inspector Arthur", date: "2026-06-15", status: "COMPLETED", notes: "No issues found." }
  ]);
  const [inspOpen, setInspOpen] = useState(false);
  const [newInspPropId, setNewInspPropId] = useState("");
  const [newInspUnitId, setNewInspUnitId] = useState("");
  const [newInspInspectorId, setNewInspInspectorId] = useState("");
  const [newInspDate, setNewInspDate] = useState("");
  const [newInspNotes, setNewInspNotes] = useState("");

  // Invoice Dialog States
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [newInvLeaseId, setNewInvLeaseId] = useState("");
  const [newInvAmount, setNewInvAmount] = useState("");
  const [newInvDueDate, setNewInvDueDate] = useState("");
  const [newInvStatus, setNewInvStatus] = useState("UNPAID");

  // Search/Filters
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("ALL");

  // Calendar State
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Accordion Sidebar states
  const [propertiesOpen, setPropertiesOpen] = useState(true);
  const [tenantsOpen, setTenantsOpen] = useState(true);
  const [maintenanceOpen, setMaintenanceOpen] = useState(true);
  const [ledgerOpen, setLedgerOpen] = useState(true);
  const [financialsOpen, setFinancialsOpen] = useState(true);
  const [activityOpen, setActivityOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(true);

  // Tab State connected to Sidebar
  const [activeTabState, setActiveTabState] = useState("dashboard");
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleHashChange = () => {
      let hash = window.location.hash.replace(/^#+/, "");
      hash = hash.split('#')[0];
      if (hash) {
        if (hash === "settings-subscription") {
          setActiveTabState("settings");
          setActiveSettingsTab("subscription");
        } else if (hash === "settings") {
          setActiveTabState("settings");
          setActiveSettingsTab("profile");
        } else {
          setActiveTabState(hash);
        }
      }
    };
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    const tabParam = searchParams ? searchParams.get("tab") : null;
    if (tabParam) {
      if (tabParam === "subscription") {
        setActiveTabState("settings");
        setActiveSettingsTab("subscription");
      } else if (tabParam === "settings") {
        setActiveTabState("settings");
        setActiveSettingsTab("profile");
      } else {
        setActiveTabState(tabParam);
      }
    }
  }, [searchParams]);

  const activeTab = activeTabState;
  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    window.history.pushState(null, "", `#${tab}`);
  };

  // Modals Open State
  const [searchOpen, setSearchOpen] = useState(false);
  
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);
  const [propOpen, setPropOpen] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const [leaseOpen, setLeaseOpen] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);
  
  // Inspector assignment state
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [selectedInspectorId, setSelectedInspectorId] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);

  // New Property Form State
  const [pName, setPName] = useState("");
  const [pAddr, setPAddr] = useState("");
  const [pCity, setPCity] = useState("");
  const [pCountry, setPCountry] = useState("");
  const [pCover, setPCover] = useState("");

  // Add/Edit Unit Form State
  const [editUnitId, setEditUnitId] = useState<string | null>(null);
  const [uName, setUName] = useState("");
  const [uRent, setURent] = useState("");
  const [uDeposit, setUDeposit] = useState("");
  const [uRooms, setURooms] = useState("");
  const [uSqFt, setUSqFt] = useState("");
  const [uPropId, setUPropId] = useState("");
  const [uAmenities, setUAmenities] = useState("");

  // Unit Details View State
  const [viewUnitId, setViewUnitId] = useState<string | null>(null);
  const [unitDetailsSubTab, setUnitDetailsSubTab] = useState("overview"); // overview, features, images, tenant, documents

  // New Lease Form State
  const [lUnitId, setLUnitId] = useState("");
  const [lEmail, setLEmail] = useState("");
  const [lStart, setLStart] = useState("");
  const [lEnd, setLEnd] = useState("");
  const [lRent, setLRent] = useState("");
  const [lAppId, setLAppId] = useState<string | undefined>(undefined);

  // Payout Form State
  const [poAmount, setPoAmount] = useState("");
  const [poBankName, setPoBankName] = useState("");
  const [poAccNumber, setPoAccNumber] = useState("");
  const [poAccName, setPoAccName] = useState("");

  // Layout and filter states for Properties
  const [propViewMode, setPropViewMode] = useState<"grid" | "list" | "table">("grid");
  const [propSearch, setPropSearch] = useState("");
  const [propTypeFilter, setPropTypeFilter] = useState("ALL");
  const [propStatusFilter, setPropStatusFilter] = useState("ALL");
  const [propSort, setPropSort] = useState("NEWEST");

  // Layout and filter states for Units
  const [unitViewMode, setUnitViewMode] = useState<"grid" | "list" | "table">("grid");
  const [unitSearch, setUnitSearch] = useState("");
  const [unitStatusFilter, setUnitStatusFilter] = useState("ALL");
  const [unitSort, setUnitSort] = useState("NEWEST");
  const [unitPropFilter, setUnitPropFilter] = useState("ALL");
  const [unitBedFilter, setUnitBedFilter] = useState("ALL");
  const [unitBathFilter, setUnitBathFilter] = useState("ALL");
  const [unitTypeFilter, setUnitTypeFilter] = useState("ALL");

  // Layout and filter states for Available Units
  const [avUnitsViewMode, setAvUnitsViewMode] = useState<"grid" | "list" | "table">("grid");
  const [avUnitsSearch, setAvUnitsSearch] = useState("");
  const [avUnitsPropTypeFilter, setAvUnitsPropTypeFilter] = useState("ALL");
  const [avUnitsBedFilter, setAvUnitsBedFilter] = useState("ALL");
  const [avUnitsBathFilter, setAvUnitsBathFilter] = useState("ALL");
  const [avUnitsUnitTypeFilter, setAvUnitsUnitTypeFilter] = useState("ALL");

  // Add/Edit Property State
  const [pType, setPType] = useState("Apartment");
  const [editPropId, setEditPropId] = useState<string | null>(null);

  // Profile Settings State
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const [profileEmploymentStatus, setProfileEmploymentStatus] = useState("EMPLOYED");
  const [profileEmployer, setProfileEmployer] = useState("");
  const [profilePosition, setProfilePosition] = useState("");
  const [entityType, setEntityType] = useState("INDIVIDUAL");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyRelationship, setEmergencyRelationship] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [approvalThreshold, setApprovalThreshold] = useState<number | string>("");
  const [emergencyOverrideLimit, setEmergencyOverrideLimit] = useState<number | string>("");
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [pricingTier, setPricingTier] = useState<any>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState("Active");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");
  const [pricingTiers, setPricingTiers] = useState<any[]>([]);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [pendingPropertyDraft, setPendingPropertyDraft] = useState<any>(null);
  const [pricingModalContext, setPricingModalContext] = useState<"general" | "blocked_property">("general");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  const fetchOwnerData = async () => {
    try {
      const [propRes, leaseRes, maintRes, payoutRes, inspectorRes, invoiceRes, tenantRes, appRes, tierRes] = await Promise.all([
        fetch("/api/properties"),
        fetch("/api/leases"),
        fetch("/api/maintenance"),
        fetch("/api/payouts"),
        fetch("/api/users?role=INSPECTOR"),
        fetch("/api/invoices"),
        fetch("/api/users?role=TENANT"),
        fetch("/api/applications"),
        fetch("/api/pricing-tiers"),
      ]);

      // Check each response and surface errors clearly
      if (!propRes.ok) {
        const err = await propRes.json();
        console.error("Properties API error:", err);
        toast.error(`Properties: ${err.error || propRes.statusText}`);
      } else {
        const propData = await propRes.json();
        if (Array.isArray(propData)) {
          setProperties(propData);
          // Load all units for all properties
          if (propData.length > 0) {
            const unitsPromises = propData.map((p: any) =>
              fetch(`/api/units?propertyId=${p.id}`).then((r) => r.ok ? r.json() : [])
            );
            const unitsLists = await Promise.all(unitsPromises);
            setUnits(unitsLists.flat());
          }
        } else {
          console.error("Properties returned non-array:", propData);
        }
      }

      if (leaseRes.ok) {
        const data = await leaseRes.json();
        setLeases(Array.isArray(data) ? data : []);
      }

      // Fetch user profile data
      if (session?.user) {
        try {
          const userRes = await fetch(`/api/users`);
          if (userRes.ok) {
            const userData = await userRes.json();
            setProfileName(userData.name || "");
            setProfilePhone(userData.phone || "");
            setProfileAvatar(userData.avatar || "");
            setProfileEmploymentStatus(userData.employmentStatus || "EMPLOYED");
            setEntityType(userData.employmentStatus === "BUSINESS" ? "BUSINESS" : "INDIVIDUAL");
            setProfileEmployer(userData.employer || "");
            setProfilePosition(userData.position || "");
            setEmergencyName(userData.emergencyName || "");
            setEmergencyRelationship(userData.emergencyRelationship || "");
            setEmergencyPhone(userData.emergencyPhone || "");
            setBankName(userData.bankName || "");
            setAccountName(userData.accountName || "");
            setAccountNumber(userData.accountNumber || "");
            setApprovalThreshold(userData.approvalThreshold !== null && userData.approvalThreshold !== undefined ? Number(userData.approvalThreshold) : "");
            setEmergencyOverrideLimit(userData.emergencyOverrideLimit !== null && userData.emergencyOverrideLimit !== undefined ? Number(userData.emergencyOverrideLimit) : "");
            setPricingTier(userData.pricingTier || null);
            const currentStatus = userData.subscriptionStatus || "";
            setSubscriptionStatus(currentStatus);

            // Auto-submit pending property draft if subscription is now active
            const draft = sessionStorage.getItem("pp_pending_property_draft");
            if (draft && currentStatus?.toLowerCase() === "active") {
              try {
                const draftData = JSON.parse(draft);
                sessionStorage.removeItem("pp_pending_property_draft");
                setPendingPropertyDraft(draftData);
                // Auto-submit after a brief delay so UI is ready
                setTimeout(async () => {
                  try {
                    const res = await fetch("/api/properties", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(draftData),
                    });
                    if (res.ok) {
                      toast.success(`🎉 Welcome to your new plan! Your property "${draftData.name || "New Property"}" has been created automatically.`, { duration: 6000 });
                      setPendingPropertyDraft(null);
                      fetchOwnerData();
                      setActiveTab("properties");
                    } else {
                      const err = await res.json();
                      toast.error(`Auto-save failed: ${err.error || "Please try adding the property again."}`);
                      setPendingPropertyDraft(null);
                    }
                  } catch {
                    setPendingPropertyDraft(null);
                    toast.error("Auto-save failed. Please add your property again.");
                  }
                }, 1200);
              } catch {
                sessionStorage.removeItem("pp_pending_property_draft");
              }
            }
          }
        } catch (e) {
          console.error("Failed to load user profile:", e);
        }
      }

      if (maintRes.ok) {
        const data = await maintRes.json();
        if (Array.isArray(data)) setMaintenance(data);
      } else {
        console.error("Maintenance API error:", await maintRes.text());
      }

      if (payoutRes.ok) {
        const data = await payoutRes.json();
        if (Array.isArray(data)) setPayouts(data);
      } else {
        console.error("Payouts API error:", await payoutRes.text());
      }

      if (inspectorRes.ok) {
        const data = await inspectorRes.json();
        if (Array.isArray(data)) setInspectors(data);
      } else {
        console.error("Inspectors API error:", await inspectorRes.text());
      }

      if (invoiceRes.ok) {
        const data = await invoiceRes.json();
        if (Array.isArray(data)) setInvoices(data);
      } else {
        console.error("Invoices API error:", await invoiceRes.text());
      }

      if (tenantRes.ok) {
        const data = await tenantRes.json();
        if (Array.isArray(data)) setTenants(data);
      } else {
        console.error("Tenants API error:", await tenantRes.text());
      }

      if (appRes.ok) {
        const data = await appRes.json();
        if (Array.isArray(data)) setApplications(data);
      } else {
        console.error("Applications API error:", await appRes.text());
      }

      if (tierRes.ok) {
        const data = await tierRes.json();
        if (Array.isArray(data)) setPricingTiers(data.filter((t: any) => t.isActive && !t.isCustom));
      }

      // Get balance from session
      if (session?.user) {
        const sessionRes = await fetch("/api/auth/session");
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          const user = sessionData?.user || {};
          setBalance(Number(user.balance) || 0);
        }
      }

    } catch (err) {
      console.error(err);
      toast.error("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchOwnerData();
    }
  }, [status]);

  const handleSaveProperty = async (data: any) => {
    try {
      const method = data.id ? "PUT" : "POST";
      const res = await fetch("/api/properties", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast.success(data.id ? "Property updated successfully!" : "Property created successfully!");
        setEditPropId(null);
        fetchOwnerData();
        setActiveTab("properties");
      } else {
        const err = await res.json();
        // Check if this is a subscription-gate error (403 with subscription message)
        const errMsg: string = err.error || "";
        const isSubscriptionError = res.status === 403 && (
          errMsg.toLowerCase().includes("subscription") ||
          errMsg === "LIMIT_REACHED"
        );
        if (isSubscriptionError && !data.id) {
          // Save draft to sessionStorage so it survives the Stripe redirect
          sessionStorage.setItem("pp_pending_property_draft", JSON.stringify(data));
          // Open pricing modal inline, keeping the user on the same page
          setPricingModalContext("blocked_property");
          setShowPricingModal(true);
          toast.info("Your property details have been saved. Choose a plan below to activate your listing.", { duration: 6000 });
        } else {
          toast.error(err.message || err.error || "Failed to save property");
        }
      }
    } catch (err) {
      toast.error("Property save error");
    }
  };

  const handleUpdatePropertyStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/properties", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        toast.success(`Property marked as ${status.toLowerCase()}`);
        fetchOwnerData();
      } else {
        toast.error("Failed to update status");
      }
    } catch (err) {
      toast.error("Error updating status");
    }
  };

  const handleDeleteProperty = async (id: string) => {
    if (!confirm("Are you sure you want to delete this property? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/properties?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Property deleted successfully");
        fetchOwnerData();
      } else {
        toast.error("Failed to delete property");
      }
    } catch (err) {
      toast.error("Error deleting property");
    }
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uName || !uRent || !uDeposit || !uRooms || !uSqFt || !uPropId) {
      toast.error("Please fill in all required unit details.");
      return;
    }

    try {
      const method = editUnitId ? "PUT" : "POST";
      const bodyPayload = {
        name: uName,
        rentAmount: uRent,
        depositAmt: uDeposit,
        rooms: uRooms,
        sqFootage: uSqFt,
        propertyId: uPropId,
        amenities: uAmenities ? uAmenities.split(",").map((a) => a.trim()) : [],
        ...(editUnitId ? { id: editUnitId } : {}),
      };

      const res = await fetch("/api/units", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      if (res.ok) {
        toast.success(editUnitId ? "Unit updated successfully!" : "Unit created successfully!");
        setUnitOpen(false);
        setUName("");
        setURent("");
        setUDeposit("");
        setURooms("");
        setUSqFt("");
        setUPropId("");
        setUAmenities("");
        setEditUnitId(null);
        fetchOwnerData();
        setActiveTab("units");
      } else {
        const err = await res.json();
        toast.error(err.error || `Failed to ${editUnitId ? "update" : "add"} unit`);
      }
    } catch (err) {
      toast.error(`Unit ${editUnitId ? "update" : "creation"} error`);
    }
  };

  const handleAddLease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lUnitId || !lEmail || !lStart || !lEnd || !lRent) {
      toast.error("Please fill in all lease details.");
      return;
    }

    try {
      const res = await fetch("/api/leases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: lUnitId,
          tenantEmail: lEmail,
          startDate: lStart,
          endDate: lEnd,
          monthlyRent: lRent,
          applicationId: lAppId,
        }),
      });

      if (res.ok) {
        toast.success("Lease agreement activated and tenant linked!");
        setLeaseSubTab("all");
        setLUnitId("");
        setLEmail("");
        setLStart("");
        setLEnd("");
        setLRent("");
        setLAppId(undefined);
        fetchOwnerData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to activate lease");
      }
    } catch (err) {
      toast.error("Add lease error");
    }
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poAmount || !poBankName || !poAccNumber || !poAccName) {
      toast.error("Please fill in all banking and payout details.");
      return;
    }

    try {
      const res = await fetch("/api/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: poAmount,
          bankName: poBankName,
          accountNumber: poAccNumber,
          accountName: poAccName,
        }),
      });

      if (res.ok) {
        toast.success("Payout request submitted! Admin approval pending.");
        setPayoutOpen(false);
        setPoAmount("");
        setPoBankName("");
        setPoAccNumber("");
        setPoAccName("");
        fetchOwnerData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Payout request failed");
      }
    } catch (err) {
      toast.error("Payout request error");
    }
  };

  const handleAssignInspector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !selectedInspectorId) {
      toast.error("Please select an inspector.");
      return;
    }

    toast.info("Routing ticket to inspector...");
    try {
      const res = await fetch("/api/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedTicket.id,
          inspectorId: selectedInspectorId,
          status: "ASSIGNED",
        }),
      });

      if (res.ok) {
        toast.success("Inspector assigned successfully!");
        setAssignOpen(false);
        setSelectedTicket(null);
        setSelectedInspectorId("");
        fetchOwnerData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to assign inspector");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error assigning inspector.");
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName) {
      toast.error("Please fill in your name.");
      return;
    }

    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName,
          phone: profilePhone,
          bankName: bankName,
          accountNumber: accountNumber,
          accountName: accountName,
        }),
      });

      if (res.ok) {
        toast.success("Settings updated successfully!");
        fetchOwnerData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save settings");
      }
    } catch (err) {
      toast.error("Error saving settings.");
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvLeaseId || !newInvAmount || !newInvDueDate) {
      toast.error("Please fill in all invoice details.");
      return;
    }

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaseId: newInvLeaseId,
          amount: newInvAmount,
          dueDate: newInvDueDate,
          status: newInvStatus,
        }),
      });

      if (res.ok) {
        toast.success("Invoice created successfully!");
        setInvoiceOpen(false);
        setNewInvLeaseId("");
        setNewInvAmount("");
        setNewInvDueDate("");
        setNewInvStatus("UNPAID");
        fetchOwnerData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to create invoice");
      }
    } catch (err) {
      toast.error("Error creating invoice.");
    }
  };

  const handleCreateInspection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInspPropId || !newInspUnitId || !newInspInspectorId || !newInspDate) {
      toast.error("Please fill in all inspection details.");
      return;
    }

    const prop = properties.find((p) => p.id === newInspPropId);
    const unitItem = units.find((u) => u.id === newInspUnitId);
    const inspectorItem = inspectors.find((i) => i.id === newInspInspectorId);

    const newInsp = {
      id: "insp_" + Date.now(),
      property: prop ? prop.name.replace(/^[^:]*:/, "") : "Unknown Property",
      unit: unitItem ? unitItem.name : "Unknown Unit",
      inspector: inspectorItem ? inspectorItem.name : "Unknown Inspector",
      date: newInspDate,
      status: "SCHEDULED",
      notes: newInspNotes || "Regular safety inspection.",
    };

    setInspections([newInsp, ...inspections]);
    toast.success("Inspection scheduled successfully!");
    setInspOpen(false);
    setNewInspPropId("");
    setNewInspUnitId("");
    setNewInspInspectorId("");
    setNewInspDate("");
    setNewInspNotes("");
  };


  // Calculations for Dashboard
  const now = new Date();
  
  // 1. Active Tenants
  const activeTenantsCount = leases.filter(l => l.status === "ACTIVE").length;

  // 2. Collection Rate (PAID vs (PAID + OVERDUE + UNPAID))
  const paidInvoicesCount = invoices.filter(i => i.status === "PAID").length;
  const totalDueInvoicesCount = invoices.filter(i => ["PAID", "UNPAID", "OVERDUE"].includes(i.status)).length;
  const collectionRate = totalDueInvoicesCount > 0
    ? Math.round((paidInvoicesCount / totalDueInvoicesCount) * 100)
    : 100;

  // 3. Monthly Revenue (paid invoices in current month)
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthlyRevenue = invoices
    .filter(i => {
      const d = new Date(i.dueDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && i.status === "PAID";
    })
    .reduce((sum, i) => sum + Number(i.amount), 0);

  // 4. Occupancy Rate
  const occupiedUnitsCount = units.filter(u => u.status === "OCCUPIED").length;
  const occupancyRate = units.length > 0
    ? Math.round((occupiedUnitsCount / units.length) * 100)
    : 100;

  // 5. Total Properties
  const totalPropertiesCount = properties.length;

  // 6. Average Rent of occupied units
  const occupiedUnitsList = units.filter(u => u.status === "OCCUPIED");
  const averageRent = occupiedUnitsList.length > 0
    ? Math.round(occupiedUnitsList.reduce((sum, u) => sum + Number(u.rentAmount), 0) / occupiedUnitsList.length)
    : 0;

  // 7. Vacant Units
  const vacantUnitsCount = units.filter(u => u.status === "VACANT").length;

  // 8. Active Maintenance Tickets
  const activeMaintenanceCount = maintenance.filter(m => ["SUBMITTED", "ASSIGNED"].includes(m.status)).length;

  // 9. Lease Renewals (expiring in next 30 days)
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiringLeasesList = leases.filter(l => {
    const end = new Date(l.endDate);
    return l.status === "ACTIVE" && end > now && end <= thirtyDaysFromNow;
  });
  const expiringLeasesCount = expiringLeasesList.length;

  // 10. Overdue Invoices
  const overdueInvoicesList = invoices.filter(i => i.status === "OVERDUE");
  const overdueInvoicesCount = overdueInvoicesList.length;

  // Urgent Maintenance Tickets
  const urgentMaintenanceList = maintenance.filter(m =>
    ["HIGH", "EMERGENCY"].includes(m.priority) &&
    ["SUBMITTED", "ASSIGNED"].includes(m.status)
  );
  const urgentMaintenanceCount = urgentMaintenanceList.length;

  // Recent Activity Feed: Combine and sort invoices, maintenance, and payouts
  const getRecentActivity = () => {
    const activity: any[] = [];

    // Paid Invoices
    invoices.filter(i => i.status === "PAID").forEach(i => {
      activity.push({
        type: "payment",
        title: `Rent payment received`,
        description: `Tenant paid $${Number(i.amount).toLocaleString()} for ${i.lease?.unit?.name || "Unit"}`,
        date: new Date(i.dueDate), // Using dueDate as placeholder for payment date
        icon: "💰",
      });
    });

    // Maintenance Requests
    maintenance.forEach(m => {
      activity.push({
        type: "maintenance",
        title: `Repair ticket: ${m.title}`,
        description: `Unit: ${m.unit?.name || "Unit"} - Priority: ${m.priority} - Status: ${m.status.toLowerCase()}`,
        date: new Date(m.createdAt),
        icon: "🔧",
      });
    });

    // Payout Requests
    payouts.forEach(po => {
      activity.push({
        type: "payout",
        title: `Withdrawal request submitted`,
        description: `Amount: $${Number(po.amount).toLocaleString()} - Status: ${po.status}`,
        date: new Date(po.createdAt),
        icon: "🏦",
      });
    });

    // Sort descending by date
    return activity.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 8);
  };
  const recentActivities = getRecentActivity();

  // Chart Data: last 6 months
  const getChartData = () => {
    const data = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const label = `${monthNames[m]} ${y.toString().slice(-2)}`;
      
      // Sum paid invoices in this month
      const monthlyPaidInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.dueDate);
        return invDate.getMonth() === m && invDate.getFullYear() === y && inv.status === "PAID";
      });
      
      const rev = monthlyPaidInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
      
      // Mock expenses as ~22% of revenue + some base operating cost per property
      const exp = rev > 0 ? Math.round(rev * 0.22 + 450) : 0;
      
      data.push({
        name: label,
        Revenue: rev,
        Expenses: exp,
      });
    }
    return data;
  };
  const chartData = getChartData();

  // --- Available Units Derivation Logic ---
  const avUnitsVacant = units.filter(u => u.status === "VACANT");
  const avTotalVacantUnits = avUnitsVacant.length;
  const avVacantPropIds = new Set(avUnitsVacant.map(u => u.propertyId));
  const avTotalPropertiesWithVacancies = avVacantPropIds.size;
  
  const avRents = avUnitsVacant.map(u => Number(u.rentAmount)).filter(r => !isNaN(r) && r > 0);
  const avAvgRent = avRents.length ? avRents.reduce((a, b) => a + b, 0) / avRents.length : 0;
  const avMinRent = avRents.length ? Math.min(...avRents) : 0;
  const avMaxRent = avRents.length ? Math.max(...avRents) : 0;

  const avSqFts = avUnitsVacant.map(u => u.sqFootage).filter(s => typeof s === 'number' && s > 0);
  const avAvgSqFt = avSqFts.length ? avSqFts.reduce((a, b) => a + b, 0) / avSqFts.length : 0;
  const avMinSqFt = avSqFts.length ? Math.min(...avSqFts) : 0;
  const avMaxSqFt = avSqFts.length ? Math.max(...avSqFts) : 0;

  const avTypeCounts = avUnitsVacant.reduce((acc: any, u: any) => {
    const t = u.type || "Apartment";
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});
  let avMostCommonType = "Apartment";
  let avHighestCount = 0;
  for (const [t, count] of Object.entries(avTypeCounts)) {
    if ((count as number) > avHighestCount) {
      avMostCommonType = t;
      avHighestCount = count as number;
    }
  }

  const avFilteredUnits = avUnitsVacant.filter(u => {
    const p = properties.find((prop) => prop.id === u.propertyId);
    if (!p) return false;
    
    // Search filter
    if (avUnitsSearch) {
      const q = avUnitsSearch.toLowerCase();
      if (!u.name.toLowerCase().includes(q) && !p.name.toLowerCase().includes(q)) return false;
    }
    // Prop Type filter
    if (avUnitsPropTypeFilter !== "ALL" && (p.type || "Apartment") !== avUnitsPropTypeFilter) return false;
    // Unit Type filter
    if (avUnitsUnitTypeFilter !== "ALL" && (u.type || "Apartment") !== avUnitsUnitTypeFilter) return false;
    // Beds filter
    if (avUnitsBedFilter !== "ALL") {
      const bedsStr = avUnitsBedFilter; 
      if (bedsStr === "5+") {
        if (u.rooms < 5) return false;
      } else {
        if (u.rooms !== parseInt(bedsStr)) return false;
      }
    }
    // Baths filter
    if (avUnitsBathFilter !== "ALL") {
      const bathsStr = avUnitsBathFilter;
      const uBaths = u.bathrooms || 1;
      if (bathsStr === "4+") {
        if (uBaths < 4) return false;
      } else {
        if (uBaths !== parseInt(bathsStr)) return false;
      }
    }
    
    return true;
  });
  // --- All Units Derivation Logic ---
  const auTotalUnits = units.length;
  const auPropIds = new Set(units.map(u => u.propertyId));
  const auTotalProperties = auPropIds.size;
  
  const auRents = units.map(u => Number(u.rentAmount)).filter(r => !isNaN(r) && r > 0);
  const auAvgRent = auRents.length ? auRents.reduce((a, b) => a + b, 0) / auRents.length : 0;
  const auMinRent = auRents.length ? Math.min(...auRents) : 0;
  const auMaxRent = auRents.length ? Math.max(...auRents) : 0;

  const auTypeCounts = units.reduce((acc: any, u: any) => {
    const t = u.type || "Apartment";
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});
  let auMostCommonType = "Apartment";
  let auHighestCount = 0;
  for (const [t, count] of Object.entries(auTypeCounts)) {
    if ((count as number) > auHighestCount) {
      auMostCommonType = t;
      auHighestCount = count as number;
    }
  }
  
  const auOccupiedCount = units.filter(u => u.status === "OCCUPIED").length;
  const auOccupancyRate = units.length > 0 ? Math.round((auOccupiedCount / units.length) * 100) : 0;

  const auFilteredUnits = units.filter(u => {
    const p = properties.find((prop) => prop.id === u.propertyId);
    if (!p) return false;
    
    // Search filter
    if (unitSearch) {
      const q = unitSearch.toLowerCase();
      if (!u.name.toLowerCase().includes(q) && !p.name.toLowerCase().includes(q)) return false;
    }
    // Property filter
    if (unitPropFilter !== "ALL" && p.id !== unitPropFilter) return false;
    // Status filter
    if (unitStatusFilter !== "ALL" && u.status !== unitStatusFilter) return false;
    // Unit Type filter
    if (unitTypeFilter !== "ALL" && (u.type || "Apartment") !== unitTypeFilter) return false;
    // Beds filter
    if (unitBedFilter !== "ALL") {
      const bedsStr = unitBedFilter; 
      if (bedsStr === "5+") {
        if (u.rooms < 5) return false;
      } else {
        if (u.rooms !== parseInt(bedsStr)) return false;
      }
    }
    // Baths filter
    if (unitBathFilter !== "ALL") {
      const bathsStr = unitBathFilter;
      const uBaths = u.bathrooms || 1;
      if (bathsStr === "4+") {
        if (uBaths < 4) return false;
      } else {
        if (uBaths !== parseInt(bathsStr)) return false;
      }
    }
    return true;
  });

  // Sort All Units
  if (unitSort === 'NEWEST') auFilteredUnits.reverse();
  else if (unitSort === 'RENT_HIGH') auFilteredUnits.sort((a, b) => Number(b.rentAmount) - Number(a.rentAmount));
  else if (unitSort === 'RENT_LOW') auFilteredUnits.sort((a, b) => Number(a.rentAmount) - Number(b.rentAmount));
  // ----------------------------------------

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSubmitting(true);
    try {
      const res = await fetch(`/api/users`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName,
          phone: profilePhone,
          avatar: profileAvatar,
          employmentStatus: entityType,
          employer: profileEmployer,
          position: profilePosition,
          emergencyName,
          emergencyRelationship,
          emergencyPhone,
          bankName,
          accountName,
          accountNumber,
          approvalThreshold: approvalThreshold === "" ? null : Number(approvalThreshold),
          emergencyOverrideLimit: emergencyOverrideLimit === "" ? null : Number(emergencyOverrideLimit),
        }),
      });
      if (res.ok) {
        toast.success("Profile updated successfully!");
        fetchOwnerData();
      } else {
        const err = await res.json();
        toast.error(`Error: ${err.error}`);
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileAvatar(reader.result as string);
        setAvatarUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPropertyClick = () => {
    // If no subscription at all, open the pricing modal inline instead of blocking with an error
    if (!pricingTier || subscriptionStatus?.toLowerCase() !== 'active') {
      setPricingModalContext("blocked_property");
      setShowPricingModal(true);
      return;
    }
    if (pricingTier && units.length >= pricingTier.maxUnits) {
      setPricingModalContext("blocked_property");
      setShowPricingModal(true);
      return;
    }
    setActiveTab('add-property');
  };

  const isManagementActive = ["properties", "add-property", "available-units", "units", "add-unit", "unit-details", "tenants", "leases"].includes(activeTab);
  const isMaintenanceActive = ["maintenance", "inspections"].includes(activeTab);
  const isFinancialsActive = ["transactions", "invoices", "revenues", "expenses", "reports"].includes(activeTab);
  const isActivityActive = ["inbox", "calendar"].includes(activeTab);
  const isAdministrationActive = ["settings"].includes(activeTab);

  const handleCheckout = async (tierId: string) => {
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId })
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.requiresPortal) {
        handlePortal();
      } else {
        alert(data.error || 'Checkout failed');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to initiate checkout.');
    }
  };

  const handlePortal = async () => {
    try {
      const response = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to open portal');
      }
    } catch (error) {
      console.error('Portal error:', error);
      alert('Failed to open billing portal.');
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 md:p-8 pb-20">
      {pricingTier && subscriptionStatus?.toLowerCase() !== "active" && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-6 text-sm font-bold shadow-sm flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <span>Your subscription has expired or payment failed. Your account is in limited mode and penalty transaction fees apply.</span>
          </div>
          <Button onClick={handlePortal} variant="outline" className="bg-white border-red-200 text-red-600 hover:bg-red-50 h-8 text-xs shrink-0">
            Reactivate Plan / Update Billing
          </Button>
        </div>
      )}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Navigation Tab lists for Mobile */}
          <TabsList className="bg-white border border-[#E2E3E0] p-1.5 rounded-full flex gap-1 h-auto shadow-sm max-w-2xl overflow-x-auto md:hidden">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-[#111111] data-[state=active]:text-white text-[#7F817F] rounded-full font-bold px-4 py-2 text-xs">Dash</TabsTrigger>
            <TabsTrigger value="properties" className="data-[state=active]:bg-[#111111] data-[state=active]:text-white text-[#7F817F] rounded-full font-bold px-4 py-2 text-xs">Prop</TabsTrigger>
            <TabsTrigger value="units" className="data-[state=active]:bg-[#111111] data-[state=active]:text-white text-[#7F817F] rounded-full font-bold px-4 py-2 text-xs">Units</TabsTrigger>
            <TabsTrigger value="leases" className="data-[state=active]:bg-[#111111] data-[state=active]:text-white text-[#7F817F] rounded-full font-bold px-4 py-2 text-xs">Lease</TabsTrigger>
            <TabsTrigger value="maintenance" className="data-[state=active]:bg-[#111111] data-[state=active]:text-white text-[#7F817F] rounded-full font-bold px-4 py-2 text-xs">Repair</TabsTrigger>
            <TabsTrigger value="payouts" className="data-[state=active]:bg-[#111111] data-[state=active]:text-white text-[#7F817F] rounded-full font-bold px-4 py-2 text-xs">Pay</TabsTrigger>
          </TabsList>

          {/* Owner Dashboard Tab View */}
          <TabsContent value="dashboard" className="space-y-6 outline-none mt-2">
            {/* Header / Welcome Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-[#111111]">
                  Good evening, {session?.user?.name ? session.user.name.split(' ')[0] : "youssef"}!
                </h1>
                <p className="text-[#7F817F] mt-1 text-sm">
                  Here's what's happening with your property portfolio
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={fetchOwnerData} variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-[#F5F5F7] rounded-xl px-4 py-2 text-xs font-bold shadow-sm transition-all flex items-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-xs font-bold shadow-sm transition-all flex items-center gap-2">
                  <BarChart2 className="h-3.5 w-3.5" /> Reports
                </Button>
              </div>
            </div>
            
            {!(session?.user as any)?.hasCompletedOnboarding && (
              <OwnerOnboardingChecklist 
                onComplete={() => fetchOwnerData()} 
                properties={properties} 
                leases={leases} 
                isProfileComplete={!!(profilePhone && bankName && accountNumber && emergencyPhone)}
              />
            )}

            {/* Alerts Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Overdue Payments Alert */}
              <Card className="border border-amber-200 bg-white rounded-2xl p-4 flex flex-col justify-center shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("invoices")}>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2 text-amber-500">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-semibold text-sm">Overdue Payments</span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                    {overdueInvoicesCount} <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </div>
                <p className="text-[#6E6E73] font-medium text-xs ml-6">{overdueInvoicesCount} payments are overdue</p>
              </Card>

              {/* Urgent Maintenance Alert */}
              <Card className="border border-red-200 bg-white rounded-2xl p-4 flex flex-col justify-center shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("maintenance")}>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2 text-red-500">
                    <Wrench className="h-4 w-4" />
                    <span className="font-semibold text-sm">Urgent Maintenance</span>
                  </div>
                  <div className="flex items-center gap-1 text-red-500 font-bold text-sm">
                    {urgentMaintenanceCount} <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </div>
                <p className="text-[#6E6E73] font-medium text-xs ml-6">{urgentMaintenanceCount > 0 ? `${urgentMaintenanceCount} urgent requests` : "No urgent maintenance requests"}</p>
              </Card>

              {/* Expiring Leases Alert */}
              <Card className="border border-cyan-300 bg-white rounded-2xl p-4 flex flex-col justify-center shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("leases")}>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2 text-cyan-500">
                    <Calendar className="h-4 w-4" />
                    <span className="font-semibold text-sm">Expiring Leases</span>
                  </div>
                  <div className="flex items-center gap-1 text-cyan-500 font-bold text-sm">
                    {expiringLeasesCount} <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </div>
                <p className="text-[#6E6E73] font-medium text-xs ml-6">{expiringLeasesCount} leases expiring within the next 30 days</p>
              </Card>
            </div>

            {/* Metrics Grid (10 Stats) */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { title: "Total Properties", value: totalPropertiesCount, sub: "Active properties in portfolio", icon: Building, color: "text-blue-500", bg: "bg-blue-50" },
                { title: "Occupancy Rate", value: `${occupancyRate}%`, sub: `${occupiedUnitsCount} of ${units.length} units occupied`, icon: Home, color: "text-emerald-500", bg: "bg-emerald-50" },
                { title: "Monthly Revenue", value: `$${monthlyRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}`, sub: "Current month collected", icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-50" },
                { title: "Collection Rate", value: `${collectionRate}%`, sub: "Payment collection efficiency", icon: Target, color: "text-cyan-500", bg: "bg-cyan-50" },
                { title: "Active Tenants", value: activeTenantsCount, sub: "0 pending applications", icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
                { title: "Maintenance Requests", value: activeMaintenanceCount, sub: `${urgentMaintenanceCount} urgent`, icon: Wrench, color: "text-amber-500", bg: "bg-amber-50" },
                { title: "Vacant Units", value: vacantUnitsCount, sub: `${(units.length > 0 ? (vacantUnitsCount / units.length * 100).toFixed(1) : 0)}% vacancy rate`, icon: Home, color: "text-red-500", bg: "bg-red-50" },
                { title: "Average Rent", value: `$${averageRent.toLocaleString(undefined, {minimumFractionDigits: 2})}`, sub: "Per unit monthly average", icon: FileText, color: "text-emerald-500", bg: "bg-emerald-50" },
                { title: "Lease Renewals", value: expiringLeasesCount, sub: "Due in next 30 days", icon: FileText, color: "text-amber-500", bg: "bg-amber-50" },
                { title: "Recent Events", value: recentActivities.length, sub: "0 urgent activities", icon: Activity, color: "text-cyan-500", bg: "bg-cyan-50" }
              ].map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <Card key={idx} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="text-sm font-semibold text-slate-700 leading-tight pr-2">{stat.title}</span>
                        <div className={`p-2 rounded-full shrink-0 ${stat.bg} ${stat.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-slate-900 mt-3 leading-none">{stat.value}</p>
                    </div>
                    <p className="text-xs text-[#6E6E73] mt-4 leading-tight font-medium">{stat.sub}</p>
                  </Card>
                );
              })}
            </div>

            {/* Lower Section (Activity & Recharts Chart) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left: Recent Activity Feed */}
              <Card className="bg-white border border-slate-100 rounded-3xl shadow-sm p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Recent Activity Feed</h3>
                      <p className="text-xs text-[#8E8E93] font-medium">Real-time log of payments, tickets, and withdrawals</p>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  
                  <div className="space-y-4 mt-5">
                    {recentActivities.length === 0 ? (
                      <div className="text-center py-12 text-[#8E8E93] font-bold">No recent activities logged.</div>
                    ) : (
                      recentActivities.map((act, i) => (
                        <div key={i} className="flex items-start gap-4">
                          <div className="text-xl bg-slate-50 p-2 rounded-xl flex items-center justify-center h-10 w-10 shrink-0 border border-slate-100">
                            {act.icon}
                          </div>
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 truncate">{act.title}</p>
                            <p className="text-[11px] text-[#6E6E73] font-medium leading-relaxed">{act.description}</p>
                            <span className="text-[9px] text-[#8E8E93] font-extrabold uppercase">{new Date(act.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </Card>

              {/* Right: Recharts Revenue vs Expenses */}
              <Card className="bg-white border border-slate-100 rounded-3xl shadow-sm p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Financial Overview</h3>
                      <p className="text-xs text-[#8E8E93] font-medium">Monthly revenue vs simulated expenses (last 6 months)</p>
                    </div>
                    <div className="flex gap-4.5 text-[10px] font-extrabold tracking-widest uppercase">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#496E5C]" />
                        <span className="text-[#6E6E73]">Revenue</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                        <span className="text-[#6E6E73]">Expenses</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-80 w-full mt-6 flex items-center justify-center">
                    {invoices.length === 0 ? (
                      <div className="text-[#8E8E93] font-bold text-xs">No transaction history available.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#496E5C" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#496E5C" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E3E0" strokeOpacity={0.3} />
                          <XAxis dataKey="name" stroke="#7F817F" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#7F817F" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #E2E3E0", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
                            labelStyle={{ fontSize: "11px", fontWeight: 800, color: "#111111", marginBottom: "4px" }}
                            itemStyle={{ fontSize: "11px", fontWeight: 700 }}
                            formatter={(value) => [value ? `$${Number(value).toLocaleString()}` : "$0"]}
                          />
                          <Area type="monotone" dataKey="Revenue" stroke="#496E5C" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                          <Area type="monotone" dataKey="Expenses" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExp)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Properties Tab - Card Grid */}
                    {/* Owner Properties Tab View */}
          <TabsContent value="properties" className="space-y-6 outline-none mt-2">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-[#111111]">Properties</h1>
                <p className="text-[#7F817F] mt-1 text-sm">Manage your property portfolio</p>
              </div>
              <div className="flex gap-3">
                <Button onClick={fetchOwnerData} variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-[#F5F5F7] rounded-xl px-4 py-2 text-xs font-bold shadow-sm transition-all flex items-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </Button>
                <Button onClick={handleAddPropertyClick} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-xs font-bold shadow-sm transition-all flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Add Property
                </Button>
              </div>
            </div>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Properties', val: properties.length, icon: Building, color: 'text-blue-500', bg: 'bg-blue-50', sub: 'All property listings' },
                { label: 'Available Properties', val: properties.filter(p=>units.some(u=>u.propertyId===p.id&&u.status==='VACANT')).length, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', sub: 'Ready for rent' },
                { label: 'Occupied Properties', val: properties.filter(p=>units.some(u=>u.propertyId===p.id&&u.status==='OCCUPIED')).length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50', sub: 'Currently rented' },
                { label: 'Under Maintenance', val: properties.filter(p=>units.some(u=>u.propertyId===p.id&&u.status==='MAINTENANCE')).length, icon: Wrench, color: 'text-amber-500', bg: 'bg-amber-50', sub: 'Needs attention' }
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <Card key={s.label} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <p className="text-xs text-[#6E6E73] font-semibold">{s.label}</p>
                      <div className={`p-2 rounded-full ${s.bg} ${s.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-1">
                      <p className="text-3xl font-bold text-slate-900 leading-none">{s.val}</p>
                      <p className="text-[11px] text-[#6E6E73] mt-3 font-medium">{s.sub}</p>
                    </div>
                  </Card>
                );
              })}
            </div>

            {(() => {
              const TYPE_KEY: Record<string,string> = {Apartment:'Apartment',House:'House',Condo:'Condo',Commercial:'Commercial',Townhouse:'Townhouse'};
              const getPropType = (p:any) => { for(const k of Object.keys(TYPE_KEY)) if(p.name?.startsWith(k+':')) return k; return 'Apartment'; };
              const getPropName = (p:any) => { const i=p.name?.indexOf(':'); return i>-1?p.name.slice(i+1).trim():p.name; };
              const getPropStatus = (p:any) => { const pu=units.filter((u:any)=>u.propertyId===p.id); if(!pu.length) return 'VACANT'; if(pu.some((u:any)=>u.status==='MAINTENANCE')) return 'MAINTENANCE'; if(pu.some((u:any)=>u.status==='VACANT')) return 'AVAILABLE'; return 'OCCUPIED'; };
              const getRentRange = (p:any) => { const pu=units.filter((u:any)=>u.propertyId===p.id); if(!pu.length) return null; const r=pu.map((u:any)=>Number(u.rentAmount)); return {min:Math.min(...r),max:Math.max(...r)}; };
              const filtered = properties.filter(p=>{
                const n=getPropName(p).toLowerCase(); const t=getPropType(p); const s=getPropStatus(p);
                if(propSearch && !n.includes(propSearch.toLowerCase()) && !p.city?.toLowerCase().includes(propSearch.toLowerCase())) return false;
                if(propTypeFilter!=='ALL' && t!==propTypeFilter) return false;
                if(propStatusFilter!=='ALL' && s!==propStatusFilter) return false;
                return true;
              });
              
              if(propSort === 'NEWEST') filtered.reverse(); // Simplified sort

              return (
                <div className="space-y-4">
                  {/* Section Controls */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                        <Building className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-900 leading-tight">Properties</h2>
                        <p className="text-[11px] text-[#6E6E73]">Showing 1 to {filtered.length} of {properties.length} properties</p>
                      </div>
                    </div>
                    <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-sm">
                      <button onClick={()=>setPropViewMode('grid')} className={`p-1.5 rounded-lg transition-colors ${propViewMode==='grid'?'bg-white text-slate-900 shadow-sm border border-slate-200/50':'text-[#8E8E93] hover:text-[#6E6E73]'}`}>
                        <LayoutGrid className="h-4 w-4" />
                      </button>
                      <button onClick={()=>setPropViewMode('list')} className={`p-1.5 rounded-lg transition-colors ${propViewMode==='list'?'bg-white text-slate-900 shadow-sm border border-slate-200/50':'text-[#8E8E93] hover:text-[#6E6E73]'}`}>
                        <List className="h-4 w-4" />
                      </button>
                      <button onClick={()=>setPropViewMode('table')} className={`p-1.5 rounded-lg transition-colors ${propViewMode==='table'?'bg-white text-slate-900 shadow-sm border border-slate-200/50':'text-[#8E8E93] hover:text-[#6E6E73]'}`}>
                        <Table2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Search and Filter Bar */}
                  <div className="flex flex-wrap gap-3 items-center bg-white p-3 border border-slate-100 rounded-2xl shadow-sm">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8E8E93]" />
                      <Input placeholder="Search properties..." value={propSearch} onChange={e=>setPropSearch(e.target.value)} className="pl-9 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 rounded-xl h-10 text-sm w-full transition-colors" />
                    </div>
                    <Select value={propTypeFilter} onValueChange={(v)=>setPropTypeFilter(v||'ALL')}>
                      <SelectTrigger className="w-[140px] rounded-xl h-10 bg-slate-50 border-transparent text-sm font-medium"><SelectValue placeholder="All Types" /></SelectTrigger>
                      <SelectContent className="bg-white rounded-xl border-slate-100 shadow-lg">
                        <SelectItem value="ALL">All Types</SelectItem>
                        <SelectItem value="Apartment">Apartment</SelectItem>
                        <SelectItem value="House">House</SelectItem>
                        <SelectItem value="Condo">Condo</SelectItem>
                        <SelectItem value="Townhouse">Townhouse</SelectItem>
                        <SelectItem value="Commercial">Commercial</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={propStatusFilter} onValueChange={(v)=>setPropStatusFilter(v||'ALL')}>
                      <SelectTrigger className="w-[140px] rounded-xl h-10 bg-slate-50 border-transparent text-sm font-medium"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                      <SelectContent className="bg-white rounded-xl border-slate-100 shadow-lg">
                        <SelectItem value="ALL">All Statuses</SelectItem>
                        <SelectItem value="AVAILABLE">Available</SelectItem>
                        <SelectItem value="OCCUPIED">Occupied</SelectItem>
                        <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={propSort} onValueChange={(v)=>setPropSort(v||'NEWEST')}>
                      <SelectTrigger className="w-[140px] rounded-xl h-10 bg-slate-50 border-transparent text-sm font-medium"><SelectValue placeholder="Sort Order" /></SelectTrigger>
                      <SelectContent className="bg-white rounded-xl border-slate-100 shadow-lg">
                        <SelectItem value="NEWEST">Newest First</SelectItem>
                        <SelectItem value="OLDEST">Oldest First</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" className="h-10 rounded-xl text-sm font-medium border-slate-200 text-slate-700 hover:bg-[#F5F5F7] px-4">
                      All Units
                    </Button>
                  </div>

                  {/* Property Render Loop */}
                  {!filtered.length ? (
                    <div className="text-center py-16 text-[#6E6E73] bg-white rounded-2xl border border-slate-100 shadow-sm"><Building className="h-12 w-12 mx-auto mb-3 opacity-20" /><p className="font-semibold">No properties found</p><Button onClick={()=>setActiveTab('add-property')} className="mt-4 bg-blue-600 text-white rounded-xl px-5 h-10 text-xs font-bold hover:bg-blue-700"><Plus className="h-4 w-4 mr-1"/>Add Your First Property</Button></div>
                  ) : propViewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filtered.map(p=>{
                        const type=getPropType(p); const name=getPropName(p); const status=getPropStatus(p); const range=getRentRange(p);
                        const propUnits=units.filter((u:any)=>u.propertyId===p.id);
                        const vacantCount=propUnits.filter((u:any)=>u.status==='VACANT').length;
                        const occupiedCount=propUnits.filter((u:any)=>u.status==='OCCUPIED').length;
                        const maintCount=propUnits.filter((u:any)=>u.status==='MAINTENANCE').length;
                        return (
                          <Card key={p.id} className="bg-white border border-slate-100 rounded-[24px] shadow-sm overflow-hidden hover:shadow-lg transition-all group relative">
                            <div className="relative h-48 bg-white flex items-center justify-center overflow-hidden p-3 pb-0">
                              <div className="w-full h-full rounded-[16px] overflow-hidden relative bg-slate-100">
                                {p.coverPhoto ? <img src={p.coverPhoto} alt={name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" /> : <Building className="h-16 w-16 text-slate-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform duration-500 group-hover:scale-110" />}
                                <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[1px]">
                                  <button onClick={() => { setUnitPropFilter(p.id); setActiveTab('units'); }} className="h-10 w-10 bg-white rounded-full flex items-center justify-center text-slate-700 hover:text-blue-600 hover:scale-110 shadow-lg transition-all"><Eye className="h-4 w-4" /></button>
                                  <button onClick={() => { setEditPropId(p.id); setActiveTab('add-property'); }} className="h-10 w-10 bg-white rounded-full flex items-center justify-center text-slate-700 hover:text-blue-600 hover:scale-110 shadow-lg transition-all"><Edit2 className="h-4 w-4" /></button>
                                </div>
                                <div className="absolute top-3 left-3 flex gap-2">
                                  <span className={`text-[11px] font-bold px-3 py-1 rounded-full shadow-sm ${status==='AVAILABLE'?'bg-emerald-100/90 text-emerald-700':status==='OCCUPIED'?'bg-blue-100/90 text-blue-700':status==='MAINTENANCE'?'bg-amber-100/90 text-amber-700':'bg-slate-100/90 text-slate-700'}`}>
                                    {status==='AVAILABLE'?'Available':status==='OCCUPIED'?'Occupied':status==='MAINTENANCE'?'Maintenance':'Vacant'}
                                  </span>
                                </div>
                                <div className="absolute top-3 right-3">
                                  <span className="text-[11px] font-bold bg-white/95 text-slate-700 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                                    <Building className="h-3 w-3 text-[#6E6E73]" />{type}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="p-5 relative flex flex-col gap-3">
                              <div>
                                <h3 className="font-bold text-slate-900 text-[17px] pr-6 truncate">{name}</h3>
                                <p className="text-[13px] text-[#6E6E73] mt-1 line-clamp-1">{p.description || "hello world"}</p>
                              </div>
                              
                              <p className="text-xs text-[#6E6E73] flex items-center gap-1.5 font-medium">
                                <MapPin className="h-4 w-4 text-[#8E8E93] shrink-0" /> <span className="truncate">{p.city}, {p.state || p.city}, {p.country || 'London'} {p.zip || '3100'}</span>
                              </p>
                              
                              <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 flex flex-col gap-2 mt-1">
                                <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-700">
                                  <span>{propUnits.length} Units</span>
                                  {vacantCount > 0 && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">{vacantCount} available</span>}
                                  {occupiedCount > 0 && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">{occupiedCount} occupied</span>}
                                </div>
                                <div className="text-[11px] text-[#6E6E73] font-medium">Types: {type}</div>
                              </div>
                              
                              <div className="mt-1 flex justify-between items-center">
                                <div>
                                  {range ? (
                                    <p className="text-[17px] font-black text-slate-900">${range.min.toLocaleString(undefined, {minimumFractionDigits: 2})}{range.min!==range.max?` - $${range.max.toLocaleString(undefined, {minimumFractionDigits: 2})}`:''}<span className="text-[12px] font-semibold text-[#6E6E73]"> /month</span></p>
                                  ) : (
                                    <p className="text-[17px] font-black text-slate-900">$150.00 <span className="text-[12px] font-semibold text-[#6E6E73]"> /month</span></p>
                                  )}
                                  <p className="text-[11px] font-bold text-emerald-600 mt-1">{vacantCount > 0 ? `${vacantCount} available` : propUnits.length === 1 ? 'Single unit' : ''}</p>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger className="text-[#8E8E93] hover:text-[#6E6E73] p-1.5 rounded-md hover:bg-[#F5F5F7] transition-colors">
                                    <MoreVertical className="h-5 w-5" />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48 bg-white border-slate-100 rounded-xl shadow-lg p-1">
                                    <DropdownMenuGroup>
                                      <DropdownMenuLabel className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider py-1.5 px-2">Actions</DropdownMenuLabel>
                                      <DropdownMenuItem onClick={() => { setUnitPropFilter(p.id); setActiveTab('units'); }} className="text-sm font-medium text-slate-700 focus:bg-slate-50 focus:text-slate-900 cursor-pointer rounded-lg py-2 px-2 flex items-center gap-2">
                                        <Eye className="h-4 w-4 text-[#8E8E93]" /> View Details
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => { setEditPropId(p.id); setActiveTab('add-property'); }} className="text-sm font-medium text-slate-700 focus:bg-slate-50 focus:text-slate-900 cursor-pointer rounded-lg py-2 px-2 flex items-center gap-2">
                                        <Edit2 className="h-4 w-4 text-[#8E8E93]" /> Edit Property
                                      </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator className="bg-slate-100 my-1" />
                                    <DropdownMenuItem onClick={() => handleDeleteProperty(p.id)} className="text-sm font-medium text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer rounded-lg py-2 px-2 flex items-center gap-2">
                                      <Trash2 className="h-4 w-4 text-red-500" /> Delete Property
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-slate-100 my-1" />
                                    <DropdownMenuItem onClick={() => handleUpdatePropertyStatus(p.id, "OCCUPIED")} className="text-sm font-medium text-blue-600 focus:bg-blue-50 focus:text-blue-700 cursor-pointer rounded-lg py-2 px-2 flex items-center gap-2">
                                      <Users className="h-4 w-4 text-blue-500" /> Mark Occupied
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdatePropertyStatus(p.id, "MAINTENANCE")} className="text-sm font-medium text-amber-600 focus:bg-amber-50 focus:text-amber-700 cursor-pointer rounded-lg py-2 px-2 flex items-center gap-2">
                                      <AlertTriangle className="h-4 w-4 text-amber-500" /> Mark Maintenance
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdatePropertyStatus(p.id, "AVAILABLE")} className="text-sm font-medium text-emerald-600 focus:bg-emerald-50 focus:text-emerald-700 cursor-pointer rounded-lg py-2 px-2 flex items-center gap-2">
                                      <CheckCircle className="h-4 w-4 text-emerald-500" /> Mark Available
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  ) : propViewMode === 'list' ? (
                     <div className="space-y-4">
                      {filtered.map(p=>{
                        const type=getPropType(p); const name=getPropName(p); const status=getPropStatus(p); const range=getRentRange(p);
                        const propUnits=units.filter((u:any)=>u.propertyId===p.id);
                        return (
                          <Card key={p.id} className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row hover:shadow-md transition-shadow group">
                            <div className="w-full md:w-48 h-40 md:h-auto bg-slate-100 relative shrink-0">
                               {p.coverPhoto ? <img src={p.coverPhoto} alt={name} className="w-full h-full object-cover" /> : <Building className="h-12 w-12 text-slate-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
                            </div>
                            <div className="p-5 flex-1 flex flex-col justify-between">
                              <div>
                                <div className="flex justify-between items-start">
                                  <h3 className="font-bold text-slate-900 text-lg">{name}</h3>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shadow-sm ${status==='AVAILABLE'?'bg-emerald-50 text-emerald-600 border-emerald-200':status==='OCCUPIED'?'bg-blue-50 text-blue-600 border-blue-200':status==='MAINTENANCE'?'bg-amber-50 text-amber-600 border-amber-200':'bg-slate-50 text-[#6E6E73] border-slate-200'}`}>
                                      {status==='AVAILABLE'?'Available':status==='OCCUPIED'?'Occupied':status==='MAINTENANCE'?'Maintenance':'Vacant'}
                                    </span>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger className="text-[#8E8E93] hover:text-[#6E6E73] p-1 rounded-md hover:bg-[#F5F5F7] transition-colors">
                                        <MoreVertical className="h-4 w-4" />
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-48 bg-white border-slate-100 rounded-xl shadow-lg p-1">
                                        <DropdownMenuGroup>
                                          <DropdownMenuLabel className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider py-1.5 px-2">Actions</DropdownMenuLabel>
                                          <DropdownMenuItem onClick={() => { setUnitPropFilter(p.id); setActiveTab('units'); }} className="text-sm font-medium text-slate-700 focus:bg-slate-50 focus:text-slate-900 cursor-pointer rounded-lg py-2 px-2 flex items-center gap-2">
                                            <Eye className="h-4 w-4 text-[#8E8E93]" /> View Details
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => { setEditPropId(p.id); setActiveTab('add-property'); }} className="text-sm font-medium text-slate-700 focus:bg-slate-50 focus:text-slate-900 cursor-pointer rounded-lg py-2 px-2 flex items-center gap-2">
                                            <Edit2 className="h-4 w-4 text-[#8E8E93]" /> Edit Property
                                          </DropdownMenuItem>
                                        </DropdownMenuGroup>
                                        <DropdownMenuSeparator className="bg-slate-100 my-1" />
                                        <DropdownMenuItem onClick={() => handleDeleteProperty(p.id)} className="text-sm font-medium text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer rounded-lg py-2 px-2 flex items-center gap-2">
                                          <Trash2 className="h-4 w-4 text-red-500" /> Delete Property
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="bg-slate-100 my-1" />
                                        <DropdownMenuItem onClick={() => handleUpdatePropertyStatus(p.id, "OCCUPIED")} className="text-sm font-medium text-blue-600 focus:bg-blue-50 focus:text-blue-700 cursor-pointer rounded-lg py-2 px-2 flex items-center gap-2">
                                          <Users className="h-4 w-4 text-blue-500" /> Mark Occupied
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleUpdatePropertyStatus(p.id, "MAINTENANCE")} className="text-sm font-medium text-amber-600 focus:bg-amber-50 focus:text-amber-700 cursor-pointer rounded-lg py-2 px-2 flex items-center gap-2">
                                          <AlertTriangle className="h-4 w-4 text-amber-500" /> Mark Maintenance
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleUpdatePropertyStatus(p.id, "AVAILABLE")} className="text-sm font-medium text-emerald-600 focus:bg-emerald-50 focus:text-emerald-700 cursor-pointer rounded-lg py-2 px-2 flex items-center gap-2">
                                          <CheckCircle className="h-4 w-4 text-emerald-500" /> Mark Available
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                                <p className="text-[11px] text-[#6E6E73] flex items-center gap-1.5 mt-1 font-medium"><MapPin className="h-3.5 w-3.5 text-[#8E8E93]" /> {p.address}, {p.city}</p>
                              </div>
                              <div className="flex items-center gap-6 mt-4">
                                <div>
                                  <p className="text-[10px] text-[#8E8E93] uppercase font-bold tracking-wider">Type</p>
                                  <p className="text-sm font-semibold text-slate-700">{type}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-[#8E8E93] uppercase font-bold tracking-wider">Units</p>
                                  <p className="text-sm font-semibold text-slate-700">{propUnits.length}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-[#8E8E93] uppercase font-bold tracking-wider">Rent Range</p>
                                  {range ? <p className="text-sm font-semibold text-slate-700">${range.min.toLocaleString()} - ${range.max.toLocaleString()}</p> : <p className="text-sm text-[#6E6E73]">-</p>}
                                </div>
                              </div>
                            </div>
                          </Card>
                        )
                      })}
                     </div>
                  ) : (
                    <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50/50 border-b border-slate-100"><TableRow className="hover:bg-transparent"><TableHead className="text-[#6E6E73] font-semibold text-[11px] py-3 uppercase tracking-wider">Property</TableHead><TableHead className="text-[#6E6E73] font-semibold text-[11px] py-3 uppercase tracking-wider">Location</TableHead><TableHead className="text-[#6E6E73] font-semibold text-[11px] py-3 uppercase tracking-wider">Type</TableHead><TableHead className="text-[#6E6E73] font-semibold text-[11px] py-3 uppercase tracking-wider">Units</TableHead><TableHead className="text-[#6E6E73] font-semibold text-[11px] py-3 uppercase tracking-wider text-right">Status</TableHead></TableRow></TableHeader>
                        <TableBody>{filtered.map(p=>{ const type=getPropType(p); const name=getPropName(p); const status=getPropStatus(p); const pu=units.filter((u:any)=>u.propertyId===p.id); return (<TableRow key={p.id} className="border-b border-slate-50 hover:bg-[#F5F5F7]/50 transition-colors"><TableCell className="font-bold text-slate-900 py-3">{name}</TableCell><TableCell className="text-[#6E6E73] font-medium text-xs">{p.city}, {p.country}</TableCell><TableCell className="text-slate-700 font-medium text-xs">{type}</TableCell><TableCell className="text-blue-600 font-bold text-xs">{pu.length}</TableCell><TableCell className="text-right"><Badge className={`rounded-full font-bold px-2.5 py-0.5 border shadow-sm ${status==='AVAILABLE'?'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100':status==='OCCUPIED'?'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100':'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'}`}>{status==='AVAILABLE'?'Available':status==='OCCUPIED'?'Occupied':status==='MAINTENANCE'?'Maintenance':'Vacant'}</Badge></TableCell></TableRow>); })}</TableBody>
                      </Table>
                    </Card>
                  )}
                </div>
              );
            })()}
          </TabsContent>


          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-6 outline-none">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-[#111111]">Applications</h2>
                <p className="text-sm text-[#7F817F] mt-0.5">Review tenant applications</p>
              </div>
            </div>
            <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/50 border-b border-slate-100"><TableRow><TableHead className="text-[#6E6E73] font-semibold text-[11px] py-3 uppercase tracking-wider">Applicant</TableHead><TableHead className="text-[#6E6E73] font-semibold text-[11px] py-3 uppercase tracking-wider">Unit</TableHead><TableHead className="text-[#6E6E73] font-semibold text-[11px] py-3 uppercase tracking-wider">Status</TableHead><TableHead className="text-[#6E6E73] font-semibold text-[11px] py-3 uppercase tracking-wider text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {applications.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-[#6E6E73] font-medium">No applications found.</TableCell></TableRow>
                  ) : applications.map(app => (
                    <TableRow key={app.id}>
                      <TableCell>
                        <p className="font-bold text-slate-900">{app.name}</p>
                        <p className="text-xs text-[#6E6E73]">{app.email} • {app.phone}</p>
                        {app.documents && app.documents.length > 0 && (
                          <a href={app.documents[0]} target="_blank" rel="noreferrer" className="text-blue-500 text-xs hover:underline mt-1 block">View Document</a>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-slate-700">{app.unit?.name}</TableCell>
                      <TableCell>
                        <Badge className={`rounded-full font-bold px-2.5 py-0.5 ${app.status === 'PENDING' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {app.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {app.status !== 'LEASE_CREATED' && (
                          <Button 
                            onClick={() => {
                              setLEmail(app.email);
                              setLUnitId(app.unitId);
                              setLRent(app.unit?.rentAmount || "");
                              setLAppId(app.id);
                              setActiveTab("leases");
                              setLeaseSubTab("new");
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-8 text-xs rounded-lg px-3"
                          >
                            Create Lease
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Add Property Full Page Tab */}
          <TabsContent value="add-property" className="outline-none">
            <PropertyForm 
              onSave={handleSaveProperty} 
              onCancel={() => { setActiveTab('properties'); setEditPropId(null); }} 
              initialData={editPropId ? properties.find((p: any) => p.id === editPropId) : undefined} 
            />
          </TabsContent>
          
          {/* Available Units Tab */}
          <TabsContent value="available-units" className="space-y-6 outline-none">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#111111] tracking-tight">Available Units</h2>
                <p className="text-sm text-[#7F817F] mt-1 font-medium">Individual units currently available for rent</p>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <Button onClick={() => fetchOwnerData()} variant="outline" className="flex-1 md:flex-none border-slate-200 text-slate-700 bg-white hover:bg-[#F5F5F7] font-semibold h-10 rounded-xl transition-all shadow-sm">
                  <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                </Button>
                <Button onClick={handleAddPropertyClick} className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 rounded-xl transition-all shadow-sm px-6">
                  <Plus className="h-4 w-4 mr-2" /> Add Property
                </Button>
              </div>
            </div>

            {/* 4 Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <p className="text-xs text-[#6E6E73] font-semibold uppercase tracking-wider">Available Units</p>
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600"><CheckCircle2 className="h-4 w-4" /></div>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-black text-slate-900">{avTotalVacantUnits}</p>
                  <p className="text-[11px] text-[#6E6E73] mt-1.5 font-medium">Across {avTotalPropertiesWithVacancies} properties</p>
                </div>
              </Card>
              <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <p className="text-xs text-[#6E6E73] font-semibold uppercase tracking-wider">Average Rent</p>
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600"><DollarSign className="h-4 w-4" /></div>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-black text-slate-900">${avAvgRent.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  <p className="text-[11px] text-[#6E6E73] mt-1.5 font-medium">${avMinRent.toLocaleString()} - ${avMaxRent.toLocaleString()}</p>
                </div>
              </Card>
              <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <p className="text-xs text-[#6E6E73] font-semibold uppercase tracking-wider">Most Common Type</p>
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600"><Building2 className="h-4 w-4" /></div>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-black text-slate-900 truncate">{avMostCommonType}</p>
                  <p className="text-[11px] text-[#6E6E73] mt-1.5 font-medium">{avHighestCount} units</p>
                </div>
              </Card>
              <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <p className="text-xs text-[#6E6E73] font-semibold uppercase tracking-wider">Average Size</p>
                  <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600"><Maximize2 className="h-4 w-4" /></div>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-black text-slate-900">{Math.round(avAvgSqFt).toLocaleString()} <span className="text-lg font-bold text-[#6E6E73]">ft²</span></p>
                  <p className="text-[11px] text-[#6E6E73] mt-1.5 font-medium">{avMinSqFt.toLocaleString()} - {avMaxSqFt.toLocaleString()} ft²</p>
                </div>
              </Card>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-2 border border-slate-100 rounded-2xl shadow-sm flex flex-col lg:flex-row gap-3">
              <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1 shrink-0">
                <button onClick={() => setAvUnitsViewMode('grid')} className={`p-2 rounded-lg transition-all ${avUnitsViewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-[#8E8E93] hover:text-[#6E6E73]'}`}>
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button onClick={() => setAvUnitsViewMode('list')} className={`p-2 rounded-lg transition-all ${avUnitsViewMode === 'list' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-[#8E8E93] hover:text-[#6E6E73]'}`}>
                  <List className="h-4 w-4" />
                </button>
                <button onClick={() => setAvUnitsViewMode('table')} className={`p-2 rounded-lg transition-all ${avUnitsViewMode === 'table' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-[#8E8E93] hover:text-[#6E6E73]'}`}>
                  <Table2 className="h-4 w-4" />
                </button>
              </div>

              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8E8E93]" />
                <Input 
                  placeholder="Search units or properties..." 
                  value={avUnitsSearch} 
                  onChange={e => setAvUnitsSearch(e.target.value)} 
                  className="pl-10 h-11 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 rounded-xl text-sm w-full transition-all" 
                />
              </div>

              <div className="flex flex-wrap sm:flex-nowrap gap-3">
                <Select value={avUnitsPropTypeFilter} onValueChange={v => setAvUnitsPropTypeFilter(v || "ALL")}>
                  <SelectTrigger className="w-[140px] sm:w-[160px] h-11 bg-slate-50 border-transparent rounded-xl text-sm font-semibold focus:bg-white focus:border-blue-500">
                    <div className="flex items-center gap-2"><Building className="h-4 w-4 text-[#8E8E93]" /><SelectValue placeholder="Property Type" /></div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-lg border-slate-100">
                    <SelectItem value="ALL">All Types</SelectItem>
                    <SelectItem value="Apartment">Apartment</SelectItem>
                    <SelectItem value="House">House</SelectItem>
                    <SelectItem value="Condo">Condo</SelectItem>
                    <SelectItem value="Townhouse">Townhouse</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={avUnitsBedFilter} onValueChange={v => setAvUnitsBedFilter(v || "ALL")}>
                  <SelectTrigger className="w-[100px] h-11 bg-slate-50 border-transparent rounded-xl text-sm font-semibold focus:bg-white focus:border-blue-500">
                    <SelectValue placeholder="Beds" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-lg border-slate-100">
                    <SelectItem value="ALL">Any Beds</SelectItem>
                    <SelectItem value="1">1 Bed</SelectItem>
                    <SelectItem value="2">2 Beds</SelectItem>
                    <SelectItem value="3">3 Beds</SelectItem>
                    <SelectItem value="4">4 Beds</SelectItem>
                    <SelectItem value="5+">5+ Beds</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={avUnitsBathFilter} onValueChange={v => setAvUnitsBathFilter(v || "ALL")}>
                  <SelectTrigger className="w-[100px] h-11 bg-slate-50 border-transparent rounded-xl text-sm font-semibold focus:bg-white focus:border-blue-500">
                    <SelectValue placeholder="Baths" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-lg border-slate-100">
                    <SelectItem value="ALL">Any Baths</SelectItem>
                    <SelectItem value="1">1 Bath</SelectItem>
                    <SelectItem value="2">2 Baths</SelectItem>
                    <SelectItem value="3">3 Baths</SelectItem>
                    <SelectItem value="4+">4+ Baths</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={avUnitsUnitTypeFilter} onValueChange={v => setAvUnitsUnitTypeFilter(v || "ALL")}>
                  <SelectTrigger className="w-[140px] sm:w-[160px] h-11 bg-slate-50 border-transparent rounded-xl text-sm font-semibold focus:bg-white focus:border-blue-500">
                    <SelectValue placeholder="Unit Type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-lg border-slate-100">
                    <SelectItem value="ALL">All Unit Types</SelectItem>
                    <SelectItem value="Apartment">Apartment</SelectItem>
                    <SelectItem value="Studio">Studio</SelectItem>
                    <SelectItem value="Duplex">Duplex</SelectItem>
                    <SelectItem value="Loft">Loft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* List Display */}
            {avFilteredUnits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <Search className="h-6 w-6 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">No units found</h3>
                <p className="text-sm text-[#6E6E73] max-w-sm text-center">We couldn't find any available units matching your filters. Try adjusting your search criteria.</p>
                <Button onClick={() => {setAvUnitsSearch(''); setAvUnitsPropTypeFilter('ALL'); setAvUnitsBedFilter('ALL'); setAvUnitsBathFilter('ALL'); setAvUnitsUnitTypeFilter('ALL');}} variant="outline" className="mt-6 rounded-xl">Clear All Filters</Button>
              </div>
            ) : avUnitsViewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {avFilteredUnits.map((u: any) => {
                  const p = properties.find((prop: any) => prop.id === u.propertyId);
                  return (
                    <Card key={u.id} className="bg-white border border-slate-100 rounded-[24px] overflow-hidden shadow-sm hover:shadow-lg transition-all group flex flex-col">
                      <div className="relative h-48 bg-white flex items-center justify-center overflow-hidden p-3 pb-0">
                        <div className="w-full h-full rounded-[16px] overflow-hidden relative bg-slate-100">
                          {u.images && u.images.length > 0 ? (
                            <img src={u.images[0]} alt={u.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : p?.coverPhoto ? (
                            <img src={p.coverPhoto} alt={p?.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <Building className="h-16 w-16 text-slate-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                          )}
                          <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[1px]">
                            <button onClick={() => { setViewUnitId(u.id); setActiveTab('unit-details'); }} className="h-10 w-10 bg-white rounded-full flex items-center justify-center text-slate-700 hover:text-blue-600 hover:scale-110 shadow-lg transition-all"><Eye className="h-4 w-4" /></button>
                          </div>
                          <div className="absolute top-3 left-3 flex gap-2">
                            <span className={`text-[11px] font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5 ${u.status === 'VACANT' || u.status === 'AVAILABLE' ? 'bg-emerald-100/90 text-emerald-700' : u.status === 'OCCUPIED' ? 'bg-blue-100/90 text-blue-700' : 'bg-amber-100/90 text-amber-700'}`}>
                              <CheckCircle className="h-3 w-3" /> {u.status === 'VACANT' || u.status === 'AVAILABLE' ? 'Available' : u.status === 'OCCUPIED' ? 'Occupied' : 'Maintenance'}
                            </span>
                          </div>
                          <div className="absolute top-3 right-3">
                            <span className="text-[11px] font-bold bg-white/95 text-slate-700 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                              <Home className="h-3 w-3 text-[#6E6E73]" />{u.type || 'Apartment'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="p-5 flex-1 flex flex-col">
                        <div>
                          <h3 className="font-bold text-slate-900 text-[17px] leading-tight truncate">{p?.name ? `${p.name} - ${u.name}` : u.name}</h3>
                          <p className="text-[13px] text-[#6E6E73] mt-1 line-clamp-2">{p?.description || "hello world"}</p>
                        </div>
                        <div className="mt-3 text-xs text-[#6E6E73] font-medium flex items-center gap-1.5 truncate">
                          <MapPin className="h-4 w-4 text-[#8E8E93] shrink-0" /> {p?.city || 'London'}, {p?.state || p?.city}, {p?.country || 'London'} {p?.zip || '3100'}
                        </div>

                        <div className="mt-4 flex items-center gap-4 text-[13px] font-semibold text-[#6E6E73]">
                          <span className="flex items-center gap-1.5"><Bed className="h-4 w-4 text-[#8E8E93]" /> {u.rooms}</span>
                          <span className="flex items-center gap-1.5"><Bath className="h-4 w-4 text-[#8E8E93]" /> {u.bathrooms || 1}</span>
                          <span className="flex items-center gap-1.5"><Square className="h-4 w-4 text-[#8E8E93]" /> {u.sqFootage || '--'} ft²</span>
                        </div>
                        
                        <div className="mt-3">
                          <span className="bg-slate-100 text-[#6E6E73] px-2 py-1 rounded text-[11px] font-bold">Floor {u.floor || 1}</span>
                        </div>

                        <div className="mt-auto pt-5 flex items-center justify-between">
                          <p className="font-black text-slate-900 text-[17px] leading-none">${Number(u.rentAmount).toLocaleString(undefined, {minimumFractionDigits: 2})} <span className="text-[12px] font-semibold text-[#6E6E73]">/month</span></p>
                          <DropdownMenu>
                            <DropdownMenuTrigger className="text-[#8E8E93] hover:text-[#6E6E73] p-1.5 rounded-md hover:bg-[#F5F5F7] transition-colors">
                              <MoreVertical className="h-5 w-5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-white rounded-xl shadow-lg border-slate-100 p-1">
                              <DropdownMenuGroup>
                                <DropdownMenuItem onClick={() => { setViewUnitId(u.id); setActiveTab('unit-details'); }} className="text-sm font-medium rounded-lg px-2 py-2 cursor-pointer focus:bg-slate-50">
                                  <Eye className="h-4 w-4 mr-2 text-[#8E8E93]" /> View Unit Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setUnitPropFilter(p?.id); setActiveTab('units'); }} className="text-sm font-medium rounded-lg px-2 py-2 cursor-pointer focus:bg-slate-50">
                                  <Building className="h-4 w-4 mr-2 text-[#8E8E93]" /> View Property
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : avUnitsViewMode === 'list' ? (
              <div className="space-y-4">
                {avFilteredUnits.map((u: any) => {
                  const p = properties.find((prop: any) => prop.id === u.propertyId);
                  return (
                    <Card key={u.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col sm:flex-row">
                      <div className="w-full sm:w-64 h-48 sm:h-auto bg-slate-100 relative shrink-0">
                        {u.images && u.images.length > 0 ? (
                          <img src={u.images[0]} alt={u.name} className="w-full h-full object-cover" />
                        ) : p?.coverPhoto ? (
                          <img src={p.coverPhoto} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Building className="h-10 w-10 text-slate-300" /></div>
                        )}
                        <Badge className="absolute top-3 left-3 bg-white/95 text-emerald-600 border-none shadow-sm font-bold px-2.5 py-1 text-[10px] tracking-wide uppercase">Available</Badge>
                      </div>
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-bold text-slate-900 text-xl leading-tight">{u.name}</h3>
                              <p className="text-sm text-[#6E6E73] font-medium mt-1">{p?.name || 'Unknown Property'}</p>
                              <div className="flex items-center gap-1.5 text-[11px] text-[#6E6E73] font-medium mt-1.5">
                                <MapPin className="h-3 w-3 text-[#8E8E93] shrink-0" /> {p?.address}, {p?.city}
                              </div>
                            </div>
                            <div className="flex items-start gap-4">
                              <div className="text-right">
                                <p className="font-black text-blue-600 text-2xl leading-tight">${Number(u.rentAmount).toLocaleString()}</p>
                                <p className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-widest mt-1">/ Month</p>
                              </div>
                              <Button variant="outline" size="icon" onClick={() => { setViewUnitId(u.id); setActiveTab('unit-details'); }} className="h-8 w-8 rounded-full text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger className="h-8 w-8 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-slate-700 hover:bg-[#F5F5F7] transition-colors border border-slate-100 ml-1">
                                  <MoreVertical className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 bg-white rounded-xl shadow-lg border-slate-100 p-1">
                                  <DropdownMenuGroup>
                                    <DropdownMenuItem onClick={() => { setEditUnitId(u.id); setUName(u.name); setURent(u.rentAmount); setUDeposit(u.depositAmt); setURooms(u.rooms); setUSqFt(u.sqFootage); setUPropId(u.propertyId); setUAmenities(u.amenities?.join(', ') || ''); setActiveTab('add-unit'); }} className="text-sm font-medium rounded-lg px-2 py-2 cursor-pointer focus:bg-slate-50">
                                      <Edit2 className="h-4 w-4 mr-2 text-[#8E8E93]" /> View Unit Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setUnitPropFilter(p?.id); setActiveTab('units'); }} className="text-sm font-medium rounded-lg px-2 py-2 cursor-pointer focus:bg-slate-50">
                                      <Building className="h-4 w-4 mr-2 text-[#8E8E93]" /> View Property
                                    </DropdownMenuItem>
                                  </DropdownMenuGroup>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-6 mt-6 pt-5 border-t border-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center"><Bed className="h-4 w-4 text-[#8E8E93]" /></div>
                            <div><p className="text-[10px] text-[#8E8E93] font-bold uppercase tracking-wider">Beds</p><p className="text-sm font-black text-slate-700 leading-none mt-0.5">{u.rooms}</p></div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center"><Bath className="h-4 w-4 text-[#8E8E93]" /></div>
                            <div><p className="text-[10px] text-[#8E8E93] font-bold uppercase tracking-wider">Baths</p><p className="text-sm font-black text-slate-700 leading-none mt-0.5">{u.bathrooms || 1}</p></div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center"><Maximize2 className="h-4 w-4 text-[#8E8E93]" /></div>
                            <div><p className="text-[10px] text-[#8E8E93] font-bold uppercase tracking-wider">Sq Ft</p><p className="text-sm font-black text-slate-700 leading-none mt-0.5">{u.sqFootage || '--'}</p></div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center"><Building2 className="h-4 w-4 text-[#8E8E93]" /></div>
                            <div><p className="text-[10px] text-[#8E8E93] font-bold uppercase tracking-wider">Type</p><p className="text-sm font-black text-slate-700 leading-none mt-0.5">{u.type || 'Apartment'}</p></div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[#6E6E73] font-bold text-[11px] py-4 uppercase tracking-wider">Unit Info</TableHead>
                        <TableHead className="text-[#6E6E73] font-bold text-[11px] py-4 uppercase tracking-wider">Property & Location</TableHead>
                        <TableHead className="text-[#6E6E73] font-bold text-[11px] py-4 uppercase tracking-wider">Details</TableHead>
                        <TableHead className="text-[#6E6E73] font-bold text-[11px] py-4 uppercase tracking-wider text-right">Rent</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {avFilteredUnits.map((u: any) => {
                        const p = properties.find((prop: any) => prop.id === u.propertyId);
                        return (
                          <TableRow key={u.id} className="border-b border-slate-50 hover:bg-[#F5F5F7]/50 transition-colors">
                            <TableCell className="py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-slate-100 overflow-hidden shrink-0 hidden sm:block">
                                  {u.images && u.images.length > 0 ? (
                                    <img src={u.images[0]} alt={u.name} className="w-full h-full object-cover" />
                                  ) : p?.coverPhoto ? (
                                    <img src={p.coverPhoto} alt={p.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center"><Building className="h-5 w-5 text-slate-300" /></div>
                                  )}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900">{u.name}</p>
                                  <p className="text-xs text-[#6E6E73] font-medium">{u.type || 'Apartment'}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="font-bold text-slate-700 text-sm">{p?.name || 'Unknown Property'}</p>
                              <p className="text-[11px] text-[#6E6E73] font-medium mt-0.5">{p?.city}</p>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3 text-xs font-semibold text-[#6E6E73]">
                                <span title="Beds" className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md"><Bed className="h-3 w-3 text-[#8E8E93]" /> {u.rooms}</span>
                                <span title="Baths" className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md"><Bath className="h-3 w-3 text-[#8E8E93]" /> {u.bathrooms || 1}</span>
                                <span title="Sq Ft" className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md"><Maximize2 className="h-3 w-3 text-[#8E8E93]" /> {u.sqFootage || '--'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <p className="font-black text-slate-900 text-[15px]">${Number(u.rentAmount).toLocaleString()}</p>
                              <p className="text-[10px] text-emerald-600 font-bold mt-0.5 uppercase tracking-wider">Available</p>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={() => { setViewUnitId(u.id); setActiveTab('unit-details'); }} className="h-8 w-8 rounded-full text-blue-600 hover:bg-blue-50">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger className="h-8 w-8 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-slate-700 hover:bg-[#F2F2F7] transition-colors">
                                  <MoreVertical className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 bg-white rounded-xl shadow-lg border-slate-100 p-1">
                                  <DropdownMenuGroup>
                                    <DropdownMenuItem onClick={() => { setEditUnitId(u.id); setUName(u.name); setURent(u.rentAmount); setUDeposit(u.depositAmt); setURooms(u.rooms); setUSqFt(u.sqFootage); setUPropId(u.propertyId); setUAmenities(u.amenities?.join(', ') || ''); setActiveTab('add-unit'); }} className="text-sm font-medium rounded-lg px-2 py-2 cursor-pointer focus:bg-slate-50">
                                      <Edit2 className="h-4 w-4 mr-2 text-[#8E8E93]" /> View Unit Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setUnitPropFilter(p?.id); setActiveTab('units'); }} className="text-sm font-medium rounded-lg px-2 py-2 cursor-pointer focus:bg-slate-50">
                                      <Building className="h-4 w-4 mr-2 text-[#8E8E93]" /> View Property
                                    </DropdownMenuItem>
                                  </DropdownMenuGroup>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="units" className="space-y-6 outline-none">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">All Units</h2>
                <p className="text-sm text-[#6E6E73] font-medium mt-1">Browse every unit across all properties</p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" className="h-10 px-4 rounded-xl border-slate-200 hover:bg-[#F5F5F7] text-[#6E6E73] font-semibold shadow-sm transition-all">
                  <RefreshCw className="h-4 w-4 mr-2 text-[#8E8E93]" /> Refresh
                </Button>
                <Dialog open={unitOpen} onOpenChange={setUnitOpen}>
                  <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 rounded-xl h-10 px-5 font-bold transition-all" />}>
                    <Plus className="h-4 w-4 mr-2" /> Add Unit
                  </DialogTrigger>
                  <DialogContent className="bg-white border-[#E2E3E0] text-[#111111] rounded-[28px] max-w-md p-6">
                    <DialogHeader>
                      <DialogTitle className="text-lg font-extrabold">Add New Rental Unit</DialogTitle>
                      <DialogDescription className="text-[#7F817F] text-xs">Create a rental unit within one of your properties.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveUnit} className="space-y-4 pt-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="unitProp" className="text-xs font-bold">Belongs to Property</Label>
                        <Select value={uPropId} onValueChange={(val) => setUPropId(val || "")}>
                          <SelectTrigger className="bg-[#F5F5F3] border-[#E2E3E0] text-[#111111] rounded-xl h-11">
                            <SelectValue placeholder="Select Property" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-[#E2E3E0] text-[#111111] rounded-xl">
                            {properties.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name} ({p.city})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="unitName" className="text-xs font-bold">Unit Name / Number</Label>
                        <Input
                          id="unitName"
                          placeholder="Flat 102"
                          value={uName}
                          onChange={(e) => setUName(e.target.value)}
                          className="bg-[#F5F5F3] border-[#E2E3E0] text-[#111111] rounded-xl h-11"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="unitRent" className="text-xs font-bold">Rent Amount ($/mo)</Label>
                          <Input
                            id="unitRent"
                            type="number"
                            placeholder="1200"
                            value={uRent}
                            onChange={(e) => setURent(e.target.value)}
                            className="bg-[#F5F5F3] border-[#E2E3E0] text-[#111111] rounded-xl h-11"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="unitDeposit" className="text-xs font-bold">Deposit Amount ($)</Label>
                          <Input
                            id="unitDeposit"
                            type="number"
                            placeholder="2400"
                            value={uDeposit}
                            onChange={(e) => setUDeposit(e.target.value)}
                            className="bg-[#F5F5F3] border-[#E2E3E0] text-[#111111] rounded-xl h-11"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="unitRooms" className="text-xs font-bold">Rooms</Label>
                          <Input
                            id="unitRooms"
                            type="number"
                            placeholder="2"
                            value={uRooms}
                            onChange={(e) => setURooms(e.target.value)}
                            className="bg-[#F5F5F3] border-[#E2E3E0] text-[#111111] rounded-xl h-11"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="unitSqFt" className="text-xs font-bold">Square Footage</Label>
                          <Input
                            id="unitSqFt"
                            type="number"
                            placeholder="850"
                            value={uSqFt}
                            onChange={(e) => setUSqFt(e.target.value)}
                            className="bg-[#F5F5F3] border-[#E2E3E0] text-[#111111] rounded-xl h-11"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="unitAmenities" className="text-xs font-bold">Amenities (comma-separated)</Label>
                        <Input
                          id="unitAmenities"
                          placeholder="WiFi, Balcony, Air Conditioning"
                          value={uAmenities}
                          onChange={(e) => setUAmenities(e.target.value)}
                          className="bg-[#F5F5F3] border-[#E2E3E0] text-[#111111] rounded-xl h-11"
                        />
                      </div>
                      <Button type="submit" className="w-full bg-[#496E5C] hover:bg-[#3E5C4E] text-white font-bold h-11 rounded-xl transition-colors">
                        Create Unit
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-110 transition-transform duration-500 opacity-50"></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shadow-sm"><LayoutGrid className="h-5 w-5" /></div>
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50 font-bold border-none shadow-sm">Total Units</Badge>
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">{auTotalUnits}</h3>
                    <p className="text-sm font-medium text-[#6E6E73] mt-1">Across {auTotalProperties} properties</p>
                  </div>
                </div>
              </Card>
              <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform duration-500 opacity-50"></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-10 w-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shadow-sm"><DollarSign className="h-5 w-5" /></div>
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 font-bold border-none shadow-sm">Avg Rent</Badge>
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">${auAvgRent.toLocaleString(undefined, {maximumFractionDigits:0})}</h3>
                    <p className="text-sm font-medium text-[#6E6E73] mt-1">Range: ${auMinRent.toLocaleString()} - ${auMaxRent.toLocaleString()}</p>
                  </div>
                </div>
              </Card>
              <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-50 rounded-full group-hover:scale-110 transition-transform duration-500 opacity-50"></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm"><Building2 className="h-5 w-5" /></div>
                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 font-bold border-none shadow-sm">Most Common</Badge>
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight capitalize truncate" title={auMostCommonType}>{auMostCommonType}</h3>
                    <p className="text-sm font-medium text-[#6E6E73] mt-1">{auHighestCount} total units</p>
                  </div>
                </div>
              </Card>
              <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-50 rounded-full group-hover:scale-110 transition-transform duration-500 opacity-50"></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-10 w-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 shadow-sm"><Users className="h-5 w-5" /></div>
                    <Badge variant="secondary" className="bg-purple-50 text-purple-700 hover:bg-purple-50 font-bold border-none shadow-sm">Occupancy</Badge>
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">{auOccupancyRate}%</h3>
                    <p className="text-sm font-medium text-[#6E6E73] mt-1">{auOccupiedCount} occupied</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm flex flex-col xl:flex-row gap-3">
              <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl shrink-0 self-start xl:self-auto">
                <button onClick={() => setUnitViewMode('grid')} className={`h-9 px-3 rounded-lg flex items-center gap-2 text-sm font-bold transition-all ${unitViewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-[#6E6E73] hover:text-slate-700 hover:bg-[#E5E5EA]/50'}`}>
                  <LayoutGrid className="h-4 w-4" /><span className="hidden sm:inline">Grid</span>
                </button>
                <button onClick={() => setUnitViewMode('list')} className={`h-9 px-3 rounded-lg flex items-center gap-2 text-sm font-bold transition-all ${unitViewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-[#6E6E73] hover:text-slate-700 hover:bg-[#E5E5EA]/50'}`}>
                  <List className="h-4 w-4" /><span className="hidden sm:inline">List</span>
                </button>
                <button onClick={() => setUnitViewMode('table')} className={`h-9 px-3 rounded-lg flex items-center gap-2 text-sm font-bold transition-all ${unitViewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-[#6E6E73] hover:text-slate-700 hover:bg-[#E5E5EA]/50'}`}>
                  <Table2 className="h-4 w-4" /><span className="hidden sm:inline">Table</span>
                </button>
              </div>
              <div className="h-px xl:h-auto xl:w-px bg-slate-200 mx-1"></div>
              
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8E8E93]" />
                <Input 
                  placeholder="Search all units..." 
                  value={unitSearch} 
                  onChange={e => setUnitSearch(e.target.value)} 
                  className="pl-10 h-11 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 rounded-xl text-sm w-full transition-all" 
                />
              </div>

              <div className="flex flex-wrap sm:flex-nowrap gap-3">
                <Select value={unitStatusFilter} onValueChange={v => setUnitStatusFilter(v || "ALL")}>
                  <SelectTrigger className="w-[130px] h-11 bg-slate-50 border-transparent rounded-xl text-sm font-semibold focus:bg-white focus:border-blue-500">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-lg border-slate-100">
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="VACANT">Vacant</SelectItem>
                    <SelectItem value="OCCUPIED">Occupied</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={unitPropFilter} onValueChange={v => setUnitPropFilter(v || "ALL")}>
                  <SelectTrigger className="w-[140px] sm:w-[160px] h-11 bg-slate-50 border-transparent rounded-xl text-sm font-semibold focus:bg-white focus:border-blue-500">
                    <div className="flex items-center gap-2"><Building className="h-4 w-4 text-[#8E8E93]" /><SelectValue placeholder="Property" /></div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-lg border-slate-100">
                    <SelectItem value="ALL">All Properties</SelectItem>
                    {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={unitBedFilter} onValueChange={v => setUnitBedFilter(v || "ALL")}>
                  <SelectTrigger className="w-[100px] h-11 bg-slate-50 border-transparent rounded-xl text-sm font-semibold focus:bg-white focus:border-blue-500">
                    <SelectValue placeholder="Beds" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-lg border-slate-100">
                    <SelectItem value="ALL">Any Beds</SelectItem>
                    <SelectItem value="1">1 Bed</SelectItem>
                    <SelectItem value="2">2 Beds</SelectItem>
                    <SelectItem value="3">3 Beds</SelectItem>
                    <SelectItem value="4">4 Beds</SelectItem>
                    <SelectItem value="5+">5+ Beds</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={unitBathFilter} onValueChange={v => setUnitBathFilter(v || "ALL")}>
                  <SelectTrigger className="w-[100px] h-11 bg-slate-50 border-transparent rounded-xl text-sm font-semibold focus:bg-white focus:border-blue-500">
                    <SelectValue placeholder="Baths" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-lg border-slate-100">
                    <SelectItem value="ALL">Any Baths</SelectItem>
                    <SelectItem value="1">1 Bath</SelectItem>
                    <SelectItem value="2">2 Baths</SelectItem>
                    <SelectItem value="3">3 Baths</SelectItem>
                    <SelectItem value="4+">4+ Baths</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={unitTypeFilter} onValueChange={v => setUnitTypeFilter(v || "ALL")}>
                  <SelectTrigger className="w-[140px] sm:w-[160px] h-11 bg-slate-50 border-transparent rounded-xl text-sm font-semibold focus:bg-white focus:border-blue-500">
                    <SelectValue placeholder="Unit Type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-lg border-slate-100">
                    <SelectItem value="ALL">All Unit Types</SelectItem>
                    <SelectItem value="Apartment">Apartment</SelectItem>
                    <SelectItem value="Studio">Studio</SelectItem>
                    <SelectItem value="Duplex">Duplex</SelectItem>
                    <SelectItem value="Loft">Loft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {auFilteredUnits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <Search className="h-6 w-6 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">No units found</h3>
                <p className="text-sm text-[#6E6E73] max-w-sm text-center">We couldn't find any units matching your filters. Try adjusting your search criteria.</p>
                <Button onClick={() => {setUnitSearch(''); setUnitPropFilter('ALL'); setUnitStatusFilter('ALL'); setUnitBedFilter('ALL'); setUnitBathFilter('ALL'); setUnitTypeFilter('ALL');}} variant="outline" className="mt-6 rounded-xl">Clear All Filters</Button>
              </div>
            ) : unitViewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {auFilteredUnits.map((u: any) => {
                  const p = properties.find((prop: any) => prop.id === u.propertyId);
                  const isAvail = u.status === "VACANT";
                  const isOcc = u.status === "OCCUPIED";
                  const badgeClass = isAvail ? "bg-white/95 text-emerald-600" : isOcc ? "bg-white/95 text-blue-600" : "bg-white/95 text-amber-600";
                  return (
                    <Card key={u.id} className="bg-white border border-slate-100 rounded-[24px] overflow-hidden shadow-sm hover:shadow-lg transition-all group flex flex-col">
                      <div className="relative h-48 bg-white flex items-center justify-center overflow-hidden p-3 pb-0">
                        <div className="w-full h-full rounded-[16px] overflow-hidden relative bg-slate-100">
                          {u.images && u.images.length > 0 ? (
                            <img src={u.images[0]} alt={u.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : p?.coverPhoto ? (
                            <img src={p.coverPhoto} alt={p?.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <Building className="h-16 w-16 text-slate-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                          )}
                          <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[1px]">
                            <button onClick={() => { setViewUnitId(u.id); setActiveTab('unit-details'); }} className="h-10 w-10 bg-white rounded-full flex items-center justify-center text-slate-700 hover:text-blue-600 hover:scale-110 shadow-lg transition-all"><Eye className="h-4 w-4" /></button>
                          </div>
                          <div className="absolute top-3 left-3 flex gap-2">
                            <span className={`text-[11px] font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5 ${isAvail ? 'bg-emerald-100/90 text-emerald-700' : isOcc ? 'bg-blue-100/90 text-blue-700' : 'bg-amber-100/90 text-amber-700'}`}>
                              <CheckCircle className="h-3 w-3" /> {u.status === 'VACANT' || u.status === 'AVAILABLE' ? 'Available' : u.status === 'OCCUPIED' ? 'Occupied' : 'Maintenance'}
                            </span>
                          </div>
                          <div className="absolute top-3 right-3">
                            <span className="text-[11px] font-bold bg-white/95 text-slate-700 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                              <Home className="h-3 w-3 text-[#6E6E73]" />{u.type || 'Apartment'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="p-5 flex-1 flex flex-col">
                        <div>
                          <h3 className="font-bold text-slate-900 text-[17px] leading-tight truncate">{p?.name ? `${p.name} - ${u.name}` : u.name}</h3>
                          <p className="text-[13px] text-[#6E6E73] mt-1 line-clamp-2">{p?.description || "hello world"}</p>
                        </div>
                        <div className="mt-3 text-xs text-[#6E6E73] font-medium flex items-center gap-1.5 truncate">
                          <MapPin className="h-4 w-4 text-[#8E8E93] shrink-0" /> {p?.city || 'London'}, {p?.state || p?.city}, {p?.country || 'London'} {p?.zip || '3100'}
                        </div>

                        <div className="mt-4 flex items-center gap-4 text-[13px] font-semibold text-[#6E6E73]">
                          <span className="flex items-center gap-1.5"><Bed className="h-4 w-4 text-[#8E8E93]" /> {u.rooms}</span>
                          <span className="flex items-center gap-1.5"><Bath className="h-4 w-4 text-[#8E8E93]" /> {u.bathrooms || 1}</span>
                          <span className="flex items-center gap-1.5"><Square className="h-4 w-4 text-[#8E8E93]" /> {u.sqFootage || '--'} ft²</span>
                        </div>
                        
                        <div className="mt-3">
                          <span className="bg-slate-100 text-[#6E6E73] px-2 py-1 rounded text-[11px] font-bold">Floor {u.floor || 1}</span>
                        </div>

                        <div className="mt-auto pt-5 flex items-center justify-between">
                          <p className="font-black text-slate-900 text-[17px] leading-none">${Number(u.rentAmount).toLocaleString(undefined, {minimumFractionDigits: 2})} <span className="text-[12px] font-semibold text-[#6E6E73]">/month</span></p>
                          <DropdownMenu>
                            <DropdownMenuTrigger className="text-[#8E8E93] hover:text-[#6E6E73] p-1.5 rounded-md hover:bg-[#F5F5F7] transition-colors">
                              <MoreVertical className="h-5 w-5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-white rounded-xl shadow-lg border-slate-100 p-1">
                              <DropdownMenuGroup>
                                <DropdownMenuItem onClick={() => { setEditUnitId(u.id); setUName(u.name); setURent(u.rentAmount); setUDeposit(u.depositAmt); setURooms(u.rooms); setUSqFt(u.sqFootage); setUPropId(u.propertyId); setUAmenities(u.amenities?.join(', ') || ''); setActiveTab('add-unit'); }} className="text-sm font-medium rounded-lg px-2 py-2 cursor-pointer focus:bg-slate-50">
                                  <Edit2 className="h-4 w-4 mr-2 text-[#8E8E93]" /> Edit Unit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setViewUnitId(u.id); setActiveTab('unit-details'); }} className="text-sm font-medium rounded-lg px-2 py-2 cursor-pointer focus:bg-slate-50">
                                  <Eye className="h-4 w-4 mr-2 text-[#8E8E93]" /> View Unit Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setUnitPropFilter(p?.id); setActiveTab('units'); }} className="text-sm font-medium rounded-lg px-2 py-2 cursor-pointer focus:bg-slate-50">
                                  <Building className="h-4 w-4 mr-2 text-[#8E8E93]" /> View Property
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : unitViewMode === 'list' ? (
              <div className="flex flex-col gap-4">
                {auFilteredUnits.map((u: any) => {
                  const p = properties.find((prop: any) => prop.id === u.propertyId);
                  const isAvail = u.status === "VACANT";
                  const isOcc = u.status === "OCCUPIED";
                  const badgeClass = isAvail ? "bg-emerald-50 text-emerald-600 border-emerald-200" : isOcc ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-amber-50 text-amber-600 border-amber-200";
                  return (
                    <Card key={u.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                      <div className="flex flex-col sm:flex-row">
                        <div className="sm:w-48 xl:w-64 aspect-[3/2] sm:aspect-auto bg-slate-100 relative overflow-hidden shrink-0">
                          {u.images && u.images.length > 0 ? (
                            <img src={u.images[0]} alt={u.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : p?.coverPhoto ? (
                            <img src={p.coverPhoto} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Building className="h-8 w-8 text-slate-300" /></div>
                          )}
                          <div className="absolute top-3 left-3 sm:hidden">
                            <Badge className={`${badgeClass} shadow-sm font-bold px-2 py-0.5 text-[10px] tracking-wide uppercase`}>{u.status}</Badge>
                          </div>
                        </div>
                        <div className="p-5 flex-1 flex flex-col justify-between">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-bold text-slate-900 text-lg sm:text-xl tracking-tight">{u.name}</h3>
                                <Badge className={`hidden sm:inline-flex ${badgeClass} shadow-sm font-bold px-2 py-0.5 text-[10px] tracking-wide uppercase`}>{u.status}</Badge>
                              </div>
                              <div className="flex items-center text-sm font-medium text-[#6E6E73] mt-1">
                                <Building className="h-4 w-4 mr-1.5 opacity-70" /> {p?.name || 'Unknown Property'}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-slate-900 text-xl sm:text-2xl">${Number(u.rentAmount).toLocaleString()}</p>
                              <p className="text-[10px] text-[#6E6E73] font-bold uppercase tracking-wider mt-0.5">Per Month</p>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-100">
                            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm font-semibold text-[#6E6E73]">
                              <span title="Beds" className="flex items-center gap-2"><Bed className="h-4 w-4 text-[#8E8E93]" /> {u.rooms} Beds</span>
                              <span title="Baths" className="flex items-center gap-2"><Bath className="h-4 w-4 text-[#8E8E93]" /> {u.bathrooms || 1} Baths</span>
                              <span title="Sq Ft" className="flex items-center gap-2"><Maximize2 className="h-4 w-4 text-[#8E8E93]" /> {u.sqFootage || '--'} Sq Ft</span>
                              <span title="Type" className="flex items-center gap-2 capitalize"><LayoutGrid className="h-4 w-4 text-[#8E8E93]" /> {u.type || 'Apartment'}</span>
                            </div>
                            <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
                              <Button variant="outline" size="icon" onClick={() => { setViewUnitId(u.id); setActiveTab('unit-details'); }} className="h-10 w-10 shrink-0 text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 rounded-xl">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button onClick={() => { setEditUnitId(u.id); setUName(u.name); setURent(u.rentAmount); setUDeposit(u.depositAmt); setURooms(u.rooms); setUSqFt(u.sqFootage); setUPropId(u.propertyId); setUAmenities(u.amenities?.join(', ') || ''); setActiveTab('add-unit'); }} variant="outline" className="flex-1 sm:flex-none border-slate-200 text-slate-700 hover:bg-[#F5F5F7] hover:text-blue-600 rounded-xl font-semibold h-10 px-4 transition-colors">
                                <Edit2 className="h-4 w-4 mr-2" /> Edit
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-bold text-slate-700 h-12 w-[300px]">Unit</TableHead>
                        <TableHead className="font-bold text-slate-700 h-12">Property</TableHead>
                        <TableHead className="font-bold text-slate-700 h-12">Details</TableHead>
                        <TableHead className="font-bold text-slate-700 h-12 text-right">Rent</TableHead>
                        <TableHead className="font-bold text-slate-700 h-12 w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auFilteredUnits.map((u: any) => {
                        const p = properties.find((prop: any) => prop.id === u.propertyId);
                        const isAvail = u.status === "VACANT";
                        const isOcc = u.status === "OCCUPIED";
                        const badgeColor = isAvail ? "text-emerald-600" : isOcc ? "text-blue-600" : "text-amber-600";
                        return (
                          <TableRow key={u.id} className="hover:bg-[#F5F5F7]/50 transition-colors border-b-slate-100 group">
                            <TableCell className="py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-slate-100 overflow-hidden shrink-0 hidden sm:block">
                                  {u.images && u.images.length > 0 ? (
                                    <img src={u.images[0]} alt={u.name} className="w-full h-full object-cover" />
                                  ) : p?.coverPhoto ? (
                                    <img src={p.coverPhoto} alt={p.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center"><Building className="h-5 w-5 text-slate-300" /></div>
                                  )}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900">{u.name}</p>
                                  <p className="text-xs text-[#6E6E73] font-medium">{u.type || 'Apartment'}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="font-bold text-slate-700 text-sm">{p?.name || 'Unknown Property'}</p>
                              <p className="text-[11px] text-[#6E6E73] font-medium mt-0.5">{p?.city}</p>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3 text-xs font-semibold text-[#6E6E73]">
                                <span title="Beds" className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md"><Bed className="h-3 w-3 text-[#8E8E93]" /> {u.rooms}</span>
                                <span title="Baths" className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md"><Bath className="h-3 w-3 text-[#8E8E93]" /> {u.bathrooms || 1}</span>
                                <span title="Sq Ft" className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md"><Maximize2 className="h-3 w-3 text-[#8E8E93]" /> {u.sqFootage || '--'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <p className="font-black text-slate-900 text-[15px]">${Number(u.rentAmount).toLocaleString()}</p>
                              <p className={`text-[10px] ${badgeColor} font-bold mt-0.5 uppercase tracking-wider`}>{u.status}</p>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={() => { setViewUnitId(u.id); setActiveTab('unit-details'); }} className="h-8 w-8 rounded-full text-blue-600 hover:bg-blue-50">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger className="h-8 w-8 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-slate-700 hover:bg-[#F2F2F7] transition-colors">
                                  <MoreVertical className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 bg-white rounded-xl shadow-lg border-slate-100 p-1">
                                  <DropdownMenuGroup>
                                    <DropdownMenuItem onClick={() => { setEditUnitId(u.id); setUName(u.name); setURent(u.rentAmount); setUDeposit(u.depositAmt); setURooms(u.rooms); setUSqFt(u.sqFootage); setUPropId(u.propertyId); setUAmenities(u.amenities?.join(', ') || ''); setActiveTab('add-unit'); }} className="text-sm font-medium rounded-lg px-2 py-2 cursor-pointer focus:bg-slate-50">
                                      <Edit2 className="h-4 w-4 mr-2 text-[#8E8E93]" /> View Unit Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setUnitPropFilter(p?.id); setActiveTab('units'); }} className="text-sm font-medium rounded-lg px-2 py-2 cursor-pointer focus:bg-slate-50">
                                      <Building className="h-4 w-4 mr-2 text-[#8E8E93]" /> View Property
                                    </DropdownMenuItem>
                                  </DropdownMenuGroup>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Unit Details Full Page Tab */}
          <TabsContent value="unit-details" className="outline-none">
            {(() => {
              const u = units.find(u => u.id === viewUnitId);
              if (!u) return <div className="py-20 flex flex-col items-center justify-center text-[#6E6E73]"><Building className="h-10 w-10 mb-4 text-slate-300" /><p className="font-bold">Unit not found or loading...</p></div>;
              const p = properties.find((prop: any) => prop.id === u.propertyId);
              const isAvail = u.status === "VACANT";
              const isOcc = u.status === "OCCUPIED";
              const badgeClass = isAvail ? "bg-emerald-50 text-emerald-600 border-emerald-200" : isOcc ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-amber-50 text-amber-600 border-amber-200";

              return (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4">
                      <Button variant="ghost" size="icon" onClick={() => setActiveTab('units')} className="h-10 w-10 rounded-xl bg-slate-50 text-[#6E6E73] hover:text-[#1D1D1F] shrink-0">
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{u.name}</h2>
                          <Badge className={`${badgeClass} shadow-sm font-bold px-2 py-0.5 text-[10px] tracking-wide uppercase`}>{u.status}</Badge>
                        </div>
                        <div className="flex items-center text-sm font-medium text-[#6E6E73]">
                          <Building className="h-4 w-4 mr-1.5 opacity-70" /> {p?.name || 'Unknown Property'} 
                          <span className="mx-2">•</span> 
                          <MapPin className="h-4 w-4 mr-1.5 opacity-70" /> {p?.city || 'Unknown City'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <Button onClick={() => { setEditUnitId(u.id); setUName(u.name); setURent(u.rentAmount); setUDeposit(u.depositAmt); setURooms(u.rooms); setUSqFt(u.sqFootage); setUPropId(u.propertyId); setUAmenities(u.amenities?.join(', ') || ''); setActiveTab('add-unit'); }} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold h-10 px-5 transition-all shadow-md shadow-blue-600/20">
                        <Edit2 className="h-4 w-4 mr-2" /> Edit Unit
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-slate-200 text-[#6E6E73]" />}>
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-white rounded-xl shadow-lg border-slate-100 p-1">
                          <DropdownMenuItem className="text-sm font-medium rounded-lg px-2 py-2 cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700">
                            <Trash2 className="h-4 w-4 mr-2" /> Delete Unit
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Navigation Tabs */}
                  <div className="flex overflow-x-auto hide-scrollbar gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                    {[
                      { id: 'overview', label: 'Overview', icon: LayoutGrid },
                      { id: 'features', label: 'Features', icon: Star },
                      { id: 'images', label: 'Images', icon: Image as any },
                      { id: 'tenant', label: 'Tenant', icon: User },
                      { id: 'documents', label: 'Documents', icon: FileText }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setUnitDetailsSubTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0 ${unitDetailsSubTab === tab.id ? 'bg-blue-50 text-blue-700' : 'text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7]'}`}
                      >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Content Area */}
                  {unitDetailsSubTab === 'overview' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      {/* Overview Top Stats */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                              <DollarSign className="h-5 w-5" />
                            </div>
                            <p className="text-[11px] font-bold text-[#6E6E73] uppercase tracking-wider">Monthly Rent</p>
                          </div>
                          <p className="text-2xl font-black text-slate-900">${Number(u.rentAmount).toLocaleString()}</p>
                        </Card>
                        <Card className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                              <Shield className="h-5 w-5" />
                            </div>
                            <p className="text-[11px] font-bold text-[#6E6E73] uppercase tracking-wider">Security Deposit</p>
                          </div>
                          <p className="text-2xl font-black text-slate-900">${Number(u.depositAmt).toLocaleString()}</p>
                        </Card>
                        <Card className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                              <Maximize2 className="h-5 w-5" />
                            </div>
                            <p className="text-[11px] font-bold text-[#6E6E73] uppercase tracking-wider">Total Area</p>
                          </div>
                          <p className="text-2xl font-black text-slate-900">{u.sqFootage || '--'} <span className="text-sm font-bold text-[#6E6E73]">Sq Ft</span></p>
                        </Card>
                        <Card className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                              <LayoutGrid className="h-5 w-5" />
                            </div>
                            <p className="text-[11px] font-bold text-[#6E6E73] uppercase tracking-wider">Unit Type</p>
                          </div>
                          <p className="text-2xl font-black text-slate-900 capitalize">{u.type || 'Apartment'}</p>
                        </Card>
                      </div>

                      {/* Detailed Breakdown */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                          <h3 className="text-lg font-bold text-slate-900 mb-4 pb-4 border-b border-slate-100 flex items-center"><Home className="h-5 w-5 mr-2 text-[#8E8E93]" /> Unit Details</h3>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center"><span className="text-sm font-medium text-[#6E6E73]">Unit ID</span><span className="text-sm font-bold text-slate-900 uppercase">{u.id.substring(u.id.length - 8)}</span></div>
                            <div className="flex justify-between items-center"><span className="text-sm font-medium text-[#6E6E73]">Bedrooms</span><span className="text-sm font-bold text-slate-900">{u.rooms}</span></div>
                            <div className="flex justify-between items-center"><span className="text-sm font-medium text-[#6E6E73]">Bathrooms</span><span className="text-sm font-bold text-slate-900">{u.bathrooms || 1}</span></div>
                            <div className="flex justify-between items-center"><span className="text-sm font-medium text-[#6E6E73]">Status</span><Badge className={`${badgeClass} shadow-sm font-bold px-2 py-0.5 text-[10px] tracking-wide uppercase`}>{u.status}</Badge></div>
                          </div>
                        </Card>
                        <Card className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                          <h3 className="text-lg font-bold text-slate-900 mb-4 pb-4 border-b border-slate-100 flex items-center"><Building className="h-5 w-5 mr-2 text-[#8E8E93]" /> Property Information</h3>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center"><span className="text-sm font-medium text-[#6E6E73]">Property Name</span><span className="text-sm font-bold text-slate-900">{p?.name || '--'}</span></div>
                            <div className="flex justify-between items-center"><span className="text-sm font-medium text-[#6E6E73]">Address</span><span className="text-sm font-bold text-slate-900">{p?.address || '--'}</span></div>
                            <div className="flex justify-between items-center"><span className="text-sm font-medium text-[#6E6E73]">City & State</span><span className="text-sm font-bold text-slate-900">{p?.city || '--'}, {p?.state || '--'}</span></div>
                            <div className="flex justify-between items-center"><span className="text-sm font-medium text-[#6E6E73]">Zip Code</span><span className="text-sm font-bold text-slate-900">{p?.zip || '--'}</span></div>
                          </div>
                        </Card>
                      </div>
                    </div>
                  )}

                  {unitDetailsSubTab === 'features' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <Card className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center"><Star className="h-5 w-5 mr-2 text-[#8E8E93]" /> Unit Amenities</h3>
                        {u.amenities && u.amenities.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {u.amenities.map((amenity: string, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                                <span className="text-sm font-semibold text-slate-700 truncate">{amenity}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-12 flex flex-col items-center justify-center text-center">
                            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4"><Star className="h-6 w-6 text-slate-300" /></div>
                            <p className="text-lg font-bold text-slate-900">No amenities listed</p>
                            <p className="text-sm text-[#6E6E73] mt-1 max-w-sm">This unit currently doesn't have any specific amenities listed. You can add them by editing the unit.</p>
                          </div>
                        )}
                      </Card>
                    </div>
                  )}

                  {unitDetailsSubTab === 'images' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <Card className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="text-lg font-bold text-slate-900 flex items-center"><Image className="h-5 w-5 mr-2 text-[#8E8E93]" /> Photo Gallery</h3>
                          <Button variant="outline" size="sm" className="h-9 rounded-lg font-bold text-blue-600 border-blue-200 hover:bg-blue-50"><Plus className="h-4 w-4 mr-1.5" /> Add Photos</Button>
                        </div>
                        {u.images && u.images.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {u.images.map((img: string, idx: number) => (
                              <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group relative">
                                <img src={img} alt={`${u.name} photo ${idx + 1}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-white text-slate-900 hover:bg-[#F2F2F7]"><Eye className="h-4 w-4" /></Button>
                                  <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full"><Trash2 className="h-4 w-4" /></Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : p?.coverPhoto ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group relative">
                              <img src={p.coverPhoto} alt={`${p.name} cover`} className="w-full h-full object-cover" />
                              <div className="absolute top-2 left-2"><Badge className="bg-white/95 text-slate-700 shadow-sm border-none font-bold px-2 py-0.5 text-[10px] tracking-wide uppercase">Property Photo</Badge></div>
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-white text-slate-900 hover:bg-[#F2F2F7]"><Eye className="h-4 w-4" /></Button>
                              </div>
                            </div>
                            {p.images && p.images.map((img: string, idx: number) => (
                              <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group relative">
                                <img src={img} alt={`${p.name} photo ${idx + 1}`} className="w-full h-full object-cover" />
                                <div className="absolute top-2 left-2"><Badge className="bg-white/95 text-slate-700 shadow-sm border-none font-bold px-2 py-0.5 text-[10px] tracking-wide uppercase">Property Photo</Badge></div>
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-white text-slate-900 hover:bg-[#F2F2F7]"><Eye className="h-4 w-4" /></Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-16 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                            <div className="h-16 w-16 bg-white shadow-sm rounded-full flex items-center justify-center mb-4"><Image className="h-6 w-6 text-[#8E8E93]" /></div>
                            <p className="text-lg font-bold text-slate-900">No photos yet</p>
                            <p className="text-sm text-[#6E6E73] mt-1 max-w-sm mb-6">Upload photos of this unit to showcase it to potential tenants.</p>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-600/20 font-bold"><Plus className="h-4 w-4 mr-2" /> Upload Photos</Button>
                          </div>
                        )}
                      </Card>
                    </div>
                  )}

                  {unitDetailsSubTab === 'tenant' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      {isOcc ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Card className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col">
                            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center"><User className="h-5 w-5 mr-2 text-[#8E8E93]" /> Current Tenant</h3>
                            <div className="flex-1 flex flex-col">
                              <div className="flex items-center gap-4 mb-8">
                                <div className="h-12 w-12 rounded-full border-2 border-slate-200 flex items-center justify-center text-[#8E8E93] shrink-0">
                                  <User className="h-6 w-6" />
                                </div>
                                <div>
                                  <h4 className="text-xl font-bold text-slate-900 leading-tight">{u.tenantName || 'Tenant Name'}</h4>
                                  <p className="text-xs text-[#6E6E73] font-medium mt-1">Tenant ID: {u.tenantId || u.id}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 mt-auto">
                                <div>
                                  <p className="text-xs font-bold text-slate-900 mb-1">Email</p>
                                  <p className="text-sm text-[#6E6E73]">{u.tenantEmail || 'tenant@example.com'}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-900 mb-1">Phone</p>
                                  <p className="text-sm text-[#6E6E73]">{u.tenantPhone || '0170000000'}</p>
                                </div>
                              </div>
                            </div>
                          </Card>
                          <Card className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col">
                            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center"><FileText className="h-5 w-5 mr-2 text-[#8E8E93]" /> Lease Information</h3>
                            <div className="space-y-4 flex-1">
                              <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                                <span className="text-sm font-semibold text-[#6E6E73]">Status</span>
                                <span className="text-sm font-bold text-slate-900">Active</span>
                              </div>
                              <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                                <span className="text-sm font-semibold text-[#6E6E73]">Start Date</span>
                                <span className="text-sm font-bold text-slate-900">10/6/2026</span>
                              </div>
                              <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                                <span className="text-sm font-semibold text-[#6E6E73]">End Date</span>
                                <span className="text-sm font-bold text-slate-900">31/7/2026</span>
                              </div>
                              <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                                <span className="text-sm font-semibold text-[#6E6E73]">Monthly Rent</span>
                                <span className="text-sm font-bold text-slate-900">${Number(u.rentAmount).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold text-[#6E6E73]">Security Deposit</span>
                                <span className="text-sm font-bold text-slate-900">${Number(u.depositAmt).toLocaleString()}</span>
                              </div>
                            </div>
                          </Card>
                        </div>
                      ) : (
                        <Card className="bg-white border border-slate-100 rounded-2xl p-10 shadow-sm flex flex-col items-center justify-center text-center">
                          <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-5"><User className="h-8 w-8 text-slate-300" /></div>
                          <h3 className="text-xl font-black text-slate-900 mb-2">No Current Tenant</h3>
                          <p className="text-sm text-[#6E6E73] max-w-md mb-8">This unit is currently marked as vacant. You can create a new lease to assign a tenant and update its status.</p>
                          <div className="flex gap-3">
                            <Button onClick={() => { setLUnitId(u.id); setActiveTab('leases'); setLeaseSubTab("new"); }} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-600/20 font-bold h-11 px-6"><Plus className="h-4 w-4 mr-2" /> Create Lease</Button>
                            <InviteTenantModal unitId={u.id} unitName={u.name} propertyName={p?.name || 'Unknown Property'} rentAmount={Number(u.rentAmount)} />
                          </div>
                        </Card>
                      )}
                    </div>
                  )}

                  {unitDetailsSubTab === 'documents' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <Card className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="text-lg font-bold text-slate-900 flex items-center"><FileText className="h-5 w-5 mr-2 text-[#8E8E93]" /> Documents & Files</h3>
                          <Button variant="outline" size="sm" className="h-9 rounded-lg font-bold text-blue-600 border-blue-200 hover:bg-blue-50"><Plus className="h-4 w-4 mr-1.5" /> Upload File</Button>
                        </div>
                        <div className="py-16 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                          <div className="h-16 w-16 bg-white shadow-sm rounded-full flex items-center justify-center mb-4"><FileText className="h-6 w-6 text-[#8E8E93]" /></div>
                          <p className="text-lg font-bold text-slate-900">No documents uploaded</p>
                          <p className="text-sm text-[#6E6E73] mt-1 max-w-sm mb-6">Upload lease agreements, inspection reports, or any other unit-specific documents here.</p>
                          <Button className="bg-slate-900 hover:bg-[#007AFF] text-white rounded-xl shadow-md font-bold"><Plus className="h-4 w-4 mr-2" /> Select Files</Button>
                        </div>
                      </Card>
                    </div>
                  )}
                </div>
              );
            })()}
          </TabsContent>

          {/* Add Unit Full Page Tab */}
          <TabsContent value="add-unit" className="outline-none">
            <div className="max-w-2xl">
              <div className="flex items-center gap-4 mb-6">
                <Button type="button" variant="ghost" size="icon" onClick={() => setActiveTab('units')} className="h-10 w-10 rounded-xl bg-slate-50 text-[#6E6E73] hover:text-[#1D1D1F] shrink-0">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h2 className="text-2xl font-black text-[#111111]">{editUnitId ? "Edit Unit" : "Add New Unit"}</h2>
                  <p className="text-sm text-[#7F817F] mt-0.5">Create a rental unit within one of your properties.</p>
                </div>
              </div>
              <Card className="bg-white border-0 rounded-3xl shadow-sm p-8">
                <form onSubmit={handleSaveUnit} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="auProp" className="text-xs font-bold">Belongs to Property *</Label>
                    <Select value={uPropId} onValueChange={(val)=>setUPropId(val||'')}>
                      <SelectTrigger className="bg-[#F5F5F3] border-[#E2E3E0] text-[#111111] rounded-xl h-11"><SelectValue placeholder="Select Property" /></SelectTrigger>
                      <SelectContent className="bg-white rounded-xl border-[#E2E3E0]">{properties.map((p:any)=>{ const i=p.name?.indexOf(':'); const n=i>-1?p.name.slice(i+1).trim():p.name; return <SelectItem key={p.id} value={p.id}>{n} ({p.city})</SelectItem>; })}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="auName" className="text-xs font-bold">Unit Name / Number *</Label>
                    <Input id="auName" placeholder="Flat 102" value={uName} onChange={e=>setUName(e.target.value)} className="bg-[#F5F5F3] border-[#E2E3E0] text-[#111111] rounded-xl h-11" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="auRent" className="text-xs font-bold">Monthly Rent ($) *</Label>
                      <Input id="auRent" type="number" placeholder="1200" value={uRent} onChange={e=>setURent(e.target.value)} className="bg-[#F5F5F3] border-[#E2E3E0] text-[#111111] rounded-xl h-11" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="auDeposit" className="text-xs font-bold">Deposit Amount ($) *</Label>
                      <Input id="auDeposit" type="number" placeholder="2400" value={uDeposit} onChange={e=>setUDeposit(e.target.value)} className="bg-[#F5F5F3] border-[#E2E3E0] text-[#111111] rounded-xl h-11" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="auRooms" className="text-xs font-bold">Bedrooms *</Label>
                      <Input id="auRooms" type="number" placeholder="2" value={uRooms} onChange={e=>setURooms(e.target.value)} className="bg-[#F5F5F3] border-[#E2E3E0] text-[#111111] rounded-xl h-11" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="auSqFt" className="text-xs font-bold">Square Footage *</Label>
                      <Input id="auSqFt" type="number" placeholder="850" value={uSqFt} onChange={e=>setUSqFt(e.target.value)} className="bg-[#F5F5F3] border-[#E2E3E0] text-[#111111] rounded-xl h-11" required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="auAmenities" className="text-xs font-bold">Amenities (comma-separated)</Label>
                    <Input id="auAmenities" placeholder="WiFi, Balcony, Air Conditioning, Parking" value={uAmenities} onChange={e=>setUAmenities(e.target.value)} className="bg-[#F5F5F3] border-[#E2E3E0] text-[#111111] rounded-xl h-11" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => { setActiveTab("units"); setEditUnitId(null); setUName(""); setURent(""); setUDeposit(""); setURooms(""); setUSqFt(""); setUPropId(""); setUAmenities(""); }} className="flex-1 border-[#E2E3E0] text-[#111111] rounded-xl h-11 font-bold">Cancel</Button>
                    <Button type="submit" className="flex-1 bg-[#496E5C] hover:bg-[#3E5C4E] text-white font-bold h-11 rounded-xl">{editUnitId ? "Save Changes" : "Create Unit"}</Button>
                  </div>
                </form>
              </Card>
            </div>
          </TabsContent>

          {/* Leases Tab */}
          <TabsContent value="leases" className="space-y-6 outline-none">
            {leaseSubTab === "new" ? (
              <div className="max-w-4xl mx-auto pb-12">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm mb-8">
                  <div className="flex items-center gap-4">
                    <Button type="button" variant="ghost" size="icon" onClick={() => setLeaseSubTab("all")} className="h-10 w-10 rounded-xl bg-slate-50 text-[#6E6E73] hover:text-[#1D1D1F] shrink-0">
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Create New Lease</h2>
                      <p className="text-sm text-[#6E6E73] mt-1">Set up a new lease with tenant, dates, and financial terms</p>
                    </div>
                  </div>
                  <div className="flex gap-3 w-full sm:w-auto">
                    <Button type="button" variant="outline" onClick={() => setLeaseSubTab("all")} className="w-full sm:w-auto rounded-full px-5 h-10 border-slate-200 text-slate-700 hover:bg-[#F5F5F7] font-bold text-sm">Cancel</Button>
                  </div>
                </div>

                <form onSubmit={handleAddLease} className="space-y-6">
                  {/* Property & Tenant Section */}
                  <div className="bg-white p-8 rounded-[28px] shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2"><Building2 className="h-5 w-5 text-[#8E8E93]" /> Property & Tenant</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">Select Property *</Label>
                        <Select value={lUnitId ? units.find(u => u.id === lUnitId)?.propertyId : ""} onValueChange={(val) => setLUnitId("")}>
                          <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl h-12 text-slate-700 font-medium">
                            <SelectValue placeholder={`Property (${properties.length} available)`} />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-200 bg-white">
                            {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">Select Vacant Unit *</Label>
                        <Select value={lUnitId} onValueChange={(val) => setLUnitId(val || "")}>
                          <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl h-12 text-slate-700 font-medium">
                            <SelectValue placeholder="Select Unit" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-200 bg-white">
                            {units.filter((u) => u.status === "VACANT").map((u) => (
                              <SelectItem key={u.id} value={u.id}>{u.name} — {u.property?.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-sm font-bold text-slate-700">Tenant Email *</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#8E8E93]" />
                          <Input type="email" placeholder="tenant@example.com" value={lEmail} onChange={e => setLEmail(e.target.value)} required className="pl-10 bg-slate-50 border-slate-200 rounded-xl h-12 font-medium" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lease Dates */}
                  <div className="bg-white p-8 rounded-[28px] shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2"><Calendar className="h-5 w-5 text-[#8E8E93]" /> Lease Dates</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">Start Date *</Label>
                        <Input type="date" value={lStart} onChange={e => setLStart(e.target.value)} required className="bg-slate-50 border-slate-200 rounded-xl h-12 font-medium text-slate-700" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">End Date *</Label>
                        <Input type="date" value={lEnd} onChange={e => setLEnd(e.target.value)} required className="bg-slate-50 border-slate-200 rounded-xl h-12 font-medium text-slate-700" />
                      </div>
                    </div>
                  </div>

                  {/* Financial Terms */}
                  <div className="bg-white p-8 rounded-[28px] shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2"><DollarSign className="h-5 w-5 text-[#8E8E93]" /> Financial Terms</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">Monthly Rent *</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#8E8E93]" />
                          <Input type="number" placeholder="1500" value={lRent} onChange={e => setLRent(e.target.value)} required className="pl-10 bg-slate-50 border-slate-200 rounded-xl h-12 font-medium text-slate-900" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">Security Deposit</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#8E8E93]" />
                          <Input type="number" placeholder="1500" className="pl-10 bg-slate-50 border-slate-200 rounded-xl h-12 font-medium text-slate-900" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">Rent Due Day</Label>
                        <Select defaultValue="1">
                          <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl h-12 text-slate-700 font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-200 bg-white">
                            <SelectItem value="1">1st of month</SelectItem>
                            <SelectItem value="5">5th of month</SelectItem>
                            <SelectItem value="15">15th of month</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Late Fee Rules */}
                  <div className="bg-white p-8 rounded-[28px] shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-[#8E8E93]" /> Late Fee Rules</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">Late Fee Amount</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#8E8E93]" />
                          <Input type="number" defaultValue="50" className="pl-10 bg-slate-50 border-slate-200 rounded-xl h-12 font-medium text-slate-900" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">Grace Period (Days)</Label>
                        <Input type="number" defaultValue="5" className="bg-slate-50 border-slate-200 rounded-xl h-12 font-medium text-slate-900" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">Late Fee Type</Label>
                        <Select defaultValue="fixed">
                          <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl h-12 text-slate-700 font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-200 bg-white">
                            <SelectItem value="fixed">Fixed Amount</SelectItem>
                            <SelectItem value="percentage">Percentage of Rent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-[28px] flex items-center gap-4 text-[#6E6E73] border border-slate-100">
                    <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <p className="text-sm">Invoices will be automatically generated for this lease including monthly rent payments.</p>
                  </div>

                  <div className="flex justify-end gap-3 pt-6">
                    <Button type="button" variant="outline" className="rounded-full px-8 h-12 border-slate-200 text-slate-700 hover:bg-[#F5F5F7] font-bold">Reset Form</Button>
                    <Button type="submit" className="rounded-full px-8 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all">Create Lease</Button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">Leases</h2>
                    <p className="text-sm text-[#6E6E73] mt-0.5">Manage tenant lease agreements across your portfolio</p>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={fetchOwnerData} variant="outline" className="border-slate-200 text-slate-700 hover:bg-[#F5F5F7] rounded-full px-4 h-10 text-xs font-bold">↻ Refresh</Button>
                    <Button onClick={() => setLeaseSubTab("new")} className="bg-slate-900 hover:bg-[#007AFF] text-white rounded-full px-5 h-10 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                      <Plus className="h-4 w-4" /> Create Lease
                    </Button>
                  </div>
                </div>

                {/* Stats Cards Row */}
                {(() => {
                  const now = new Date();
                  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                  const activeCount = leases.filter((l: any) => l.status === "ACTIVE").length;
                  const pendingCount = leases.filter((l: any) => l.status === "PENDING_SIGNATURE" || l.status === "DRAFT").length;
                  const expiredCount = leases.filter((l: any) => l.status === "EXPIRED" || new Date(l.endDate) < now).length;
                  const terminatedCount = leases.filter((l: any) => l.status === "TERMINATED").length;
                  const expiringSoonCount = leases.filter((l: any) => {
                    const end = new Date(l.endDate);
                    return l.status === "ACTIVE" && end >= now && end <= in30;
                  }).length;
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                      {[
                        { label: "Total Leases", value: leases.length },
                        { label: "Active Leases", value: activeCount },
                        { label: "Pending Leases", value: pendingCount },
                        { label: "Expired Leases", value: expiredCount },
                        { label: "Terminated Leases", value: terminatedCount },
                        { label: "Expiring Leases", value: expiringSoonCount },
                      ].map((s) => (
                        <Card key={s.label} className={`border border-slate-100 rounded-2xl shadow-sm p-4 bg-white`}>
                          <p className="text-[11px] text-[#6E6E73] font-bold uppercase">{s.label}</p>
                          <p className={`text-2xl font-black mt-1 text-slate-900`}>{s.value}</p>
                        </Card>
                      ))}
                    </div>
                  );
                })()}

                {/* Main Leases View Area */}
                {(() => {
                  const now = new Date();
                  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

                  const activeLeases = leases.filter((l: any) => l.status === "ACTIVE");
                  const expiringSoonLeases = leases.filter((l: any) => {
                    const end = new Date(l.endDate);
                    return l.status === "ACTIVE" && end >= now && end <= in30;
                  });
                  let displayLeases = leaseSubTab === "active" ? activeLeases : leaseSubTab === "expiring" ? expiringSoonLeases : leases;

                  if (leaseSearch) {
                    const ls = leaseSearch.toLowerCase();
                    displayLeases = displayLeases.filter((l: any) => 
                      l.tenant?.name?.toLowerCase().includes(ls) || 
                      l.tenant?.email?.toLowerCase().includes(ls) ||
                      l.unit?.name?.toLowerCase().includes(ls)
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {/* Sub-tabs & View Toggles */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex flex-wrap gap-2">
                          {[
                            { key: "all", label: "All Leases", count: leases.length },
                            { key: "active", label: "Active Leases", count: activeLeases.length },
                            { key: "expiring", label: "Expiring Soon", count: expiringSoonLeases.length },
                          ].map((tab) => (
                            <button
                              key={tab.key}
                              onClick={() => setLeaseSubTab(tab.key)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                                leaseSubTab === tab.key
                                  ? "bg-[#007AFF] text-white border-slate-900"
                                  : "bg-white text-[#6E6E73] border-slate-200 hover:border-slate-300 hover:bg-[#F5F5F7] shadow-sm"
                              }`}
                            >
                              {tab.label}
                              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${leaseSubTab === tab.key ? "bg-white/20 text-white" : "bg-slate-100 text-[#6E6E73]"}`}>
                                {tab.count}
                              </span>
                            </button>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <Button variant={leaseViewLayout === "list" ? "default" : "outline"} size="icon" onClick={() => setLeaseViewLayout("list")} className={`h-9 w-9 rounded-lg ${leaseViewLayout === "list" ? "bg-[#007AFF] text-white" : "text-[#6E6E73] border-slate-200 bg-white shadow-sm"}`}>
                            <List className="h-4 w-4" />
                          </Button>
                          <Button variant={leaseViewLayout === "grid" ? "default" : "outline"} size="icon" onClick={() => setLeaseViewLayout("grid")} className={`h-9 w-9 rounded-lg ${leaseViewLayout === "grid" ? "bg-[#007AFF] text-white" : "text-[#6E6E73] border-slate-200 bg-white shadow-sm"}`}>
                            <LayoutGrid className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Filter Bar */}
                      <div className="bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative w-full sm:w-80">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8E8E93]" />
                          <Input placeholder="Search leases..." value={leaseSearch} onChange={(e) => setLeaseSearch(e.target.value)} className="pl-9 bg-slate-50 border-slate-200 rounded-xl h-10 text-sm text-slate-700 placeholder-slate-400" />
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto ml-auto">
                          <Select defaultValue="ALL">
                            <SelectTrigger className="w-full sm:w-36 rounded-xl h-10 bg-white border-slate-200 text-sm font-semibold text-slate-700 shadow-sm">
                              <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent className="bg-white rounded-xl border-slate-200">
                              <SelectItem value="ALL">All Status</SelectItem>
                              <SelectItem value="ACTIVE">Active</SelectItem>
                              <SelectItem value="EXPIRED">Expired</SelectItem>
                              <SelectItem value="TERMINATED">Terminated</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select defaultValue="NEWEST">
                            <SelectTrigger className="w-full sm:w-36 rounded-xl h-10 bg-white border-slate-200 text-sm font-semibold text-slate-700 shadow-sm">
                              <SelectValue placeholder="Newest First" />
                            </SelectTrigger>
                            <SelectContent className="bg-white rounded-xl border-slate-200">
                              <SelectItem value="NEWEST">Newest First</SelectItem>
                              <SelectItem value="OLDEST">Oldest First</SelectItem>
                              <SelectItem value="EXPIRING">Expiring Soon</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Content Render */}
                      {displayLeases.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm mt-4">
                          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20 text-[#8E8E93]" />
                          <p className="font-bold text-sm text-slate-900">No leases found</p>
                          <p className="text-xs mt-1 font-medium text-[#6E6E73]">Create a lease to link a tenant to one of your units</p>
                          <Button onClick={() => setLeaseSubTab("new")} className="mt-5 bg-slate-900 hover:bg-[#007AFF] text-white rounded-full px-5 h-10 text-xs font-bold shadow-sm">
                            <Plus className="h-3.5 w-3.5 mr-1.5" /> Create First Lease
                          </Button>
                        </div>
                      ) : (
                        <div className="mt-4">
                          {leaseViewLayout === "list" ? (
                            <Card className="bg-white border-slate-100 rounded-[24px] shadow-sm overflow-hidden">
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="hover:bg-transparent border-slate-100">
                                      <TableHead className="text-[#8E8E93] font-extrabold text-[10px] uppercase tracking-wider pl-6">Property & Unit</TableHead>
                                      <TableHead className="text-[#8E8E93] font-extrabold text-[10px] uppercase tracking-wider">Tenant</TableHead>
                                      <TableHead className="text-[#8E8E93] font-extrabold text-[10px] uppercase tracking-wider">Status</TableHead>
                                      <TableHead className="text-[#8E8E93] font-extrabold text-[10px] uppercase tracking-wider">Rent Amount</TableHead>
                                      <TableHead className="text-[#8E8E93] font-extrabold text-[10px] uppercase tracking-wider">Start Date</TableHead>
                                      <TableHead className="text-[#8E8E93] font-extrabold text-[10px] uppercase tracking-wider">End Date</TableHead>
                                      <TableHead className="text-[#8E8E93] font-extrabold text-[10px] uppercase tracking-wider">Days Remaining</TableHead>
                                      <TableHead className="text-right text-[#8E8E93] font-extrabold text-[10px] uppercase tracking-wider pr-6">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {displayLeases.map((l: any) => {
                                      const now2 = new Date();
                                      const endDate = new Date(l.endDate);
                                      const startDate = new Date(l.startDate);
                                      const daysLeft = Math.ceil((endDate.getTime() - now2.getTime()) / (1000 * 60 * 60 * 24));
                                      const isExpiringSoon = l.status === "ACTIVE" && daysLeft >= 0 && daysLeft <= 30;
                                      const isExpired = endDate < now2 || l.status === "EXPIRED";
                                      const getPropName = (p: any) => { const i = p?.name?.indexOf(":"); return i > -1 ? p.name.slice(i + 1).trim() : p?.name; };
                                      const initials = l.tenant?.name ? l.tenant.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() : "T";
                                      
                                      const statusStyle = l.status === "ACTIVE" && !isExpired
                                        ? "text-emerald-700 border-emerald-200"
                                        : isExpired
                                        ? "text-red-600 border-red-200"
                                        : "text-[#6E6E73] border-slate-200";

                                      return (
                                        <TableRow key={l.id} className="border-slate-100 hover:bg-[#F5F5F7] transition-colors group h-16">
                                          <TableCell className="pl-6">
                                            <div className="flex items-center gap-3">
                                              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                                <Home className="h-4 w-4 text-[#6E6E73]" />
                                              </div>
                                              <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                  <span className="font-bold text-slate-900 text-sm">{getPropName(l.unit?.property)}</span>
                                                  <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-0 rounded-md px-1.5 py-0 text-[10px] uppercase">{l.unit?.name}</Badge>
                                                </div>
                                                <span className="text-xs text-[#6E6E73]">{l.unit?.property?.address}</span>
                                              </div>
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            <div className="flex items-center gap-2">
                                              <div className="h-7 w-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0 shadow-inner">
                                                {initials}
                                              </div>
                                              <div className="flex flex-col">
                                                <span className="font-semibold text-slate-900 text-xs">{l.tenant?.name || "—"}</span>
                                                <span className="text-[10px] text-[#6E6E73]">{l.tenant?.email}</span>
                                              </div>
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            <Badge variant="outline" className={`rounded-full font-bold px-2.5 py-0.5 text-[10px] capitalize bg-white shadow-sm ${statusStyle}`}>
                                              {isExpired ? "Expired" : l.status.toLowerCase().replace("_", " ")}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>
                                            <div className="flex flex-col">
                                              <span className="font-bold text-slate-900 text-sm">${Number(l.monthlyRent).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                              <span className="text-[10px] text-[#6E6E73]">per month</span>
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            <span className="text-xs text-[#6E6E73] font-medium">{startDate.toLocaleDateString()}</span>
                                          </TableCell>
                                          <TableCell>
                                            <span className="text-xs text-[#6E6E73] font-medium">{endDate.toLocaleDateString()}</span>
                                          </TableCell>
                                          <TableCell>
                                            {isExpired ? (
                                              <span className="text-xs font-bold text-red-600">Expired</span>
                                            ) : (
                                              <span className={`text-xs font-bold ${daysLeft <= 30 ? 'text-red-600' : 'text-emerald-600'}`}>{daysLeft} days</span>
                                            )}
                                          </TableCell>
                                          <TableCell className="pr-6 text-right">
                                            <DropdownMenu>
                                              <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-[#6E6E73] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]" />}>
                                                <MoreVertical className="h-4 w-4" />
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end" className="w-48 bg-white rounded-xl shadow-lg border-slate-100 p-1">
                                                <DropdownMenuItem className="cursor-pointer rounded-lg text-xs font-medium focus:bg-slate-50 py-2"><Eye className="h-4 w-4 mr-2 text-[#8E8E93]" /> View Details</DropdownMenuItem>
                                                <DropdownMenuItem className="cursor-pointer rounded-lg text-xs font-medium focus:bg-slate-50 py-2"><Edit2 className="h-4 w-4 mr-2 text-[#8E8E93]" /> Edit Lease</DropdownMenuItem>
                                                <DropdownMenuSeparator className="bg-[#F2F2F7]" />
                                                <DropdownMenuItem className="cursor-pointer rounded-lg text-xs font-medium focus:bg-slate-50 py-2"><FileText className="h-4 w-4 mr-2 text-[#8E8E93]" /> View Invoice</DropdownMenuItem>
                                                <DropdownMenuSeparator className="bg-[#F2F2F7]" />
                                                <DropdownMenuItem className="cursor-pointer rounded-lg text-xs font-medium focus:bg-red-50 text-red-600 py-2"><Trash2 className="h-4 w-4 mr-2 text-red-500" /> Delete</DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            </Card>
                          ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                              {displayLeases.map((l: any) => {
                                const now2 = new Date();
                                const endDate = new Date(l.endDate);
                                const startDate = new Date(l.startDate);
                                const daysLeft = Math.ceil((endDate.getTime() - now2.getTime()) / (1000 * 60 * 60 * 24));
                                const isExpiringSoon = l.status === "ACTIVE" && daysLeft >= 0 && daysLeft <= 30;
                                const isExpired = endDate < now2 || l.status === "EXPIRED";
                                const getPropName = (p: any) => { const i = p?.name?.indexOf(":"); return i > -1 ? p.name.slice(i + 1).trim() : p?.name; };
                                const initials = l.tenant?.name ? l.tenant.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() : "T";
                                
                                const statusStyle = l.status === "ACTIVE" && !isExpired
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : isExpired
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : "bg-slate-50 text-slate-700 border-slate-200";

                                return (
                                  <Card key={l.id} className="bg-white border border-slate-100 rounded-[24px] shadow-sm overflow-hidden hover:shadow-md transition-all group">
                                    <div className="p-5 border-b border-slate-100">
                                      <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                            <Home className="h-5 w-5 text-[#6E6E73]" />
                                          </div>
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <h3 className="font-bold text-slate-900 text-sm truncate max-w-[120px]">{getPropName(l.unit?.property)}</h3>
                                              <Badge className="bg-slate-100 text-[#6E6E73] hover:bg-[#F2F2F7] border-0 rounded-md px-1.5 py-0 text-[10px] uppercase font-bold">{l.unit?.name}</Badge>
                                            </div>
                                            <p className="text-xs text-[#6E6E73] truncate mt-0.5">{l.unit?.property?.address || "No address provided"}</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Badge variant="outline" className={`rounded-full font-bold px-2.5 py-0.5 text-[10px] capitalize shadow-sm ${statusStyle}`}>
                                            {isExpired ? "Expired" : l.status.toLowerCase().replace("_", " ")}
                                          </Badge>
                                          <DropdownMenu>
                                            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-[#8E8E93] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]" />}>
                                              <MoreVertical className="h-4 w-4" />
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 bg-white rounded-xl shadow-lg border-slate-100 p-1">
                                              <DropdownMenuItem className="cursor-pointer rounded-lg text-xs font-medium focus:bg-slate-50 py-2"><Eye className="h-4 w-4 mr-2 text-[#8E8E93]" /> View Details</DropdownMenuItem>
                                              <DropdownMenuItem className="cursor-pointer rounded-lg text-xs font-medium focus:bg-slate-50 py-2"><Edit2 className="h-4 w-4 mr-2 text-[#8E8E93]" /> Edit Lease</DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                      </div>

                                      <div className="bg-slate-50/80 rounded-xl p-3 flex items-center justify-between border border-slate-100/50">
                                        <div className="flex items-center gap-2.5">
                                          <div className="h-8 w-8 rounded-full bg-white border border-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm">
                                            {initials}
                                          </div>
                                          <div className="flex flex-col">
                                            <span className="font-semibold text-slate-900 text-xs">{l.tenant?.name || "—"}</span>
                                            <span className="text-[10px] text-[#6E6E73]">{l.tenant?.email}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="p-5">
                                      <div className="flex items-center justify-between mb-5">
                                        <div className="flex items-center gap-2">
                                          <Calendar className="h-4 w-4 text-[#8E8E93]" />
                                          <span className="text-xs font-semibold text-slate-700">{startDate.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})} - {endDate.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}</span>
                                        </div>
                                        {!isExpired && (
                                          <Badge className={`bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-0 rounded-full text-[10px] font-bold px-2 shadow-sm ${daysLeft <= 30 ? '!bg-red-50 !text-red-700' : ''}`}>
                                            {daysLeft} days remaining
                                          </Badge>
                                        )}
                                      </div>

                                      <div className="grid grid-cols-2 gap-3 mb-5">
                                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                          <p className="text-[10px] text-[#6E6E73] font-bold uppercase mb-1">Monthly Rent</p>
                                          <p className="text-sm font-black text-slate-900">${Number(l.monthlyRent).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                          <p className="text-[10px] text-[#6E6E73] font-bold uppercase mb-1">Security</p>
                                          <p className="text-sm font-black text-slate-900">${Number(l.unit?.depositAmt || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-3 text-[#6E6E73] pb-5 border-b border-slate-100">
                                        <div className="flex items-center gap-1.5"><Bed className="h-3.5 w-3.5" /><span className="text-xs font-semibold">{l.unit?.rooms || 0}</span></div>
                                        <div className="h-1 w-1 rounded-full bg-slate-300"></div>
                                        <div className="flex items-center gap-1.5"><Bath className="h-3.5 w-3.5" /><span className="text-xs font-semibold">{l.unit?.bathrooms || 1}</span></div>
                                        <div className="h-1 w-1 rounded-full bg-slate-300"></div>
                                        <div className="flex items-center gap-1.5"><Maximize2 className="h-3.5 w-3.5" /><span className="text-xs font-semibold">{l.unit?.sqFootage || 0} sqft</span></div>
                                        <div className="h-1 w-1 rounded-full bg-slate-300"></div>
                                        <div className="flex items-center gap-1.5"><Building className="h-3.5 w-3.5" /><span className="text-xs font-semibold">Fl {l.unit?.floor || 1}</span></div>
                                      </div>

                                      <div className="pt-4 flex justify-between items-center">
                                        <button className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">View Details</button>
                                        <button className="text-xs font-bold text-[#6E6E73] hover:text-[#1D1D1F] transition-colors">Invoice</button>
                                      </div>
                                    </div>
                                  </Card>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </TabsContent>
{/* Maintenance Tab */}
          <TabsContent value="maintenance" className="space-y-4 outline-none">
            <h2 className="text-xl font-black text-[#111111]">Maintenance Repair Tickets</h2>
            <Card className="bg-white border-0 rounded-[28px] shadow-sm p-6">
              <CardContent className="p-0">
                {maintenance.length === 0 ? (
                  <div className="text-center py-10 text-[#7F817F]">No active maintenance work orders.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="border-[#E2E3E0]/60">
                        <TableRow className="hover:bg-transparent border-[#E2E3E0]/60">
                          <TableHead className="text-[#7F817F] font-bold text-xs uppercase tracking-wider">Issue</TableHead>
                          <TableHead className="text-[#7F817F] font-bold text-xs uppercase tracking-wider">Unit / Property</TableHead>
                          <TableHead className="text-[#7F817F] font-bold text-xs uppercase tracking-wider">Priority</TableHead>
                          <TableHead className="text-[#7F817F] font-bold text-xs uppercase tracking-wider">Status</TableHead>
                          <TableHead className="text-[#7F817F] font-bold text-xs uppercase tracking-wider">Local Inspector</TableHead>
                          <TableHead className="text-right text-[#7F817F] font-bold text-xs uppercase tracking-wider">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {maintenance.map((m) => (
                          <TableRow key={m.id} className="border-[#E2E3E0]/40 hover:bg-[#F5F5F3]/30">
                            <TableCell className="font-extrabold text-[#111111] py-4">
                              {m.title}
                              <p className="text-xs text-[#7F817F] font-normal">{m.description}</p>
                            </TableCell>
                            <TableCell className="text-[#111111] font-semibold">
                              {m.unit.name}
                              <p className="text-xs text-[#7F817F] font-normal">{m.unit.property.name}</p>
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                m.priority === "EMERGENCY" ? "bg-[#E05A47]/10 text-[#E05A47] border border-[#E05A47]/20 rounded-full font-bold px-3 py-1" :
                                m.priority === "HIGH" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full font-bold px-3 py-1" :
                                "bg-[#496E5C]/10 text-[#496E5C] border border-[#496E5C]/20 rounded-full font-bold px-3 py-1"
                              }>
                                {m.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-white text-[#111111] border border-[#E2E3E0] rounded-full font-bold px-3 py-1 capitalize">{m.status.toLowerCase()}</Badge>
                            </TableCell>
                            <TableCell className="text-[#7F817F] text-sm font-semibold">
                              {m.inspector ? m.inspector.name : <span className="text-[#7F817F]/65 italic">Pending routing</span>}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedTicket(m);
                                  setSelectedInspectorId(m.inspectorId || "");
                                  setAssignOpen(true);
                                }}
                                className="border-[#E2E3E0] text-[#111111] hover:bg-[#ECECE9] rounded-full font-bold text-xs px-3 h-8 shadow-sm"
                              >
                                Assign Inspector
                              </Button>
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

          {/* Payouts Tab */}
          <TabsContent value="payouts" className="space-y-4 outline-none">
            <h2 className="text-xl font-black text-[#111111]">Ledger Payout Requests</h2>
            <Card className="bg-white border-0 rounded-[28px] shadow-sm p-6">
              <CardContent className="p-0">
                {payouts.length === 0 ? (
                  <div className="text-center py-10 text-[#7F817F]">No withdrawal requests logged.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="border-[#E2E3E0]/60">
                        <TableRow className="hover:bg-transparent border-[#E2E3E0]/60">
                          <TableHead className="text-[#7F817F] font-bold text-xs uppercase tracking-wider">Date Requested</TableHead>
                          <TableHead className="text-[#7F817F] font-bold text-xs uppercase tracking-wider">Amount</TableHead>
                          <TableHead className="text-[#7F817F] font-bold text-xs uppercase tracking-wider">Bank Details</TableHead>
                          <TableHead className="text-[#7F817F] font-bold text-xs uppercase tracking-wider">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payouts.map((po) => (
                          <TableRow key={po.id} className="border-[#E2E3E0]/40 hover:bg-[#F5F5F3]/30">
                            <TableCell className="text-[#111111] font-semibold">
                              {new Date(po.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-extrabold text-[#111111]">
                              ${Number(po.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-[#7F817F] text-xs font-semibold">
                              {po.bankName} - {po.accountName} (***{po.accountNumber.slice(-4)})
                            </TableCell>
                            <TableCell>
                              {po.status === "COMPLETED" ? (
                                <Badge className="bg-green-500/10 text-green-500 border border-green-500/20 rounded-full font-bold px-3 py-1">COMPLETED</Badge>
                              ) : po.status === "REJECTED" ? (
                                <Badge className="bg-[#E05A47]/10 text-[#E05A47] border border-[#E05A47]/20 rounded-full font-bold px-3 py-1">REJECTED</Badge>
                              ) : (
                                <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full font-bold px-3 py-1">PENDING</Badge>
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
          {/* Tenants Tab */}
          <TabsContent value="tenants" className="space-y-6 outline-none">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-[#111111]">Tenants</h2>
                <p className="text-sm text-[#7F817F] mt-0.5">{tenants.length} registered tenants in your portfolio</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Tenants", val: tenants.length, color: "text-[#1D1D1F]" },
                { label: "Active Leases", val: leases.filter((l:any) => l.status === "ACTIVE").length, color: "text-emerald-600" },
                { label: "Expiring Soon", val: leases.filter((l:any) => { const d = new Date(l.endDate); return l.status==="ACTIVE" && d > new Date() && d <= new Date(Date.now()+30*86400000); }).length, color: "text-amber-600" },
                { label: "Vacant Units", val: units.filter((u:any) => u.status==="VACANT").length, color: "text-blue-600" },
              ].map(s => (
                <Card key={s.label} className="bg-white border-0 rounded-2xl shadow-sm p-5">
                  <p className="text-xs text-[#7F817F] font-bold">{s.label}</p>
                  <p className={`text-3xl font-black mt-1 ${s.color}`}>{s.val}</p>
                </Card>
              ))}
            </div>
            <Card className="bg-white border-0 rounded-3xl shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="text-[#8E8E93] font-extrabold text-[10px] uppercase pl-6">Tenant</TableHead>
                    <TableHead className="text-[#8E8E93] font-extrabold text-[10px] uppercase">Email</TableHead>
                    <TableHead className="text-[#8E8E93] font-extrabold text-[10px] uppercase">Unit</TableHead>
                    <TableHead className="text-[#8E8E93] font-extrabold text-[10px] uppercase">Lease Status</TableHead>
                    <TableHead className="text-[#8E8E93] font-extrabold text-[10px] uppercase pr-6">Monthly Rent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-16 text-[#8E8E93]"><Users className="h-10 w-10 mx-auto mb-3 opacity-20"/><p className="font-bold">No tenants yet</p></TableCell></TableRow>
                  ) : tenants.map((t:any) => {
                    const tLease = leases.find((l:any) => l.tenantId === t.id && l.status === "ACTIVE");
                    return (
                      <TableRow key={t.id} className="border-slate-100 hover:bg-[#F5F5F7]/50">
                        <TableCell className="py-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-700">{t.name?.charAt(0) || "T"}</div>
                            <p className="font-extrabold text-slate-900 text-sm">{t.name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-[#6E6E73] text-sm">{t.email}</TableCell>
                        <TableCell className="font-semibold text-slate-700">{tLease?.unit?.name || "—"}</TableCell>
                        <TableCell><Badge className={`rounded-full font-bold px-3 py-1 text-xs ${tLease ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-[#6E6E73] border border-slate-200"}`}>{tLease ? "ACTIVE" : "NO LEASE"}</Badge></TableCell>
                        <TableCell className="font-extrabold text-slate-900 pr-6">{tLease ? `$${Number(tLease.monthlyRent).toLocaleString()}` : "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Inspections Tab */}
          <TabsContent value="inspections" className="space-y-6 outline-none">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-[#111111]">Inspections</h2>
                <p className="text-sm text-[#7F817F] mt-0.5">Schedule and track property inspections</p>
              </div>
              <Button onClick={() => setInspOpen(true)} className="bg-slate-900 hover:bg-[#007AFF] text-white rounded-full px-5 h-10 text-xs font-bold flex items-center gap-1.5">
                <Plus className="h-4 w-4" /> Schedule Inspection
              </Button>
            </div>
            <Card className="bg-white border-0 rounded-3xl shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="text-[#8E8E93] font-extrabold text-[10px] uppercase pl-6">Property / Unit</TableHead>
                    <TableHead className="text-[#8E8E93] font-extrabold text-[10px] uppercase">Inspector</TableHead>
                    <TableHead className="text-[#8E8E93] font-extrabold text-[10px] uppercase">Date</TableHead>
                    <TableHead className="text-[#8E8E93] font-extrabold text-[10px] uppercase">Status</TableHead>
                    <TableHead className="text-[#8E8E93] font-extrabold text-[10px] uppercase pr-6">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inspections.map((ins:any) => (
                    <TableRow key={ins.id} className="border-slate-100 hover:bg-[#F5F5F7]/50">
                      <TableCell className="py-4 pl-6"><p className="font-extrabold text-slate-900">{ins.unit}</p><p className="text-xs text-[#8E8E93]">{ins.property}</p></TableCell>
                      <TableCell className="font-semibold text-slate-700">{ins.inspector}</TableCell>
                      <TableCell className="text-[#6E6E73] font-semibold">{new Date(ins.date).toLocaleDateString("en-GB", {day:"2-digit",month:"short",year:"numeric"})}</TableCell>
                      <TableCell><Badge className={`rounded-full font-bold px-3 py-1 text-xs border ${ins.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{ins.status}</Badge></TableCell>
                      <TableCell className="text-[#6E6E73] text-xs pr-6">{ins.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
            <Dialog open={inspOpen} onOpenChange={setInspOpen}>
              <DialogContent className="bg-white rounded-[28px] max-w-md p-6">
                <DialogHeader><DialogTitle className="text-lg font-extrabold">Schedule Inspection</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateInspection} className="space-y-4 pt-4">
                  <div className="space-y-1.5"><Label className="text-xs font-bold">Property</Label>
                    <Select value={newInspPropId} onValueChange={v => setNewInspPropId(v||"")}>
                      <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl h-11"><SelectValue placeholder="Select Property"/></SelectTrigger>
                      <SelectContent className="bg-white rounded-xl">{properties.map((p:any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs font-bold">Unit</Label>
                    <Select value={newInspUnitId} onValueChange={v => setNewInspUnitId(v||"")}>
                      <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl h-11"><SelectValue placeholder="Select Unit"/></SelectTrigger>
                      <SelectContent className="bg-white rounded-xl">{units.filter((u:any) => !newInspPropId || u.propertyId===newInspPropId).map((u:any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs font-bold">Inspector</Label>
                    <Select value={newInspInspectorId} onValueChange={v => setNewInspInspectorId(v||"")}>
                      <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl h-11"><SelectValue placeholder="Select Inspector"/></SelectTrigger>
                      <SelectContent className="bg-white rounded-xl">{inspectors.map((i:any) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs font-bold">Date</Label><Input type="date" value={newInspDate} onChange={e => setNewInspDate(e.target.value)} className="bg-slate-50 border-slate-200 rounded-xl h-11" required/></div>
                  <div className="space-y-1.5"><Label className="text-xs font-bold">Notes (optional)</Label><Input value={newInspNotes} onChange={e => setNewInspNotes(e.target.value)} placeholder="Routine safety check..." className="bg-slate-50 border-slate-200 rounded-xl h-11"/></div>
                  <Button type="submit" className="w-full bg-slate-900 hover:bg-[#007AFF] text-white font-bold h-11 rounded-xl">Schedule Inspection</Button>
                </form>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6 outline-none">
            <div className="flex justify-between items-center">
              <div><h2 className="text-2xl font-black text-[#111111]">Transactions</h2><p className="text-sm text-[#7F817F] mt-0.5">All rent payments and financial movements</p></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Paid", val: `$${invoices.filter((i:any)=>i.status==="PAID").reduce((s:number,i:any)=>s+Number(i.amount),0).toLocaleString()}`, color: "text-emerald-600" },
                { label: "Unpaid", val: invoices.filter((i:any)=>i.status==="UNPAID").length, color: "text-amber-600" },
                { label: "Overdue", val: invoices.filter((i:any)=>i.status==="OVERDUE").length, color: "text-red-600" },
                { label: "Ledger Balance", val: `$${balance.toLocaleString()}`, color: "text-[#1D1D1F]" },
              ].map(s => <Card key={s.label} className="bg-white border-0 rounded-2xl shadow-sm p-5"><p className="text-xs text-[#7F817F] font-bold">{s.label}</p><p className={`text-2xl font-black mt-1 ${s.color}`}>{s.val}</p></Card>)}
            </div>
            <Card className="bg-white border-0 rounded-3xl shadow-sm overflow-hidden">
              <Table>
                <TableHeader><TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="text-[#8E8E93] font-extrabold text-[10px] uppercase pl-6">Invoice / Tenant</TableHead>
                  <TableHead className="text-[#8E8E93] font-extrabold text-[10px] uppercase">Unit</TableHead>
                  <TableHead className="text-[#8E8E93] font-extrabold text-[10px] uppercase">Amount</TableHead>
                  <TableHead className="text-[#8E8E93] font-extrabold text-[10px] uppercase">Due Date</TableHead>
                  <TableHead className="text-[#8E8E93] font-extrabold text-[10px] uppercase pr-6">Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {invoices.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-16 text-[#8E8E93] font-bold">No transactions yet</TableCell></TableRow>
                  ) : invoices.map((inv:any) => (
                    <TableRow key={inv.id} className="border-slate-100 hover:bg-[#F5F5F7]/50">
                      <TableCell className="py-4 pl-6"><p className="font-extrabold text-slate-900 text-sm">{inv.lease?.tenant?.name || "Tenant"}</p><p className="text-xs text-[#8E8E93]">{inv.lease?.tenant?.email}</p></TableCell>
                      <TableCell className="font-semibold text-slate-700">{inv.lease?.unit?.name || "—"}</TableCell>
                      <TableCell className="font-extrabold text-slate-900">${Number(inv.amount).toLocaleString()}</TableCell>
                      <TableCell className="text-[#6E6E73] text-sm">{new Date(inv.dueDate).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</TableCell>
                      <TableCell className="pr-6"><Badge className={`rounded-full font-bold px-3 py-1 text-xs border ${inv.status==="PAID"?"bg-emerald-50 text-emerald-700 border-emerald-200":inv.status==="OVERDUE"?"bg-red-50 text-red-700 border-red-200":"bg-amber-50 text-amber-700 border-amber-200"}`}>{inv.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-6 outline-none">
            <div className="flex justify-between items-center">
              <div><h2 className="text-2xl font-black text-[#111111]">Invoices</h2><p className="text-sm text-[#7F817F] mt-0.5">Manage and create rent invoices</p></div>
              <Button onClick={() => setInvoiceOpen(true)} className="bg-slate-900 hover:bg-[#007AFF] text-white rounded-full px-5 h-10 text-xs font-bold flex items-center gap-1.5"><Plus className="h-4 w-4"/> New Invoice</Button>
            </div>
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[180px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8E8E93]"/><Input placeholder="Search invoices..." value={invoiceSearch} onChange={e=>setInvoiceSearch(e.target.value)} className="pl-9 bg-white border-slate-200 rounded-full h-10 text-sm"/></div>
              <Select value={invoiceStatusFilter} onValueChange={v=>setInvoiceStatusFilter(v||"ALL")}><SelectTrigger className="w-36 rounded-full h-10 bg-white border-slate-200 text-sm font-semibold"><SelectValue/></SelectTrigger><SelectContent className="bg-white rounded-xl"><SelectItem value="ALL">All Status</SelectItem><SelectItem value="PAID">Paid</SelectItem><SelectItem value="UNPAID">Unpaid</SelectItem><SelectItem value="OVERDUE">Overdue</SelectItem></SelectContent></Select>
            </div>
            <Card className="bg-white border-0 rounded-3xl shadow-sm overflow-hidden">
              <Table>
                <TableHeader><TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="text-[#8E8E93] font-extrabold text-[10px] uppercase pl-6">Tenant</TableHead>
                  <TableHead className="text-[#8E8E93] font-extrabold text-[10px] uppercase">Unit</TableHead>
                  <TableHead className="text-[#8E8E93] font-extrabold text-[10px] uppercase">Amount</TableHead>
                  <TableHead className="text-[#8E8E93] font-extrabold text-[10px] uppercase">Due Date</TableHead>
                  <TableHead className="text-[#8E8E93] font-extrabold text-[10px] uppercase pr-6">Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {invoices.filter((i:any)=>{
                    if(invoiceStatusFilter!=="ALL"&&i.status!==invoiceStatusFilter) return false;
                    if(invoiceSearch&&!i.lease?.tenant?.name?.toLowerCase().includes(invoiceSearch.toLowerCase())&&!i.lease?.unit?.name?.toLowerCase().includes(invoiceSearch.toLowerCase())) return false;
                    return true;
                  }).map((inv:any) => (
                    <TableRow key={inv.id} className="border-slate-100 hover:bg-[#F5F5F7]/50">
                      <TableCell className="py-4 pl-6 font-extrabold text-slate-900">{inv.lease?.tenant?.name || "Tenant"}</TableCell>
                      <TableCell className="font-semibold text-slate-700">{inv.lease?.unit?.name || "—"}</TableCell>
                      <TableCell className="font-extrabold text-slate-900">${Number(inv.amount).toLocaleString()}</TableCell>
                      <TableCell className="text-[#6E6E73]">{new Date(inv.dueDate).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</TableCell>
                      <TableCell className="pr-6"><Badge className={`rounded-full font-bold px-3 py-1 text-xs border ${inv.status==="PAID"?"bg-emerald-50 text-emerald-700 border-emerald-200":inv.status==="OVERDUE"?"bg-red-50 text-red-700 border-red-200":"bg-amber-50 text-amber-700 border-amber-200"}`}>{inv.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
            <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
              <DialogContent className="bg-white rounded-[28px] max-w-md p-6">
                <DialogHeader><DialogTitle className="text-lg font-extrabold">Create Invoice</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateInvoice} className="space-y-4 pt-4">
                  <div className="space-y-1.5"><Label className="text-xs font-bold">Lease</Label>
                    <Select value={newInvLeaseId} onValueChange={v=>setNewInvLeaseId(v||"")}><SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl h-11"><SelectValue placeholder="Select Lease"/></SelectTrigger><SelectContent className="bg-white rounded-xl">{leases.filter((l:any)=>l.status==="ACTIVE").map((l:any)=><SelectItem key={l.id} value={l.id}>{l.tenant?.name} – {l.unit?.name}</SelectItem>)}</SelectContent></Select>
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs font-bold">Amount ($)</Label><Input type="number" value={newInvAmount} onChange={e=>setNewInvAmount(e.target.value)} placeholder="1200" className="bg-slate-50 border-slate-200 rounded-xl h-11" required/></div>
                  <div className="space-y-1.5"><Label className="text-xs font-bold">Due Date</Label><Input type="date" value={newInvDueDate} onChange={e=>setNewInvDueDate(e.target.value)} className="bg-slate-50 border-slate-200 rounded-xl h-11" required/></div>
                  <div className="space-y-1.5"><Label className="text-xs font-bold">Status</Label>
                    <Select value={newInvStatus} onValueChange={v=>setNewInvStatus(v||"UNPAID")}><SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl h-11"><SelectValue/></SelectTrigger><SelectContent className="bg-white rounded-xl"><SelectItem value="UNPAID">Unpaid</SelectItem><SelectItem value="PAID">Paid</SelectItem><SelectItem value="OVERDUE">Overdue</SelectItem></SelectContent></Select>
                  </div>
                  <Button type="submit" className="w-full bg-slate-900 hover:bg-[#007AFF] text-white font-bold h-11 rounded-xl">Create Invoice</Button>
                </form>
              </DialogContent>
            </Dialog>
          </TabsContent>
          {/* Revenues Tab */}
          <TabsContent value="revenues" className="space-y-6 outline-none">
            <div className="flex justify-between items-center">
              <div><h2 className="text-2xl font-black text-[#111111]">Revenues</h2><p className="text-sm text-[#7F817F] mt-0.5">Track your rental income stream</p></div>
            </div>
            <Card className="bg-white border-0 rounded-3xl shadow-sm p-6 text-center text-[#7F817F]">
              <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-bold">Detailed revenue tracking is currently in beta.</p>
              <p className="text-sm mt-1">Please refer to the Transactions and Dashboard tabs for your primary financial summary.</p>
            </Card>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-6 outline-none">
            <div className="flex justify-between items-center">
              <div><h2 className="text-2xl font-black text-[#111111]">Expenses</h2><p className="text-sm text-[#7F817F] mt-0.5">Manage property-related costs and maintenance bills</p></div>
            </div>
            <Card className="bg-white border-0 rounded-3xl shadow-sm p-6 text-center text-[#7F817F]">
              <ArrowDownRight className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-bold">Expense management module is rolling out soon.</p>
              <p className="text-sm mt-1">You will be able to log vendor bills, maintenance costs, and operational expenses here.</p>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6 outline-none">
            <div className="flex justify-between items-center">
              <div><h2 className="text-2xl font-black text-[#111111]">Financial Reports</h2><p className="text-sm text-[#7F817F] mt-0.5">Generate and download financial statements</p></div>
            </div>
            <Card className="bg-white border-0 rounded-3xl shadow-sm p-6 text-center text-[#7F817F]">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-bold">Custom reporting is coming to PropertyPro.</p>
              <p className="text-sm mt-1">Soon you can generate PDF/CSV exports for tax season and investor updates.</p>
            </Card>
          </TabsContent>

          {/* Inbox Tab */}
          <TabsContent value="inbox" className="space-y-6 outline-none">
            <div className="flex justify-between items-center">
              <div><h2 className="text-2xl font-black text-[#111111]">Inbox</h2><p className="text-sm text-[#7F817F] mt-0.5">Messages and communications</p></div>
            </div>
            <Card className="bg-white border-0 rounded-3xl shadow-sm p-6 text-center text-[#7F817F]">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-bold">No new messages</p>
              <p className="text-sm mt-1">Tenant communications and system alerts will appear here.</p>
            </Card>
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="space-y-6 outline-none">
            <div className="flex justify-between items-center">
              <div><h2 className="text-2xl font-black text-[#111111]">Calendar</h2><p className="text-sm text-[#7F817F] mt-0.5">Upcoming events, inspections, and lease expirations</p></div>
            </div>
            <Card className="bg-white border-0 rounded-3xl shadow-sm p-6 text-center text-[#7F817F]">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-bold">Calendar View</p>
              <p className="text-sm mt-1">Your schedule is clear for the next 7 days.</p>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6 outline-none">
            <div className="flex justify-between items-center">
              <div><h2 className="text-2xl font-black text-[#111111]">Account Settings</h2><p className="text-sm text-[#7F817F] mt-0.5">Manage your preferences and profile</p></div>
            </div>

            <div className="flex items-center space-x-6 border-b border-[#E5E5EA] mb-6">
              <button
                type="button"
                onClick={() => setActiveSettingsTab("profile")}
                className={`pb-4 text-sm font-bold border-b-2 transition-colors ${
                  activeSettingsTab === "profile" 
                    ? "border-blue-600 text-blue-600" 
                    : "border-transparent text-[#6E6E73] hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                Profile Settings
              </button>
              <button
                type="button"
                onClick={() => setActiveSettingsTab("security")}
                className={`pb-4 text-sm font-bold border-b-2 transition-colors ${
                  activeSettingsTab === "security" 
                    ? "border-blue-600 text-blue-600" 
                    : "border-transparent text-[#6E6E73] hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                Security & Password
              </button>
              <button
                type="button"
                onClick={() => setActiveSettingsTab("subscription")}
                className={`pb-4 text-sm font-bold border-b-2 transition-colors ${
                  activeSettingsTab === "subscription" 
                    ? "border-blue-600 text-blue-600" 
                    : "border-transparent text-[#6E6E73] hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                Subscription Plan
              </button>
            </div>

            {activeSettingsTab === "subscription" && (
              <div className="space-y-6 mt-6 max-w-4xl">
                {pricingTier ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Column: Plan Details */}
                    <Card className="bg-gradient-to-br from-[#1D1D1F] to-[#1E293B] border-0 rounded-3xl shadow-xl p-8 col-span-2 text-white relative overflow-hidden">
                      <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
                      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl"></div>
                      
                      <div className="relative z-10 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-8">
                          <div>
                            <Badge className="bg-white/10 text-white hover:bg-white/20 border-0 rounded-lg px-3 py-1 font-bold text-xs uppercase tracking-widest backdrop-blur-md mb-3 inline-block">
                              Current Plan
                            </Badge>
                            <h3 className="text-3xl font-black text-white">{pricingTier.name}</h3>
                          </div>
                          <div className="text-right">
                            <span className="text-3xl font-black text-white">${pricingTier.price}</span>
                            <span className="text-[#8E8E93] font-medium text-sm">/mo</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8 mb-8">
                          <div>
                            <p className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-2">Billing Cycle</p>
                            <p className="font-semibold text-white flex items-center gap-2"><Calendar className="h-4 w-4 text-blue-400"/> Monthly</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-2">Status</p>
                            <div className="flex items-center gap-2">
                              <span className="relative flex h-3 w-3">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${subscriptionStatus.toLowerCase() === 'active' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                                <span className={`relative inline-flex rounded-full h-3 w-3 ${subscriptionStatus.toLowerCase() === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                              </span>
                              <span className="font-semibold text-white capitalize">{subscriptionStatus}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-auto bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                          <div className="flex justify-between items-end mb-3">
                            <div>
                              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Unit Usage</p>
                              <p className="text-2xl font-black text-white">{units.length} <span className="text-sm font-medium text-[#8E8E93]">/ {pricingTier.maxUnits} Units</span></p>
                            </div>
                            <span className="text-sm font-bold text-blue-400">
                              {Math.round((units.length / pricingTier.maxUnits) * 100)}% Used
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                            <div 
                              className={`h-2.5 rounded-full transition-all duration-1000 ${
                                (units.length / pricingTier.maxUnits) > 0.9 ? 'bg-red-500' : 
                                (units.length / pricingTier.maxUnits) > 0.75 ? 'bg-amber-400' : 'bg-blue-500'
                              }`} 
                              style={{ width: `${Math.min((units.length / pricingTier.maxUnits) * 100, 100)}%` }}
                            ></div>
                          </div>
                          {(units.length / pricingTier.maxUnits) >= 0.9 && (
                            <p className="text-xs text-red-400 font-medium mt-3 flex items-center gap-1.5">
                              <AlertTriangle className="h-3.5 w-3.5" /> You are approaching your unit limit. Upgrade to add more units.
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>

                    {/* Right Column: Features & Upgrade */}
                    <Card className="bg-white border border-[#E5E5EA] rounded-3xl shadow-sm flex flex-col">
                      <div className="p-6 pb-4 border-b border-slate-100">
                        <h4 className="text-lg font-bold text-[#111111]">Plan Features</h4>
                      </div>
                      <div className="p-6 flex-1 flex flex-col">
                        <ul className="space-y-4 mb-8 flex-1">
                          {pricingTier.features && Array.isArray(pricingTier.features) && pricingTier.features.map((feature: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-3">
                              <div className="mt-0.5 bg-emerald-50 text-emerald-500 rounded-full p-0.5 shrink-0">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-sm font-medium text-[#6E6E73] leading-snug">{feature}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-auto space-y-3">
                          <Button onClick={() => setShowPricingModal(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl shadow-md shadow-blue-600/20 transition-all">
                            View & Purchase Plans
                          </Button>
                          <Button onClick={handlePortal} variant="outline" className="w-full bg-white hover:bg-[#F5F5F7] border-slate-200 text-slate-700 font-bold h-12 rounded-xl transition-all">
                            Stripe Customer Portal
                          </Button>
                          <p className="text-center text-[11px] font-medium text-[#8E8E93] mt-1">Stripe Portal is used for changing cards & billing details.</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                ) : (
                  <Card className="bg-white border border-[#E5E5EA] rounded-3xl shadow-sm p-12 text-center flex flex-col items-center justify-center">
                    <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                      <Activity className="h-10 w-10 text-slate-300" />
                    </div>
                    <h3 className="text-2xl font-black text-[#111111] mb-2">No Active Subscription</h3>
                    <p className="text-[#6E6E73] max-w-md mx-auto mb-8">You are currently not on an active plan. Upgrade your account to list properties, manage units, and start collecting rent.</p>
                    <div className="flex gap-4 justify-center">
                      <Button onClick={() => handleCheckout("starter")} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 px-8 rounded-xl shadow-md shadow-blue-600/20">
                        View Pricing Plans
                      </Button>
                    </div>
                  </Card>
                )}

                {/* Billing History Section */}
                <div className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-[#111111]">Billing History</h4>
                    <Button variant="outline" className="text-xs font-bold h-8 rounded-lg border-slate-200">
                      Download All
                    </Button>
                  </div>
                  <Card className="bg-white border border-[#E5E5EA] rounded-3xl shadow-sm overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-slate-100 hover:bg-transparent">
                          <TableHead className="text-[#6E6E73] font-bold text-[10px] uppercase tracking-wider py-3 pl-6">Date</TableHead>
                          <TableHead className="text-[#6E6E73] font-bold text-[10px] uppercase tracking-wider py-3">Description</TableHead>
                          <TableHead className="text-[#6E6E73] font-bold text-[10px] uppercase tracking-wider py-3">Amount</TableHead>
                          <TableHead className="text-[#6E6E73] font-bold text-[10px] uppercase tracking-wider py-3">Status</TableHead>
                          <TableHead className="text-[#6E6E73] font-bold text-[10px] uppercase tracking-wider py-3 text-right pr-6">Receipt</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pricingTier ? (
                          <TableRow className="border-slate-100 hover:bg-[#F5F5F7]/50">
                            <TableCell className="py-4 pl-6 text-sm font-semibold text-slate-700">Oct 01, 2026</TableCell>
                            <TableCell className="text-sm font-bold text-slate-900">{pricingTier.name} Subscription</TableCell>
                            <TableCell className="text-sm font-black text-slate-900">${pricingTier.price}</TableCell>
                            <TableCell>
                              <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-50 rounded-full font-bold px-2.5 py-0.5 shadow-sm">Paid</Badge>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <Button variant="ghost" className="h-8 w-8 p-0 rounded-full text-[#8E8E93] hover:text-blue-600 hover:bg-blue-50">
                                <Download className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="py-8 text-center text-sm font-medium text-[#6E6E73]">
                              No billing history available.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                </div>
              </div>
            )}

            {activeSettingsTab === "profile" && (
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                
                <Card className="bg-white border-0 rounded-3xl shadow-sm p-8 max-w-3xl mt-6">
                  <h3 className="text-lg font-bold text-[#111111] border-b border-slate-100 pb-2 mb-6">Personal Information</h3>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-6 pb-6 mb-6 border-b border-slate-100">
                    <div className="h-24 w-24 shrink-0 rounded-full bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center relative">
                      {profileAvatar ? (
                        <img src={profileAvatar} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-10 w-10 text-[#8E8E93]" />
                      )}
                      {avatarUploading && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-slate-900" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="relative inline-block">
                          <Button type="button" variant="outline" className="h-9 px-4 text-xs font-bold rounded-lg border-slate-300">
                            Change Photo
                          </Button>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleAvatarUpload} 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </div>
                        <Button type="button" variant="ghost" className="h-9 px-4 text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setProfileAvatar("")}>
                          Remove
                        </Button>
                      </div>
                      <p className="text-xs text-[#6E6E73]">JPG, PNG or GIF. Max size 5MB.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="profName" className="text-sm font-bold text-slate-700">Full Name</Label>
                      <Input 
                        id="profName"
                        placeholder="Your Name"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="profPhone" className="text-sm font-bold text-slate-700">Phone Number</Label>
                      <Input 
                        id="profPhone"
                        type="tel"
                        placeholder="+1 555-0000"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label className="text-sm font-bold text-slate-700">Email Address</Label>
                      <div className="relative">
                        <Input 
                          disabled
                          value={session?.user?.email || ""}
                          className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11 text-[#6E6E73] pl-10 cursor-not-allowed"
                        />
                        <Shield className="h-4 w-4 text-[#8E8E93] absolute left-3.5 top-3.5" />
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="bg-white border-0 rounded-3xl shadow-sm p-8 max-w-3xl">
                  <h3 className="text-lg font-bold text-[#111111] border-b border-slate-100 pb-2 mb-6">Entity & Tax Profile</h3>
                  
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-bold text-slate-700">How are you operating?</Label>
                      <div className="flex items-center gap-4">
                        <label className={`flex-1 flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${entityType === "INDIVIDUAL" ? "border-blue-500 bg-blue-50/50" : "border-slate-200 hover:border-slate-300 bg-white"}`}>
                          <input type="radio" name="entityType" value="INDIVIDUAL" checked={entityType === "INDIVIDUAL"} onChange={() => setEntityType("INDIVIDUAL")} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300" />
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-sm">Individual</span>
                            <span className="text-xs text-[#6E6E73]">Sole proprietor or personal ownership</span>
                          </div>
                        </label>
                        <label className={`flex-1 flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${entityType === "BUSINESS" ? "border-blue-500 bg-blue-50/50" : "border-slate-200 hover:border-slate-300 bg-white"}`}>
                          <input type="radio" name="entityType" value="BUSINESS" checked={entityType === "BUSINESS"} onChange={() => setEntityType("BUSINESS")} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300" />
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-sm">Business</span>
                            <span className="text-xs text-[#6E6E73]">LLC, Corporation, or Partnership</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {entityType === "BUSINESS" && (
                      <div className="space-y-1.5">
                        <Label className="text-sm font-bold text-slate-700">Legal Business Name</Label>
                        <Input 
                          placeholder="e.g. Acme Properties LLC"
                          value={profileEmployer}
                          onChange={(e) => setProfileEmployer(e.target.value)}
                          className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11"
                        />
                      </div>
                    )}
                    
                    <div className="space-y-1.5">
                      <Label className="text-sm font-bold text-slate-700">{entityType === "BUSINESS" ? "Tax ID / EIN" : "Social Security Number (SSN)"}</Label>
                      <Input 
                        placeholder={entityType === "BUSINESS" ? "e.g. 12-3456789" : "e.g. XXX-XX-XXXX"}
                        value={profilePosition}
                        onChange={(e) => setProfilePosition(e.target.value)}
                        className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11"
                      />
                      <p className="text-xs text-[#6E6E73]">Required for verification and year-end 1099 tax document generation.</p>
                    </div>
                  </div>
                </Card>

                <Card className="bg-white border-0 rounded-3xl shadow-sm p-8 max-w-3xl">
                  <h3 className="text-lg font-bold text-[#111111] border-b border-slate-100 pb-2 mb-6">Bank Payout Details</h3>
                  <p className="text-sm text-[#6E6E73] mb-6">
                    Connect your bank account to receive automatic rental payouts from Stripe. Note: This data will be securely synced with Stripe Connect.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-bold text-slate-700">Bank Name</Label>
                      <Input 
                        placeholder="e.g. Chase Bank"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-bold text-slate-700">Account Name</Label>
                        <Input 
                          placeholder="John Doe"
                          value={accountName}
                          onChange={(e) => setAccountName(e.target.value)}
                          className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-bold text-slate-700">Account / Routing Number</Label>
                        <Input 
                          placeholder="**** **** **** 1234"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11"
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="bg-white border-0 rounded-3xl shadow-sm p-8 max-w-3xl">
                  <h3 className="text-lg font-bold text-[#111111] border-b border-slate-100 pb-2 mb-6">Maintenance Cost Controls</h3>
                  <p className="text-sm text-[#6E6E73] mb-6">
                    Define standard thresholds and emergency limits. Vendor quotes under these thresholds are automatically approved to expedite work.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="appThreshold" className="text-sm font-bold text-slate-700">Standard Approval Threshold ($)</Label>
                      <Input 
                        id="appThreshold"
                        type="number"
                        placeholder="200.00"
                        min="0"
                        step="0.01"
                        value={approvalThreshold}
                        onChange={(e) => setApprovalThreshold(e.target.value)}
                        className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11"
                      />
                      <p className="text-[11px] text-[#6E6E73]">Estimates above this require your manual approval. Default is $200.00</p>
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="emergLimit" className="text-sm font-bold text-slate-700">Emergency Override Limit ($)</Label>
                      <Input 
                        id="emergLimit"
                        type="number"
                        placeholder="1500.00"
                        min="0"
                        step="0.01"
                        value={emergencyOverrideLimit}
                        onChange={(e) => setEmergencyOverrideLimit(e.target.value)}
                        className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11"
                      />
                      <p className="text-[11px] text-[#6E6E73]">Emergency tickets under this are auto-authorized. Default is $1,500.00</p>
                    </div>
                  </div>
                </Card>

                <div className="pt-2 max-w-3xl flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={profileSubmitting}
                    className="bg-slate-900 hover:bg-[#007AFF] text-white font-bold h-11 px-10 rounded-xl shadow-sm transition-colors"
                  >
                    {profileSubmitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</>
                    ) : (
                      "Save Profile Settings"
                    )}
                  </Button>
                </div>
              </form>
            )}

            {activeSettingsTab === "security" && (
              <div className="mt-6">
                <SecuritySettings />
              </div>
            )}
          </TabsContent>
        </Tabs>

      {/* Assign Inspector Dialog Modal */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="bg-white border-[#E2E3E0] text-[#111111] rounded-[28px] max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold flex items-center gap-2">
              <User className="h-5 w-5 text-[#496E5C]" />
              Assign Inspector
            </DialogTitle>
            <DialogDescription className="text-[#7F817F] text-xs">
              Assign an on-site inspector to inspect: "{selectedTicket?.title}"
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignInspector} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Select Local Inspector</Label>
              <Select value={selectedInspectorId} onValueChange={(val) => setSelectedInspectorId(val || "")}>
                <SelectTrigger className="bg-[#F5F5F3] border-[#E2E3E0] text-[#111111] rounded-xl h-11">
                  <SelectValue placeholder="Select Inspector" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#E2E3E0] text-[#111111] rounded-xl">
                  {inspectors.map((ins) => (
                    <SelectItem key={ins.id} value={ins.id}>
                      {ins.name} ({ins.phone || ins.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full bg-[#496E5C] hover:bg-[#3E5C4E] text-white font-bold h-11 rounded-xl transition-colors mt-2">
              Assign Inspector
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Global Command/Search Modal */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-2xl overflow-hidden rounded-[24px]">
          <div className="bg-white rounded-[24px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col h-[500px]">
            <div className="flex items-center px-4 border-b border-slate-100">
              <Search className="h-5 w-5 text-[#8E8E93] shrink-0" />
              <input
                className="flex h-14 w-full bg-transparent py-3 text-sm outline-none placeholder:text-[#8E8E93] disabled:cursor-not-allowed disabled:opacity-50 border-0 focus:ring-0 ml-3 font-medium text-slate-900"
                placeholder="Search..."
                autoFocus
              />
              <button onClick={() => setSearchOpen(false)} className="text-[#8E8E93] hover:text-[#6E6E73] p-2">
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 text-slate-700">
              <div className="px-2 py-3">
                <p className="px-2 pb-2 text-[11px] font-bold text-[#8E8E93] tracking-wider">Overview</p>
                <button onClick={() => { setActiveTab("dashboard"); setSearchOpen(false); }} className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm hover:bg-[#F5F5F7] hover:text-[#1D1D1F] cursor-pointer transition-colors group">
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-slate-700 group-hover:text-[#1D1D1F]">Dashboard</span>
                    <span className="text-xs text-[#8E8E93]">/dashboard</span>
                  </div>
                  <Badge variant="secondary" className="bg-slate-100 text-[#6E6E73] hover:bg-[#F2F2F7] border-0 text-[10px] rounded-full px-2.5 font-bold shadow-sm">Overview</Badge>
                </button>
                <button onClick={() => { setActiveTab("calendar"); setSearchOpen(false); }} className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm hover:bg-[#F5F5F7] hover:text-[#1D1D1F] cursor-pointer transition-colors group mt-1">
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-slate-700 group-hover:text-[#1D1D1F]">Calendar</span>
                    <span className="text-xs text-[#8E8E93]">/dashboard/calendar</span>
                  </div>
                  <Badge variant="secondary" className="bg-slate-100 text-[#6E6E73] hover:bg-[#F2F2F7] border-0 text-[10px] rounded-full px-2.5 font-bold shadow-sm">Overview</Badge>
                </button>
              </div>
              <div className="px-2 py-3">
                <p className="px-2 pb-2 text-[11px] font-bold text-[#8E8E93] tracking-wider">Management</p>
                <button onClick={() => { setActiveTab("properties"); setSearchOpen(false); }} className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm hover:bg-[#F5F5F7] hover:text-[#1D1D1F] cursor-pointer transition-colors group">
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-slate-700 group-hover:text-[#1D1D1F]">Properties</span>
                    <span className="text-xs text-[#8E8E93]">/dashboard/properties</span>
                  </div>
                  <Badge variant="secondary" className="bg-slate-100 text-[#6E6E73] hover:bg-[#F2F2F7] border-0 text-[10px] rounded-full px-2.5 font-bold shadow-sm">Overview</Badge>
                </button>
                <button onClick={() => { setActiveTab("units"); setSearchOpen(false); }} className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm hover:bg-[#F5F5F7] hover:text-[#1D1D1F] cursor-pointer transition-colors group mt-1">
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-slate-700 group-hover:text-[#1D1D1F]">Units</span>
                    <span className="text-xs text-[#8E8E93]">/dashboard/properties/units</span>
                  </div>
                  <Badge variant="secondary" className="bg-slate-100 text-[#6E6E73] hover:bg-[#F2F2F7] border-0 text-[10px] rounded-full px-2.5 font-bold shadow-sm">List</Badge>
                </button>
                <button onClick={() => { setActiveTab("tenants"); setSearchOpen(false); }} className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm hover:bg-[#F5F5F7] hover:text-[#1D1D1F] cursor-pointer transition-colors group mt-1">
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-slate-700 group-hover:text-[#1D1D1F]">Tenants</span>
                    <span className="text-xs text-[#8E8E93]">/dashboard/tenants</span>
                  </div>
                  <Badge variant="secondary" className="bg-slate-100 text-[#6E6E73] hover:bg-[#F2F2F7] border-0 text-[10px] rounded-full px-2.5 font-bold shadow-sm">Overview</Badge>
                </button>
                <button onClick={() => { setActiveTab("leases"); setSearchOpen(false); }} className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm hover:bg-[#F5F5F7] hover:text-[#1D1D1F] cursor-pointer transition-colors group mt-1">
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-slate-700 group-hover:text-[#1D1D1F]">Applications</span>
                    <span className="text-xs text-[#8E8E93]">/dashboard/tenants/applications</span>
                  </div>
                  <Badge variant="secondary" className="bg-slate-100 text-[#6E6E73] hover:bg-[#F2F2F7] border-0 text-[10px] rounded-full px-2.5 font-bold shadow-sm">List</Badge>
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Subscription Upgrade / Lockout Modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="bg-white border-0 rounded-[28px] max-w-md p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <div className="h-16 w-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
              <Lock className="h-8 w-8" />
            </div>
            <DialogTitle className="text-2xl font-black text-slate-900 mb-2">Upgrade Required</DialogTitle>
            <DialogDescription className="text-[#6E6E73] font-medium mb-8">
              {upgradeReason}
            </DialogDescription>
            <div className="w-full space-y-3">
              <Button onClick={() => {
                setShowUpgradeModal(false);
                setActiveTab('settings');
                setActiveSettingsTab('subscription');
              }} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl">
                View Subscription Settings
              </Button>
              <Button onClick={() => setShowUpgradeModal(false)} variant="ghost" className="w-full text-[#6E6E73] hover:text-slate-700 font-bold h-12 rounded-xl">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pending Draft Banner */}
      {pendingPropertyDraft && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#007AFF] text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold animate-pulse">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          Creating your property "{pendingPropertyDraft.name}"...
        </div>
      )}

      {/* Embedded Subscribe Modal (replaces redirect-based pricing modal) */}
      <EmbeddedSubscribeModal
        open={showPricingModal}
        onOpenChange={(open) => { setShowPricingModal(open); if (!open) setPricingModalContext("general"); }}
        pricingTiers={pricingTiers}
        currentTierId={pricingTier?.id}
        currentUserUnitCount={units.length}
        currentTierPrice={pricingTier?.price ? Number(pricingTier.price) : 0}
        title={pricingModalContext === "blocked_property" ? "One Step Away from Listing!" : "Choose Your Plan"}
        contextMessage={
          pricingModalContext === "blocked_property"
            ? "Your property details are saved. Subscribe below — your property will be created automatically right after payment. 🚀"
            : undefined
        }
        onSuccess={() => {
          setShowPricingModal(false);
          setPricingModalContext("general");
          fetchOwnerData();
          toast.success("Subscription activated! Your account is now fully unlocked.", { duration: 5000 });
        }}
      />
    </div>
  );
}
