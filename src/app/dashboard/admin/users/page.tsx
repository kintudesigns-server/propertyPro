"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Loader2,
  Users2,
  UserCheck,
  UserMinus,
  ShieldAlert,
  RefreshCw,
  UserPlus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash,
  Ban,
  CheckCircle2,
  Building,
  FileText,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  User,
  Shield,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function AdminUsersPage() {
  const { status, data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modals & Selected state
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    tenantStatus: "",
  });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        setUsers(await res.json());
      } else {
        toast.error("Failed to load users");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") fetchUsers();
  }, [status]);

  const handleViewDetails = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedUser(data);
        setIsDetailModalOpen(true);
      } else {
        toast.error("Failed to fetch user details");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch user details");
    }
  };

  const handleOpenEdit = (user: any) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role || "TENANT",
      tenantStatus: user.tenantStatus || "Active",
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });
      if (res.ok) {
        toast.success("User details updated successfully");
        setIsEditModalOpen(false);
        fetchUsers();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update user");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (user: any) => {
    const newStatus = user.tenantStatus === "Inactive" ? "Active" : "Inactive";
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantStatus: newStatus }),
      });
      if (res.ok) {
        toast.success(`User is now ${newStatus === "Active" ? "activated" : "deactivated"}`);
        fetchUsers();
      } else {
        toast.error("Failed to update status");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("User deleted successfully");
        setIsDeleteModalOpen(false);
        fetchUsers();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to delete user");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete user");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#3B82F6]" />
        <p className="text-[#64748B] font-bold text-sm uppercase tracking-wider">Loading user management...</p>
      </div>
    );
  }

  // Calculate stats based on fetched users
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.tenantStatus !== "Inactive").length;
  const inactiveUsers = users.length - activeUsers;
  const adminUsers = users.filter((u) => u.role === "SUPERADMIN").length;

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const formatRole = (role: string) => {
    switch (role) {
      case "SUPERADMIN":
        return "Admin";
      case "OWNER":
        return "Property Owner";
      case "TENANT":
        return "Tenant";
      case "INSPECTOR":
        return "Inspector";
      case "ACCOUNTANT":
        return "Accountant";
      default:
        return role;
    }
  };

  const maskSSN = (ssn?: string) => {
    if (!ssn) return "N/A";
    const cleaned = ssn.replace(/\D/g, "");
    if (cleaned.length >= 4) {
      return `•••-••-${cleaned.slice(-4)}`;
    }
    return "•••-••-••••";
  };

  const maskAccount = (num?: string) => {
    if (!num) return "N/A";
    if (num.length >= 4) {
      return `•••• ${num.slice(-4)}`;
    }
    return "•••• ••••";
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pt-6 pb-20 px-2 sm:px-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight">User Management</h1>
          <p className="text-[#64748B] text-base mt-0.5">Manage system users and their permissions</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={fetchUsers} className="text-[#64748B] hover:bg-[#F8FAFC]">
            <RefreshCw className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            className="border-[#E2E8F0] text-[#0F172A] font-semibold h-11 px-5 rounded-xl flex items-center gap-2"
          >
            <ShieldAlert className="h-4 w-4 text-[#64748B]" /> Manage Roles
          </Button>
          <Link href="/dashboard/admin/users/new">
            <Button className="bg-[#1E293B] hover:bg-[#0F172A] text-white font-semibold rounded-xl flex items-center gap-2 h-11 px-6 shadow-sm">
              <UserPlus className="h-4 w-4" /> Add User
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-semibold text-[#0F172A]">Total Users</p>
              <Users2 className="h-5 w-5 text-[#94A3B8]" />
            </div>
            <p className="text-3xl font-bold text-[#0F172A] mb-1">{totalUsers}</p>
            <p className="text-sm text-[#64748B]">All registered users</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-semibold text-[#0F172A]">Active Users</p>
              <UserCheck className="h-5 w-5 text-[#94A3B8]" />
            </div>
            <p className="text-3xl font-bold text-[#0F172A] mb-1">{activeUsers}</p>
            <p className="text-sm text-[#64748B]">Currently active</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-semibold text-[#0F172A]">Inactive Users</p>
              <UserMinus className="h-5 w-5 text-[#94A3B8]" />
            </div>
            <p className="text-3xl font-bold text-[#0F172A] mb-1">{inactiveUsers}</p>
            <p className="text-sm text-[#64748B]">Deactivated users</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-semibold text-[#0F172A]">Admins</p>
              <ShieldAlert className="h-5 w-5 text-[#94A3B8]" />
            </div>
            <p className="text-3xl font-bold text-[#0F172A] mb-1">{adminUsers}</p>
            <p className="text-sm text-[#64748B]">Admin users</p>
          </CardContent>
        </Card>
      </div>

      {/* Users List Card */}
      <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-[#0F172A]">Users ({totalUsers})</h2>
            <span className="text-xs text-[#64748B] bg-[#F8FAFC] px-2 py-1 rounded-md border border-[#E2E8F0]">
              Showing {filteredUsers.length} users on page 1 of 1
            </span>
          </div>

          <div className="flex items-center gap-3 flex-1 md:justify-end">
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
              <Input
                placeholder="Search users by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-[#F8FAFC] border-[#E2E8F0] h-10 rounded-xl"
              />
            </div>
            <Button
              variant="outline"
              className="border-[#E2E8F0] text-[#0F172A] h-10 rounded-xl shrink-0 gap-2 font-medium"
            >
              <Filter className="h-4 w-4" /> All Roles
            </Button>
            <Button
              variant="outline"
              className="border-[#E2E8F0] text-[#0F172A] h-10 rounded-xl shrink-0 gap-2 font-medium hidden sm:flex"
            >
              <Filter className="h-4 w-4" /> All Status
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[#F8FAFC]">
              <TableRow className="border-[#E2E8F0] hover:bg-transparent">
                <TableHead className="w-12 text-center text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">
                  <input type="checkbox" className="rounded border-gray-300" />
                </TableHead>
                <TableHead className="w-12 text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">#</TableHead>
                <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">User</TableHead>
                <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Role</TableHead>
                <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Contact</TableHead>
                <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Created</TableHead>
                <TableHead className="text-right text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-[#64748B]">
                    No users found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user, idx) => (
                  <TableRow key={user.id} className="border-[#E2E8F0] hover:bg-[#F8FAFC]">
                    <TableCell className="text-center">
                      <input type="checkbox" className="rounded border-gray-300" />
                    </TableCell>
                    <TableCell className="text-[#64748B] text-sm font-medium">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center font-extrabold text-sm shrink-0">
                          {user.name?.charAt(0) || "U"}
                        </div>
                        <div>
                          <p className="font-bold text-[#0F172A]">{user.name || "Unknown User"}</p>
                          <p className="text-xs text-[#64748B]">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-semibold text-[#0F172A]">{formatRole(user.role)}</p>
                    </TableCell>
                    <TableCell>
                      {user.tenantStatus === "Inactive" ? (
                        <Badge className="bg-[#FEE2E2] text-[#EF4444] border-0 rounded-lg px-2.5 py-1 font-bold">
                          Inactive
                        </Badge>
                      ) : (
                        <Badge className="bg-[#DCFCE7] text-[#16A34A] border-0 rounded-lg px-2.5 py-1 font-bold">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-[#64748B]">{user.phone || user.email}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-[#64748B]">
                        {new Date(user.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-8 w-8 p-0 text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#E2E8F0] inline-flex items-center justify-center rounded-lg transition-colors outline-none cursor-pointer">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-48 rounded-xl border-[#E2E8F0] p-1 shadow-lg bg-white"
                        >
                          <DropdownMenuItem
                            onClick={() => handleViewDetails(user.id)}
                            className="cursor-pointer font-semibold text-[#0F172A] rounded-lg gap-2"
                          >
                            <Eye className="h-4 w-4 text-[#94A3B8]" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleOpenEdit(user)}
                            className="cursor-pointer font-semibold text-[#0F172A] rounded-lg gap-2"
                          >
                            <Edit className="h-4 w-4 text-[#94A3B8]" /> Edit User
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(user)}
                            className="cursor-pointer font-semibold text-[#0F172A] rounded-lg gap-2"
                          >
                            {user.tenantStatus === "Inactive" ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-[#16A34A]" /> Activate User
                              </>
                            ) : (
                              <>
                                <Ban className="h-4 w-4 text-[#94A3B8]" /> Deactivate User
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-[#E2E8F0]" />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(user);
                              setIsDeleteModalOpen(true);
                            }}
                            className="cursor-pointer font-semibold text-red-500 rounded-lg hover:text-red-600 focus:text-red-600 focus:bg-red-50 gap-2"
                          >
                            <Trash className="h-4 w-4 text-red-500" /> Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modal 1: View Details */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-2xl bg-white rounded-2xl p-0 border-0 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
          {selectedUser && (
            <>
              <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center font-extrabold text-lg shrink-0">
                    {selectedUser.name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold text-[#0F172A]">
                      {selectedUser.name || "Unknown User"}
                    </DialogTitle>
                    <p className="text-[#64748B] text-xs font-semibold mt-0.5">
                      ID: {selectedUser.id}
                    </p>
                  </div>
                </div>
                <div className="mr-6 flex gap-2">
                  <Badge className="bg-[#E0F2FE] text-[#0369A1] border-0 rounded-lg px-2.5 py-1 font-bold">
                    {formatRole(selectedUser.role)}
                  </Badge>
                  {selectedUser.tenantStatus === "Inactive" ? (
                    <Badge className="bg-[#FEE2E2] text-[#EF4444] border-0 rounded-lg px-2.5 py-1 font-bold">
                      Inactive
                    </Badge>
                  ) : (
                    <Badge className="bg-[#DCFCE7] text-[#16A34A] border-0 rounded-lg px-2.5 py-1 font-bold">
                      Active
                    </Badge>
                  )}
                </div>
              </div>

              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                {/* Contact & General Grid */}
                <div>
                  <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-3">General Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-[#E2E8F0]">
                    <div className="flex items-center gap-2.5 text-sm text-[#0F172A]">
                      <Mail className="h-4.5 w-4.5 text-[#94A3B8]" />
                      <div>
                        <p className="text-xs font-bold text-[#64748B]">Email Address</p>
                        <p className="font-semibold">{selectedUser.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm text-[#0F172A]">
                      <Phone className="h-4.5 w-4.5 text-[#94A3B8]" />
                      <div>
                        <p className="text-xs font-bold text-[#64748B]">Phone Number</p>
                        <p className="font-semibold">{selectedUser.phone || "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm text-[#0F172A]">
                      <Calendar className="h-4.5 w-4.5 text-[#94A3B8]" />
                      <div>
                        <p className="text-xs font-bold text-[#64748B]">Member Since</p>
                        <p className="font-semibold">
                          {new Date(selectedUser.createdAt).toLocaleDateString(undefined, {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm text-[#0F172A]">
                      <DollarSign className="h-4.5 w-4.5 text-[#94A3B8]" />
                      <div>
                        <p className="text-xs font-bold text-[#64748B]">Ledger Balance</p>
                        <p className="font-semibold text-emerald-600">${Number(selectedUser.balance || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bank / Payout details */}
                <div>
                  <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-3">Bank Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-[#E2E8F0] text-sm text-[#0F172A]">
                    <div>
                      <p className="text-xs font-bold text-[#64748B]">Bank Name</p>
                      <p className="font-semibold mt-0.5">{selectedUser.bankName || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#64748B]">Account Holder</p>
                      <p className="font-semibold mt-0.5">{selectedUser.accountName || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#64748B]">Account Number</p>
                      <p className="font-semibold mt-0.5">{maskAccount(selectedUser.accountNumber)}</p>
                    </div>
                  </div>
                </div>

                {/* Role Specific Section */}
                {selectedUser.role === "TENANT" && (
                  <>
                    <hr className="border-[#E2E8F0]" />
                    {/* Employment / Background */}
                    <div>
                      <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-3">Tenant Profile Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-[#E2E8F0] text-sm text-[#0F172A]">
                        <div>
                          <p className="text-xs font-bold text-[#64748B]">Date of Birth</p>
                          <p className="font-semibold mt-0.5">{selectedUser.dob || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#64748B]">SSN (Masked)</p>
                          <p className="font-semibold mt-0.5">{maskSSN(selectedUser.ssn)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#64748B]">Credit Score</p>
                          <p className="font-semibold mt-0.5 text-indigo-600">{selectedUser.creditScore || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#64748B]">Employer & Position</p>
                          <p className="font-semibold mt-0.5">
                            {selectedUser.employer ? `${selectedUser.employer} (${selectedUser.position || "N/A"})` : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#64748B]">Annual Income</p>
                          <p className="font-semibold mt-0.5 text-emerald-600">
                            {selectedUser.annualIncome ? `$${Number(selectedUser.annualIncome).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#64748B]">Preferred Move-In</p>
                          <p className="font-semibold mt-0.5">{selectedUser.targetMoveInDate || "N/A"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Emergency Contact */}
                    <div>
                      <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-3">Emergency Contact</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-[#E2E8F0] text-sm text-[#0F172A]">
                        <div>
                          <p className="text-xs font-bold text-[#64748B]">Name & Relationship</p>
                          <p className="font-semibold mt-0.5">
                            {selectedUser.emergencyName ? `${selectedUser.emergencyName} (${selectedUser.emergencyRelationship || "N/A"})` : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#64748B]">Contact Info</p>
                          <p className="font-semibold mt-0.5 text-slate-500">
                            {selectedUser.emergencyPhone || ""} {selectedUser.emergencyEmail ? `| ${selectedUser.emergencyEmail}` : ""}
                            {!selectedUser.emergencyPhone && !selectedUser.emergencyEmail && "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Associated Leases */}
                    <div>
                      <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-3">Lease Agreements</h3>
                      {selectedUser.leases && selectedUser.leases.length > 0 ? (
                        <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                          <table className="w-full text-left border-collapse text-sm">
                            <thead>
                              <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                                <th className="p-3 font-bold text-[#64748B]">Property & Unit</th>
                                <th className="p-3 font-bold text-[#64748B]">Start / End Date</th>
                                <th className="p-3 font-bold text-[#64748B]">Monthly Rent</th>
                                <th className="p-3 font-bold text-[#64748B]">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedUser.leases.map((lease: any) => (
                                <tr key={lease.id} className="border-b border-[#E2E8F0] last:border-b-0 hover:bg-slate-50">
                                  <td className="p-3 font-semibold">
                                    <p className="text-[#0F172A]">{lease.unit?.property?.name || "Unknown Property"}</p>
                                    <p className="text-xs text-[#64748B]">Unit {lease.unit?.name || "N/A"}</p>
                                  </td>
                                  <td className="p-3 text-slate-500 text-xs font-medium">
                                    {new Date(lease.startDate).toLocaleDateString()} - {new Date(lease.endDate).toLocaleDateString()}
                                  </td>
                                  <td className="p-3 font-bold text-[#0F172A]">
                                    ${Number(lease.monthlyRent).toLocaleString()}
                                  </td>
                                  <td className="p-3">
                                    <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-md ${
                                      lease.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                                      lease.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                                      "bg-gray-100 text-gray-700"
                                    }`}>
                                      {lease.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-[#64748B] italic">No lease records associated with this tenant.</p>
                      )}
                    </div>
                  </>
                )}

                {selectedUser.role === "OWNER" && (
                  <>
                    <hr className="border-[#E2E8F0]" />
                    {/* Owned Properties */}
                    <div>
                      <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-3">Owned Properties</h3>
                      {selectedUser.ownedProperties && selectedUser.ownedProperties.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {selectedUser.ownedProperties.map((prop: any) => (
                            <div
                              key={prop.id}
                              className="border border-[#E2E8F0] p-4 rounded-xl flex items-start gap-3 bg-slate-50 hover:bg-slate-100/70 transition-all cursor-pointer"
                              onClick={() => router.push(`/dashboard/properties/${prop.id}`)}
                            >
                              <Building className="h-5 w-5 text-[#3B82F6] shrink-0 mt-0.5" />
                              <div>
                                <p className="font-bold text-[#0F172A]">{prop.name}</p>
                                <p className="text-xs text-[#64748B] mt-0.5">{prop.address}</p>
                                <p className="text-xs text-[#94A3B8]">{prop.city}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[#64748B] italic">No properties registered under this owner.</p>
                      )}
                    </div>
                  </>
                )}

                {selectedUser.notes && (
                  <>
                    <hr className="border-[#E2E8F0]" />
                    <div>
                      <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Internal Admin Notes</h3>
                      <div className="bg-amber-50/50 border border-amber-200/50 rounded-xl p-4 text-sm text-[#0F172A] italic">
                        {selectedUser.notes}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="p-6 border-t border-[#E2E8F0] bg-slate-50 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-xl h-11 font-bold px-6 border-[#E2E8F0] text-[#0F172A] hover:bg-slate-100"
                >
                  Close Profile
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal 2: Edit User */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-0 border-0 shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <DialogTitle className="text-xl font-bold text-[#0F172A]">Edit User Details</DialogTitle>
          </div>

          <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0F172A] uppercase">Full Name</label>
              <Input
                required
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="h-11 rounded-xl bg-white border-[#E2E8F0] focus-visible:ring-[#3B82F6] font-semibold text-[#0F172A]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0F172A] uppercase">Email Address</label>
              <Input
                required
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                className="h-11 rounded-xl bg-white border-[#E2E8F0] focus-visible:ring-[#3B82F6] font-semibold text-[#0F172A]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0F172A] uppercase">Phone Number</label>
              <Input
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                className="h-11 rounded-xl bg-white border-[#E2E8F0] focus-visible:ring-[#3B82F6] font-semibold text-[#0F172A]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0F172A] uppercase">System Role</label>
                <select
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                  className="w-full h-11 bg-white border border-[#E2E8F0] rounded-xl px-4 text-sm font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#3B82F6]"
                >
                  <option value="TENANT">Tenant</option>
                  <option value="OWNER">Property Owner</option>
                  <option value="INSPECTOR">Inspector</option>
                  <option value="ACCOUNTANT">Accountant</option>
                  <option value="SUPERADMIN">Admin</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0F172A] uppercase">Account Status</label>
                <select
                  value={editFormData.tenantStatus}
                  onChange={(e) => setEditFormData({ ...editFormData, tenantStatus: e.target.value })}
                  className="w-full h-11 bg-white border border-[#E2E8F0] rounded-xl px-4 text-sm font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#3B82F6]"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Pending Review">Pending Review</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-[#F1F5F9] mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-xl h-11 font-bold px-6 border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={actionLoading}
                className="rounded-xl h-11 font-bold px-6 bg-[#3B82F6] hover:bg-[#2563EB] text-white flex items-center gap-2"
              >
                {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Delete Confirmation */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-0 border-0 shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-[#E2E8F0] bg-[#FFF5F5] flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
              <Trash className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-red-950">Delete User Account</DialogTitle>
              <DialogDescription className="text-red-700/80 text-xs font-semibold mt-0.5">
                This operation is destructive and cannot be undone.
              </DialogDescription>
            </div>
          </div>

          <div className="p-6">
            <p className="text-sm font-semibold text-[#0F172A] mb-4">
              Are you sure you want to permanently delete the account for{" "}
              <span className="font-extrabold text-[#3B82F6]">
                {selectedUser?.name || selectedUser?.email}
              </span>
              ?
            </p>
            <p className="text-xs text-[#64748B] leading-relaxed mb-6 bg-slate-50 p-3 rounded-lg border border-[#E2E8F0]">
              If this user has active leases, payments, or properties, deleting them will be prevented to avoid breaking database relationships. Consider deactivating their account instead to remove their login access.
            </p>

            <DialogFooter className="pt-4 border-t border-[#F1F5F9] gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-xl h-11 font-bold px-6 border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteUser}
                disabled={actionLoading}
                className="rounded-xl h-11 font-bold px-6 bg-red-500 hover:bg-red-600 text-white flex items-center gap-2"
              >
                {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete User
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
