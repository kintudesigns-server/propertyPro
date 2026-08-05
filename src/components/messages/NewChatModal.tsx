"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Mail } from "lucide-react";
import { getUserAvatar } from "@/lib/avatar";

interface Contact {
  id: string;
  name: string | null;
  email: string;
  role: string;
  avatar?: string | null;
  image?: string | null;
  hasMessagingAccess?: boolean;
  messagingChannel?: string;
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
        return "bg-rose-50 text-rose-700 border border-rose-200/60 font-medium";
      case "OWNER":
        return "bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-medium";
      case "INSPECTOR":
        return "bg-purple-50 text-purple-700 border border-purple-200/60 font-medium";
      case "TENANT":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-medium";
      default:
        return "bg-slate-100 text-slate-600 border border-slate-200/60 font-medium";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white rounded-3xl p-0 border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] font-sans">
        <DialogHeader className="p-6 border-b border-slate-100 bg-slate-50/70">
          <DialogTitle className="text-lg font-semibold text-[#1D1D1F] tracking-tight">New Chat</DialogTitle>
          <p className="text-[#6E6E73] text-xs font-normal mt-0.5">Select a contact to start a conversation</p>
        </DialogHeader>

        {/* Search */}
        <div className="p-4 border-b border-slate-100 relative">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6E6E73]" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2.5 w-full bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-2xs"
          />
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-[#6E6E73] font-normal text-xs">
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
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={getUserAvatar(contact)}
                      alt={contact.name || "Contact Profile"}
                      className="h-10 w-10 rounded-xl object-cover border border-slate-200 shadow-2xs"
                    />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-[#1D1D1F] group-hover:text-emerald-700 transition-colors flex items-center gap-2">
                      <span>{contact.name || "User"}</span>
                      {contact.messagingChannel === "EMAIL_FALLBACK" && (
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Mail className="h-2.5 w-2.5" /> Email
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-normal text-[#6E6E73]">{contact.email}</div>
                  </div>
                </div>
                <span className={`text-[9px] font-medium px-2 py-0.5 rounded-md uppercase tracking-wider ${getRoleColor(contact.role)}`}>
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
