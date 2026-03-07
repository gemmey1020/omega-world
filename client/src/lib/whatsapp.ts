import type { VendorAPI } from "@/types/vendor";

export interface CheckoutWhatsAppItem {
  title: string;
  price: number;
  quantity: number;
}

function normalizeNumber(rawNumber: string): string {
  return rawNumber.replace(/[^\d]/g, "");
}

export function buildWhatsAppCheckoutURL(
  vendor: Pick<VendorAPI, "name" | "whatsapp_number">,
  items: readonly CheckoutWhatsAppItem[],
  deviceHash: string,
  shareCartUrl?: string | null,
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
    ...(shareCartUrl ? [`Share this cart: ${shareCartUrl}`] : []),
  ].join("\n");

  return `https://wa.me/${normalizedTarget}?text=${encodeURIComponent(message)}`;
}
