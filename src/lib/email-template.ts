export interface SaaSEmailOptions {
  brandName?: string;
  preheader?: string;
  categoryBadge?: string;
  badgeType?: "default" | "success" | "warning" | "danger" | "info";
  title: string;
  subtitle?: string;
  greeting?: string;
  bodyParagraphs?: string[];
  statusPill?: {
    text: string;
    type: "success" | "warning" | "danger" | "info" | "neutral";
  };
  summaryCard?: {
    title?: string;
    items: Array<{ label: string; value: string }>;
  };
  primaryAction?: {
    label: string;
    url: string;
  };
  secondaryAction?: {
    label: string;
    url: string;
  };
  infoNotice?: {
    title?: string;
    text: string;
    type?: "info" | "warning" | "success" | "danger";
  };
  checklist?: Array<{
    text: string;
    completed?: boolean;
  }>;
  footerNote?: string;
}

export function renderSaaSEmail(options: SaaSEmailOptions): string {
  const brandName = options.brandName || "PropertyPro";
  const year = new Date().getFullYear();

  // Status Pill Color Map
  const statusPillColors = {
    success: { bg: "#DCFCE7", text: "#15803D", border: "#86EFAC" },
    warning: { bg: "#FEF3C7", text: "#B45309", border: "#FDE68A" },
    danger: { bg: "#FEE2E2", text: "#B91C1C", border: "#FCA5A5" },
    info: { bg: "#E0F2FE", text: "#0369A1", border: "#7DD3FC" },
    neutral: { bg: "#F1F5F9", text: "#475569", border: "#CBD5E1" },
  };

  // Info Notice Color Map
  const infoNoticeColors = {
    info: { bg: "#F0F9FF", border: "#BAE6FD", text: "#0369A1" },
    warning: { bg: "#FFFBEB", border: "#FDE68A", text: "#B45309" },
    success: { bg: "#F0FDF4", border: "#BBF7D0", text: "#15803D" },
    danger: { bg: "#FEF2F2", border: "#FECACA", text: "#B91C1C" },
  };

  const pillStyle = options.statusPill
    ? statusPillColors[options.statusPill.type] || statusPillColors.neutral
    : null;

  const noticeStyle = options.infoNotice
    ? infoNoticeColors[options.infoNotice.type || "info"] || infoNoticeColors.info
    : null;

  const preheaderHtml = options.preheader
    ? `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${options.preheader}</div>`
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%;">
  ${preheaderHtml}
  
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Email Card -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #0F172A; padding: 32px 36px; text-align: left;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left">
                    <div style="display: inline-block; vertical-align: middle;">
                      <table border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="background-color: #1E293B; border: 1px solid #334155; border-radius: 10px; padding: 8px 12px; color: #FFFFFF; font-weight: 700; font-size: 16px; letter-spacing: -0.3px;">
                            🏢 ${brandName}
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                  ${
                    options.categoryBadge
                      ? `
                  <td align="right">
                    <span style="color: #94A3B8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px;">
                      ${options.categoryBadge}
                    </span>
                  </td>
                  `
                      : ""
                  }
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              
              <!-- Title & Status Pill -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #0F172A; letter-spacing: -0.5px; line-height: 1.3;">
                      ${options.title}
                    </h1>
                    ${
                      options.subtitle
                        ? `<p style="margin: 6px 0 0 0; font-size: 14px; color: #64748B; line-height: 1.5;">${options.subtitle}</p>`
                        : ""
                    }
                  </td>
                  ${
                    options.statusPill && pillStyle
                      ? `
                  <td align="right" valign="top" style="padding-left: 12px;">
                    <span style="display: inline-block; background-color: ${pillStyle.bg}; color: ${pillStyle.text}; border: 1px solid ${pillStyle.border}; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">
                      ${options.statusPill.text}
                    </span>
                  </td>
                  `
                      : ""
                  }
                </tr>
              </table>

              <!-- Greeting -->
              ${
                options.greeting
                  ? `<p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #0F172A;">${options.greeting}</p>`
                  : ""
              }

              <!-- Body Paragraphs -->
              ${
                options.bodyParagraphs && options.bodyParagraphs.length > 0
                  ? options.bodyParagraphs
                      .map(
                        (p) =>
                          `<p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">${p}</p>`
                      )
                      .join("")
                  : ""
              }

              <!-- Summary Card Grid -->
              ${
                options.summaryCard && options.summaryCard.items.length > 0
                  ? `
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin: 24px 0;">
                <tr>
                  <td style="padding: 20px 24px;">
                    ${
                      options.summaryCard.title
                        ? `<h3 style="margin: 0 0 14px 0; font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 1px;">${options.summaryCard.title}</h3>`
                        : ""
                    }
                    <table width="100%" border="0" cellpadding="0" cellspacing="0">
                      ${options.summaryCard.items
                        .map(
                          (item, index) => `
                        <tr>
                          <td style="padding: 10px 0; color: #64748B; font-size: 14px; width: 40%; font-weight: 500;">${item.label}</td>
                          <td style="padding: 10px 0; color: #0F172A; font-size: 14px; font-weight: 600;" align="right">${item.value}</td>
                        </tr>
                        ${
                          index < options.summaryCard!.items.length - 1
                            ? `<tr><td colspan="2" style="border-bottom: 1px solid #E2E8F0;"></td></tr>`
                            : ""
                        }
                      `
                        )
                        .join("")}
                    </table>
                  </td>
                </tr>
              </table>
              `
                  : ""
              }

              <!-- Info Notice -->
              ${
                options.infoNotice && noticeStyle
                  ? `
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: ${noticeStyle.bg}; border: 1px solid ${noticeStyle.border}; border-radius: 10px; margin: 20px 0;">
                <tr>
                  <td style="padding: 14px 18px;">
                    ${
                      options.infoNotice.title
                        ? `<p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: ${noticeStyle.text};">${options.infoNotice.title}</p>`
                        : ""
                    }
                    <p style="margin: 0; font-size: 13px; color: ${noticeStyle.text}; line-height: 1.5;">${options.infoNotice.text}</p>
                  </td>
                </tr>
              </table>
              `
                  : ""
              }

              <!-- Checklist -->
              ${
                options.checklist && options.checklist.length > 0
                  ? `
              <div style="margin: 24px 0; padding-top: 16px; border-top: 1px solid #E2E8F0;">
                <p style="margin: 0 0 12px 0; font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 1px;">Next Steps Checklist</p>
                <table width="100%" border="0" cellpadding="0" cellspacing="0">
                  ${options.checklist
                    .map(
                      (item) => `
                    <tr>
                      <td style="padding: 6px 0; font-size: 14px; color: ${item.completed ? "#059669" : "#475569"}; font-weight: ${item.completed ? "600" : "400"};">
                        <span style="display: inline-block; width: 20px; font-weight: 700; color: ${item.completed ? "#059669" : "#94A3B8"};">${item.completed ? "✓" : "○"}</span>
                        ${item.text}
                      </td>
                    </tr>
                  `
                    )
                    .join("")}
                </table>
              </div>
              `
                  : ""
              }

              <!-- Call to Action Buttons -->
              ${
                options.primaryAction || options.secondaryAction
                  ? `
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-top: 28px; margin-bottom: 12px;">
                <tr>
                  <td align="center">
                    ${
                      options.primaryAction
                        ? `
                    <a href="${options.primaryAction.url}" style="display: inline-block; background-color: #0F172A; color: #FFFFFF; text-decoration: none; font-weight: 600; font-size: 14px; padding: 14px 28px; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.15); margin: 4px;">
                      ${options.primaryAction.label}
                    </a>
                    `
                        : ""
                    }
                    ${
                      options.secondaryAction
                        ? `
                    <a href="${options.secondaryAction.url}" style="display: inline-block; background-color: #F1F5F9; color: #0F172A; text-decoration: none; font-weight: 600; font-size: 14px; padding: 14px 24px; border-radius: 10px; border: 1px solid #CBD5E1; margin: 4px;">
                      ${options.secondaryAction.label}
                    </a>
                    `
                        : ""
                    }
                  </td>
                </tr>
              </table>
              `
                  : ""
              }

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 24px 36px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748B; font-weight: 500;">
                © ${year} ${brandName} Inc. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 12px; color: #94A3B8;">
                ${options.footerNote || "Automated notification from PropertyPro platform. If you have questions, please reply directly to this email or contact support."}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
