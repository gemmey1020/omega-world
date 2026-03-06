"use client";

import { useMemo } from "react";
import { AlertCircle, ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatSubscriptionReason } from "@/lib/subscription";
import { buildWhatsAppCheckoutURL } from "@/lib/whatsapp";
import type { ProductAPI, VendorCatalogAPI } from "@/types/vendor";

interface VendorCatalogClientProps {
  vendor: VendorCatalogAPI;
}

export default function VendorCatalogClient({ vendor }: VendorCatalogClientProps) {
  const { addItem, items, total, vendor_id, device_hash } = useCart();

  const cartItemsForVendor = useMemo(
    () => (vendor_id === vendor.id ? items : []),
    [vendor_id, vendor.id, items],
  );

  const cartCount = useMemo(
    () => cartItemsForVendor.reduce((count, item) => count + item.quantity, 0),
    [cartItemsForVendor],
  );

  function handleAddProduct(product: ProductAPI): void {
    addItem(
      { id: vendor.id, name: vendor.name },
      {
        product_id: product.id,
        title: product.title,
        price: Number(product.price),
        quantity: 1,
        image_url: product.image_url,
      },
    );
  }

  function handleCheckout(): void {
    if (cartItemsForVendor.length === 0) {
      return;
    }

    const checkoutURL = buildWhatsAppCheckoutURL(vendor, cartItemsForVendor, device_hash);
    window.location.href = checkoutURL;
  }

  return (
    <div className="relative flex h-full flex-col bg-background">
      <header className="border-b border-slate/10 px-6 py-4">
        <h1 className="text-2xl font-bold text-navy">{vendor.name}</h1>
        <p className="mt-1 text-sm text-slate">{vendor.primary_category ?? "Local essentials"}</p>

        {vendor.is_checkout_available ? (
          <p className="mt-3 inline-flex rounded-full bg-emerald/15 px-3 py-1 text-xs font-semibold text-emerald">
            Checkout available
          </p>
        ) : (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate/10 px-3 py-1 text-xs font-semibold text-slate">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{formatSubscriptionReason(vendor.subscription.reason)}</span>
          </div>
        )}
      </header>

      <main className="flex-1 space-y-6 overflow-y-auto px-6 pb-28 pt-5">
        {vendor.categories.map((category) => (
          <section key={category.id}>
            <h2 className="mb-3 text-lg font-semibold text-navy">{category.name}</h2>
            <div className="space-y-3">
              {category.products.map((product) => (
                <article
                  key={product.id}
                  className="rounded-2xl border border-slate/10 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-navy">{product.title}</h3>
                      <p className="mt-1 text-sm font-medium text-slate">EGP {Number(product.price).toFixed(2)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddProduct(product)}
                      disabled={!vendor.is_checkout_available}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        vendor.is_checkout_available
                          ? "bg-navy text-white hover:bg-navy/90"
                          : "cursor-not-allowed bg-slate/10 text-slate"
                      }`}
                    >
                      Add
                    </button>
                  </div>
                </article>
              ))}

              {category.products.length === 0 ? (
                <div className="rounded-xl border border-slate/10 bg-slate/5 p-3 text-xs text-slate">
                  No products in this category yet.
                </div>
              ) : null}
            </div>
          </section>
        ))}

        {vendor.categories.length === 0 ? (
          <div className="rounded-2xl border border-slate/15 bg-slate/5 p-4 text-sm text-slate">
            Catalog is currently empty.
          </div>
        ) : null}
      </main>

      <footer className="absolute inset-x-0 bottom-0 border-t border-slate/10 bg-white/95 px-6 py-4 backdrop-blur">
        <div className="mb-2 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-navy">
            <ShoppingCart className="h-4 w-4" />
            <span>{cartCount} item(s)</span>
          </div>
          <span className="font-semibold text-navy">EGP {total.toFixed(2)}</span>
        </div>
        <button
          type="button"
          onClick={handleCheckout}
          disabled={!vendor.is_checkout_available || cartItemsForVendor.length === 0}
          className="w-full rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white transition enabled:hover:bg-navy/90 disabled:cursor-not-allowed disabled:bg-slate/30"
        >
          Checkout on WhatsApp
        </button>
      </footer>
    </div>
  );
}
