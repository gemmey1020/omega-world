"use client";

import { AnimatePresence, motion } from "framer-motion";
import PrimaryButton from "@/components/ui/PrimaryButton";

interface ClearCartModalProps {
  isOpen: boolean;
  mode: "vendor-switch" | "shared-cart";
  vendorName: string | null;
  incomingVendorName?: string | null;
  onKeepCart: () => void;
  onConfirmAction: () => void;
}

export default function ClearCartModal({
  isOpen,
  mode,
  vendorName,
  incomingVendorName,
  onKeepCart,
  onConfirmAction,
}: ClearCartModalProps) {
  const title = mode === "shared-cart" ? "Shared Cart Received" : "Switch Vendor?";

  const message = mode === "shared-cart"
    ? `You received a shared cart from ${incomingVendorName ?? "another user"}. Keep your current cart or replace it with the shared items.`
    : `You already have items from ${vendorName ?? "another vendor"}. Starting a new order will clear your current cart.`;

  const confirmLabel = mode === "shared-cart" ? "Replace With Shared Cart" : "Clear & Switch";

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/55 px-6"
        >
          <motion.div
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            className="w-full max-w-sm rounded-[var(--radius-primary)] bg-white p-5 shadow-2xl"
          >
            <h2 className="text-lg font-semibold text-navy">{title}</h2>
            <p className="mt-2 text-sm text-muted">{message}</p>

            <div className="mt-5 flex flex-col gap-5">
              <PrimaryButton
                type="button"
                onClick={onKeepCart}
                className="w-full border border-slate/20 bg-white text-navy hover:bg-slate/10"
              >
                Keep Cart
              </PrimaryButton>

              <PrimaryButton
                type="button"
                onClick={onConfirmAction}
                className="w-full bg-red-500 hover:bg-red-600"
              >
                {confirmLabel}
              </PrimaryButton>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
