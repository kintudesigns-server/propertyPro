import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  const searchParams = req.nextUrl.searchParams;
  const tenantIdParam = searchParams.get("tenantId");

  try {
    let whereClause: any = {};

    if (role === "TENANT") {
      whereClause.tenantId = userId;
    } else if (tenantIdParam) {
      whereClause.tenantId = tenantIdParam;
    }

    const documents = await prisma.document.findMany({
      where: whereClause,
      include: {
        property: true
      },
      orderBy: { uploadedAt: "desc" }
    });

    return NextResponse.json(documents);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, url, category, fileSize, tenantId, type, description, tags, propertyId } = await req.json();

    if (!name || !url || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const finalTenantId = (session.user as any).role === "TENANT" 
      ? (session.user as any).id 
      : (tenantId || (session.user as any).id);

    const document = await prisma.document.create({
      data: {
        name,
        url,
        category,
        type: type || "Other",
        description: description || null,
        tags: tags || [],
        fileSize: fileSize || "1.0 MB",
        tenantId: finalTenantId,
        propertyId: propertyId || null
      }
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create document" }, { status: 500 });
  }
}
