"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { useSession } from "next-auth/react";

export function MessageBadge() {
  const [unreadCount, setUnreadCount] = useState(0);
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;

  const fetchUnreadCount = () => {
    if (!currentUserId) return;
    
    fetch("/api/messages")
      .then((res) => res.json())
      .then((data) => {
        // If it's an array directly (no pagination)
        if (Array.isArray(data)) {
          const unread = data.filter((m: any) => m.receiverId === currentUserId && !m.isRead).length;
          setUnreadCount(unread);
        } 
        // If it's paginated (contains data.messages)
        else if (data && data.messages && Array.isArray(data.messages)) {
          const unread = data.messages.filter((m: any) => m.receiverId === currentUserId && !m.isRead).length;
          setUnreadCount(unread);
        }
      })
      .catch((err) => console.error("Error fetching initial unread count:", err));
  };

  useEffect(() => {
    if (!currentUserId) return;
    fetchUnreadCount();

    // Listen to real-time messages
    const eventSource = new EventSource("/api/notifications/sse");
    eventSource.addEventListener("message", (e) => {
      fetchUnreadCount();
    });

    // Listen for manual read events from the Messages page
    const handleMessagesRead = () => fetchUnreadCount();
    window.addEventListener("messagesRead", handleMessagesRead);

    return () => {
      eventSource.close();
      window.removeEventListener("messagesRead", handleMessagesRead);
    };
  }, []);

  return (
    <Link
      href="/dashboard/messages"
      className="relative p-2.5 bg-white rounded-xl border border-[#E5E5EA] shadow-sm text-[#6E6E73] hover:text-[#007AFF] hover:bg-[#EFF6FF] transition-colors"
      title="Messages"
    >
      <MessageSquare className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 h-5 min-w-[20px] px-1.5 bg-blue-500 text-white text-[10px] font-extrabold rounded-full border-2 border-white flex items-center justify-center animate-in zoom-in">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
