import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const { to, subject, text, html, attachments } = options;

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
        attachments,
      });
      console.log(`[Email] Sent via SMTP to ${to}: "${subject}"`);
      return;
    } catch (err) {
      console.error("[Email] Failed to send via SMTP:", err);
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
