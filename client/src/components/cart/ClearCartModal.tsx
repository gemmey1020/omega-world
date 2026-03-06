"use client";

import { AnimatePresence, motion } from "framer-motion";

interface ClearCartModalProps {
  isOpen: boolean;
  vendorName: string | null;
  onKeepCart: () => void;
  onClearAndSwitch: () => void;
}

export default function ClearCartModal({
  isOpen,
  vendorName,
  onKeepCart,
  onClearAndSwitch,
}: ClearCartModalProps) {
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
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
          >
            <h2 className="text-lg font-semibold text-navy">Switch Vendor?</h2>
            <p className="mt-2 text-sm text-slate">
              You already have items from <span className="font-semibold text-navy">{vendorName ?? "another vendor"}</span>.
              Starting a new order will clear your current cart.
            </p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={onKeepCart}
                className="flex-1 rounded-xl border border-slate/20 px-3 py-2.5 text-sm font-medium text-slate transition hover:border-slate/40"
              >
                Keep Cart
              </button>
              <button
                type="button"
                onClick={onClearAndSwitch}
                className="flex-1 rounded-xl bg-red-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600"
              >
                Clear &amp; Switch
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
