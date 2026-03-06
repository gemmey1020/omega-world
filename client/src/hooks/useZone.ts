import { useCallback, useState } from "react";
import Cookies from "js-cookie";
import type { SelectedZone } from "@/types/zone";

function canUseSecureCookies(): boolean {
  return typeof window !== "undefined" && window.location.protocol === "https:";
}

export function useZone() {
  const [activeZone, setActiveZone] = useState<SelectedZone | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const zoneIdCookie = Cookies.get("zone_id");
    const zoneName = Cookies.get("zone_name");

    if (!zoneIdCookie || !zoneName) {
      return null;
    }

    const zoneId = Number.parseInt(zoneIdCookie, 10);

    if (Number.isNaN(zoneId)) {
      return null;
    }

    return { id: zoneId, name: zoneName };
  });

  const selectZone = useCallback((zone: SelectedZone) => {
    const secure = canUseSecureCookies();

    Cookies.set("zone_id", String(zone.id), { secure, sameSite: "strict" });
    Cookies.set("zone_name", zone.name, { secure, sameSite: "strict" });
    setActiveZone(zone);
  }, []);

  const clearZone = useCallback(() => {
    Cookies.remove("zone_id");
    Cookies.remove("zone_name");
    setActiveZone(null);
  }, []);

  return { activeZone, selectZone, clearZone };
}
