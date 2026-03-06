"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Store, ShoppingBasket, Beef, Croissant, Pill, Star, Clock, AlertCircle } from "lucide-react";
import { useZone } from "@/hooks/useZone";
import { Vendor, FilterState } from "@/types/vendor";
import { mockVendors, mockCategories } from "@/mocks/vendors";

// Map string icons from API/Mocks to Lucide components
const IconMap: Record<string, any> = {
    "shopping-basket": ShoppingBasket,
    "beef": Beef,
    "croissant": Croissant,
    "pill": Pill,
    "store": Store,
};

export default function VendorsFeed() {
    const { activeZone } = useZone();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);

    const [filters, setFilters] = useState<FilterState>({
        searchQuery: "",
        categoryId: null,
        isOpenNow: false,
        isFastDelivery: false,
    });

    useEffect(() => {
        async function fetchVendors() {
            try {
                setLoading(true);
                // Assuming API returns Vendors enriched with their Category
                const res = await fetch(`/api/vendors?zone_id=${activeZone?.id || ''}`);
                if (res.ok) {
                    const data = await res.json();
                    setVendors(data.data || data);
                } else {
                    setVendors(mockVendors);
                }
            } catch (err) {
                setVendors(mockVendors);
            } finally {
                setLoading(false);
            }
        }
        fetchVendors();
    }, [activeZone]);

    const filteredVendors = useMemo(() => {
        return vendors.filter(vendor => {
            // 1. Search (Name match)
            if (filters.searchQuery && !vendor.name.toLowerCase().includes(filters.searchQuery.toLowerCase())) {
                return false;
            }
            // 2. Category Match
            if (filters.categoryId && vendor.category_id !== filters.categoryId) {
                return false;
            }
            // 3. Open Now Match
            if (filters.isOpenNow && !vendor.isOpenNow) {
                return false;
            }
            // 4. Fast Delivery Match
            if (filters.isFastDelivery && !vendor.offersFastDelivery) {
                return false;
            }
            return true;
        });
    }, [vendors, filters]);

    // Framer Motion variants
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 },
        },
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.95 },
        show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 200, damping: 20 } },
        exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
    };

    return (
        <div className="flex flex-col h-full bg-background relative overflow-hidden">

            {/* Sticky Header & Search */}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-slate/10 px-6 py-4">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-xl font-bold text-navy tracking-tight">Local Feed</h1>
                        <div className="flex items-center text-xs text-slate mt-1 space-x-1">
                            <MapPin className="w-3 h-3 text-emerald" />
                            <span>{activeZone ? activeZone.name : "Select Zone"}</span>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate/10 flex justify-center items-center">
                        {/* Profile placeholder */}
                        <div className="w-4 h-4 rounded-full bg-slate/30" />
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate/50" />
                    <input
                        type="text"
                        placeholder="Search stores, pharmacies..."
                        value={filters.searchQuery}
                        onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                        className="w-full bg-slate/5 border border-slate/10 rounded-2xl py-3 pl-10 pr-4 text-sm text-navy placeholder:text-slate/50 focus:outline-none focus:border-navy/30 focus:ring-1 focus:ring-navy/30 transition-all"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-24">
                {/* Tier 1: Horizontal Category Scroll */}
                <div className="pt-4 pb-2 px-6">
                    <h2 className="text-xs font-semibold text-slate uppercase tracking-wider mb-3">Needs</h2>
                    <div className="flex space-x-3 overflow-x-auto no-scrollbar pb-2 -mx-6 px-6">
                        {mockCategories.map((cat) => {
                            const IconComponent = IconMap[cat.icon] || Store;
                            const isActive = filters.categoryId === cat.id;

                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setFilters(prev => ({ ...prev, categoryId: isActive ? null : cat.id }))}
                                    className={`flex flex-col flex-shrink-0 items-center justify-center p-3 rounded-2xl transition-all duration-300 w-20 
                    ${isActive
                                            ? "bg-navy text-white shadow-md shadow-navy/20"
                                            : "bg-slate/5 text-slate hover:bg-slate/10"}`}
                                >
                                    <IconComponent className={`w-6 h-6 mb-2 ${isActive ? "text-white" : "text-navy"}`} />
                                    <span className="text-[10px] font-medium">{cat.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tier 2: Status Toggles */}
                <div className="px-6 py-2 mb-4 flex space-x-2">
                    <button
                        onClick={() => setFilters(prev => ({ ...prev, isOpenNow: !prev.isOpenNow }))}
                        className={`px-4 py-2 rounded-full text-xs font-medium transition-all flex items-center space-x-2
              ${filters.isOpenNow ? "bg-emerald/10 text-emerald border border-emerald/20" : "bg-slate/5 text-slate border border-transparent"}
             `}
                    >
                        {filters.isOpenNow && <span className="w-1.5 h-1.5 rounded-full bg-emerald shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
                        <span>Open Now</span>
                    </button>

                    <button
                        onClick={() => setFilters(prev => ({ ...prev, isFastDelivery: !prev.isFastDelivery }))}
                        className={`px-4 py-2 rounded-full text-xs font-medium transition-all flex items-center space-x-2
              ${filters.isFastDelivery ? "bg-navy text-white shadow-md" : "bg-slate/5 text-slate"}
             `}
                    >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Fast Delivery</span>
                    </button>
                </div>

                {/* Vendor List */}
                <div className="px-6">
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
                            <AnimatePresence mode="popLayout">
                                {filteredVendors.length > 0 ? filteredVendors.map((vendor) => (
                                    <motion.div
                                        key={vendor.id}
                                        layout // Required for smooth re-ordering when filtering
                                        variants={cardVariants}
                                        initial="hidden"
                                        animate="show"
                                        exit="exit"
                                        className={`relative rounded-3xl border border-slate/10 p-4 transition-all duration-300
                      ${!vendor.is_checkout_available ? "bg-slate/5 grayscale-[25%] opacity-80" : "bg-white shadow-sm hover:shadow-md hover:border-navy/10"}
                    `}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h3 className="font-bold text-navy text-lg leading-tight">{vendor.name}</h3>
                                                <div className="flex items-center text-xs text-slate mt-1.5 space-x-2">
                                                    <div className="flex items-center text-amber-500">
                                                        <Star className="w-3.5 h-3.5 fill-current mr-1" />
                                                        <span className="font-semibold">{vendor.rating}</span>
                                                    </div>
                                                    <span className="w-1 h-1 rounded-full bg-slate/30" />
                                                    <div className="flex items-center">
                                                        <Clock className="w-3 h-3 mr-1" />
                                                        <span>{vendor.delivery_time_mins} mins</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Active Status Bubble */}
                                            {vendor.isOpenNow ? (
                                                <div className="px-2.5 py-1 rounded-full bg-emerald/10 text-emerald text-[10px] font-bold flex items-center space-x-1 shrink-0">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
                                                    <span>OPEN</span>
                                                </div>
                                            ) : (
                                                <div className="px-2.5 py-1 rounded-full bg-slate/10 text-slate text-[10px] font-bold shrink-0">
                                                    CLOSED
                                                </div>
                                            )}
                                        </div>

                                        {/* The "Waiting Mode" Logic vs Active Action */}
                                        <div className="mt-4 pt-4 border-t border-slate/5">
                                            {!vendor.is_checkout_available ? (
                                                <div className="flex items-center space-x-2 text-xs font-medium text-slate py-2 bg-slate/10 rounded-xl px-3 justify-center">
                                                    <AlertCircle className="w-4 h-4" />
                                                    <span>
                                                        {vendor.subscription.reason?.replace(/_/g, ' ') || "Waiting for Restock/Renewal"}
                                                    </span>
                                                </div>
                                            ) : (
                                                <button className="w-full py-2.5 bg-navy text-white rounded-xl text-sm font-semibold hover:bg-navy/90 transition-colors shadow-sm shadow-navy/20">
                                                    Order Now
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                )) : (
                                    <motion.div
                                        key="empty-state"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="py-12 text-center"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-slate/5 flex items-center justify-center mx-auto mb-4">
                                            <Store className="w-8 h-8 text-slate/40" />
                                        </div>
                                        <h3 className="text-navy font-semibold mb-1">No local vendors found.</h3>
                                        <p className="text-slate text-sm">Try adjusting your filters.</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}
