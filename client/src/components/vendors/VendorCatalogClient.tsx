"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Layers, ShoppingCart } from "lucide-react";
import OrangeLaserButton from "@/components/ui/OrangeLaserButton";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { useCart } from "@/context/CartContext";
import { useStaging } from "@/context/StagingContext";
import { getVendorCatalog } from "@/lib/api";
import { generateCartShareURL } from "@/lib/cart-token";
import { triggerHaptic } from "@/lib/haptic";
import { formatSubscriptionReason } from "@/lib/subscription";
import { buildWhatsAppCheckoutURL } from "@/lib/whatsapp";
import type {
  CatalogLinksAPI,
  CatalogMetaAPI,
  CategoryAPI,
  ProductAPI,
  VendorCatalogAPI,
} from "@/types/vendor";

interface VendorCatalogClientProps {
  initialVendor: VendorCatalogAPI;
  initialMeta: CatalogMetaAPI;
  initialLinks: CatalogLinksAPI;
}

function mergeProducts(existing: ProductAPI[], incoming: ProductAPI[]): ProductAPI[] {
  if (incoming.length === 0) {
    return existing;
  }

  const productMap = new Map<number, ProductAPI>(existing.map((product) => [product.id, product]));
  let changed = false;

  incoming.forEach((product) => {
    const currentProduct = productMap.get(product.id);

    if (
      !currentProduct ||
      currentProduct.external_id !== product.external_id ||
      currentProduct.title !== product.title ||
      currentProduct.price !== product.price ||
      currentProduct.image_url !== product.image_url
    ) {
      productMap.set(product.id, product);
      changed = true;
    }
  });

  if (!changed) {
    return existing;
  }

  return Array.from(productMap.values());
}

function mergeCategories(existing: CategoryAPI[], incoming: CategoryAPI[]): CategoryAPI[] {
  if (incoming.length === 0) {
    return existing;
  }

  const categoryMap = new Map<number, CategoryAPI>(existing.map((category) => [category.id, category]));
  let changed = false;

  incoming.forEach((category) => {
    const currentCategory = categoryMap.get(category.id);

    if (!currentCategory) {
      changed = true;
      categoryMap.set(category.id, {
        ...category,
        products: [...category.products],
      });

      return;
    }

    const mergedProducts = mergeProducts(currentCategory.products, category.products);

    if (currentCategory.name === category.name && mergedProducts === currentCategory.products) {
      return;
    }

    changed = true;
    categoryMap.set(category.id, {
      ...currentCategory,
      name: category.name,
      products: mergedProducts,
    });
  });

  if (!changed) {
    return existing;
  }

  return Array.from(categoryMap.values());
}

function mergeVendorCatalog(previous: VendorCatalogAPI, incoming: VendorCatalogAPI): VendorCatalogAPI {
  return {
    ...incoming,
    categories: mergeCategories(previous.categories, incoming.categories),
  };
}

