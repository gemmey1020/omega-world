"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, SkipForward, Trash2 } from "lucide-react";
import OrangeLaserButton from "@/components/ui/OrangeLaserButton";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { useStaging } from "@/context/StagingContext";
import { getDeviceHash } from "@/lib/device";
import { triggerHaptic } from "@/lib/haptic";
import { buildWhatsAppCheckoutURL } from "@/lib/whatsapp";

export default function CheckoutPage() {
  const {
    bundles,
    activeBundleIndex,
    startBatchHandoff,
    advanceHandoff,
    skipBundle,
    clearStaging,
  } = useStaging();

  const [pendingConfirmationIndex, setPendingConfirmationIndex] = useState<number | null>(null);

  useEffect(() => {
    startBatchHandoff();
  }, [startBatchHandoff]);

  const progress = useMemo(() => {
    const sentCount = bundles.filter((bundle) => bundle.status === "sent").length;

    return {
      sentCount,
      totalCount: bundles.length,
    };
  }, [bundles]);

  function handleSendBundle(index: number): void {
    const bundle = bundles[index];

    if (!bundle || bundle.status !== "pending") {
      return;
    }

    triggerHaptic(80);

    const checkoutUrl = buildWhatsAppCheckoutURL(
      {
        name: bundle.vendor_name,
        whatsapp_number: bundle.whatsapp_number,
      },
      bundle.items,
      getDeviceHash(),
      null,
    );

    const opened = window.open(checkoutUrl, "_blank", "noopener,noreferrer");

    if (!opened) {
      window.location.assign(checkoutUrl);
    }

    setPendingConfirmationIndex(index);
  }

  function handleConfirmSent(index: number): void {
    if (pendingConfirmationIndex !== index) {
      return;
    }

    triggerHaptic(50);
    advanceHandoff();
    setPendingConfirmationIndex(null);
  }

  if (bundles.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
        <Clock3 className="h-10 w-10 text-muted" />
        <h1 className="text-2xl font-bold text-navy">Batch Checkout</h1>
        <p className="max-w-xs text-sm text-muted">
          No staged bundles yet. Stage vendor carts first, then return here for serial WhatsApp handoff.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-background px-6 pb-10 pt-8">
      <div className="mx-auto max-w-xl">
        <header className="mb-8 space-interactive-y rounded-[var(--radius-primary)] border border-slate/20 bg-white p-5">
          <div>
            <h1 className="text-2xl font-bold text-navy">Your Orders</h1>
            <p className="mt-1 text-sm text-muted">Send each vendor order one-by-one to keep checkout isolated.</p>
          </div>

          <div className="rounded-[var(--radius-secondary)] bg-slate/10 px-4 py-3 text-sm text-navy">
            Progress: <span className="font-semibold">{progress.sentCount}</span> of <span className="font-semibold">{progress.totalCount}</span> sent
          </div>

          <PrimaryButton
            type="button"
            onClick={clearStaging}
            className="w-full border border-red-300 bg-red-500 hover:bg-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Staging
          </PrimaryButton>
        </header>

        <div className="space-interactive-y">
          {bundles.map((bundle, index) => {
            const itemCount = bundle.items.reduce((sum, item) => sum + item.quantity, 0);
            const total = bundle.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const isActive = index === activeBundleIndex && bundle.status === "pending";
            const isPendingConfirmation = pendingConfirmationIndex === index;

            return (
              <article
                key={`${bundle.vendor_id}-${index}`}
                className={`rounded-[var(--radius-primary)] border bg-white p-5 ${
                  isActive ? "border-laser/60 shadow-md" : "border-slate/20"
                }`}
              >
                <div className="mb-5 flex items-start justify-between gap-5">
                  <div>
                    <h2 className="text-lg font-semibold text-navy">{bundle.vendor_name}</h2>
                    <p className="mt-1 text-sm text-muted">
                      {itemCount} item(s) • EGP {total.toFixed(2)}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                      bundle.status === "sent"
                        ? "bg-emerald/20 text-emerald"
                        : bundle.status === "skipped"
                          ? "bg-red-100 text-red-700"
                          : isActive
                            ? "bg-laser/15 text-laser"
                            : "bg-slate/15 text-muted"
                    }`}
                  >
                    {bundle.status === "sent"
                      ? "Sent"
                      : bundle.status === "skipped"
                        ? "Skipped"
                        : isActive
                          ? "Ready"
                          : "Queued"}
                  </span>
                </div>

                {bundle.status === "pending" ? (
                  <div className="space-interactive-y">
                    <OrangeLaserButton
                      type="button"
                      onClick={() => handleSendBundle(index)}
                      disabled={!isActive}
                      className="w-full"
                    >
                      Send on WhatsApp
                    </OrangeLaserButton>

                    {isPendingConfirmation ? (
                      <PrimaryButton
                        type="button"
                        onClick={() => handleConfirmSent(index)}
                        className="w-full bg-emerald hover:bg-emerald/90"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        I Sent This Order
                      </PrimaryButton>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => {
                        skipBundle(index);
                        setPendingConfirmationIndex(null);
                      }}
                      className="flex min-h-14 w-full items-center justify-center rounded-[var(--radius-secondary)] border border-slate/20 px-4 py-3 text-sm font-semibold text-muted transition hover:border-slate/40"
                    >
                      <SkipForward className="mr-2 h-4 w-4" />
                      Skip Bundle
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
