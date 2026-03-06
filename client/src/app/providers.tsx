"use client";

import type { ReactNode } from "react";
import { CartProvider } from "@/context/CartContext";
import { StagingProvider } from "@/context/StagingContext";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <StagingProvider>{children}</StagingProvider>
    </CartProvider>
  );
}
