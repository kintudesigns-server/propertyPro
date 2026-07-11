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

    const info = await transporter.sendMail({
      from: `PropertyPro <${smtpFrom}>`,
      to,
      subject,
      text: message,
      html: `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; padding: 40px 0; width: 100%;">
          <div style="max-w-2xl mx-auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); max-width: 600px; margin: 0 auto;">
            <!-- Header -->
            <div style="background-color: #3B82F6; padding: 32px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">PropertyPro</h1>
              <p style="color: #BFDBFE; margin: 8px 0 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Invoice Attached</p>
            </div>
            
            <!-- Body -->
            <div style="padding: 40px;">
              <p style="color: #0F172A; font-size: 16px; line-height: 1.6; margin-top: 0; margin-bottom: 24px;">
                ${message.replace(/\n/g, '<br/>')}
              </p>
              
              <div style="background-color: #F1F5F9; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
                <p style="color: #64748B; font-size: 14px; font-weight: 600; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Attached Document</p>
                <p style="color: #0F172A; font-size: 18px; font-weight: 700; margin: 0;">Invoice_${invoiceId}.pdf</p>
              </div>
              
              <div style="text-align: center;">
                <a href="#" style="display: inline-block; background-color: #10B981; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);">
                  Pay Online in Tenant Portal
                </a>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 24px 40px; text-align: center;">
              <p style="color: #94A3B8; font-size: 13px; line-height: 1.5; margin: 0;">
                This is an automated message from your property management team.<br/>
                Please do not reply directly to this email.
              </p>
            </div>
          </div>
        </div>
      `,
      attachments
    });

    console.log("Message sent: %s", info.messageId);



    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
