"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import ClearCartModal from "@/components/cart/ClearCartModal";
import { getDeviceHash } from "@/lib/device";
import type { VendorAPI } from "@/types/vendor";

export interface CartItem {
  product_id: number;
  title: string;
  price: number;
  quantity: number;
  image_url: string | null;
}

interface CartState {
  vendor_id: number | null;
  vendor_name: string | null;
  items: CartItem[];
  device_hash: string;
}

interface PendingSwitchState {
  vendor: Pick<VendorAPI, "id" | "name">;
  item: CartItem;
}

interface PersistedCartState {
  vendor_id: number | null;
  vendor_name: string | null;
  items: CartItem[];
}

interface CartContextValue extends CartState {
  addItem: (vendor: Pick<VendorAPI, "id" | "name">, item: CartItem) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  total: number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCartItem(value: unknown): value is CartItem {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.product_id === "number" &&
    typeof value.title === "string" &&
    typeof value.price === "number" &&
    typeof value.quantity === "number" &&
    (typeof value.image_url === "string" || value.image_url === null)
  );
}

function parsePersistedCart(rawValue: string | null): PersistedCartState | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(rawValue);

    if (!isRecord(parsed)) {
      return null;
    }

    const vendorId = parsed.vendor_id;
    const vendorName = parsed.vendor_name;
    const items = parsed.items;

    if (!(typeof vendorId === "number" || vendorId === null)) {
      return null;
    }

    if (!(typeof vendorName === "string" || vendorName === null)) {
      return null;
    }

    if (!Array.isArray(items) || !items.every((item) => isCartItem(item))) {
      return null;
    }

    return {
      vendor_id: vendorId,
      vendor_name: vendorName,
      items,
    };
  } catch {
    return null;
  }
}

function persistCart(state: CartState): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!state.device_hash) {
    return;
  }

  const key = `omega_cart_${state.device_hash}`;
  const payload: PersistedCartState = {
    vendor_id: state.vendor_id,
    vendor_name: state.vendor_name,
    items: state.items,
  };

  localStorage.setItem(key, JSON.stringify(payload));
}

function createInitialCartState(): CartState {
  if (typeof window === "undefined") {
    return {
      vendor_id: null,
      vendor_name: null,
      items: [],
      device_hash: "",
    };
  }

  const deviceHash = getDeviceHash();
  const stored = parsePersistedCart(localStorage.getItem(`omega_cart_${deviceHash}`));

  if (stored) {
    return {
      vendor_id: stored.vendor_id,
      vendor_name: stored.vendor_name,
      items: stored.items,
      device_hash: deviceHash,
    };
  }

  return {
    vendor_id: null,
    vendor_name: null,
    items: [],
    device_hash: deviceHash,
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>(createInitialCartState);
  const [pendingSwitch, setPendingSwitch] = useState<PendingSwitchState | null>(null);

  useEffect(() => {
    persistCart(state);
  }, [state]);

  const clearCart = useCallback(() => {
    setState((previous) => ({
      ...previous,
      vendor_id: null,
      vendor_name: null,
      items: [],
    }));
  }, []);

  const upsertItem = useCallback(
    (vendor: Pick<VendorAPI, "id" | "name">, item: CartItem) => {
      setState((previous) => {
        const existing = previous.items.find((cartItem) => cartItem.product_id === item.product_id);

        let nextItems: CartItem[];

        if (existing) {
          nextItems = previous.items.map((cartItem) =>
            cartItem.product_id === item.product_id
              ? { ...cartItem, quantity: cartItem.quantity + Math.max(1, item.quantity) }
              : cartItem,
          );
        } else {
          nextItems = [...previous.items, { ...item, quantity: Math.max(1, item.quantity) }];
        }

        return {
          ...previous,
          vendor_id: vendor.id,
          vendor_name: vendor.name,
          items: nextItems,
        };
      });
    },
    [],
  );

  const addItem = useCallback(
    (vendor: Pick<VendorAPI, "id" | "name">, item: CartItem) => {
      if (state.vendor_id !== null && state.vendor_id !== vendor.id) {
        setPendingSwitch({ vendor, item });
        return;
      }

      upsertItem(vendor, item);
    },
    [state.vendor_id, upsertItem],
  );

  const confirmVendorSwitch = useCallback(() => {
    if (!pendingSwitch) {
      return;
    }

    setState((previous) => ({
      ...previous,
      vendor_id: pendingSwitch.vendor.id,
      vendor_name: pendingSwitch.vendor.name,
      items: [{ ...pendingSwitch.item, quantity: Math.max(1, pendingSwitch.item.quantity) }],
    }));

    setPendingSwitch(null);
  }, [pendingSwitch]);

  const dismissVendorSwitch = useCallback(() => {
    setPendingSwitch(null);
  }, []);

  const removeItem = useCallback((productId: number) => {
    setState((previous) => {
      const nextItems = previous.items.filter((item) => item.product_id !== productId);

      return {
        ...previous,
        items: nextItems,
        vendor_id: nextItems.length > 0 ? previous.vendor_id : null,
        vendor_name: nextItems.length > 0 ? previous.vendor_name : null,
      };
    });
  }, []);

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    setState((previous) => ({
      ...previous,
      items: previous.items.map((item) =>
        item.product_id === productId ? { ...item, quantity } : item,
      ),
    }));
  }, [removeItem]);

  const total = useMemo(
    () => state.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [state.items],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      ...state,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      total,
    }),
    [state, addItem, removeItem, updateQuantity, clearCart, total],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <ClearCartModal
        isOpen={pendingSwitch !== null}
        vendorName={state.vendor_name}
        onKeepCart={dismissVendorSwitch}
        onClearAndSwitch={confirmVendorSwitch}
      />
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within a CartProvider.");
  }

  return context;
}
