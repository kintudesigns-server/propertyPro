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

interface UserInfo {
  id: string;
  name: string | null;
  email: string;
  role: string;
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

export default function MessagesPage() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;

  const [messages, setMessages] = useState<Message[]>([]);
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
  // Initial Fetch & Setup SSE
  useEffect(() => {
    fetchMessages(true);

    const eventSource = new EventSource("/api/notifications/sse");
    
    eventSource.addEventListener("message", (e) => {
      try {
        const newMessage = JSON.parse(e.data);
        setMessages((prev) => {
          // Prevent duplicates if already in state
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
  }, []);

  // Scroll to bottom when messages or active thread changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThreadId, messages]);

  // Mark active thread messages as read when active thread changes or new messages arrive
  useEffect(() => {
    if (activeThreadId) {
      markThreadAsRead(activeThreadId);
    }
  }, [activeThreadId, messages.length]);

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
        // Optimistically update local read states
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

  // Group messages into threads
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

  // Filter threads by search and filter chips
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

      // Upload file right before sending the message if exists
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
      } else {
        toast.error("Failed to send message");
        setNewMessage(content); // Restore input on failure
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
      setAttachmentPreview("FILE"); // Marker for non-image preview
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

  return (
    <div className="flex h-[calc(100vh-80px)] -mx-6 md:-mx-10 border-t border-[#E5E5EA] overflow-hidden bg-[#F2F2F7]">
      {/* Pane 1: Thread/Chats List (Left) */}
      <div className="w-80 border-r border-[#E5E5EA] bg-white flex flex-col shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E5EA] flex justify-between items-center bg-white sticky top-0 z-10">
          <h1 className="text-xl font-bold text-[#1D1D1F]">Chats</h1>
          <button
            onClick={() => setIsNewChatOpen(true)}
            className="p-2 rounded-xl bg-[#EFF6FF] text-[#007AFF] hover:bg-[#007AFF] hover:text-white transition-all shadow-sm"
            title="Start new conversation"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-[#E5E5EA] relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-full bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-sm text-[#1D1D1F] placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF] transition-all"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 p-3 bg-[#F2F2F7] border-b border-[#E5E5EA]">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all border ${
              filter === "ALL"
                ? "bg-[#007AFF] text-white border-[#007AFF]"
                : "bg-white text-[#6E6E73] border-[#E5E5EA] hover:bg-[#F5F5F7]"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("UNREAD")}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all border ${
              filter === "UNREAD"
                ? "bg-[#007AFF] text-white border-[#007AFF]"
                : "bg-white text-[#6E6E73] border-[#E5E5EA] hover:bg-[#F5F5F7]"
            }`}
          >
            Unread
          </button>
        </div>

        {/* Scrollable Threads List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007AFF]"></div>
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="text-center py-12 text-[#6E6E73] font-semibold text-sm">
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
                  className={`w-full flex items-center gap-3 p-4 border-b border-slate-50 hover:bg-[#F2F2F7] transition-colors text-left relative ${
                    isActive ? "bg-[#EFF6FF] hover:bg-[#EFF6FF]" : ""
                  }`}
                >
                  {/* Avatar */}
                  <div className="h-11 w-11 rounded-full bg-[#EFF6FF] text-[#007AFF] flex items-center justify-center font-bold text-base shrink-0 border border-blue-100">
                    {thread.contact.name ? thread.contact.name.charAt(0) : "U"}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="font-semibold text-sm text-[#1D1D1F] truncate">
                        {thread.contact.name || "User"}
                      </span>
                      <span className="text-[10px] text-[#94A3B8]">
                        {formatMessageTime(thread.lastMessage.createdAt)}
                      </span>
                    </div>
                    <p className={`text-xs truncate ${unread ? "font-bold text-[#1D1D1F]" : "text-[#6E6E73]"}`}>
                      {thread.lastMessage.senderId === currentUserId ? "You: " : ""}
                      {thread.lastMessage.content}
                    </p>
                  </div>

                  {/* Status Indicator */}
                  {unread && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 h-2.5 w-2.5 bg-[#007AFF] rounded-full shadow-md animate-pulse"></span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Pane 2: Conversation Box (Center) */}
      <div className="flex-1 flex flex-col bg-[#F2F2F7]">
        {activeThreadId && activeThread ? (
          <>
            {/* Thread Header */}
            <div className="h-16 bg-white border-b border-[#E5E5EA] px-6 flex justify-between items-center sticky top-0 z-10 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#EFF6FF] text-[#007AFF] flex items-center justify-center font-bold text-sm shrink-0">
                  {activeThread.contact.name ? activeThread.contact.name.charAt(0) : "U"}
                </div>
                <div>
                  <h2 className="font-semibold text-sm text-[#1D1D1F]">
                    {activeThread.contact.name || "User"}
                  </h2>
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${getRoleColor(activeThread.contact.role)}`}>
                    {activeThread.contact.role}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowRightPanel(!showRightPanel)}
                className={`p-2 rounded-xl transition-all border ${
                  showRightPanel
                    ? "bg-[#EFF6FF] text-[#007AFF] border-blue-200/50"
                    : "bg-white text-[#6E6E73] border-[#E5E5EA] hover:bg-[#F5F5F7]"
                }`}
                title="Toggle contact details"
              >
                <Info className="h-5 w-5" />
              </button>
            </div>

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
                        <span className="text-[10px] font-extrabold text-[#6E6E73] bg-slate-100 border border-slate-200/30 px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                          {formatMessageDate(message.createdAt)}
                        </span>
                      </div>
                    )}

                    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} items-end gap-2`}>
                      {!isOwn && (
                        <div className="h-8 w-8 rounded-full bg-[#EFF6FF] text-[#007AFF] flex items-center justify-center font-bold text-xs shrink-0 border border-blue-100 mb-1">
                          {activeThread.contact.name ? activeThread.contact.name.charAt(0) : "U"}
                        </div>
                      )}

                      <div className="max-w-[70%] group">
                        <div
                          className={`p-3.5 rounded-2xl text-sm shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
                            isOwn
                              ? "bg-[#007AFF] text-white rounded-br-none"
                              : "bg-white text-[#1D1D1F] rounded-bl-none border border-[#E5E5EA]"
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                          {message.attachmentUrl && message.messageType === "IMAGE" && (
                            <div className="mt-2 rounded-lg overflow-hidden border border-black/10">
                              <img src={message.attachmentUrl} alt="Attachment" className="max-w-full max-h-48 object-cover" />
                            </div>
                          )}
                          {message.attachmentUrl && message.messageType === "FILE" && (
                            <a 
                              href={message.attachmentUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="mt-2 flex items-center gap-2 p-2 rounded bg-black/5 hover:bg-black/10 transition-colors text-xs font-semibold"
                            >
                              <FileText className="h-4 w-4" />
                              View Document
                            </a>
                          )}
                        </div>
                        <div className={`flex items-center gap-1.5 mt-1 text-[9px] text-[#94A3B8] ${isOwn ? "justify-end" : "justify-start"}`}>
                          <span>{formatMessageTime(message.createdAt)}</span>
                          {isOwn && (
                            message.isRead ? (
                              <CheckCheck className="h-3.5 w-3.5 text-[#007AFF]" />
                            ) : (
                              <Check className="h-3.5 w-3.5 text-[#94A3B8]" />
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
              <div className="px-4 py-3 bg-[#F2F2F7] border-t border-[#E5E5EA] relative">
                <div className="relative inline-block border border-black/10 rounded-lg overflow-hidden bg-white shadow-sm p-1 pr-8">
                  <button
                    type="button"
                    onClick={cancelAttachment}
                    className="absolute top-1 right-1 bg-black/5 text-[#6E6E73] rounded-full p-1 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {attachmentPreview === "FILE" ? (
                    <div className="flex items-center gap-2 p-2 px-4">
                      <FileText className="h-6 w-6 text-[#007AFF]" />
                      <span className="text-sm font-semibold text-[#1D1D1F] truncate max-w-[200px]">{attachmentFile?.name}</span>
                    </div>
                  ) : (
                    <img src={attachmentPreview} alt="Preview" className="h-20 max-w-[200px] object-cover rounded" />
                  )}
                </div>
              </div>
            )}

            {/* Composer */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-[#E5E5EA] flex gap-3 sticky bottom-0 z-10 shadow-[0_-4px_24px_rgba(0,0,0,0.02)] items-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending || isUploading}
                className="p-2 text-[#94A3B8] hover:text-[#007AFF] hover:bg-[#EFF6FF] rounded-xl transition-colors shrink-0 disabled:opacity-50"
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
                className="flex-1 px-4 py-3 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-sm text-[#1D1D1F] placeholder-[#94A3B8] focus:outline-none focus:border-[#007AFF] transition-all disabled:opacity-50"
              />
              <Button
                type="submit"
                disabled={(!newMessage.trim() && !attachmentFile) || sending || isUploading}
                className="h-11 w-11 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white flex items-center justify-center shadow-md shadow-blue-500/10 p-0"
              >
                <Send className="h-5 w-5" />
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center p-8 text-center bg-white">
            <div className="h-16 w-16 bg-[#EFF6FF] text-[#007AFF] rounded-full flex items-center justify-center mb-4 shadow-sm border border-blue-100/50">
              <MessageSquare className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-[#1D1D1F] mb-1">Your Inbox</h2>
            <p className="text-sm text-[#6E6E73] max-w-sm mb-6 leading-relaxed">
              Select a conversation from the list or start a new chat with your contacts to get started.
            </p>
            <Button
              onClick={() => setIsNewChatOpen(true)}
              className="rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white font-bold h-11 px-6 shadow-md shadow-blue-500/10"
            >
              Start Conversation
            </Button>
          </div>
        )}
      </div>

      {/* Pane 3: Profile Details Panel (Right) */}
      {activeThreadId && activeThread && showRightPanel && (
        <div className="w-72 border-l border-[#E5E5EA] bg-white flex flex-col shrink-0 animate-in slide-in-from-right duration-200">
          <div className="p-4 border-b border-[#E5E5EA] flex justify-between items-center sticky top-0 z-10 bg-white">
            <h3 className="font-bold text-[#1D1D1F] text-sm">Contact Info</h3>
            <button
              onClick={() => setShowRightPanel(false)}
              className="p-1.5 text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] rounded-lg transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6 flex flex-col items-center border-b border-[#E5E5EA] bg-[#F2F2F7]/50">
            <div className="h-20 w-20 rounded-full bg-[#EFF6FF] text-[#007AFF] flex items-center justify-center font-bold text-3xl mb-3 shadow-md shadow-blue-500/5 border border-blue-100">
              {activeThread.contact.name ? activeThread.contact.name.charAt(0) : "U"}
            </div>
            <h4 className="font-bold text-base text-[#1D1D1F] text-center mb-1 leading-tight">
              {activeThread.contact.name || "User"}
            </h4>
            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${getRoleColor(activeThread.contact.role)}`}>
              {activeThread.contact.role}
            </span>
          </div>

          <div className="p-6 space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1"><Mail className="h-3 w-3" /> Email Address</span>
              <p className="text-sm font-semibold text-[#1D1D1F] break-all">{activeThread.contact.email}</p>
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
  );
}
