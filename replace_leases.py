import re
import sys

def main():
    try:
        with open(r'c:\PropertyPro\src\app\dashboard\owner\page.tsx', 'r', encoding='utf-8') as f:
            content = f.read()

        leases_tab_start = content.find('{/* Leases Tab */}')
        maintenance_tab_start = content.find('{/* Maintenance Tab */}')

        if leases_tab_start == -1 or maintenance_tab_start == -1:
            print("Could not find boundaries")
            return

        new_content = content[:leases_tab_start] + """{/* Leases Tab */}
          <TabsContent value="leases" className="space-y-6 outline-none">
            {leaseSubTab === "new" ? (
              <div className="max-w-4xl mx-auto pb-12">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm sticky top-0 z-10 mb-8">
                  <div className="flex items-center gap-4">
                    <Button type="button" variant="ghost" size="icon" onClick={() => setLeaseSubTab("all")} className="h-10 w-10 rounded-xl bg-slate-50 text-slate-500 hover:text-slate-900 shrink-0">
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Create New Lease</h2>
                      <p className="text-sm text-slate-500 mt-1">Set up a new lease with tenant, dates, and financial terms</p>
                    </div>
                  </div>
                  <div className="flex gap-3 w-full sm:w-auto">
                    <Button type="button" variant="outline" onClick={() => setLeaseSubTab("all")} className="w-full sm:w-auto rounded-full px-5 h-10 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-sm">Cancel</Button>
                  </div>
                </div>

                <form onSubmit={handleAddLease} className="space-y-6">
                  {/* Property & Tenant Section */}
                  <div className="bg-white p-8 rounded-[28px] shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2"><Building2 className="h-5 w-5 text-slate-400" /> Property & Tenant</h3>
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
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                          <Input type="email" placeholder="tenant@example.com" value={lEmail} onChange={e => setLEmail(e.target.value)} required className="pl-10 bg-slate-50 border-slate-200 rounded-xl h-12 font-medium" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lease Dates */}
                  <div className="bg-white p-8 rounded-[28px] shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2"><Calendar className="h-5 w-5 text-slate-400" /> Lease Dates</h3>
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
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2"><DollarSign className="h-5 w-5 text-slate-400" /> Financial Terms</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">Monthly Rent *</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                          <Input type="number" placeholder="1500" value={lRent} onChange={e => setLRent(e.target.value)} required className="pl-10 bg-slate-50 border-slate-200 rounded-xl h-12 font-medium text-slate-900" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">Security Deposit</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
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
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-slate-400" /> Late Fee Rules</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">Late Fee Amount</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
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

                  <div className="bg-slate-50 p-6 rounded-[28px] flex items-center gap-4 text-slate-600 border border-slate-100">
                    <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <p className="text-sm">Invoices will be automatically generated for this lease including monthly rent payments.</p>
                  </div>

                  <div className="flex justify-end gap-3 pt-6">
                    <Button type="button" variant="outline" className="rounded-full px-8 h-12 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold">Reset Form</Button>
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
                    <p className="text-sm text-slate-500 mt-0.5">Manage tenant lease agreements across your portfolio</p>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={fetchOwnerData} variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-full px-4 h-10 text-xs font-bold">↻ Refresh</Button>
                    <Button onClick={() => setLeaseSubTab("new")} className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-5 h-10 text-xs font-bold flex items-center gap-1.5 shadow-sm">
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
                          <p className="text-[11px] text-slate-500 font-bold uppercase">{s.label}</p>
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
                                  ? "bg-slate-900 text-white border-slate-900"
                                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm"
                              }`}
                            >
                              {tab.label}
                              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${leaseSubTab === tab.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                                {tab.count}
                              </span>
                            </button>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <Button variant={leaseViewLayout === "list" ? "default" : "outline"} size="icon" onClick={() => setLeaseViewLayout("list")} className={`h-9 w-9 rounded-lg ${leaseViewLayout === "list" ? "bg-slate-900 text-white" : "text-slate-500 border-slate-200 bg-white shadow-sm"}`}>
                            <List className="h-4 w-4" />
                          </Button>
                          <Button variant={leaseViewLayout === "grid" ? "default" : "outline"} size="icon" onClick={() => setLeaseViewLayout("grid")} className={`h-9 w-9 rounded-lg ${leaseViewLayout === "grid" ? "bg-slate-900 text-white" : "text-slate-500 border-slate-200 bg-white shadow-sm"}`}>
                            <LayoutGrid className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Filter Bar */}
                      <div className="bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative w-full sm:w-80">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
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
                          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20 text-slate-400" />
                          <p className="font-bold text-sm text-slate-900">No leases found</p>
                          <p className="text-xs mt-1 font-medium text-slate-500">Create a lease to link a tenant to one of your units</p>
                          <Button onClick={() => setLeaseSubTab("new")} className="mt-5 bg-slate-900 hover:bg-slate-800 text-white rounded-full px-5 h-10 text-xs font-bold shadow-sm">
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
                                      <TableHead className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider pl-6">Property & Unit</TableHead>
                                      <TableHead className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">Tenant</TableHead>
                                      <TableHead className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">Status</TableHead>
                                      <TableHead className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">Rent Amount</TableHead>
                                      <TableHead className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">Start Date</TableHead>
                                      <TableHead className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">End Date</TableHead>
                                      <TableHead className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">Days Remaining</TableHead>
                                      <TableHead className="text-right text-slate-400 font-extrabold text-[10px] uppercase tracking-wider pr-6">Actions</TableHead>
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
                                        : "text-slate-600 border-slate-200";

                                      return (
                                        <TableRow key={l.id} className="border-slate-100 hover:bg-slate-50 transition-colors group h-16">
                                          <TableCell className="pl-6">
                                            <div className="flex items-center gap-3">
                                              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                                <Home className="h-4 w-4 text-slate-500" />
                                              </div>
                                              <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                  <span className="font-bold text-slate-900 text-sm">{getPropName(l.unit?.property)}</span>
                                                  <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-0 rounded-md px-1.5 py-0 text-[10px] uppercase">{l.unit?.name}</Badge>
                                                </div>
                                                <span className="text-xs text-slate-500">{l.unit?.property?.address}</span>
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
                                                <span className="text-[10px] text-slate-500">{l.tenant?.email}</span>
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
                                              <span className="text-[10px] text-slate-500">per month</span>
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            <span className="text-xs text-slate-600 font-medium">{startDate.toLocaleDateString()}</span>
                                          </TableCell>
                                          <TableCell>
                                            <span className="text-xs text-slate-600 font-medium">{endDate.toLocaleDateString()}</span>
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
                                              <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:bg-slate-100 hover:text-slate-900" />}>
                                                <MoreVertical className="h-4 w-4" />
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end" className="w-48 bg-white rounded-xl shadow-lg border-slate-100 p-1">
                                                <DropdownMenuItem className="cursor-pointer rounded-lg text-xs font-medium focus:bg-slate-50 py-2"><Eye className="h-4 w-4 mr-2 text-slate-400" /> View Details</DropdownMenuItem>
                                                <DropdownMenuItem className="cursor-pointer rounded-lg text-xs font-medium focus:bg-slate-50 py-2"><Edit2 className="h-4 w-4 mr-2 text-slate-400" /> Edit Lease</DropdownMenuItem>
                                                <DropdownMenuSeparator className="bg-slate-100" />
                                                <DropdownMenuItem className="cursor-pointer rounded-lg text-xs font-medium focus:bg-slate-50 py-2"><FileText className="h-4 w-4 mr-2 text-slate-400" /> View Invoice</DropdownMenuItem>
                                                <DropdownMenuSeparator className="bg-slate-100" />
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
                                            <Home className="h-5 w-5 text-slate-500" />
                                          </div>
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <h3 className="font-bold text-slate-900 text-sm truncate max-w-[120px]">{getPropName(l.unit?.property)}</h3>
                                              <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-0 rounded-md px-1.5 py-0 text-[10px] uppercase font-bold">{l.unit?.name}</Badge>
                                            </div>
                                            <p className="text-xs text-slate-500 truncate mt-0.5">{l.unit?.property?.address || "No address provided"}</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Badge variant="outline" className={`rounded-full font-bold px-2.5 py-0.5 text-[10px] capitalize shadow-sm ${statusStyle}`}>
                                            {isExpired ? "Expired" : l.status.toLowerCase().replace("_", " ")}
                                          </Badge>
                                          <DropdownMenu>
                                            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-900" />}>
                                              <MoreVertical className="h-4 w-4" />
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 bg-white rounded-xl shadow-lg border-slate-100 p-1">
                                              <DropdownMenuItem className="cursor-pointer rounded-lg text-xs font-medium focus:bg-slate-50 py-2"><Eye className="h-4 w-4 mr-2 text-slate-400" /> View Details</DropdownMenuItem>
                                              <DropdownMenuItem className="cursor-pointer rounded-lg text-xs font-medium focus:bg-slate-50 py-2"><Edit2 className="h-4 w-4 mr-2 text-slate-400" /> Edit Lease</DropdownMenuItem>
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
                                            <span className="text-[10px] text-slate-500">{l.tenant?.email}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="p-5">
                                      <div className="flex items-center justify-between mb-5">
                                        <div className="flex items-center gap-2">
                                          <Calendar className="h-4 w-4 text-slate-400" />
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
                                          <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Monthly Rent</p>
                                          <p className="text-sm font-black text-slate-900">${Number(l.monthlyRent).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                          <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Security</p>
                                          <p className="text-sm font-black text-slate-900">${Number(l.unit?.depositAmt || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-3 text-slate-500 pb-5 border-b border-slate-100">
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
                                        <button className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">Invoice</button>
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
"""
        new_content += content[maintenance_tab_start:]

        with open(r'c:\PropertyPro\src\app\dashboard\owner\page.tsx', 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print("Successfully replaced Leases Tab!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
