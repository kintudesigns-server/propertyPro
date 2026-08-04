import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notificationEmitter } from "@/lib/notification-events";
import { checkModuleAccess, moduleLockedResponse } from "@/lib/module-guard";
import { checkUserFeatureAccess } from "@/lib/user-access-guard";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;

  if (userRole === "OWNER") {
    const access = await checkModuleAccess(userId, "messages");
    if (!access.allowed) {
      return moduleLockedResponse(access);
    }
  }

  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");

    // If conversationId is passed, fetch only messages for that thread, supporting legacy null conversationId
    let whereClause: any = {
      OR: [
        { senderId: userId },
        { receiverId: userId }
      ]
    };

    if (conversationId) {
      const parts = conversationId.split("_");
      if (parts.length === 2) {
        whereClause = {
          OR: [
            { conversationId },
            {
              senderId: parts[0],
              receiverId: parts[1],
            },
            {
              senderId: parts[1],
              receiverId: parts[0],
            }
          ]
        };
      }
    }

    const pageVal = searchParams.get("page");
    const limitVal = searchParams.get("limit");

    if (pageVal || limitVal) {
      const page = parseInt(pageVal || "1", 10);
      const limit = parseInt(limitVal || "20", 10);
      const skip = (page - 1) * limit;

      const [messages, total] = await prisma.$transaction([
        prisma.message.findMany({
          where: whereClause,
          include: {
            sender: {
              select: { id: true, name: true, email: true, role: true, avatar: true }
            },
            receiver: {
              select: { id: true, name: true, email: true, role: true, avatar: true }
            }
          },
          orderBy: { createdAt: "asc" },
          skip,
          take: limit,
        }),
        prisma.message.count({ where: whereClause }),
      ]);

      return NextResponse.json({
        messages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        }
      });
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        sender: {
          select: { id: true, name: true, email: true, role: true, avatar: true }
        },
        receiver: {
          select: { id: true, name: true, email: true, role: true, avatar: true }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    return NextResponse.json(messages);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const senderId = userId;
  const userRole = (session.user as any).role;

  if (userRole === "TENANT") {
    const featureCheck = await checkUserFeatureAccess(senderId, "message_owner");
    if (!featureCheck.allowed) {
      return NextResponse.json(
        { error: featureCheck.reason || "Outbound messaging is restricted for your account by an administrator." },
        { status: 403 }
      );
    }
  }

  if (userRole === "OWNER") {
    const access = await checkModuleAccess(senderId, "messages");
    if (!access.allowed) {
      return moduleLockedResponse(access);
    }
  }

  try {
    const { receiverId, content, attachmentUrl, messageType, ticketId, leaseId } = await req.json();

    if (!receiverId || !content) {
      return NextResponse.json({ error: "Missing receiver ID or message content" }, { status: 400 });
    }

    // Owners can only message their own tenants or SUPERADMIN
    let deliveryChannel = "LIVE_CHAT";

    if (userRole === "TENANT") {
      const receiver = await prisma.user.findUnique({
        where: { id: receiverId },
        select: { id: true, role: true },
      });
      if (!receiver) {
        return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
      }
      if (receiver.role === "SUPERADMIN") {
        // Always allowed to message admin
      } else if (receiver.role === "INSPECTOR") {
        // Verify inspector is assigned to their ticket
        const validTicket = await prisma.maintenanceRequest.findFirst({
          where: { tenantId: userId, inspectorId: receiverId }
        });
        if (!validTicket) {
          return NextResponse.json({ error: "You can only message inspectors assigned to your tickets." }, { status: 403 });
        }
      } else if (receiver.role === "OWNER") {
        // Verify tenant rents from this owner
        const validRelationship = await prisma.lease.findFirst({
          where: {
            tenantId: userId,
            unit: { property: { ownerId: receiverId } },
          },
        });
        if (!validRelationship) {
          return NextResponse.json(
            { error: "You can only message the owner of properties you rent from." },
            { status: 403 }
          );
        }

        // Check if target owner has messaging module unlocked
        const ownerAccess = await checkModuleAccess(receiverId, "messages");
        if (!ownerAccess.allowed) {
          deliveryChannel = "EMAIL_NOTIFIED";
        }
      } else {
        return NextResponse.json({ error: "You cannot message this user." }, { status: 403 });
      }
    } else if (userRole === "OWNER") {
      const receiver = await prisma.user.findUnique({
        where: { id: receiverId },
        select: { id: true, role: true },
      });
      if (!receiver) {
        return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
      }
      if (receiver.role !== "SUPERADMIN" && receiver.role !== "TENANT" && receiver.role !== "INSPECTOR") {
        return NextResponse.json({ error: "Owners can only message their tenants, inspectors, or admin." }, { status: 403 });
      }
      if (receiver.role === "TENANT") {
        const validRelationship = await prisma.lease.findFirst({
          where: {
            tenantId: receiverId,
            unit: { property: { ownerId: userId } },
          },
        });
        if (!validRelationship) {
          return NextResponse.json(
            { error: "You can only message tenants who rent from your properties." },
            { status: 403 }
          );
        }
      }
    } else if (userRole === "INSPECTOR") {
      const receiver = await prisma.user.findUnique({
        where: { id: receiverId },
        select: { id: true, role: true },
      });
      if (receiver?.role !== "SUPERADMIN") {
        const valid = await prisma.maintenanceRequest.findFirst({
          where: {
            inspectorId: userId,
            OR: [
              { tenantId: receiverId },
              { unit: { property: { ownerId: receiverId } } }
            ]
          }
        });
        if (!valid) {
          return NextResponse.json({ error: "You can only message users related to your assigned tickets." }, { status: 403 });
        }
      }
    }

    const conversationId = [userId, receiverId].sort().join("_");

    const message = await prisma.message.create({
      data: {
        senderId: userId,
        receiverId,
        content,
        isRead: false,
        conversationId,
        attachmentUrl: attachmentUrl || null,
        messageType: messageType || "TEXT",
        deliveryChannel,
        ticketId: ticketId || null,
        leaseId: leaseId || null,
      },
      include: {
        sender: { select: { id: true, name: true, email: true, role: true } },
        receiver: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (deliveryChannel === "EMAIL_NOTIFIED") {
      await prisma.notification.create({
        data: {
          userId: receiverId,
          title: "New Tenant Inquiry (Email Notification)",
          message: `Tenant ${session.user.name || session.user.email} sent an inquiry: "${content.substring(0, 100)}...". Upgrade your subscription plan to enable 1-click live chat reply.`,
          type: "MESSAGE",
          priority: "HIGH",
          relatedEntityId: message.id
        }
      });
      notificationEmitter.emit(`notification:${receiverId}`, {
        type: "MESSAGE",
        title: "New Tenant Inquiry (Email Notification)",
        message: `Tenant ${session.user.name || session.user.email} sent an inquiry.`
      });

      return NextResponse.json({
        ...message,
        fallbackMode: true,
        info: "Message delivered via Email notification to property manager."
      }, { status: 201 });
    }

    // Phase 1: Real-time broadcast to the receiver
    notificationEmitter.emit(`message:${receiverId}`, message);

    return NextResponse.json(message, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to send message" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    const { senderId } = await req.json();

    if (!senderId) {
      return NextResponse.json({ error: "Missing sender ID" }, { status: 400 });
    }

    await prisma.message.updateMany({
      where: {
        senderId,
        receiverId: userId,
        isRead: false
      },
      data: {
        isRead: true
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to mark messages as read" }, { status: 500 });
  }
}
