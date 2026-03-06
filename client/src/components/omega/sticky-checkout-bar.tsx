'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { triggerHaptic } from '@/lib/haptic';

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
        triggerHaptic(80);
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

            <div className="min-h-14 px-5 py-2 flex items-center justify-between gap-5 max-w-7xl mx-auto w-full relative z-10">
                <div className="hidden sm:block text-white font-semibold text-sm">
                    {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
                </div>

                <div className="flex-1 text-center" />

                <div className="flex items-center gap-5">
                    <div className="flex flex-col items-end">
                        <span className="text-white text-xs font-medium opacity-90">Total</span>
                        <span className="font-mono font-bold text-white text-[clamp(1rem,0.95rem+0.5vw,1.125rem)]">
                            {currency} {totalPrice.toFixed(2)}
                        </span>
                    </div>

                    <motion.div
                        whileHover={{ scale: isCheckoutDisabled ? 1 : 1.02 }}
                        whileTap={{ scale: isCheckoutDisabled ? 1 : 0.98, y: isCheckoutDisabled ? 0 : 2 }}
                    >
                        <PrimaryButton
                            onClick={handleCheckout}
                            disabled={isLoading || isCheckoutDisabled}
                            className="h-14 px-6 whitespace-nowrap shadow-[0_4px_6px_-1px_rgba(0,0,0,0.15)]"
                        >
                            {isLoading ? 'Processing...' : 'Checkout'}
                        </PrimaryButton>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
}
