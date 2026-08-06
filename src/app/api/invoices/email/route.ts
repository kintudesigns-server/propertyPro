import { renderSaaSEmail } from "@/lib/email-template";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { to, subject, message, attachmentBase64, invoiceId } = await req.json();

    if (!to || !subject || !message) {
      return NextResponse.json({ error: "Missing required fields (to, subject, message)" }, { status: 400 });
    }

    // SMTP Configuration from Environment Variables
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASSWORD;
    const smtpFrom = process.env.SMTP_FROM || 'no-reply@propertypro.com';

    if (process.env.NODE_ENV === "production" && (!smtpHost || !smtpPort || !smtpUser || !smtpPass)) {
      return NextResponse.json({ error: "SMTP credentials are not configured in production environment" }, { status: 500 });
    }

    // Create in-app Database Notification for Tenant so it appears in their bell icon
    if (invoiceId) {
      try {
        const invoice = await prisma.invoice.findUnique({
          where: { id: invoiceId },
          include: { lease: { include: { unit: true } } }
        });
        if (invoice?.lease?.tenantId) {
          const propertyName = invoice.lease.unit?.propertyId 
            ? (await prisma.property.findUnique({ where: { id: invoice.lease.unit.propertyId } }))?.name 
            : "";
            
          await notify({
            userId: invoice.lease.tenantId,
            title: "Urgent Payment Reminder",
            message: `You have an outstanding invoice of $${Number(invoice.amount).toFixed(2)} due on ${invoice.dueDate.toLocaleDateString()}. Property: ${propertyName || "your unit"}.`,
            type: "PAYMENT",
            priority: "HIGH",
            relatedEntityId: invoice.id
          });
        }
      } catch (notifyErr) {
        console.error("Failed to create in-app notification for invoice reminder:", notifyErr);
      }
    }

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.warn("SMTP credentials are not fully configured in .env. Simulating email send.");
      // If not configured, we simulate a successful send for demo purposes
      return NextResponse.json({ success: true, simulated: true });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: Number(smtpPort) === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const attachments: any[] = [];
    if (attachmentBase64 && invoiceId) {
      attachments.push({
        filename: `Invoice_${invoiceId}.pdf`,
        content: attachmentBase64,
        encoding: 'base64',
        contentType: 'application/pdf'
      });
    }

    const portalUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/payments/pay-rent`;
    const info = await transporter.sendMail({
      from: `PropertyPro <${smtpFrom}>`,
      to,
      subject,
      text: message,
      html: renderSaaSEmail({
        categoryBadge: "INVOICE & BILLING",
        preheader: `An invoice has been generated for your account. Attached PDF: Invoice_${invoiceId}.pdf`,
        title: "New Invoice Issued",
        subtitle: `Invoice #${invoiceId}`,
        statusPill: { text: "PAYMENT DUE", type: "warning" },
        bodyParagraphs: message.split("\n").filter(Boolean),
        summaryCard: {
          title: "Invoice Overview",
          items: [
            { label: "Invoice ID", value: String(invoiceId) },
            { label: "Attached Document", value: `Invoice_${invoiceId}.pdf` },
            { label: "Payment Status", value: "Outstanding" },
          ],
        },
        primaryAction: {
          label: "Pay Online in Tenant Portal →",
          url: portalUrl,
        },
        infoNotice: {
          title: "Need help with payments?",
          text: "Log in to your PropertyPro tenant portal to review payment options or submit questions to your property manager.",
          type: "info",
        },
      }),
      attachments
    });

    console.log("Message sent: %s", info.messageId);



    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
