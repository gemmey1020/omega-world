import type { VendorAPI } from "@/types/vendor";

export interface CheckoutWhatsAppItem {
  title: string;
  price: number;
  quantity: number;
}

export interface JoinLeadPayload {
  business_name: string;
  owner_name: string;
  whatsapp_number: string;
  zone_name: string;
}

function normalizeNumber(rawNumber: string): string {
  return rawNumber.replace(/[^\d]/g, "");
}

export function buildJoinWhatsAppURL(targetNumber: string, payload: JoinLeadPayload): string {
  const normalizedTarget = normalizeNumber(targetNumber);

  if (!normalizedTarget) {
    throw new Error("Join WhatsApp number is missing or invalid.");
  }

  const messageLines = [
    "OMEGA Join Request",
    `Business: ${payload.business_name}`,
    `Owner: ${payload.owner_name}`,
    `Phone: ${payload.whatsapp_number}`,
    `Zone: ${payload.zone_name}`,
  ];

  return `https://wa.me/${normalizedTarget}?text=${encodeURIComponent(messageLines.join("\n"))}`;
}

export function buildWhatsAppCheckoutURL(
  vendor: Pick<VendorAPI, "name" | "whatsapp_number">,
  items: readonly CheckoutWhatsAppItem[],
  deviceHash: string,
): string {
  const normalizedTarget = normalizeNumber(vendor.whatsapp_number);

  if (!normalizedTarget) {
    throw new Error("Vendor WhatsApp number is missing or invalid.");
  }

  const orderLines = items.map((item) => {
    const lineTotal = item.price * item.quantity;
    return `- ${item.title} x${item.quantity} = EGP ${lineTotal.toFixed(2)}`;
  });

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const message = [
    `Order Request - ${vendor.name}`,
    `Device Hash: ${deviceHash}`,
    "Items:",
    ...orderLines,
    `Total: EGP ${total.toFixed(2)}`,
  ].join("\n");

  return `https://wa.me/${normalizedTarget}?text=${encodeURIComponent(message)}`;
}
