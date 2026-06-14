export function generateWhatsAppLink(
  invoice: { id: string; month: string; netAmount: number; currency: string },
  student: { name: string | null; whatsappNumber: string | null },
  parent?: { name: string | null; whatsappNumber: string | null } | null,
  stage: number = 1
) {
  const recipientName = parent?.name || student.name || "Student";
  const studentName = student.name || "Student";
  const rawPhone = parent?.whatsappNumber || student.whatsappNumber || "";
  // Clean phone number (keep digits, plus sign)
  const phone = rawPhone.replace(/[^\d+]/g, "");

  let message = "";
  switch (stage) {
    case 1:
      message = `Dear ${recipientName}, this is a friendly reminder that invoice ${invoice.id} for ${invoice.month} (Amount: ${invoice.netAmount} ${invoice.currency}) is due soon. Please process payment via the portal at your earliest convenience to ensure class continuity. Thank you!`;
      break;
    case 2:
      message = `Dear ${recipientName}, your invoice ${invoice.id} for ${invoice.month} (Amount: ${invoice.netAmount} ${invoice.currency}) is now overdue. Please settle this within 3 days to avoid temporary account deactivation. Thank you.`;
      break;
    case 3:
      message = `Dear ${recipientName}, we regret to inform you that access for ${studentName} has been temporarily deactivated due to unpaid invoice ${invoice.id}. Classes will resume immediately once the invoice is settled via the portal.`;
      break;
    case 4:
      message = `Dear ${recipientName}, thank you for submitting your payment receipt for invoice ${invoice.id}. Our finance team is currently verifying the transaction. Thank you!`;
      break;
    case 5:
      message = `Dear ${recipientName}, regarding invoice ${invoice.id} for ${invoice.month}, we understand there may be circumstances requiring flexibility. We would be happy to discuss a structured payment plan. Please contact us to set this up.`;
      break;
    default:
      message = `Dear ${recipientName}, regarding invoice ${invoice.id}. Please contact us. Thank you.`;
  }

  const encodedText = encodeURIComponent(message);
  return {
    url: `https://wa.me/${phone}?text=${encodedText}`,
    text: message,
    whatsappNumber: phone
  };
}
