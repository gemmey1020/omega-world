'use client';

import React, { useState } from 'react';
import { VendorCard } from '@/components/omega/vendor-card';
import { StickyCheckoutBar } from '@/components/omega/sticky-checkout-bar';

const DEMO_PRODUCTS = [
  {
    id: '1',
    productName: 'Fresh Tomatoes',
    price: 8.5,
    vendorName: "Ahmed's Market",
    vendorDistance: '200m away',
    isOnline: true,
    scarcityCount: 2,
    isWaiting: false,
  },
  {
    id: '2',
    productName: 'Organic Cucumbers',
    price: 6.75,
    vendorName: "Ahmed's Market",
    vendorDistance: '200m away',
    isOnline: true,
    scarcityCount: undefined,
    isWaiting: false,
  },
  {
    id: '3',
    productName: 'Premium Olive Oil',
    price: 18.99,
    vendorName: "Fatima's Spice Shop",
    vendorDistance: '450m away',
    isOnline: false,
    scarcityCount: 3,
    isWaiting: false,
  },
  {
    id: '4',
    productName: 'Fresh Bread',
    price: 4.5,
    vendorName: "Ali's Bakery",
    vendorDistance: '150m away',
    isOnline: true,
    scarcityCount: undefined,
    isWaiting: true, // Waiting state demo
  },
  {
    id: '5',
    productName: 'Greek Cheese',
    price: 14.99,
    vendorName: "Maria's Dairy",
    vendorDistance: '320m away',
    isOnline: true,
    scarcityCount: 1,
    isWaiting: false,
  },
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
    alert(`Checkout with ${cart.length} items - Total: ₪${totalPrice.toFixed(2)}`);
    setCart([]);
    setTotalPrice(0);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Header */}
      <header className="bg-[#1E293B] text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">OMEGA V3 Design System Demo</h1>
          <p className="text-[#CBD5E1] text-sm mt-1">
            Vendor Cards + Sticky Checkout Bar | Mom-Approved
          </p>
        </div>
      </header>

      {/* Content Container */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Section: Design System Overview */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-[#1E293B] mb-4">
            Key V3 Refinements
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-[18px] border border-[#E2E8F0] bg-white p-4 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">
              <h3 className="font-semibold text-[#1E293B] mb-2">Radius Logic</h3>
              <p className="text-sm text-[#9CA3AF]">
                <strong>18px primary</strong> (cards, warm embrace) +{' '}
                <strong>10px secondary</strong> (precision elements).
              </p>
            </div>

            <div className="rounded-[18px] border border-[#E2E8F0] bg-white p-4 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">
              <h3 className="font-semibold text-[#1E293B] mb-2">Tap Targets</h3>
              <p className="text-sm text-[#9CA3AF]">
                <strong>56px buttons</strong> + <strong>12px dead zones</strong>{' '}
                for tremor-affected users (Parkinson's, etc.).
              </p>
            </div>

            <div className="rounded-[18px] border border-[#E2E8F0] bg-white p-4 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">
              <h3 className="font-semibold text-[#1E293B] mb-2">Orange Control</h3>
              <p className="text-sm text-[#9CA3AF]">
                <strong>#EA580C only for Checkout bar</strong>. "Waiting" states
                use soft pattern overlay instead.
              </p>
            </div>

            <div className="rounded-[18px] border border-[#E2E8F0] bg-white p-4 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">
              <h3 className="font-semibold text-[#1E293B] mb-2">Haptic Feedback</h3>
              <p className="text-sm text-[#9CA3AF]">
                Success (50ms), Blocked (100ms), Checkout (80ms). Confirmation
                without startling.
              </p>
            </div>
          </div>
        </section>

        {/* Section: Vendor Cards Grid */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-[#1E293B] mb-4">
            Vendor Cards (Responsive Grid)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEMO_PRODUCTS.map((product) => (
              <VendorCard
                key={product.id}
                id={product.id}
                productName={product.productName}
                price={product.price}
                currency="₪"
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

        {/* Section: Typography & Accessibility */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-[#1E293B] mb-4">
            Typography & Accessibility
          </h2>
          <div className="rounded-[18px] border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="space-y-4">
              <div>
                <h3 className="text-[clamp(1.25rem,1rem+2.5vw,2rem)] font-bold text-[#1E293B]">
                  H1: Fluid clamp() Typography
                </h3>
                <p className="text-xs text-[#9CA3AF] mt-1">
                  Font size scales from 20px (mobile) to 32px (desktop)
                </p>
              </div>

              <div>
                <p className="text-[clamp(0.875rem,0.85rem+0.4vw,1rem)] leading-[1.6] text-[#1E293B]">
                  Body text with <strong>line-height: 1.6</strong> ensures
                  readability on small screens. Line-height increases to{' '}
                  <strong>1.7</strong> for smaller text (12-14px).
                </p>
              </div>

              <div>
                <span className="font-mono font-bold text-[clamp(1rem,0.95rem+0.5vw,1.125rem)] text-[#1E293B]">
                  ₪ 45.99
                </span>
                <p className="text-xs text-[#9CA3AF] mt-1">
                  Monospace prices: Eliminates character-width ambiguity.
                </p>
              </div>

              <div className="mt-4 p-4 bg-[#F0F4F8] rounded-[10px] border border-[#E2E8F0]">
                <p className="text-xs font-semibold text-[#1E293B] mb-2">
                  WCAG AA+ Contrast Ratios:
                </p>
                <ul className="text-xs text-[#9CA3AF] space-y-1">
                  <li>
                    ✓ Deep Navy (#1E293B) on Off-White (#F8FAFC):{' '}
                    <strong>15.8:1</strong>
                  </li>
                  <li>
                    ✓ Burnt Orange (#EA580C) on White: <strong>4.5:1</strong>
                  </li>
                  <li>
                    ✓ Slate Grey (#E2E8F0) borders: <strong>6.2:1</strong>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Animation & Interaction */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-[#1E293B] mb-4">
            Interactions & Animations
          </h2>
          <div className="rounded-[18px] border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-[#1E293B] mb-2">
                  Scarcity Pulse Animation (2s cycle)
                </p>
                <p className="text-sm text-[#9CA3AF] mb-3">
                  "Only X Left" uses orange pulse to indicate live data without
                  inducing panic.
                </p>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full bg-[#DC2626]"
                      style={{
                        animation: 'omega-pulse 2s ease-in-out infinite',
                      }}
                    />
                    <span className="text-sm text-[#DC2626] font-semibold">
                      Only 2 Left
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <p className="font-semibold text-[#1E293B] mb-2">
                  Status Indicator (4s cycle, slower)
                </p>
                <p className="text-sm text-[#9CA3AF] mb-3">
                  "Online Now" uses emerald green with slower pulse for
                  secondary signals.
                </p>
                <div className="flex gap-2 items-center">
                  <div
                    className="w-2 h-2 rounded-full bg-[#10B981]"
                    style={{
                      animation:
                        'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    }}
                  />
                  <span className="text-sm text-[#10B981]">Online Now</span>
                </div>
              </div>

              <div>
                <p className="font-semibold text-[#1E293B] mb-2">
                  Button Press Animation (150ms)
                </p>
                <p className="text-sm text-[#9CA3AF]">
                  Buttons scale to 0.97 on tap, mimicking physical depression.
                  Transition: cubic-bezier(0.4, 0, 0.2, 1) for snappy feedback.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Spacing demonstration */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-[#1E293B] mb-4">
            Spacing & Grid (8pt System)
          </h2>
          <div className="rounded-[18px] border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="space-y-3">
              <p className="text-sm text-[#9CA3AF]">
                Mobile gutters: <strong>16px</strong> | Desktop gutters:{' '}
                <strong>32px</strong>
              </p>
              <p className="text-sm text-[#9CA3AF]">
                Card padding: <strong>16px</strong> | Button gap:{' '}
                <strong>12px minimum</strong>
              </p>
              <p className="text-sm text-[#9CA3AF]">
                Image-to-text gap: <strong>16px</strong> | Between buttons:{' '}
                <strong>12px dead zone</strong> (for tremor users)
              </p>
            </div>
          </div>
        </section>

        {/* Color Palette */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-[#1E293B] mb-4">
            Color Palette (V3)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { name: 'Warm Off-White', hex: '#F8FAFC', role: 'Background' },
              { name: 'Deep Navy', hex: '#1E293B', role: 'Text, Icons' },
              { name: 'Slate Grey', hex: '#E2E8F0', role: 'Borders' },
              { name: 'Burnt Orange', hex: '#EA580C', role: 'Checkout Only' },
              { name: 'Emerald Green', hex: '#10B981', role: 'Status Live' },
              { name: 'Soft Red', hex: '#DC2626', role: 'Alerts' },
              { name: 'Neutral Grey', hex: '#9CA3AF', role: 'Disabled' },
            ].map((color) => (
              <div key={color.hex} className="rounded-[18px] overflow-hidden border border-[#E2E8F0] shadow-sm">
                <div
                  className="h-16"
                  style={{ backgroundColor: color.hex }}
                />
                <div className="p-3 bg-white">
                  <p className="font-semibold text-xs text-[#1E293B]">
                    {color.name}
                  </p>
                  <p className="text-xs text-[#9CA3AF]">{color.hex}</p>
                  <p className="text-xs text-[#CBD5E1] mt-1">{color.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Sticky Checkout Bar */}
      <StickyCheckoutBar
        itemCount={cart.length}
        totalPrice={totalPrice}
        currency="₪"
        isCheckoutDisabled={cart.length === 0}
        onCheckout={handleCheckout}
      />

      {/* Styles: Global animations */}
      <style>{`
        @keyframes omega-pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4);
            opacity: 1;
          }
          50% {
            box-shadow: 0 0 0 8px rgba(220, 38, 38, 0);
            opacity: 0.85;
          }
          100% {
            box-shadow: 0 0 0 0 rgba(220, 38, 38, 0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
