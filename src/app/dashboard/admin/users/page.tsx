"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/KpiCard";
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
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals & Selected state
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
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

  const handleViewDetails = (userId: string) => {
    router.push(`/dashboard/admin/users/${userId}`);
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

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    const matchesStatus = statusFilter === "ALL" || u.tenantStatus === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

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
        <KpiCard
          title="Total Users"
          value={totalUsers}
          subtext="All registered users"
          icon={Users2}
          variant="blue"
        />
        <KpiCard
          title="Active Users"
          value={activeUsers}
          subtext="Currently active"
          icon={UserCheck}
          variant="green"
        />
        <KpiCard
          title="Inactive Users"
          value={inactiveUsers}
          subtext="Deactivated users"
          icon={UserMinus}
          variant="red"
        />
        <KpiCard
          title="Admins"
          value={adminUsers}
          subtext="System administrators"
          icon={ShieldAlert}
          variant="orange"
        />
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
            <DropdownMenu>
              <DropdownMenuTrigger className="border-[#E2E8F0] text-[#0F172A] h-10 rounded-xl shrink-0 gap-2 font-medium inline-flex items-center justify-center text-sm px-4 py-2 border hover:bg-slate-50 transition-colors bg-white">
                <Filter className="h-4 w-4" /> {roleFilter === "ALL" ? "All Roles" : formatRole(roleFilter)}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl bg-white border-[#E2E8F0] shadow-lg p-1">
                <DropdownMenuItem onClick={() => setRoleFilter("ALL")} className="cursor-pointer rounded-lg font-semibold text-[#0F172A]">All Roles</DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#E2E8F0]" />
                <DropdownMenuItem onClick={() => setRoleFilter("SUPERADMIN")} className="cursor-pointer rounded-lg font-semibold text-[#0F172A]">Admin</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRoleFilter("OWNER")} className="cursor-pointer rounded-lg font-semibold text-[#0F172A]">Property Owner</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRoleFilter("TENANT")} className="cursor-pointer rounded-lg font-semibold text-[#0F172A]">Tenant</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRoleFilter("INSPECTOR")} className="cursor-pointer rounded-lg font-semibold text-[#0F172A]">Inspector</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className="border-[#E2E8F0] text-[#0F172A] h-10 rounded-xl shrink-0 gap-2 font-medium hidden sm:inline-flex items-center justify-center text-sm px-4 py-2 border hover:bg-slate-50 transition-colors bg-white">
                <Filter className="h-4 w-4" /> {statusFilter === "ALL" ? "All Status" : statusFilter}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-xl bg-white border-[#E2E8F0] shadow-lg p-1">
                <DropdownMenuItem onClick={() => setStatusFilter("ALL")} className="cursor-pointer rounded-lg font-semibold text-[#0F172A]">All Status</DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#E2E8F0]" />
                <DropdownMenuItem onClick={() => setStatusFilter("Active")} className="cursor-pointer rounded-lg font-semibold text-[#16A34A]"><CheckCircle2 className="h-4 w-4 mr-2" /> Active</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("Inactive")} className="cursor-pointer rounded-lg font-semibold text-[#EF4444]"><Ban className="h-4 w-4 mr-2" /> Inactive</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                  <TableRow key={user.id} className="border-[#E2E8F0] hover:bg-blue-50/50 transition-colors group">
                    <TableCell className="text-center">
                      <input type="checkbox" className="rounded border-gray-300" />
                    </TableCell>
                    <TableCell className="text-[#64748B] text-sm font-bold">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-md">
                          {user.name?.charAt(0) || "U"}
                        </div>
                        <div>
                          <p className="font-extrabold text-[#0F172A] group-hover:text-blue-600 transition-colors cursor-pointer" onClick={() => handleViewDetails(user.id)}>{user.name || "Unknown User"}</p>
                          <p className="text-xs font-medium text-[#64748B]">{user.email}</p>
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
