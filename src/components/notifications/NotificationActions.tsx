"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, CheckCheck, Eye } from "lucide-react";
import { toast } from "sonner";

interface NotificationActionsProps {
  id: string;
  isRead: boolean;
}

export function NotificationActions({ id, isRead: initialIsRead }: NotificationActionsProps) {
  const router = useRouter();
  const [isRead, setIsRead] = useState(initialIsRead);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this notification?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Notification deleted");
        router.push("/dashboard/notifications");
      } else {
        toast.error("Failed to delete notification");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleRead = async () => {
    setToggling(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isRead: !isRead }),
      });
      if (res.ok) {
        setIsRead(!isRead);
        toast.success(isRead ? "Marked as unread" : "Marked as read");
        router.refresh();
      } else {
        toast.error("Failed to update notification");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleToggleRead}
        disabled={toggling}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors border disabled:opacity-50 ${
          isRead
            ? "bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-100"
            : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-100"
        }`}
      >
        {isRead ? (
          <><Eye className="h-4 w-4" /> Mark as Unread</>
        ) : (
          <><CheckCheck className="h-4 w-4" /> Mark as Read</>
        )}
      </button>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-bold transition-colors border border-red-100 disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
        {deleting ? "Deleting..." : "Delete Notification"}
      </button>
    </div>
  );
}
