"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { 
  Search, 
  Plus, 
  Send, 
  MessageSquare, 
  Mail, 
  Phone, 
  User, 
  Info, 
  X,
  ShieldCheck,
  Check,
  CheckCheck,
  Paperclip,
  FileText
} from "lucide-react";
import { NewChatModal } from "@/components/messages/NewChatModal";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { FeatureBlockedOverlay } from "@/components/subscription/FeatureBlockedBanner";
import { getUserAvatar } from "@/lib/avatar";

interface UserInfo {
  id: string;
  name: string | null;
  email: string;
  role: string;
  avatar?: string | null;
  image?: string | null;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  attachmentUrl?: string | null;
  messageType?: string;
  ticketId?: string | null;
  leaseId?: string | null;
  sender: UserInfo;
  receiver: UserInfo;
}

interface Thread {
  contact: UserInfo;
  messages: Message[];
  lastMessage: Message;
  unreadCount: number;
}

import { useModuleAccess } from "@/hooks/useModuleAccess";
import ModuleLockedBanner from "@/components/subscription/ModuleLockedBanner";

export default function MessagesPage() {
  const featureAccess = useFeatureAccess("message_owner");
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const currentUserRole = (session?.user as any)?.role;
  const { allowed, loading: checkingAccess } = useModuleAccess("messages");

  const [messages, setMessages] = useState<Message[]>([]);
  const [contactsList, setContactsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | "UNREAD">("ALL");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [sending, setSending] = useState(false);
  const [newContact, setNewContact] = useState<UserInfo | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch("/api/messages");
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const res = await fetch("/api/messages/contacts");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setContactsList(data);
        }
      }
    } catch (err) {
      console.error("Error fetching contacts:", err);
    }
  };

  const markThreadAsRead = async (contactId: string) => {
    const unreadFromContact = messages.some(
      (m) => m.senderId === contactId && m.receiverId === currentUserId && !m.isRead
    );
    if (!unreadFromContact) return;

    try {
      const res = await fetch("/api/messages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: contactId }),
      });
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId === contactId && m.receiverId === currentUserId ? { ...m, isRead: true } : m
          )
        );
        window.dispatchEvent(new CustomEvent("messagesRead"));
      }
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  };

  // Initial Fetch & Setup SSE
  useEffect(() => {
    if (!allowed && currentUserRole === "OWNER") return;
    fetchMessages(true);
    fetchContacts();

    const eventSource = new EventSource("/api/notifications/sse");
    
    eventSource.addEventListener("message", (e) => {
      try {
        const newMessage = JSON.parse(e.data);
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
      } catch (err) {
        console.error("Error parsing incoming message", err);
      }
    });

    return () => {
      eventSource.close();
    };
  }, [allowed, currentUserRole]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThreadId, messages]);

  useEffect(() => {
    if (activeThreadId) {
      markThreadAsRead(activeThreadId);
    }
  }, [activeThreadId, messages.length]);

  const getThreads = (): Thread[] => {
    if (!currentUserId) return [];

    const threadsMap: { [key: string]: Message[] } = {};

    messages.forEach((message) => {
      const partnerId = message.senderId === currentUserId ? message.receiverId : message.senderId;
      if (!threadsMap[partnerId]) {
        threadsMap[partnerId] = [];
      }
      threadsMap[partnerId].push(message);
    });

    return Object.keys(threadsMap).map((partnerId) => {
      const threadMsgs = threadsMap[partnerId];
      const lastMsg = threadMsgs[threadMsgs.length - 1];
      const partnerInfo = lastMsg.senderId === currentUserId ? lastMsg.receiver : lastMsg.sender;

      const unreadCount = threadMsgs.filter(
        (m) => m.senderId === partnerId && m.receiverId === currentUserId && !m.isRead
      ).length;

      return {
        contact: partnerInfo,
        messages: threadMsgs,
        lastMessage: lastMsg,
        unreadCount,
      };
    }).sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());
  };

  const allThreads = getThreads();

  const filteredThreads = allThreads.filter((t) => {
    const nameMatch = t.contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const emailMatch = t.contact.email.toLowerCase().includes(searchQuery.toLowerCase());
    const textMatch = t.lastMessage.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSearch = nameMatch || emailMatch || textMatch;

    if (filter === "UNREAD") {
      return matchesSearch && t.unreadCount > 0;
    }
    return matchesSearch;
  });

  let activeThread = allThreads.find((t) => t.contact.id === activeThreadId);
  if (!activeThread && activeThreadId && newContact && newContact.id === activeThreadId) {
    activeThread = {
      contact: newContact,
      messages: [],
      lastMessage: null as any,
      unreadCount: 0
    };
  }

  const activeContactDetails = contactsList.find((c) => c.id === activeThreadId);
  const isEmailFallback = activeContactDetails?.messagingChannel === "EMAIL_FALLBACK";

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!newMessage.trim() && !attachmentFile) || !activeThreadId || sending || isUploading) return;

    setSending(true);
    setIsUploading(!!attachmentFile);
    const content = newMessage.trim() || (attachmentFile?.type.startsWith("image/") ? "Shared an image" : "Shared a document");
    setNewMessage("");

    try {
      let attachmentUrl = null;
      let messageType = "TEXT";

      if (attachmentFile) {
        const formData = new FormData();
        formData.append("file", attachmentFile);
        formData.append("category", "GENERAL");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) throw new Error("Upload failed");
        const uploadData = await uploadRes.json();
        attachmentUrl = uploadData.url;
        messageType = attachmentFile.type.startsWith("image/") ? "IMAGE" : "FILE";
      }

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          receiverId: activeThreadId, 
          content,
          attachmentUrl,
          messageType
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data]);
        setAttachmentFile(null);
        setAttachmentPreview(null);
        if (data.fallbackMode) {
          toast.success("Message delivered via Email notification to property manager.");
        }
      } else {
        toast.error("Failed to send message");
        setNewMessage(content);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Failed to upload and send message.");
      setNewMessage(content);
    } finally {
      setSending(false);
      setIsUploading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeThreadId) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error("File exceeds 15MB limit.");
      return;
    }

    setAttachmentFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setAttachmentPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setAttachmentPreview("FILE");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const cancelAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleStartNewChat = (contact: UserInfo) => {
    setActiveThreadId(contact.id);
    if (!allThreads.find((t) => t.contact.id === contact.id)) {
      setNewContact(contact);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role.toUpperCase()) {
      case "SUPERADMIN":
        return "bg-rose-50 text-rose-700 border border-rose-200/60 font-extrabold";
      case "OWNER":
        return "bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-extrabold";
      case "INSPECTOR":
        return "bg-purple-50 text-purple-700 border border-purple-200/60 font-extrabold";
      case "TENANT":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-extrabold";
      default:
        return "bg-slate-100 text-slate-600 border border-slate-200/60 font-bold";
    }
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
    }
  };

  const isBlocked = !featureAccess.allowed && !featureAccess.loading;

  return (
    <div className="relative font-sans">
      {isBlocked && (
        <FeatureBlockedOverlay
          featureLabel={featureAccess.featureLabel || "Inbox Messages"}
          reason={featureAccess.reason}
          adminNote={featureAccess.adminNote}
          expiresAt={featureAccess.expiresAt}
        />
      )}
      <div className={isBlocked ? "pointer-events-none select-none blur-[2.5px] opacity-70" : ""}>
      <div className="flex h-[calc(100vh-80px)] -mx-6 md:-mx-10 border-t border-slate-200 overflow-hidden bg-slate-50/50">
      {/* Pane 1: Thread/Chats List (Left) */}
      <div className="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Chats</h1>
          <button
            onClick={() => setIsNewChatOpen(true)}
            className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-xs cursor-pointer"
            title="Start new conversation"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-100 relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 transition-all shadow-2xs"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 p-3 bg-slate-50/60 border-b border-slate-100">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer border ${
              filter === "ALL"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("UNREAD")}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer border ${
              filter === "UNREAD"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Unread
          </button>
        </div>

        {/* Scrollable Threads List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-semibold text-xs">
              {searchQuery ? "No chats match query" : "No conversations yet"}
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const isActive = thread.contact.id === activeThreadId;
              const unread = thread.unreadCount > 0;
              return (
                <button
                  key={thread.contact.id}
                  onClick={() => setActiveThreadId(thread.contact.id)}
                  className={`w-full flex items-center gap-3 p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors text-left relative cursor-pointer ${
                    isActive ? "bg-emerald-50/80 border-l-4 border-l-emerald-600 font-extrabold" : ""
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <img
                      src={getUserAvatar(thread.contact)}
                      alt={thread.contact.name || "Contact Profile"}
                      className="h-10 w-10 rounded-xl object-cover border border-slate-200 shadow-2xs"
                    />
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="font-extrabold text-xs text-slate-900 truncate">
                        {thread.contact.name || "User"}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {formatMessageTime(thread.lastMessage.createdAt)}
                      </span>
                    </div>
                    <p className={`text-xs truncate ${unread ? "font-extrabold text-slate-900" : "text-slate-500 font-semibold"}`}>
                      {thread.lastMessage.senderId === currentUserId ? "You: " : ""}
                      {thread.lastMessage.content}
                    </p>
                  </div>

                  {/* Status Indicator */}
                  {unread && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 h-2.5 w-2.5 bg-emerald-500 rounded-full shadow-md animate-pulse"></span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Pane 2: Conversation Box (Center) */}
      <div className="flex-1 flex flex-col bg-slate-50/50">
        {activeThreadId && activeThread ? (
          <>
            {/* Thread Header */}
            <div className="h-16 bg-white border-b border-slate-200 px-6 flex justify-between items-center sticky top-0 z-10 shadow-2xs">
              <div className="flex items-center gap-3">
                <img
                  src={getUserAvatar(activeThread.contact)}
                  alt={activeThread.contact.name || "Contact Profile"}
                  className="h-10 w-10 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                />
                <div>
                  <h2 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <span>{activeThread.contact.name || "User"}</span>
                    {isEmailFallback && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <Mail className="h-2.5 w-2.5" /> Email Notification
                      </span>
                    )}
                  </h2>
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${getRoleColor(activeThread.contact.role)}`}>
                    {activeThread.contact.role}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowRightPanel(!showRightPanel)}
                className={`p-2 rounded-xl transition-all border cursor-pointer ${
                  showRightPanel
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
                title="Toggle contact details"
              >
                <Info className="h-4 w-4" />
              </button>
            </div>

            {/* Email Fallback Channel Banner */}
            {isEmailFallback && (
              <div className="bg-amber-50/90 border-b border-amber-200 px-6 py-2.5 flex items-center gap-2.5 text-amber-900 text-xs font-semibold shadow-2xs">
                <Mail className="h-4 w-4 text-amber-700 shrink-0" />
                <span>
                  This property manager's package relies on direct email notifications. Messages submitted here deliver directly to their registered inbox.
                </span>
              </div>
            )}

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {activeThread.messages.map((message, index) => {
                const isOwn = message.senderId === currentUserId;
                const prevMessage = index > 0 ? activeThread.messages[index - 1] : null;
                const showDateHeader = !prevMessage || 
                  new Date(prevMessage.createdAt).toDateString() !== new Date(message.createdAt).toDateString();

                return (
                  <div key={message.id} className="space-y-2">
                    {showDateHeader && (
                      <div className="flex justify-center my-4">
                        <span className="text-[10px] font-extrabold text-emerald-900 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full uppercase tracking-wider shadow-2xs">
                          {formatMessageDate(message.createdAt)}
                        </span>
                      </div>
                    )}

                    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} items-end gap-2`}>
                      {!isOwn && (
                        <div className="relative shrink-0 mb-1">
                          <img
                            src={getUserAvatar(message.sender || activeThread.contact)}
                            alt={activeThread.contact.name || "User Profile"}
                            className="h-8 w-8 rounded-xl object-cover border border-slate-200 shadow-2xs"
                          />
                        </div>
                      )}

                      <div className="max-w-[70%] group">
                        <div
                          className={`p-3.5 rounded-2xl text-xs font-semibold shadow-2xs ${
                            isOwn
                              ? "bg-emerald-100 text-slate-900 border border-emerald-200/80 rounded-br-none"
                              : "bg-white text-slate-900 rounded-bl-none border border-slate-200"
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                          {message.attachmentUrl && message.messageType === "IMAGE" && (
                            <div className="mt-2 rounded-xl overflow-hidden border border-black/10">
                              <img src={message.attachmentUrl} alt="Attachment" className="max-w-full max-h-48 object-cover" />
                            </div>
                          )}
                          {message.attachmentUrl && message.messageType === "FILE" && (
                            <a 
                              href={message.attachmentUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="mt-2 flex items-center gap-2 p-2 rounded-xl bg-[#0000000d] hover:bg-[#0000001a] transition-colors text-xs font-bold text-slate-900"
                            >
                              <FileText className="h-4 w-4 text-emerald-700" />
                              View Document
                            </a>
                          )}
                        </div>
                        <div className={`flex items-center gap-1.5 mt-1 text-[9px] text-slate-400 font-semibold ${isOwn ? "justify-end" : "justify-start"}`}>
                          <span>{formatMessageTime(message.createdAt)}</span>
                          {isOwn && (
                            message.isRead ? (
                              <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Check className="h-3.5 w-3.5 text-slate-400" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Attachment Preview Box */}
            {attachmentPreview && (
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 relative">
                <div className="relative inline-block border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs p-1 pr-8">
                  <button
                    type="button"
                    onClick={cancelAttachment}
                    className="absolute top-1 right-1 bg-slate-100 text-slate-600 rounded-full p-1 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {attachmentPreview === "FILE" ? (
                    <div className="flex items-center gap-2 p-2 px-4">
                      <FileText className="h-5 w-5 text-emerald-700" />
                      <span className="text-xs font-extrabold text-slate-900 truncate max-w-[200px]">{attachmentFile?.name}</span>
                    </div>
                  ) : (
                    <img src={attachmentPreview} alt="Preview" className="h-20 max-w-[200px] object-cover rounded-lg" />
                  )}
                </div>
              </div>
            )}

            {/* Composer or Administrative Block Notice */}
            {currentUserRole === "TENANT" && !featureAccess.allowed ? (
              <div className="p-4 bg-rose-50 border-t border-rose-200 flex items-center justify-between gap-4 sticky bottom-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-rose-950 uppercase tracking-wider">
                      Messaging Restricted by Administrator
                    </p>
                    <p className="text-xs font-medium text-rose-800 mt-0.5">
                      "{featureAccess.adminNote || featureAccess.reason || "Outbound messaging is restricted for your account."}"
                    </p>
                  </div>
                </div>
                {featureAccess.expiresAt && (
                  <span className="text-[10px] font-extrabold text-rose-800 bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-full shrink-0 uppercase tracking-wider">
                    Restores in ~{featureAccess.daysRemaining ?? 1}d
                  </span>
                )}
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-200 flex gap-3 sticky bottom-0 z-10 items-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending || isUploading}
                  className="p-2.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                  title="Attach file"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload}
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
                  className="hidden" 
                />
                <input
                  type="text"
                  placeholder={isUploading ? "Uploading attachment..." : "Type a message..."}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={sending || isUploading}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 transition-all disabled:opacity-50 shadow-2xs"
                />
                <Button
                  type="submit"
                  disabled={(!newMessage.trim() && !attachmentFile) || sending || isUploading}
                  className="h-10 w-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-xs p-0 cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center p-8 text-center bg-white">
            <div className="h-16 w-16 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl flex items-center justify-center mb-4 shadow-2xs">
              <MessageSquare className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Your Inbox</h2>
            <p className="text-xs text-slate-500 font-semibold max-w-sm mb-6 leading-relaxed">
              Select a conversation from the list or start a new chat with your contacts to get started.
            </p>
            <Button
              onClick={() => setIsNewChatOpen(true)}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-10 px-6 shadow-xs cursor-pointer"
            >
              Start Conversation
            </Button>
          </div>
        )}
      </div>

      {/* Pane 3: Profile Details Panel (Right) */}
      {activeThreadId && activeThread && showRightPanel && (
        <div className="w-72 border-l border-slate-200 bg-white flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10 bg-white">
            <h3 className="font-extrabold text-slate-900 text-xs">Contact Info</h3>
            <button
              onClick={() => setShowRightPanel(false)}
              className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6 flex flex-col items-center border-b border-slate-100 bg-slate-50/50">
            <div className="relative shrink-0 mb-3">
              <img
                src={getUserAvatar(activeThread.contact)}
                alt={activeThread.contact.name || "Contact Profile"}
                className="h-16 w-16 rounded-2xl object-cover border border-slate-200 shadow-2xs"
              />
            </div>
            <h4 className="font-black text-sm text-slate-900 text-center mb-1 leading-tight">
              {activeThread.contact.name || "User"}
            </h4>
            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${getRoleColor(activeThread.contact.role)}`}>
              {activeThread.contact.role}
            </span>
          </div>

          <div className="p-6 space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Mail className="h-3 w-3" /> Email Address</span>
              <p className="text-xs font-semibold text-slate-900 break-all">{activeThread.contact.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        onSelectContact={handleStartNewChat}
        activeContactIds={allThreads.map((t) => t.contact.id)}
      />
    </div>
    </div>
    </div>
  );
}
