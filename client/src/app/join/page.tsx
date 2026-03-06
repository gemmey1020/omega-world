"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useZone } from "@/hooks/useZone";
import { useScarcityCounter } from "@/hooks/useScarcityCounter";
import { getZones } from "@/lib/api";
import { buildJoinWhatsAppURL } from "@/lib/whatsapp";
import type { ZoneAPI } from "@/types/zone";

interface JoinFormState {
  business_name: string;
  owner_name: string;
  whatsapp_number: string;
  zone_id: string;
}

const EGYPT_MOBILE_PATTERN = /^\+20\d{10}$/;

export default function JoinPage() {
  const { activeZone } = useZone();
  const { remainingSeats, decrement } = useScarcityCounter();
  const [zones, setZones] = useState<ZoneAPI[]>([]);
  const [loadingZones, setLoadingZones] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState<JoinFormState>({
    business_name: "",
    owner_name: "",
    whatsapp_number: "",
    zone_id: "",
  });

  useEffect(() => {
    if (activeZone) {
      setForm((previous) => ({ ...previous, zone_id: String(activeZone.id) }));
      return;
    }

    let isMounted = true;

    async function fetchZones() {
      setLoadingZones(true);

      try {
        const fetchedZones = await getZones();

        if (isMounted) {
          setZones(fetchedZones);
        }
      } catch {
        if (isMounted) {
          setZones([]);
        }
      } finally {
        if (isMounted) {
          setLoadingZones(false);
        }
      }
    }

    void fetchZones();

    return () => {
      isMounted = false;
    };
  }, [activeZone]);

  const selectedZoneName = useMemo(() => {
    if (activeZone) {
      return activeZone.name;
    }

    const selectedZone = zones.find((zone) => String(zone.id) === form.zone_id);
    return selectedZone?.name ?? "";
  }, [activeZone, zones, form.zone_id]);

  function updateField(field: keyof JoinFormState, value: string): void {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function validateForm(): string | null {
    if (!form.business_name.trim()) {
      return "Business name is required.";
    }

    if (!form.owner_name.trim()) {
      return "Owner name is required.";
    }

    if (!EGYPT_MOBILE_PATTERN.test(form.whatsapp_number.trim())) {
      return "WhatsApp number must follow Egyptian format: +20XXXXXXXXXX";
    }

    if (!form.zone_id) {
      return "Zone is required.";
    }

    if (!selectedZoneName) {
      return "Selected zone is invalid.";
    }

    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSubmitError(null);

    const validationError = validateForm();

    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    const joinTarget = process.env.NEXT_PUBLIC_JOIN_WHATSAPP_NUMBER;

    if (!joinTarget) {
      setSubmitError("Join destination is not configured. Please contact support.");
      return;
    }

    const joinURL = buildJoinWhatsAppURL(joinTarget, {
      business_name: form.business_name.trim(),
      owner_name: form.owner_name.trim(),
      whatsapp_number: form.whatsapp_number.trim(),
      zone_name: selectedZoneName,
    });

    decrement();
    window.location.href = joinURL;
  }

  return (
    <div className="h-full overflow-y-auto bg-background px-6 pb-8 pt-10">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-navy">
            <ShieldCheck className="h-6 w-6 text-emerald" />
          </div>
          <h1 className="text-3xl font-bold text-navy">Join the OMEGA Family</h1>
          <p className="mt-2 text-sm text-slate">
            Start your hyper-local digital storefront and reach nearby customers.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-emerald/30 bg-emerald/10 p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald">Free Trial Scarcity</p>
          <p className="mt-1 text-2xl font-bold text-navy">Only {remainingSeats} seats left</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate/15 bg-white p-5 shadow-sm">
          <div>
            <label htmlFor="business_name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate">
              Business Name
            </label>
            <input
              id="business_name"
              type="text"
              value={form.business_name}
              onChange={(event) => updateField("business_name", event.target.value)}
              className="w-full rounded-xl border border-slate/15 px-3 py-2.5 text-sm text-navy outline-none transition focus:border-navy/35 focus:ring-1 focus:ring-navy/25"
              required
            />
          </div>

          <div>
            <label htmlFor="owner_name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate">
              Owner Name
            </label>
            <input
              id="owner_name"
              type="text"
              value={form.owner_name}
              onChange={(event) => updateField("owner_name", event.target.value)}
              className="w-full rounded-xl border border-slate/15 px-3 py-2.5 text-sm text-navy outline-none transition focus:border-navy/35 focus:ring-1 focus:ring-navy/25"
              required
            />
          </div>

          <div>
            <label htmlFor="whatsapp_number" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate">
              WhatsApp Number
            </label>
            <input
              id="whatsapp_number"
              type="tel"
              value={form.whatsapp_number}
              onChange={(event) => updateField("whatsapp_number", event.target.value)}
              placeholder="+201001234567"
              className="w-full rounded-xl border border-slate/15 px-3 py-2.5 text-sm text-navy outline-none transition focus:border-navy/35 focus:ring-1 focus:ring-navy/25"
              required
            />
          </div>

          <div>
            <label htmlFor="zone_id" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate">
              Zone
            </label>

            {activeZone ? (
              <input
                id="zone_id"
                type="text"
                value={activeZone.name}
                readOnly
                className="w-full rounded-xl border border-slate/15 bg-slate/5 px-3 py-2.5 text-sm text-navy"
              />
            ) : (
              <select
                id="zone_id"
                value={form.zone_id}
                onChange={(event) => updateField("zone_id", event.target.value)}
                className="w-full rounded-xl border border-slate/15 bg-white px-3 py-2.5 text-sm text-navy outline-none transition focus:border-navy/35 focus:ring-1 focus:ring-navy/25"
                required
                disabled={loadingZones}
              >
                <option value="">Select your zone</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={String(zone.id)}>
                    {zone.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {submitError ? (
            <p className="rounded-xl border border-red-300/60 bg-red-50 px-3 py-2 text-sm text-red-700">
              {submitError}
            </p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy/90"
          >
            Apply Now via WhatsApp
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate">
          Trusted by local vendors growing across secure OMEGA zones.
        </p>
      </div>
    </div>
  );
}
