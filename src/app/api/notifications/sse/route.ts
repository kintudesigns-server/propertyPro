import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { notificationEmitter } from "@/lib/notification-events";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = (session.user as any).id;

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial connected event
  writer.write(encoder.encode("event: connected\ndata: {}\n\n"));

  const onNotification = (notification: any) => {
    try {
      writer.write(encoder.encode(`event: notification\ndata: ${JSON.stringify(notification)}\n\n`));
    } catch (err) {
      console.error("Error writing notification to SSE stream:", err);
    }
  };

  const eventName = `notification:${userId}`;
  notificationEmitter.on(eventName, onNotification);

  // Keep-alive heartbeat every 15 seconds to prevent gateway timeouts (e.g. Vercel, Nginx)
  const heartbeatInterval = setInterval(() => {
    try {
      writer.write(encoder.encode("event: heartbeat\ndata: {}\n\n"));
    } catch (err) {
      console.error("Error writing heartbeat to SSE stream:", err);
    }
  }, 15000);

  // Clean up when connection closes
  req.signal.addEventListener("abort", () => {
    clearInterval(heartbeatInterval);
    notificationEmitter.off(eventName, onNotification);
    try {
      writer.close();
    } catch (err) {
      // Stream might already be closed
    }
  });

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
