"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, MapPin } from "lucide-react";
import { useZone } from "@/hooks/useZone";

interface ZoneData {
  id: string;
  name: string;
  status: string;
}

// Fallback data if API is unconfigured
const mockZones: ZoneData[] = [
  { id: "z-cairo-01", name: "New Cairo", status: "active" },
  { id: "z-giza-01", name: "Zayed City", status: "active" },
  { id: "z-alex-01", name: "Alexandria", status: "coming_soon" },
];

export default function ZoneSelection() {
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectZone, activeZone } = useZone();

  useEffect(() => {
    async function fetchZones() {
      try {
        // Assume fetching from central API or Next API Route. We fall back gracefully.
        const res = await fetch("/api/zones");
        if (res.ok) {
          const data = await res.json();
          setZones(data.data || data);
        } else {
          setZones(mockZones);
        }
      } catch (err) {
        setZones(mockZones);
      } finally {
        setLoading(false);
      }
    }
    fetchZones();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300 } },
  };

  return (
    <div className="flex flex-col h-full bg-background px-6 pt-12 pb-8">
      <motion.div
        className="flex-1"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-10 text-center">
          <div className="mx-auto w-12 h-12 bg-navy rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-navy/20">
            <ShieldCheck className="w-6 h-6 text-emerald" />
          </div>
          <h1 className="text-3xl font-bold text-navy mb-3 tracking-tight">Welcome to OMEGA</h1>
          <p className="text-slate text-sm max-w-[280px] mx-auto leading-relaxed">
            Your trust is our architecture. Select your active zone to initialize hyper-local services within a secure perimeter.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="w-8 h-8 border-4 border-slate/20 border-t-navy rounded-full animate-spin" />
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            {zones.map((zone) => (
              <motion.div key={zone.id} variants={itemVariants}>
                <button
                  onClick={() => selectZone(zone)}
                  disabled={zone.status !== "active"}
                  className={`w-full text-left p-5 rounded-3xl border transition-all duration-300 flex justify-between items-center group
                    ${activeZone?.id === zone.id
                      ? "border-emerald bg-emerald/5 shadow-md shadow-emerald/10"
                      : zone.status === "active"
                        ? "border-slate/20 bg-background hover:border-navy/30 hover:shadow-lg"
                        : "border-slate/10 bg-slate/5 opacity-60 cursor-not-allowed"
                    }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors
                      ${activeZone?.id === zone.id ? "bg-emerald/20 text-emerald" : "bg-slate/10 text-slate group-hover:bg-navy/10 group-hover:text-navy"}`}>
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className={`font-semibold text-lg ${activeZone?.id === zone.id ? "text-emerald" : "text-navy"}`}>
                        {zone.name}
                      </h3>
                      <p className="text-xs text-slate mt-1">
                        {zone.status === "active" ? "Active Perimeter" : "Deployment Pending"}
                      </p>
                    </div>
                  </div>
                  {activeZone?.id === zone.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-3 h-3 bg-emerald rounded-full"
                    />
                  )}
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>

      <motion.div
        className="mt-auto pt-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <p className="text-[10px] text-slate/60 font-mono uppercase tracking-widest">
          Secure Connection &bull; End-to-End Encrypted
        </p>
      </motion.div>
    </div>
  );
}
