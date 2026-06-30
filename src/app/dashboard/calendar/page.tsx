import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";

export default async function CalendarPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/auth/login");
  }

  return (
    <div className="max-w-7xl mx-auto w-full">
      <CalendarGrid />
    </div>
  );
}
