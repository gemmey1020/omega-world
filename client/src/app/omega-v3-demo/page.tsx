'use client';

import React, { useState } from 'react';
import { VendorCard } from '@/components/omega/vendor-card';
import { StickyCheckoutBar } from '@/components/omega/sticky-checkout-bar';

const DEMO_PRODUCTS = [
    { id: '1', productName: 'Fresh Tomatoes', price: 8.5, vendorName: "Ahmed's Market", vendorDistance: '200m away', isOnline: true, scarcityCount: 2, isWaiting: false },
    { id: '2', productName: 'Organic Cucumbers', price: 6.75, vendorName: "Ahmed's Market", vendorDistance: '200m away', isOnline: true, scarcityCount: undefined, isWaiting: false },
    { id: '3', productName: 'Premium Olive Oil', price: 18.99, vendorName: "Fatima's Spice Shop", vendorDistance: '450m away', isOnline: false, scarcityCount: 3, isWaiting: false },
    { id: '4', productName: 'Fresh Bread', price: 4.5, vendorName: "Ali's Bakery", vendorDistance: '150m away', isOnline: true, scarcityCount: undefined, isWaiting: true },
    { id: '5', productName: 'Greek Cheese', price: 14.99, vendorName: "Maria's Dairy", vendorDistance: '320m away', isOnline: true, scarcityCount: 1, isWaiting: false },
];

export default function OmegaV3DemoPage() {
    const [cart, setCart] = useState<string[]>([]);
    const [totalPrice, setTotalPrice] = useState(0);

    const handleAddToCart = (productId: string) => {
        const product = DEMO_PRODUCTS.find((p) => p.id === productId);
        if (product && !product.isWaiting) {
            setCart((prev) => [...prev, productId]);
            setTotalPrice((prev) => prev + product.price);
        }
    };

    const handleCheckout = () => {
        alert(`Checkout with ${cart.length} items — Total: EGP ${totalPrice.toFixed(2)}`);
        setCart([]);
        setTotalPrice(0);
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24">
            <header className="bg-[#1E293B] text-white sticky top-0 z-30 shadow-md">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <h1 className="text-2xl font-bold">OMEGA V3 Design System Demo</h1>
                    <p className="text-[#CBD5E1] text-sm mt-1">Vendor Cards + Sticky Checkout Bar | Mom-Approved</p>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Key Refinements */}
                <section className="mb-12">
                    <h2 className="text-xl font-bold text-[#1E293B] mb-4">Key V3 Refinements</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { title: 'Radius Logic', body: '18px primary (cards) + 10px secondary (precision elements).' },
                            { title: 'Tap Targets', body: '56px buttons + 12px dead zones for tremor-affected users.' },
                            { title: 'Action Laser Control', body: 'Action Laser token is reserved for Checkout bar and critical alerts.' },
                            { title: 'Haptic Feedback', body: 'Success (50ms), Blocked (100ms), Checkout (80ms).' },
                        ].map((item) => (
                            <div key={item.title} className="rounded-[18px] border border-[#E2E8F0] bg-white p-4 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">
                                <h3 className="font-semibold text-[#1E293B] mb-2">{item.title}</h3>
                                <p className="text-sm text-[#9CA3AF]">{item.body}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Vendor Cards */}
                <section className="mb-12">
                    <h2 className="text-xl font-bold text-[#1E293B] mb-4">Vendor Cards</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {DEMO_PRODUCTS.map((product) => (
                            <VendorCard
                                key={product.id}
                                id={product.id}
                                productName={product.productName}
                                price={product.price}
                                currency="EGP"
                                vendorName={product.vendorName}
                                vendorDistance={product.vendorDistance}
                                isOnline={product.isOnline}
                                scarcityCount={product.scarcityCount}
                                isWaiting={product.isWaiting}
                                onAddToCart={handleAddToCart}
                            />
                        ))}
                    </div>
                </section>

                {/* Color Palette */}
                <section className="mb-12">
                    <h2 className="text-xl font-bold text-[#1E293B] mb-4">Color Palette (V3)</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {[
                            { name: 'Warm Off-White', hex: '#F8FAFC', role: 'Background' },
                            { name: 'Deep Navy', hex: '#1E293B', role: 'Text, Icons' },
                            { name: 'Slate Grey', hex: '#E2E8F0', role: 'Borders' },
                            { name: 'Action Laser', hex: 'var(--color-laser)', role: 'Checkout Only' },
                            { name: 'Emerald Green', hex: '#10B981', role: 'Status Live' },
                            { name: 'Soft Red', hex: '#DC2626', role: 'Alerts' },
                            { name: 'Neutral Grey', hex: '#9CA3AF', role: 'Disabled' },
                        ].map((color) => (
                            <div key={color.hex} className="rounded-[18px] overflow-hidden border border-[#E2E8F0] shadow-sm">
                                <div className="h-16" style={{ backgroundColor: color.hex }} />
                                <div className="p-3 bg-white">
                                    <p className="font-semibold text-xs text-[#1E293B]">{color.name}</p>
                                    <p className="text-xs text-[#9CA3AF]">{color.hex}</p>
                                    <p className="text-xs text-[#CBD5E1] mt-1">{color.role}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            <StickyCheckoutBar
                itemCount={cart.length}
                totalPrice={totalPrice}
                currency="EGP"
                isCheckoutDisabled={cart.length === 0}
                onCheckout={handleCheckout}
            />
        </div>
    );
}
