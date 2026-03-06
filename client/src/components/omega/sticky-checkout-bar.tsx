'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface StickyCheckoutBarProps {
    itemCount: number;
    totalPrice: number;
    currency: string;
    isCheckoutDisabled?: boolean;
    onCheckout: () => void;
}

export function StickyCheckoutBar({
    itemCount,
    totalPrice,
    currency,
    isCheckoutDisabled = false,
    onCheckout,
}: StickyCheckoutBarProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleCheckout = async () => {
        setIsLoading(true);
        if (navigator.vibrate) navigator.vibrate(80);
        try {
            onCheckout();
        } finally {
            setIsLoading(false);
        }
    };

    if (itemCount === 0) return null;

    return (
        <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-40 bg-[#EA580C]"
            style={{ boxShadow: '0 -4px 12px -2px rgba(0,0,0,0.15)' }}
        >
            <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)' }} />

            <div className="h-14 px-4 flex items-center justify-between gap-4 max-w-7xl mx-auto w-full relative z-10">
                <div className="hidden sm:block text-white font-semibold text-sm">
                    {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
                </div>

                <div className="flex-1 text-center" />

                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-white text-xs font-medium opacity-90">Total</span>
                        <span className="font-mono font-bold text-white text-[clamp(1rem,0.95rem+0.5vw,1.125rem)]">
                            {currency} {totalPrice.toFixed(2)}
                        </span>
                    </div>

                    <motion.button
                        onClick={handleCheckout}
                        disabled={isLoading || isCheckoutDisabled}
                        whileHover={{ scale: isCheckoutDisabled ? 1 : 1.02 }}
                        whileTap={{ scale: isCheckoutDisabled ? 1 : 0.98, y: isCheckoutDisabled ? 0 : 2 }}
                        className={`h-14 px-6 rounded-[10px] font-semibold text-sm whitespace-nowrap transition-all duration-150 flex-shrink-0 ${isCheckoutDisabled
                                ? 'bg-[#9CA3AF] text-white cursor-not-allowed opacity-60'
                                : 'bg-[#1E293B] text-white hover:bg-[#0F172A] cursor-pointer'
                            }`}
                        style={{ boxShadow: !isCheckoutDisabled ? '0 4px 6px -1px rgba(0,0,0,0.15)' : 'none' }}
                    >
                        {isLoading ? 'Processing...' : 'Checkout'}
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
}
