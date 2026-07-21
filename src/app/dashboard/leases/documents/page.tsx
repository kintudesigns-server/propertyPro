"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  FileText, Search, Plus, Loader2, RefreshCw, MoreHorizontal, 
  Eye, Download, Building2, Calendar, Tag, X, Folder, Upload, Check 
} from "lucide-react";
import { toast } from "sonner";

export default function TenantDocumentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [documents, setDocuments] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  // Upload Form States
  const [uploadType, setUploadType] = useState("Lease");
  const [uploadCategory, setUploadCategory] = useState("GENERAL");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadTags, setUploadTags] = useState("");
  const [uploadPropertyId, setUploadPropertyId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadSubmitting, setUploadSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter States
  const [docSearch, setDocSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [filterProperty, setFilterProperty] = useState("ALL");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Active Action Menu state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Fetch Documents and Leases
  const fetchData = async () => {
    setLoading(true);
    try {
      const docRes = await fetch("/api/documents");
      if (docRes.ok) {
        setDocuments(await docRes.json());
      }
      
      const leaseRes = await fetch("/api/leases");
      if (leaseRes.ok) {
        const leaseData = await leaseRes.json();
        setLeases(leaseData);
        
        // Auto-select first property if available
        const properties = leaseData.map((l: any) => l.unit?.property).filter(Boolean);
        if (properties.length > 0 && !uploadPropertyId) {
          setUploadPropertyId(properties[0].id);
        }
      }
    } catch (err) {
      toast.error("Failed to load document vault data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }

    const role = (session?.user as any)?.role;
    if (role && role !== "TENANT") {
      router.push("/dashboard/leases");
      return;
    }

    fetchData();
  }, [status, session, router]);

  // Handle outside clicks for Actions menu
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Compute Unique Properties for Dropdown
  const uniqueProperties = Array.from(
    new Map(
      leases
        .map((l: any) => l.unit?.property)
        .filter(Boolean)
        .map((p: any) => [p.id, p])
    ).values()
  );

  // File drag-and-drop helpers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Submit file upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please select a file to upload.");
      return;
    }

    setUploadSubmitting(true);
    try {
      // 1. Upload to Cloudinary via local helper API
      const formData = new FormData();
      formData.append("file", selectedFile);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error("File upload failed. Please try again.");
      }

      const { url } = await uploadRes.json();

      // Format size
      const sizeInMB = selectedFile.size / (1024 * 1024);
      const fileSizeStr = sizeInMB >= 1 
        ? `${sizeInMB.toFixed(1)} MB` 
        : `${(selectedFile.size / 1024).toFixed(0)} KB`;

      // Parse tags
      const tagsArray = uploadTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      // 2. Save document record
      const docRes = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedFile.name,
          url,
          category: uploadCategory,
          type: uploadType,
          description: uploadDescription,
          tags: tagsArray,
          fileSize: fileSizeStr,
          propertyId: uploadPropertyId || null,
        }),
      });

      if (docRes.ok) {
        toast.success("Document uploaded successfully.");
        setUploadOpen(false);
        setSelectedFile(null);
        setUploadDescription("");
        setUploadTags("");
        fetchData();
      } else {
        throw new Error("Failed to register document database record.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error occurred during upload.");
    } finally {
      setUploadSubmitting(false);
    }
  };

  // Download document helper
  const handleDownload = async (doc: any) => {
    toast.info(`Preparing ${doc.name} for download...`);
    try {
      const response = await fetch(doc.url);
      if (!response.ok) throw new Error("CORS or network error");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success("Download complete.");
    } catch {
      // Fallback
      window.open(doc.url, "_blank");
      toast.success("Document opened in new tab for download.");
    }
  };

  if (status === "loading" || (loading && documents.length === 0)) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#007AFF]" />
        <p className="text-[#8E8E93] font-extrabold text-sm uppercase tracking-wider">Syncing document vault...</p>
      </div>
    );
  }

  // Filter Logic
  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(docSearch.toLowerCase()) || 
      (doc.description && doc.description.toLowerCase().includes(docSearch.toLowerCase())) ||
      (doc.tags && doc.tags.some((t: string) => t.toLowerCase().includes(docSearch.toLowerCase())));
      
    const matchesCategory = filterCategory === "ALL" || doc.category === filterCategory;
    const matchesType = filterType === "ALL" || doc.type === filterType;
    const matchesProperty = filterProperty === "ALL" || doc.propertyId === filterProperty;

    return matchesSearch && matchesCategory && matchesType && matchesProperty;
  });

  // Dynamic Metrics Calculation
  const totalDocsCount = documents.length;
  const filteredDocsCount = filteredDocs.length;
  const uniqueCategoriesCount = Array.from(new Set(documents.map((d) => d.category))).length;
  
  // Calculate total size in MB
  const totalBytes = documents.reduce((acc, doc) => {
    if (!doc.fileSize) return acc;
    const val = parseFloat(doc.fileSize);
    if (isNaN(val)) return acc;
    if (doc.fileSize.toUpperCase().includes("MB")) {
      return acc + val * 1024 * 1024;
    } else if (doc.fileSize.toUpperCase().includes("KB")) {
      return acc + val * 1024;
    }
    return acc;
  }, 0);
  const totalSizeMB = (totalBytes / (1024 * 1024)).toFixed(1);

  // Recent Uploads (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentUploadsCount = documents.filter((d) => new Date(d.uploadedAt) >= thirtyDaysAgo).length;

  // Pagination Logic
  const totalPages = Math.ceil(filteredDocsCount / pageSize);
  const paginatedDocs = filteredDocs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Category Tailwind Badges mapping
  const categoryColors: Record<string, string> = {
    LEASE: "bg-blue-50 text-blue-700 border-blue-200",
    PAYMENTS: "bg-emerald-50 text-emerald-700 border-emerald-200",
    MAINTENANCE: "bg-amber-50 text-amber-700 border-amber-200",
    INSURANCE: "bg-purple-50 text-purple-700 border-purple-200",
    IDENTIFICATION: "bg-indigo-50 text-indigo-700 border-indigo-200",
    NOTICES: "bg-rose-50 text-rose-700 border-rose-200",
    GENERAL: "bg-slate-50 text-slate-700 border-slate-200",
  };

  return (
    <div className="w-full max-w-7xl mx-auto pt-6 space-y-6 pb-20 px-4 md:px-0">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Documents</h1>
            <p className="text-[#6E6E73] text-sm mt-0.5">Access and manage your lease-related documents</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={fetchData}
            className="flex items-center justify-center gap-2 h-11 px-4 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-[#F5F5F7] transition-colors shadow-sm w-full sm:w-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center justify-center gap-2 h-11 px-4 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Upload Document
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Documents */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-start">
          <div className="space-y-1.5">
            <p className="text-[#6E6E73] text-sm font-medium">Total Documents</p>
            <h3 className="text-3xl font-bold text-slate-900">{totalDocsCount}</h3>
            <p className="text-[#8E8E93] text-xs">{totalSizeMB} MB total size</p>
          </div>
          <div className="p-2 bg-blue-50 text-blue-500 rounded-xl">
            <FileText className="h-5 w-5" />
          </div>
        </div>

        {/* Filtered Results */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-start">
          <div className="space-y-1.5">
            <p className="text-[#6E6E73] text-sm font-medium">Filtered Results</p>
            <h3 className="text-3xl font-bold text-slate-900">{filteredDocsCount}</h3>
            <p className="text-[#8E8E93] text-xs">Matching your current filters</p>
          </div>
          <div className="p-2 bg-cyan-50 text-cyan-500 rounded-xl">
            <Search className="h-5 w-5" />
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-start">
          <div className="space-y-1.5">
            <p className="text-[#6E6E73] text-sm font-medium">Categories</p>
            <h3 className="text-3xl font-bold text-slate-900">{uniqueCategoriesCount}</h3>
            <p className="text-[#8E8E93] text-xs">Available document categories</p>
          </div>
          <div className="p-2 bg-amber-50 text-amber-500 rounded-xl">
            <Folder className="h-5 w-5" />
          </div>
        </div>

        {/* Recent Uploads */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-start">
          <div className="space-y-1.5">
            <p className="text-[#6E6E73] text-sm font-medium">Recent Uploads</p>
            <h3 className="text-3xl font-bold text-slate-900">{recentUploadsCount}</h3>
            <p className="text-[#8E8E93] text-xs">Last 30 days</p>
          </div>
          <div className="p-2 bg-emerald-50 text-emerald-500 rounded-xl">
            <Upload className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter and Table Card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Documents</h2>
            <p className="text-[#8E8E93] text-xs mt-0.5">Access and manage all your lease-related documents</p>
          </div>
          {/* Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:flex gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#8E8E93] pointer-events-none">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search documents..."
                value={docSearch}
                onChange={(e) => {
                  setDocSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-10 pl-10 pr-4 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-400 text-slate-800"
              />
            </div>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 px-4 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700"
            >
              <option value="ALL">All Categories</option>
              <option value="LEASE">Lease</option>
              <option value="PAYMENTS">Payments</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="INSURANCE">Insurance</option>
              <option value="IDENTIFICATION">Identification</option>
              <option value="NOTICES">Notices</option>
              <option value="GENERAL">General</option>
            </select>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 px-4 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700"
            >
              <option value="ALL">All Types</option>
              <option value="Lease">Lease</option>
              <option value="Notice">Notice</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Insurance">Insurance</option>
              <option value="Identification">Identification</option>
              <option value="Income">Income</option>
              <option value="Inspection">Inspection</option>
              <option value="Receipt">Receipt</option>
              <option value="Other">Other</option>
            </select>

            {/* Property Filter */}
            <select
              value={filterProperty}
              onChange={(e) => {
                setFilterProperty(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 px-4 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700"
            >
              <option value="ALL">All Properties</option>
              {uniqueProperties.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Documents count and subtext */}
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-800">Documents ({filteredDocsCount})</h4>
          <p className="text-[#8E8E93] text-xs">Access and manage all your lease-related documents</p>
        </div>

        {/* Table Container */}
        <div className="overflow-hidden border border-slate-100 rounded-2xl">
          <table className="w-full border-collapse text-left text-sm text-[#6E6E73]">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-[#8E8E93] font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th scope="col" className="px-6 py-4">Document</th>
                <th scope="col" className="px-6 py-4">Type</th>
                <th scope="col" className="px-6 py-4">Property</th>
                <th scope="col" className="px-6 py-4">Upload Date</th>
                <th scope="col" className="px-6 py-4">Size</th>
                <th scope="col" className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {paginatedDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-[#8E8E93] italic">
                    No documents found matching the current criteria.
                  </td>
                </tr>
              ) : (
                paginatedDocs.map((doc) => {
                  const catClass = categoryColors[doc.category] || "bg-slate-50 text-slate-700 border-slate-200";
                  const formattedDate = new Date(doc.uploadedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                  });

                  return (
                    <tr key={doc.id} className="hover:bg-[#F5F5F7]/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 flex items-start gap-3">
                        <div className="p-2 bg-blue-50 text-blue-500 rounded-lg mt-0.5 shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="truncate">{doc.name}</span>
                          {doc.description && (
                            <span className="text-[11px] text-[#8E8E93] font-normal mt-0.5 truncate max-w-xs md:max-w-md">
                              {doc.description}
                            </span>
                          )}
                          {doc.tags && doc.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {doc.tags.map((t: string, idx: number) => (
                                <span key={idx} className="inline-flex items-center text-[9px] bg-slate-100 text-[#6E6E73] px-1.5 py-0.5 rounded-full font-medium">
                                  <Tag className="h-2 w-2 mr-0.5" />
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${catClass}`}>
                          {doc.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-[#6E6E73]">
                          <Building2 className="h-3.5 w-3.5 text-[#8E8E93]" />
                          <span>{doc.property?.name || "—"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-[#6E6E73]">
                          <Calendar className="h-3.5 w-3.5 text-[#8E8E93]" />
                          <span>{formattedDate}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#6E6E73] font-medium">
                        {doc.fileSize || "1.0 MB"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="relative inline-block text-left" ref={activeMenuId === doc.id ? actionMenuRef : null}>
                          <button
                            onClick={() => setActiveMenuId(activeMenuId === doc.id ? null : doc.id)}
                            className="p-1 text-[#8E8E93] hover:text-slate-700 hover:bg-[#F5F5F7] rounded-lg transition-colors border-0 bg-transparent"
                          >
                            <MoreHorizontal className="h-5 w-5" />
                          </button>

                          {activeMenuId === doc.id && (
                            <div className="absolute right-0 mt-1 z-50 w-36 bg-white rounded-xl border border-slate-100 shadow-lg py-1">
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setPreviewDoc(doc);
                                }}
                                className="w-full px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-[#F5F5F7] flex items-center gap-2 border-0 bg-transparent text-left"
                              >
                                <Eye className="h-3.5 w-3.5 text-blue-500" />
                                Preview
                              </button>
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  handleDownload(doc);
                                }}
                                className="w-full px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-[#F5F5F7] flex items-center gap-2 border-0 bg-transparent text-left"
                              >
                                <Download className="h-3.5 w-3.5 text-emerald-500" />
                                Download
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Container */}
        {filteredDocsCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#6E6E73]">
                Showing {Math.min(filteredDocsCount, (currentPage - 1) * pageSize + 1)}-{Math.min(filteredDocsCount, currentPage * pageSize)} of {filteredDocsCount}
              </span>
              <div className="flex items-center gap-1.5">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none text-[#6E6E73]"
                >
                  <option value="12">12</option>
                  <option value="24">24</option>
                  <option value="36">36</option>
                  <option value="48">48</option>
                </select>
                <span className="text-xs text-[#8E8E93]">per page</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="px-3 h-9 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-[#F5F5F7] disabled:opacity-50 disabled:pointer-events-none transition-colors border-0"
              >
                &lt; Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  onClick={() => setCurrentPage(pg)}
                  className={`px-3 h-9 text-xs font-semibold rounded-lg transition-colors border-0 ${
                    currentPage === pg 
                      ? "bg-blue-600 text-white" 
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-[#F5F5F7]"
                  }`}
                >
                  {pg}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="px-3 h-9 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-[#F5F5F7] disabled:opacity-50 disabled:pointer-events-none transition-colors border-0"
              >
                Next &gt;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Document Modal */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">Upload Documents</h3>
                <p className="text-[11px] text-[#8E8E93] mt-0.5">
                  Select up to 5 files. Supported types: PDF, DOC, DOCX, JPG, PNG, TXT.
                </p>
              </div>
              <button
                onClick={() => {
                  setUploadOpen(false);
                  setSelectedFile(null);
                }}
                className="p-1.5 hover:bg-[#F2F2F7] rounded-lg text-[#8E8E93] hover:text-[#6E6E73] transition-colors border-0 bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUploadSubmit} className="flex-1 flex flex-col overflow-hidden min-h-0">
              {/* Scrollable Fields */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                {/* Document Type Select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Document Type</label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value)}
                    className="w-full h-10 px-3.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800"
                  >
                    <option value="Lease">Lease</option>
                    <option value="Notice">Notice</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Identification">Identification</option>
                    <option value="Income">Income</option>
                    <option value="Inspection">Inspection</option>
                    <option value="Receipt">Receipt</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Category Select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Category</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full h-10 px-3.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800"
                  >
                    <option value="GENERAL">General</option>
                    <option value="LEASE">Lease</option>
                    <option value="PAYMENTS">Payments</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="INSURANCE">Insurance</option>
                    <option value="IDENTIFICATION">Identification</option>
                    <option value="NOTICES">Notices</option>
                  </select>
                </div>

                {/* Associated Property (Optional) */}
                {uniqueProperties.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Property</label>
                    <select
                      value={uploadPropertyId}
                      onChange={(e) => setUploadPropertyId(e.target.value)}
                      className="w-full h-10 px-3.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800"
                    >
                      {uniqueProperties.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Description Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Description (optional)</label>
                  <textarea
                    placeholder="Add a short description for these files"
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    rows={2}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-400 text-slate-800 resize-none"
                  />
                </div>

                {/* Tags Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Tags (optional)</label>
                  <input
                    type="text"
                    placeholder="Enter comma-separated tags, e.g. lease, renewal"
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                    className="w-full h-10 px-3.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-400 text-slate-800"
                  />
                </div>

                {/* Dropzone File Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Files</label>
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center cursor-pointer hover:bg-[#F5F5F7]/50 hover:border-blue-500 transition-colors flex flex-col items-center justify-center gap-2 group"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                    />
                    {selectedFile ? (
                      <div className="w-full flex items-center justify-between bg-blue-50/50 px-4 py-3 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 bg-blue-100/75 text-blue-600 rounded-lg">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="text-left min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate max-w-[200px]">
                              {selectedFile.name}
                            </p>
                            <p className="text-[10px] text-[#8E8E93]">
                              {(selectedFile.size / 1024).toFixed(0)} KB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                          }}
                          className="p-1 bg-white hover:bg-red-50 text-[#8E8E93] hover:text-red-500 rounded-lg border border-slate-200 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="p-3 bg-slate-50 text-[#8E8E93] group-hover:text-blue-500 group-hover:bg-blue-50 rounded-2xl transition-colors">
                          <Upload className="h-6 w-6" />
                        </div>
                        <p className="text-xs text-[#6E6E73] font-semibold mt-1">
                          Drag and drop files here, or <span className="text-blue-600">browse files</span>
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Fixed Footer Buttons */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setUploadOpen(false);
                    setSelectedFile(null);
                  }}
                  className="h-10 px-4 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-[#F5F5F7] transition-colors border-0"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadSubmitting || !selectedFile}
                  className="h-10 px-5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 disabled:pointer-events-none transition-colors border-0 flex items-center gap-1.5"
                >
                  {uploadSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {uploadSubmitting ? "Uploading..." : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">Document Preview</h3>
                <p className="text-[11px] text-[#8E8E93] mt-0.5">
                  {previewDoc.description || "lease document"}
                </p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 hover:bg-[#F2F2F7] rounded-lg text-[#8E8E93] hover:text-[#6E6E73] transition-colors border-0 bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 min-h-0">
              {/* File details card */}
              <div className="bg-slate-50/75 border border-slate-100 p-5 rounded-2xl space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-sm font-bold text-slate-800 break-all leading-tight">
                    {previewDoc.name}
                  </h4>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {previewDoc.type}
                  </span>
                </div>

                {/* Details list */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center gap-2 text-[#6E6E73]">
                    <Building2 className="h-4 w-4 text-[#8E8E93] shrink-0" />
                    <span className="truncate">{previewDoc.property?.name || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#6E6E73]">
                    <Calendar className="h-4 w-4 text-[#8E8E93] shrink-0" />
                    <span>
                      {new Date(previewDoc.uploadedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[#6E6E73]">
                    <FileText className="h-4 w-4 text-[#8E8E93] shrink-0" />
                    <span>{previewDoc.fileSize || "1.0 MB"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#6E6E73]">
                    <Check className="h-4 w-4 text-[#8E8E93] shrink-0" />
                    <span>Status: Active</span>
                  </div>
                </div>
              </div>

              {/* Tags panel if exists */}
              {previewDoc.tags && previewDoc.tags.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {previewDoc.tags.map((t: string, idx: number) => (
                      <span key={idx} className="inline-flex items-center text-[10px] bg-slate-100 text-[#6E6E73] px-2.5 py-0.5 rounded-full font-medium">
                        <Tag className="h-2.5 w-2.5 mr-1 text-[#8E8E93]" />
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Fixed Footer Buttons */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
              <button
                onClick={() => {
                  window.open(previewDoc.url, "_blank");
                }}
                className="h-10 px-4 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-[#F5F5F7] transition-colors border-0 flex items-center gap-1.5"
              >
                <Eye className="h-3.5 w-3.5" />
                Open Document
              </button>
              <button
                onClick={() => {
                  handleDownload(previewDoc);
                }}
                className="h-10 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors border-0 flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </button>
              <button
                onClick={() => setPreviewDoc(null)}
                className="h-10 px-4 text-xs font-bold text-[#6E6E73] bg-transparent rounded-xl hover:bg-[#F5F5F7] transition-colors border-0"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
