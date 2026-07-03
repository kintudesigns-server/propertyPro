import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const { to, subject, text, html } = options;

  // 1. Try SMTP if configured in .env
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_PORT === "465",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@propertypro.com";
      await transporter.sendMail({
        from: `"PropertyPro" <${fromEmail}>`,
        to,
        subject,
        text: text || "",
        html: html || text || "",
      });
      console.log(`[Email] Sent via SMTP to ${to}: "${subject}"`);
      return;
    } catch (err) {
      console.error("[Email] Failed to send via SMTP:", err);
    }
  }

  // 2. Try Resend if configured
  if (process.env.RESEND_API_KEY) {
    try {
      // @ts-expect-error resend is dynamically imported and optional
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "PropertyPro <noreply@propertypro.com>",
        to,
        subject,
        text: text || "",
        html: html || text || "",
      });
      console.log(`[Email] Sent via Resend to ${to}: "${subject}"`);
      return;
    } catch (err) {
      console.error("[Email] Failed to send via Resend:", err);
    }
  }

  // Fallback: log to console for development
  console.log("─────────────────────────────────────────────");
  console.log(`📧 EMAIL (dev mode — no email credentials working/set)`);
  console.log(`   To:      ${to}`);
  console.log(`   Subject: ${subject}`);
  console.log(`   Body:    ${text?.slice(0, 200) || "(html only)"}`);
  console.log("─────────────────────────────────────────────");
}
