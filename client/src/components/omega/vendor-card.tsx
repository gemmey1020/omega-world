'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { triggerHaptic } from '@/lib/haptic';

interface VendorCardProps {
    id: string;
    productName: string;
    productImage?: string;
    price: number;
    currency: string;
    vendorName: string;
    vendorDistance: string;
    isOnline: boolean;
    scarcityCount?: number;
    isWaiting?: boolean;
    onAddToCart: (productId: string) => void;
}

export function VendorCard({
    id,
    productName,
    productImage,
    price,
    currency,
    vendorName,
    vendorDistance,
    isOnline,
    scarcityCount,
    isWaiting,
    onAddToCart,
}: VendorCardProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleAddToCart = async () => {
        setIsLoading(true);
        triggerHaptic(50);
        try {
            onAddToCart(id);
        } catch {
            triggerHaptic(100);
        } finally {
            setIsLoading(false);
        }
    };

    const showScarcity = scarcityCount !== undefined && scarcityCount <= 5;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`rounded-[18px] border border-[#E2E8F0] overflow-hidden transition-all duration-150 ${isWaiting ? 'opacity-55 pointer-events-none' : 'bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]'
                }`}
        >
            <div className="relative aspect-video overflow-hidden bg-[#CBD5E1] rounded-[10px] m-4 mb-0">
                {productImage ? (
                    <img src={productImage} alt={productName} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-[#9CA3AF] text-sm">Image</span>
                    </div>
                )}

                {isWaiting && (
                    <div className="absolute inset-0 bg-[#E2E8F0]/70 flex flex-col items-center justify-center gap-5">
                        <Clock className="h-12 w-12 text-[#1E293B]" />
                        <motion.span
                            animate={{ opacity: [1, 0.6, 1] }}
                            transition={{ duration: 4, repeat: Infinity }}
                            className="text-[#1E293B] text-sm font-semibold text-center px-3"
                        >
                            Waiting for Update
                        </motion.span>
                    </div>
                )}
            </div>

            <div className="p-4 pt-0 flex flex-col space-interactive-y">
                <div className="flex items-baseline justify-between gap-5">
                    <h3 className="text-[clamp(1rem,0.9rem+0.8vw,1.25rem)] font-bold text-[#1E293B] line-clamp-2">
                        {productName}
                    </h3>
                    <span className="font-mono font-bold text-[clamp(1rem,0.95rem+0.5vw,1.125rem)] text-[#1E293B] whitespace-nowrap">
                        {currency} {price.toFixed(2)}
                    </span>
                </div>

                {showScarcity && (
                    <motion.div
                        animate={{ boxShadow: ['0 0 0 0 rgba(220,38,38,0.4)', '0 0 0 8px rgba(220,38,38,0)', '0 0 0 0 rgba(220,38,38,0)'] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-[#DC2626] text-xs font-semibold"
                    >
                        Only {scarcityCount} Left
                    </motion.div>
                )}

                <div className="flex items-center gap-5 text-xs text-[#9CA3AF] font-medium">
                    <span>{vendorName}</span>
                    <span>•</span>
                    <span>{vendorDistance}</span>
                    {isOnline && (
                        <>
                            <span>•</span>
                            <div className="flex items-center gap-5">
                                <motion.div
                                    animate={{ boxShadow: ['0 0 0 0 rgba(16,185,129,0.4)', '0 0 0 6px rgba(16,185,129,0)', '0 0 0 0 rgba(16,185,129,0)'] }}
                                    transition={{ duration: 4, repeat: Infinity }}
                                    className="w-2 h-2 rounded-full bg-[#10B981]"
                                />
                                <span className="text-[#10B981]">Online Now</span>
                            </div>
                        </>
                    )}
                </div>

                <motion.div
                    whileHover={{ scale: isWaiting ? 1 : 1.02 }}
                    whileTap={{ scale: isWaiting ? 1 : 0.97 }}
                >
                    <PrimaryButton
                        onClick={handleAddToCart}
                        disabled={isLoading || isWaiting}
                        className={`w-full ${isWaiting ? 'opacity-70' : ''}`}
                    >
                        {isLoading ? 'Adding...' : 'Add to Cart'}
                    </PrimaryButton>
                </motion.div>
            </div>
        </motion.div>
    );
}