export default function VendorCatalogClient({
  initialVendor,
  initialMeta,
  initialLinks,
}: VendorCatalogClientProps) {
  const isMountedRef = useRef(true);
  const loadMoreInFlightRef = useRef(false);

  const [vendor, setVendor] = useState<VendorCatalogAPI>(initialVendor);
  const [catalogMeta, setCatalogMeta] = useState<CatalogMetaAPI>(initialMeta);
  const [catalogLinks, setCatalogLinks] = useState<CatalogLinksAPI>(initialLinks);

  const { addItem, items, total, vendor_id, device_hash, clearCart } = useCart();
  const { bundles, stageCurrentCart } = useStaging();

  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [stagingNotice, setStagingNotice] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  const cartItemsForVendor = useMemo(
    () => (vendor_id === vendor.id ? items : []),
    [vendor_id, vendor.id, items],
  );

  const cartCount = useMemo(
    () => cartItemsForVendor.reduce((count, item) => count + item.quantity, 0),
    [cartItemsForVendor],
  );

  const loadedProductsCount = useMemo(
    () => vendor.categories.reduce((count, category) => count + category.products.length, 0),
    [vendor.categories],
  );

  const canLoadMore = Boolean(catalogLinks.next) || catalogMeta.current_page < catalogMeta.last_page;

  function handleAddProduct(product: ProductAPI): void {
    setCheckoutError(null);
    setStagingNotice(null);

    addItem(
      { id: vendor.id, name: vendor.name, whatsapp_number: vendor.whatsapp_number },
      {
        product_id: product.id,
        title: product.title,
        price: Number(product.price),
        quantity: 1,
        image_url: product.image_url,
      },
    );
  }

  async function handleCheckout(): Promise<void> {
    if (cartItemsForVendor.length === 0) {
      return;
    }

    setCheckoutError(null);

    let shareCartUrl: string | null = null;

    try {
      shareCartUrl = await generateCartShareURL({
        vendor_id: vendor.id,
        vendor_name: vendor.name,
        items: cartItemsForVendor,
      });
    } catch {
      shareCartUrl = null;
    }

    try {
      const checkoutURL = buildWhatsAppCheckoutURL(
        vendor,
        cartItemsForVendor,
        device_hash,
        shareCartUrl,
      );

      window.location.href = checkoutURL;
    } catch (error) {
      if (isMountedRef.current) {
        setCheckoutError(error instanceof Error ? error.message : "Unable to start WhatsApp checkout.");
      }
    }
  }

  function handleStageCart(): void {
    if (cartItemsForVendor.length === 0) {
      return;
    }

    stageCurrentCart({
      vendor_id: vendor.id,
      vendor_name: vendor.name,
      whatsapp_number: vendor.whatsapp_number,
      items: cartItemsForVendor,
    });

    clearCart();
    triggerHaptic(50);
    setCheckoutError(null);
    setStagingNotice("Cart staged successfully. Continue shopping or complete batch checkout.");
  }

  async function handleLoadMore(): Promise<void> {
    if (!canLoadMore || loadingMore || loadMoreInFlightRef.current) {
      return;
    }

    loadMoreInFlightRef.current = true;
    setLoadMoreError(null);
    setLoadingMore(true);

    try {
      const nextPage = catalogMeta.current_page + 1;
      const nextCatalogPage = await getVendorCatalog(vendor.id, nextPage);

      if (!isMountedRef.current) {
        return;
      }

      setVendor((previousVendor) => mergeVendorCatalog(previousVendor, nextCatalogPage.vendor));
      setCatalogMeta(nextCatalogPage.meta);
      setCatalogLinks(nextCatalogPage.links);
    } catch {
      if (isMountedRef.current) {
        setLoadMoreError("Unable to load more products right now.");
      }
    } finally {
      loadMoreInFlightRef.current = false;

      if (isMountedRef.current) {
        setLoadingMore(false);
      }
    }
  }

  return (
    <div className="relative flex h-full flex-col bg-background">
      <header className="border-b border-slate/10 px-6 py-4">
        <h1 className="text-2xl font-bold text-navy">{vendor.name}</h1>
        <p className="mt-1 text-sm text-muted">{vendor.primary_category ?? "Local essentials"}</p>

        {vendor.is_checkout_available ? (
          <p className="mt-3 inline-flex rounded-full bg-emerald/15 px-3 py-1 text-xs font-semibold text-emerald">
            Checkout available
          </p>
        ) : (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate/10 px-3 py-1 text-xs font-semibold text-muted">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{formatSubscriptionReason(vendor.subscription.reason)}</span>
          </div>
        )}
      </header>

      <main className="flex-1 space-y-6 overflow-y-auto px-6 pb-44 pt-5">
        {vendor.categories.map((category) => (
          <section key={category.id}>
            <h2 className="mb-3 text-lg font-semibold text-navy">{category.name}</h2>
            <div className="space-interactive-y">
              {category.products.map((product) => (
                <article
                  key={product.id}
                  className="rounded-2xl border border-slate/10 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <h3 className="text-sm font-semibold text-navy">{product.title}</h3>
                      <p className="mt-1 text-sm font-medium text-muted">EGP {Number(product.price).toFixed(2)}</p>
                    </div>
                    <PrimaryButton
                      type="button"
                      onClick={() => handleAddProduct(product)}
                      disabled={!vendor.is_checkout_available}
                      className="min-h-10 rounded-lg px-3 py-1.5 text-xs"
                    >
                      Add
                    </PrimaryButton>
                  </div>
                </article>
              ))}

              {category.products.length === 0 ? (
                <div className="rounded-xl border border-slate/10 bg-slate/5 p-3 text-xs text-muted">
                  No products in this category yet.
                </div>
              ) : null}
            </div>
          </section>
        ))}

        {vendor.categories.length === 0 ? (
          <div className="rounded-2xl border border-slate/15 bg-slate/5 p-4 text-sm text-muted">
            Catalog is currently empty.
          </div>
        ) : null}

        <section className="space-interactive-y rounded-2xl border border-slate/15 bg-white p-4">
          <p className="text-xs text-muted">
            Showing {loadedProductsCount} of {catalogMeta.total} products.
          </p>

          {canLoadMore ? (
            <PrimaryButton
              type="button"
              onClick={() => {
                void handleLoadMore();
              }}
              disabled={loadingMore}
              className="w-full"
            >
              {loadingMore ? "Loading..." : "Load More Products"}
            </PrimaryButton>
          ) : (
            <p className="text-xs font-medium text-emerald">
              All available catalog pages are loaded.
            </p>
          )}

          {loadMoreError ? (
            <p className="rounded-xl border border-red-300/60 bg-red-50 px-3 py-2 text-xs text-red-700">
              {loadMoreError}
            </p>
          ) : null}
        </section>
      </main>

      <footer className="absolute inset-x-0 bottom-0 border-t border-slate/10 bg-white/95 px-6 py-4 backdrop-blur">
        <div className="mb-2 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-navy">
            <ShoppingCart className="h-4 w-4" />
            <span>{cartCount} item(s)</span>
          </div>
          <span className="font-semibold text-navy">EGP {total.toFixed(2)}</span>
        </div>

        <div className="space-interactive-y">
          <OrangeLaserButton
            type="button"
            onClick={() => {
              void handleCheckout();
            }}
            disabled={!vendor.is_checkout_available || cartItemsForVendor.length === 0}
            className="w-full"
          >
            Checkout on WhatsApp
          </OrangeLaserButton>

          <PrimaryButton
            type="button"
            onClick={handleStageCart}
            disabled={cartItemsForVendor.length === 0}
            className="w-full"
          >
            <Layers className="mr-2 h-4 w-4" />
            Stage Cart For Batch Checkout
          </PrimaryButton>

          <Link
            href="/checkout"
            className="flex min-h-14 w-full items-center justify-center rounded-[var(--radius-secondary)] border border-navy/20 px-4 py-3 text-sm font-semibold text-navy transition hover:border-navy/40"
          >
            Open Batch Checkout ({bundles.length})
          </Link>

          {stagingNotice ? (
            <p className="rounded-xl border border-emerald/20 bg-emerald/10 px-3 py-2 text-xs text-emerald">
              {stagingNotice}
            </p>
          ) : null}

          {checkoutError ? (
            <p className="rounded-xl border border-red-300/60 bg-red-50 px-3 py-2 text-xs text-red-700">
              {checkoutError}
            </p>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
