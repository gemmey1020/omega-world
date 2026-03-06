"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, ShieldCheck, TriangleAlert } from "lucide-react";
import { getZones } from "@/lib/api";
import { useZone } from "@/hooks/useZone";
import type { ZoneAPI } from "@/types/zone";

export default function ZoneSelectionPage() {
  const { activeZone, selectZone } = useZone();
  const [zones, setZones] = useState<ZoneAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchZones() {
      setLoading(true);
      setError(null);

      try {
        const nextZones = await getZones();

        if (isMounted) {
          setZones(nextZones);
        }
      } catch {
        if (isMounted) {
          setError("Unable to load active zones right now. Please try again.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void fetchZones();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="flex h-full flex-col bg-background px-6 pb-8 pt-12">
      <motion.div
        className="mb-10 text-center"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-navy shadow-lg shadow-navy/20">
          <ShieldCheck className="h-6 w-6 text-emerald" />
        </div>
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-navy">OMEGA World</h1>
        <p className="mx-auto max-w-[280px] text-sm leading-relaxed text-muted">
          Select your secure zone to unlock the hyper-local vendor network.
        </p>
      </motion.div>

      <div className="flex-1">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate/20 border-t-navy" />
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-2xl border border-red-300/60 bg-red-50 p-4 text-sm text-red-700">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <TriangleAlert className="h-4 w-4" />
              <span>Zone Fetch Failed</span>
            </div>
            <p>{error}</p>
          </div>
        ) : null}

        {!loading && !error && zones.length === 0 ? (
          <div className="rounded-2xl border border-slate/20 bg-slate/5 p-4 text-sm text-muted">
            No active zones are available yet.
          </div>
        ) : null}

        {!loading && !error && zones.length > 0 ? (
          <motion.div
            className="space-interactive-y"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {zones.map((zone) => {
              const isSelected = activeZone?.id === zone.id;

              return (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => selectZone({ id: zone.id, name: zone.name })}
                  className={`flex w-full items-center justify-between rounded-3xl border p-5 text-left transition-all duration-200 ${
                    isSelected
                      ? "border-emerald bg-emerald/5 shadow-md shadow-emerald/10"
                      : "border-slate/20 bg-white hover:border-navy/30 hover:shadow-lg"
                  }`}
                >
                  <div className="flex items-center gap-5">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        isSelected ? "bg-emerald/20 text-emerald" : "bg-slate/10 text-muted"
                      }`}
                    >
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className={`text-lg font-semibold ${isSelected ? "text-emerald" : "text-navy"}`}>
                        {zone.name}
                      </h3>
                      <p className="mt-1 text-xs text-muted">Active perimeter</p>
                    </div>
                  </div>
                  {isSelected ? <span className="h-3 w-3 rounded-full bg-emerald" /> : null}
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </div>

      <div className="pt-6">
        <Link
          href="/vendors"
          className="flex min-h-14 w-full items-center justify-center rounded-[var(--radius-secondary)] bg-navy px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-navy/90"
        >
          Continue to Vendors
        </Link>
      </div>
    </div>
  );
}
