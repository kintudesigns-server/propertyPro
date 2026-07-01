import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const generateLeasePDF = (lease: any) => {
  // Create a new jsPDF instance (portrait, points, A4)
  const doc = new jsPDF("p", "pt", "a4");
  
  // Custom colors and fonts
  const primaryColor = "#3B82F6"; // PropertyPro Blue
  const textColor = "#0F172A"; // Slate 900
  const lightText = "#64748B"; // Slate 500
  
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 40;

  // --- HEADER ---
  doc.setFontSize(24);
  doc.setTextColor(primaryColor);
  doc.text("PropertyPro", 40, currentY);
  
  doc.setFontSize(10);
  doc.setTextColor(lightText);
  doc.text("Official Lease Summary Document", 40, currentY + 15);
  
  doc.setFontSize(12);
  doc.setTextColor(textColor);
  const dateStr = `Generated: ${new Date().toLocaleDateString()}`;
  doc.text(dateStr, pageWidth - 40 - doc.getTextWidth(dateStr), currentY);
  
  currentY += 50;
  
  // --- LINE SEPARATOR ---
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.line(40, currentY, pageWidth - 40, currentY);
  currentY += 30;

  // --- TITLE ---
  doc.setFontSize(18);
  doc.setTextColor(textColor);
  doc.text("Lease Agreement Details", 40, currentY);
  currentY += 30;

  // --- PROPERTY & TENANT INFO (Two columns) ---
  const leftColX = 40;
  const rightColX = pageWidth / 2 + 10;
  
  // Property Info
  doc.setFontSize(10);
  doc.setTextColor(lightText);
  doc.text("PROPERTY INFORMATION", leftColX, currentY);
  
  doc.setFontSize(12);
  doc.setTextColor(textColor);
  doc.text(`${lease.unit?.property?.name || "N/A"}`, leftColX, currentY + 15);
  doc.setFontSize(11);
  doc.setTextColor(lightText);
  doc.text(`Unit: ${lease.unit?.name || "N/A"}`, leftColX, currentY + 30);
  doc.text(`${lease.unit?.property?.address || "No Address Provided"}`, leftColX, currentY + 45);
  doc.text(`${lease.unit?.property?.city || ""}, ${lease.unit?.property?.state || ""} ${lease.unit?.property?.zipCode || ""}`, leftColX, currentY + 60);

  // Tenant Info
  doc.setFontSize(10);
  doc.setTextColor(lightText);
  doc.text("TENANT INFORMATION", rightColX, currentY);
  
  doc.setFontSize(12);
  doc.setTextColor(textColor);
  doc.text(`${lease.tenant?.name || "N/A"}`, rightColX, currentY + 15);
  doc.setFontSize(11);
  doc.setTextColor(lightText);
  doc.text(`${lease.tenant?.email || "No Email Provided"}`, rightColX, currentY + 30);
  doc.text(`${lease.tenant?.phone || "No Phone Provided"}`, rightColX, currentY + 45);
  
  currentY += 90;

  // --- FINANCIALS TABLE ---
  doc.setFontSize(14);
  doc.setTextColor(textColor);
  doc.text("Financial Breakdown", 40, currentY);
  currentY += 15;

  autoTable(doc, {
    startY: currentY,
    head: [['Item', 'Amount']],
    body: [
      ['Monthly Rent', `$${Number(lease.monthlyRent || 0).toLocaleString()}`],
      ['Security Deposit', `$${Number(lease.deposit || 0).toLocaleString()}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] }, // Primary color
    styles: { fontSize: 11, cellPadding: 8 },
    margin: { left: 40, right: 40 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 30;

  // --- TERMS TABLE ---
  doc.setFontSize(14);
  doc.setTextColor(textColor);
  doc.text("Lease Terms", 40, currentY);
  currentY += 15;

  const formatDate = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleDateString() : "N/A";

  autoTable(doc, {
    startY: currentY,
    head: [['Detail', 'Value']],
    body: [
      ['Lease ID', lease.id],
      ['Status', lease.status],
      ['Start Date', formatDate(lease.startDate)],
      ['End Date', formatDate(lease.endDate)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 11, cellPadding: 8 },
    margin: { left: 40, right: 40 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 40;

  // --- FOOTER NOTE ---
  doc.setFontSize(10);
  doc.setTextColor(lightText);
  const footerText = "This document is a generated summary of the lease details stored in PropertyPro. It is not a legally binding contract unless accompanied by signatures.";
  
  const splitText = doc.splitTextToSize(footerText, pageWidth - 80);
  doc.text(splitText, 40, currentY);

  // Save the PDF
  const filename = `Lease_${lease.unit?.property?.name || "Property"}_Unit_${lease.unit?.name || ""}.pdf`.replace(/\s+/g, '_');
  doc.save(filename);
};

export const createInvoiceDoc = (lease: any) => {
  const doc = new jsPDF("p", "pt", "a4");
  
  const primaryColor = "#3B82F6"; 
  const textColor = "#0F172A"; 
  const lightText = "#64748B"; 
  
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 40;

  // Header
  doc.setFontSize(24);
  doc.setTextColor(primaryColor);
  doc.text("PropertyPro", 40, currentY);
  
  doc.setFontSize(20);
  doc.setTextColor(textColor);
  doc.text("INVOICE", pageWidth - 40 - doc.getTextWidth("INVOICE"), currentY);
  
  currentY += 40;
  
  // Invoice Meta
  const currentDate = new Date().toLocaleDateString();
  const dueDate = lease.startDate ? new Date(lease.startDate).toLocaleDateString() : currentDate;
  
  doc.setFontSize(10);
  doc.setTextColor(lightText);
  const invoiceId = `INV-${lease.id.substring(0,6).toUpperCase()}`;
  doc.text(`Invoice #: ${invoiceId}`, pageWidth - 40 - doc.getTextWidth(`Invoice #: ${invoiceId}`), currentY);
  doc.text(`Date Issued: ${currentDate}`, pageWidth - 40 - doc.getTextWidth(`Date Issued: ${currentDate}`), currentY + 15);
  doc.text(`Date Due: ${dueDate}`, pageWidth - 40 - doc.getTextWidth(`Date Due: ${dueDate}`), currentY + 30);
  
  // From / To
  doc.setFontSize(10);
  doc.setTextColor(lightText);
  doc.text("FROM", 40, currentY);
  
  doc.setFontSize(12);
  doc.setTextColor(textColor);
  doc.text(`${lease.unit?.property?.name || "Property Management"}`, 40, currentY + 15);
  doc.setFontSize(10);
  doc.setTextColor(lightText);
  doc.text(`${lease.unit?.property?.address || ""}`, 40, currentY + 30);
  doc.text(`${lease.unit?.property?.city || ""}, ${lease.unit?.property?.state || ""} ${lease.unit?.property?.zipCode || ""}`, 40, currentY + 45);

  currentY += 80;
  
  doc.setFontSize(10);
  doc.setTextColor(lightText);
  doc.text("BILLED TO", 40, currentY);
  
  doc.setFontSize(12);
  doc.setTextColor(textColor);
  doc.text(`${lease.tenant?.name || "Unknown Tenant"}`, 40, currentY + 15);
  doc.setFontSize(10);
  doc.setTextColor(lightText);
  doc.text(`${lease.tenant?.email || "No email"}`, 40, currentY + 30);
  doc.text(`${lease.tenant?.phone || "No phone"}`, 40, currentY + 45);

  currentY += 80;

  // Financials Table
  const monthlyRent = Number(lease.monthlyRent || 0);
  const deposit = Number(lease.deposit || 0);
  const lateFee = 50.00;
  const subTotal = monthlyRent + deposit;
  const tax = 0;
  const total = subTotal + tax;

  autoTable(doc, {
    startY: currentY,
    head: [['Description', 'Qty', 'Amount']],
    body: [
      ['Monthly Rent\nStandard monthly residential rent', '1', `$${monthlyRent.toLocaleString(undefined, {minimumFractionDigits: 2})}`],
      ['Security Deposit\nRefundable deposit upon lease termination', '1', `$${deposit.toLocaleString(undefined, {minimumFractionDigits: 2})}`],
      ['Late Fee\nApplied after 5th of the month', '-', `($${lateFee.toLocaleString(undefined, {minimumFractionDigits: 2})})`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [248, 250, 252], textColor: [100, 116, 139], fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 12 },
    columnStyles: {
      0: { cellWidth: 300 },
      1: { halign: 'center' },
      2: { halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 40, right: 40 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 30;

  // Totals
  const rightAlign = pageWidth - 40;
  
  doc.setFontSize(10);
  doc.setTextColor(lightText);
  doc.text("Subtotal:", rightAlign - 100, currentY);
  doc.setTextColor(textColor);
  doc.setFont("helvetica", 'bold');
  doc.text(`$${subTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`, rightAlign, currentY, { align: 'right' });
  
  currentY += 20;
  doc.setFont("helvetica", 'normal');
  doc.setTextColor(lightText);
  doc.text("Tax (0%):", rightAlign - 100, currentY);
  doc.setTextColor(textColor);
  doc.setFont("helvetica", 'bold');
  doc.text(`$${tax.toLocaleString(undefined, {minimumFractionDigits: 2})}`, rightAlign, currentY, { align: 'right' });

  currentY += 30;
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(2);
  doc.line(rightAlign - 150, currentY - 15, rightAlign, currentY - 15);
  
  doc.setFontSize(14);
  doc.text("Total Initial Payment:", rightAlign - 150, currentY);
  doc.setTextColor(primaryColor);
  doc.text(`$${total.toLocaleString(undefined, {minimumFractionDigits: 2})}`, rightAlign, currentY, { align: 'right' });

  currentY += 80;
  
  // Footer
  doc.setFontSize(9);
  doc.setTextColor(lightText);
  doc.setFont("helvetica", 'normal');
  const footerText = "Please pay your invoice by the due date. You can pay securely online through your tenant portal. Late payments may incur additional fees as specified in your lease agreement. If you have any questions about this invoice, please contact your property manager immediately.";
  const splitFooter = doc.splitTextToSize(footerText, pageWidth - 80);
  doc.text(splitFooter, 40, currentY);

  return { doc, invoiceId };
};

export const generateInvoicePDF = (lease: any) => {
  const { doc, invoiceId } = createInvoiceDoc(lease);
  const filename = `Invoice_${invoiceId}.pdf`;
  doc.save(filename);
};

export const generateInvoicePDFBase64 = (lease: any): string => {
  const { doc } = createInvoiceDoc(lease);
  // Return the base64 string (without the data:application/pdf;filename=generated.pdf;base64, prefix if possible, or just parse it)
  // output('datauristring') returns data:application/pdf;filename=generated.pdf;base64,.....
  // output('dataurlstring') is similar.
  // We can just return output('datauristring') and let the backend strip the prefix, or strip it here.
  const dataUri = doc.output('datauristring');
  return dataUri.split(',')[1]; // returns just the base64 string
};

export const generateSingleInvoicePDF = (invoice: any) => {
  const doc = new jsPDF("p", "pt", "a4");
  
  const primaryColor = "#3B82F6"; 
  const textColor = "#0F172A"; 
  const lightText = "#64748B"; 
  
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 40;

  // Header
  doc.setFontSize(24);
  doc.setTextColor(primaryColor);
  doc.text("PropertyPro", 40, currentY);
  
  doc.setFontSize(20);
  doc.setTextColor(textColor);
  doc.text("INVOICE", pageWidth - 40 - doc.getTextWidth("INVOICE"), currentY);
  
  currentY += 40;
  
  // Invoice Meta
  const currentDate = invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : new Date().toLocaleDateString();
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : new Date().toLocaleDateString();
  
  doc.setFontSize(10);
  doc.setTextColor(lightText);
  const invoiceId = `INV-${invoice.id.substring(0, 6).toUpperCase()}`;
  doc.text(`Invoice #: ${invoiceId}`, pageWidth - 40 - doc.getTextWidth(`Invoice #: ${invoiceId}`), currentY);
  doc.text(`Date Issued: ${currentDate}`, pageWidth - 40 - doc.getTextWidth(`Date Issued: ${currentDate}`), currentY + 15);
  doc.text(`Date Due: ${dueDate}`, pageWidth - 40 - doc.getTextWidth(`Date Due: ${dueDate}`), currentY + 30);
  doc.text(`Status: ${invoice.status}`, pageWidth - 40 - doc.getTextWidth(`Status: ${invoice.status}`), currentY + 45);
  
  // From / To
  doc.setFontSize(10);
  doc.setTextColor(lightText);
  doc.text("FROM", 40, currentY);
  
  doc.setFontSize(12);
  doc.setTextColor(textColor);
  doc.text(`${invoice.lease?.unit?.property?.name || "Property Management"}`, 40, currentY + 15);
  doc.setFontSize(10);
  doc.setTextColor(lightText);
  doc.text(`${invoice.lease?.unit?.property?.address || ""}`, 40, currentY + 30);
  doc.text(`${invoice.lease?.unit?.property?.city || ""}, ${invoice.lease?.unit?.property?.state || ""} ${invoice.lease?.unit?.property?.zip || invoice.lease?.unit?.property?.zipCode || ""}`, 40, currentY + 45);

  currentY += 80;
  
  doc.setFontSize(10);
  doc.setTextColor(lightText);
  doc.text("BILLED TO", 40, currentY);
  
  doc.setFontSize(12);
  doc.setTextColor(textColor);
  doc.text(`${invoice.lease?.tenant?.name || "Unknown Tenant"}`, 40, currentY + 15);
  doc.setFontSize(10);
  doc.setTextColor(lightText);
  doc.text(`${invoice.lease?.tenant?.email || "No email"}`, 40, currentY + 30);
  doc.text(`${invoice.lease?.tenant?.phone || "No phone"}`, 40, currentY + 45);

  currentY += 80;

  // Financials Table
  const amount = Number(invoice.amount || 0);
  const subTotal = amount;
  const tax = 0;
  const total = subTotal + tax;

  autoTable(doc, {
    startY: currentY,
    head: [['Description', 'Qty', 'Amount']],
    body: [
      ['Residential Rental Invoice\nCharges related to lease tenancy and billing schedule', '1', `$${amount.toLocaleString(undefined, {minimumFractionDigits: 2})}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [248, 250, 252], textColor: [100, 116, 139], fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 12 },
    columnStyles: {
      0: { cellWidth: 300 },
      1: { halign: 'center' },
      2: { halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 40, right: 40 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 30;

  // Totals
  const rightAlign = pageWidth - 40;
  
  doc.setFontSize(10);
  doc.setTextColor(lightText);
  doc.text("Subtotal:", rightAlign - 100, currentY);
  doc.setTextColor(textColor);
  doc.setFont("helvetica", 'bold');
  doc.text(`$${subTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`, rightAlign, currentY, { align: 'right' });
  
  currentY += 20;
  doc.setFont("helvetica", 'normal');
  doc.setTextColor(lightText);
  doc.text("Tax (0%):", rightAlign - 100, currentY);
  doc.setTextColor(textColor);
  doc.setFont("helvetica", 'bold');
  doc.text(`$${tax.toLocaleString(undefined, {minimumFractionDigits: 2})}`, rightAlign, currentY, { align: 'right' });

  currentY += 30;
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(2);
  doc.line(rightAlign - 150, currentY - 15, rightAlign, currentY - 15);
  
  doc.setFontSize(14);
  doc.text("Total Due:", rightAlign - 150, currentY);
  doc.setTextColor(primaryColor);
  doc.text(`$${total.toLocaleString(undefined, {minimumFractionDigits: 2})}`, rightAlign, currentY, { align: 'right' });

  currentY += 80;
  
  // Footer
  doc.setFontSize(9);
  doc.setTextColor(lightText);
  doc.setFont("helvetica", 'normal');
  const footerText = "Please pay your invoice by the due date. You can pay securely online through your tenant portal. Late payments may incur additional fees as specified in your lease agreement. If you have any questions about this invoice, please contact your property manager immediately.";
  const splitFooter = doc.splitTextToSize(footerText, pageWidth - 80);
  doc.text(splitFooter, 40, currentY);

  const filename = `Invoice_${invoiceId}.pdf`;
  doc.save(filename);
};

export const generatePDF = (htmlContent: string, filename: string) => {
  // Extract tenant info
  const tenantNameMatch = htmlContent.match(/Tenant Info<\/h3>\s*<p[^>]*>([^<]+)<\/p>\s*<p[^>]*>([^<]+)<\/p>/);
  const tenantName = tenantNameMatch ? tenantNameMatch[1].trim() : "N/A";
  const tenantEmail = tenantNameMatch ? tenantNameMatch[2].trim() : "";

  // Extract property info
  const propertyInfoMatch = htmlContent.match(/Property Info<\/h3>\s*<p[^>]*>([^<]+)<\/p>\s*<p[^>]*>([^<]+)<\/p>/);
  const propertyName = propertyInfoMatch ? propertyInfoMatch[1].trim() : "N/A";
  const propertyUnit = propertyInfoMatch ? propertyInfoMatch[2].trim() : "";

  // Extract deductions from table rows
  const deductions: [string, string][] = [];
  const rowRegex = /<tr[^>]*>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>(-?\$[^<]+)<\/td>\s*<\/tr>/g;
  let match;
  while ((match = rowRegex.exec(htmlContent)) !== null) {
    deductions.push([match[1].trim(), match[2].trim()]);
  }

  // Extract summary values
  const originalDepositMatch = htmlContent.match(/Original Deposit:<\/span>\s*<span[^>]*>([^<]+)<\/span>/);
  const originalDeposit = originalDepositMatch ? originalDepositMatch[1].trim() : "$0.00";

  const totalDeductionsMatch = htmlContent.match(/Total Deductions:<\/span>\s*<span[^>]*>([^<]+)<\/span>/);
  const totalDeductions = totalDeductionsMatch ? totalDeductionsMatch[1].trim() : "$0.00";

  const finalRefundMatch = htmlContent.match(/Final Refund:<\/span>\s*<span[^>]*>([^<]+)<\/span>/);
  const finalRefund = finalRefundMatch ? finalRefundMatch[1].trim() : "$0.00";

  // Generate the PDF beautifully
  const doc = new jsPDF("p", "pt", "a4");
  const primaryColor = "#3B82F6"; 
  const textColor = "#0F172A"; 
  const lightText = "#64748B"; 
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 40;

  // Header
  doc.setFontSize(24);
  doc.setTextColor(primaryColor);
  doc.text("PropertyPro", 40, currentY);
  
  doc.setFontSize(10);
  doc.setTextColor(lightText);
  doc.text("Security Deposit Disposition", 40, currentY + 15);

  const dateStr = `Generated: ${new Date().toLocaleDateString()}`;
  doc.setFontSize(12);
  doc.setTextColor(textColor);
  doc.text(dateStr, pageWidth - 40 - doc.getTextWidth(dateStr), currentY);

  currentY += 50;

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(40, currentY, pageWidth - 40, currentY);
  currentY += 30;

  // Title
  doc.setFontSize(18);
  doc.setTextColor(textColor);
  doc.text("Security Deposit Disposition Statement", 40, currentY);
  currentY += 30;

  // Info Section
  const leftColX = 40;
  const rightColX = pageWidth / 2 + 10;
  
  doc.setFontSize(10);
  doc.setTextColor(lightText);
  doc.text("TENANT INFORMATION", leftColX, currentY);
  
  doc.setFontSize(12);
  doc.setTextColor(textColor);
  doc.text(tenantName, leftColX, currentY + 15);
  doc.setFontSize(10);
  doc.setTextColor(lightText);
  doc.text(tenantEmail, leftColX, currentY + 30);

  doc.setFontSize(10);
  doc.setTextColor(lightText);
  doc.text("PROPERTY INFORMATION", rightColX, currentY);
  
  doc.setFontSize(12);
  doc.setTextColor(textColor);
  doc.text(propertyName, rightColX, currentY + 15);
  doc.setFontSize(10);
  doc.setTextColor(lightText);
  doc.text(propertyUnit, rightColX, currentY + 30);

  currentY += 70;

  // Table
  doc.setFontSize(14);
  doc.setTextColor(textColor);
  doc.text("Itemized Deductions", 40, currentY);
  currentY += 15;

  const tableBody = deductions.length > 0 ? deductions : [["No deductions recorded. Full deposit will be refunded.", "$0.00"]];

  autoTable(doc, {
    startY: currentY,
    head: [['Description', 'Amount Deducted']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 11, cellPadding: 8 },
    columnStyles: {
      1: { halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 40, right: 40 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 30;

  // Summary
  const rightAlign = pageWidth - 40;
  
  doc.setFontSize(10);
  doc.setTextColor(lightText);
  doc.text("Original Deposit:", rightAlign - 120, currentY);
  doc.setTextColor(textColor);
  doc.text(originalDeposit, rightAlign, currentY, { align: 'right' });
  
  currentY += 20;
  doc.setTextColor(lightText);
  doc.text("Total Deductions:", rightAlign - 120, currentY);
  doc.setTextColor("#EF4444");
  doc.text(totalDeductions, rightAlign, currentY, { align: 'right' });

  currentY += 30;
  doc.setDrawColor(226, 232, 240);
  doc.line(rightAlign - 150, currentY - 15, rightAlign, currentY - 15);
  
  doc.setFontSize(12);
  doc.setTextColor(textColor);
  doc.setFont("helvetica", 'bold');
  doc.text("Final Refund:", rightAlign - 120, currentY);
  doc.setTextColor("#10B981");
  doc.text(finalRefund, rightAlign, currentY, { align: 'right' });

  currentY += 60;

  // Footer note
  doc.setFontSize(9);
  doc.setFont("helvetica", 'normal');
  doc.setTextColor(lightText);
  const footerText = "This statement is an official security deposit disposition summary generated by PropertyPro. If you have any questions regarding these deductions or refund processing, please contact the management office.";
  const splitFooter = doc.splitTextToSize(footerText, pageWidth - 80);
  doc.text(splitFooter, 40, currentY);

  doc.save(filename);
};


