"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, MapPin, Search, Store, TriangleAlert } from "lucide-react";
import { getVendorsByZone } from "@/lib/api";
import { formatSubscriptionReason } from "@/lib/subscription";
import { useZone } from "@/hooks/useZone";
import type { VendorAPI } from "@/types/vendor";

export default function VendorsPage() {
  const { activeZone, clearZone } = useZone();
  const [vendors, setVendors] = useState<VendorAPI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    if (!activeZone) {
      setVendors([]);
      setLoading(false);
      return;
    }

    const zoneId = activeZone.id;
    let isMounted = true;

    async function fetchVendors() {
      setLoading(true);
      setError(null);

      try {
        const nextVendors = await getVendorsByZone(zoneId);

        if (isMounted) {
          setVendors(nextVendors);
        }
      } catch {
        if (isMounted) {
          setError("Unable to load vendors for this zone.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void fetchVendors();

    return () => {
      isMounted = false;
    };
  }, [activeZone]);

  const categoryOptions = useMemo(() => {
    const categorySet = new Set<string>();

    vendors.forEach((vendor) => {
      if (vendor.primary_category) {
        categorySet.add(vendor.primary_category);
      }
    });

    return ["all", ...Array.from(categorySet).sort((a, b) => a.localeCompare(b))];
  }, [vendors]);

  const filteredVendors = useMemo(() => {
    return vendors.filter((vendor) => {
      const matchesSearch = vendor.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === "all" || vendor.primary_category === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [vendors, searchQuery, activeCategory]);

  if (!activeZone) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <Store className="h-10 w-10 text-slate" />
        <h1 className="text-xl font-semibold text-navy">Zone Required</h1>
        <p className="text-sm text-slate">Select your zone first to view hyper-local vendors.</p>
        <Link href="/" className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white">
          Choose Zone
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="sticky top-0 z-20 border-b border-slate/10 bg-background/90 px-6 py-4 backdrop-blur-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-navy">Local Vendors</h1>
            <div className="mt-1 flex items-center gap-1 text-xs text-slate">
              <MapPin className="h-3 w-3 text-emerald" />
              <span>{activeZone.name}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={clearZone}
            className="rounded-lg border border-slate/20 px-3 py-1.5 text-xs font-medium text-slate transition hover:border-navy/30 hover:text-navy"
          >
            Change Zone
          </button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate/60" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search vendors"
            className="w-full rounded-2xl border border-slate/15 bg-slate/5 py-2.5 pl-10 pr-4 text-sm text-navy outline-none transition focus:border-navy/30 focus:ring-1 focus:ring-navy/25"
          />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {categoryOptions.map((category) => {
            const isActive = category === activeCategory;
            const label = category === "all" ? "All" : category;

            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  isActive ? "bg-navy text-white" : "bg-slate/8 text-slate hover:bg-slate/15"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {loading ? (
          <div className="flex h-36 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate/20 border-t-navy" />
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-2xl border border-red-300/60 bg-red-50 p-4 text-sm text-red-700">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <TriangleAlert className="h-4 w-4" />
              <span>Vendor Fetch Failed</span>
            </div>
            <p>{error}</p>
          </div>
        ) : null}

        {!loading && !error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {filteredVendors.map((vendor) => (
              <article
                key={vendor.id}
                className={`rounded-3xl border p-4 ${
                  vendor.is_checkout_available
                    ? "border-slate/10 bg-white shadow-sm"
                    : "border-slate/10 bg-slate/5 opacity-85"
                }`}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-navy">{vendor.name}</h2>
                    <p className="mt-1 text-xs text-slate">
                      {vendor.primary_category ?? "General"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                      vendor.is_checkout_available
                        ? "bg-emerald/15 text-emerald"
                        : "bg-slate/12 text-slate"
                    }`}
                  >
                    {vendor.is_checkout_available ? "Checkout Ready" : "Waiting"}
                  </span>
                </div>

                <Link
                  href={`/vendors/${vendor.id}`}
                  className="block w-full rounded-xl bg-navy px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-navy/90"
                >
                  Open Catalog
                </Link>

                {!vendor.is_checkout_available ? (
                  <div className="mt-2 flex items-center gap-2 rounded-xl bg-slate/10 px-3 py-2.5 text-xs font-medium text-slate">
                    <AlertCircle className="h-4 w-4" />
                    <span>{formatSubscriptionReason(vendor.subscription.reason)}</span>
                  </div>
                ) : null}
              </article>
            ))}

            {filteredVendors.length === 0 ? (
              <div className="rounded-2xl border border-slate/15 bg-slate/5 p-6 text-center">
                <p className="text-sm text-slate">No vendors match your current filters.</p>
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
