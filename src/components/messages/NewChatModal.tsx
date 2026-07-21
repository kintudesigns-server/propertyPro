"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search } from "lucide-react";

interface Contact {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectContact: (contact: Contact) => void;
  activeContactIds: string[];
}

export function NewChatModal({ isOpen, onClose, onSelectContact, activeContactIds }: NewChatModalProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    fetch("/api/messages/contacts")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setContacts(data);
        }
      })
      .catch((err) => console.error("Error fetching contacts:", err))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const filteredContacts = contacts.filter((contact) => {
    const nameMatch = contact.name?.toLowerCase().includes(search.toLowerCase()) || false;
    const emailMatch = contact.email.toLowerCase().includes(search.toLowerCase());
    const roleMatch = contact.role.toLowerCase().includes(search.toLowerCase());
    return (nameMatch || emailMatch || roleMatch) && !activeContactIds.includes(contact.id);
  });

  const getRoleColor = (role: string) => {
    switch (role.toUpperCase()) {
      case "SUPERADMIN":
        return "bg-red-50 text-red-600 border border-red-200/50";
      case "OWNER":
        return "bg-blue-50 text-blue-600 border border-blue-200/50";
      case "INSPECTOR":
        return "bg-purple-50 text-purple-600 border border-purple-200/50";
      case "TENANT":
        return "bg-green-50 text-green-600 border border-green-200/50";
      default:
        return "bg-slate-50 text-[#6E6E73] border border-slate-200/50";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white rounded-2xl p-0 border-0 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <DialogHeader className="p-6 border-b border-[#E5E5EA] bg-[#F2F2F7]">
          <DialogTitle className="text-xl font-bold text-[#1D1D1F]">New Chat</DialogTitle>
          <p className="text-[#6E6E73] text-xs font-semibold mt-1">Select a contact to start a conversation</p>
        </DialogHeader>

        {/* Search */}
        <div className="p-4 border-b border-[#E5E5EA] relative">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2.5 w-full bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-sm text-[#1D1D1F] placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-all"
          />
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#007AFF]"></div>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-[#8E8E93] font-semibold text-sm">
              {search ? "No contacts match search" : "No new contacts available"}
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => {
                  onSelectContact(contact);
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[#F5F5F7] transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#EFF6FF] text-[#007AFF] flex items-center justify-center font-bold text-sm">
                    {contact.name ? contact.name.charAt(0) : "U"}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-[#1D1D1F] group-hover:text-[#007AFF] transition-colors">
                      {contact.name || "User"}
                    </div>
                    <div className="text-xs text-[#6E6E73]">{contact.email}</div>
                  </div>
                </div>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${getRoleColor(contact.role)}`}>
                  {contact.role}
                </span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
