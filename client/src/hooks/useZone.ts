import { useState, useEffect } from "react";
import Cookies from "js-cookie";

export interface Zone {
    id: string;
    name: string;
}

export function useZone() {
    const [activeZone, setActiveZone] = useState<Zone | null>(null);

    useEffect(() => {
        const zoneId = Cookies.get("zone_id");
        const zoneName = Cookies.get("zone_name");
        if (zoneId && zoneName) {
            setActiveZone({ id: zoneId, name: zoneName });
        }
    }, []);

    const selectZone = (zone: Zone) => {
        // Ensuring "Secure" flag usage for state persistence (and sameSite: 'strict' for trust center design)
        Cookies.set("zone_id", zone.id, { secure: true, sameSite: "strict" });
        Cookies.set("zone_name", zone.name, { secure: true, sameSite: "strict" });
        setActiveZone(zone);
    };

    const clearZone = () => {
        Cookies.remove("zone_id");
        Cookies.remove("zone_name");
        setActiveZone(null);
    };

    return { activeZone, selectZone, clearZone };
}
