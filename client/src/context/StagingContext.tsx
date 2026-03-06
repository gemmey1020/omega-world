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
import type { SharedCartItem } from "@/lib/cart-token";

const STORAGE_KEY = "omega_staging_bundles";

export interface StagedBundle {
  vendor_id: number;
  vendor_name: string;
  whatsapp_number: string;
  items: SharedCartItem[];
  status: "pending" | "sent" | "skipped";
}

interface StageInput {
  vendor_id: number;
  vendor_name: string;
  whatsapp_number: string;
  items: SharedCartItem[];
}

interface StagingState {
  bundles: StagedBundle[];
  activeBundleIndex: number;
}

interface StagingContextValue extends StagingState {
  stageCurrentCart: (bundle: StageInput) => void;
  startBatchHandoff: () => void;
  advanceHandoff: () => void;
  skipBundle: (index: number) => void;
  clearStaging: () => void;
}

const StagingContext = createContext<StagingContextValue | undefined>(undefined);

function isSharedCartItem(value: unknown): value is SharedCartItem {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.product_id === "number" &&
    typeof item.title === "string" &&
    typeof item.price === "number" &&
    typeof item.quantity === "number" &&
    (typeof item.image_url === "string" || item.image_url === null)
  );
}

function isStagedBundle(value: unknown): value is StagedBundle {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const bundle = value as Record<string, unknown>;

  return (
    typeof bundle.vendor_id === "number" &&
    typeof bundle.vendor_name === "string" &&
    typeof bundle.whatsapp_number === "string" &&
    Array.isArray(bundle.items) &&
    bundle.items.every((item) => isSharedCartItem(item)) &&
    (bundle.status === "pending" || bundle.status === "sent" || bundle.status === "skipped")
  );
}

function firstPendingIndex(bundles: StagedBundle[]): number {
  const index = bundles.findIndex((bundle) => bundle.status === "pending");
  return index >= 0 ? index : bundles.length;
}

function loadInitialState(): StagingState {
  if (typeof window === "undefined") {
    return {
      bundles: [],
      activeBundleIndex: 0,
    };
  }

  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return {
      bundles: [],
      activeBundleIndex: 0,
    };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed) || !parsed.every((bundle) => isStagedBundle(bundle))) {
      return {
        bundles: [],
        activeBundleIndex: 0,
      };
    }

    return {
      bundles: parsed,
      activeBundleIndex: firstPendingIndex(parsed),
    };
  } catch {
    return {
      bundles: [],
      activeBundleIndex: 0,
    };
  }
}

export function StagingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StagingState>(loadInitialState);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.bundles));
  }, [state.bundles]);

  const stageCurrentCart = useCallback((bundleInput: StageInput) => {
    setState((previous) => {
      const normalizedBundle: Omit<StagedBundle, "status"> = {
        vendor_id: bundleInput.vendor_id,
        vendor_name: bundleInput.vendor_name,
        whatsapp_number: bundleInput.whatsapp_number,
        items: bundleInput.items.map((item) => ({ ...item })),
      };

      const existingPendingIndex = previous.bundles.findIndex(
        (bundle) => bundle.vendor_id === normalizedBundle.vendor_id && bundle.status === "pending",
      );

      const nextBundles = [...previous.bundles];

      if (existingPendingIndex >= 0) {
        nextBundles[existingPendingIndex] = {
          ...normalizedBundle,
          status: "pending",
        };
      } else {
        nextBundles.push({
          ...normalizedBundle,
          status: "pending",
        });
      }

      return {
        bundles: nextBundles,
        activeBundleIndex: firstPendingIndex(nextBundles),
      };
    });
  }, []);

  const startBatchHandoff = useCallback(() => {
    setState((previous) => ({
      ...previous,
      activeBundleIndex: firstPendingIndex(previous.bundles),
    }));
  }, []);

  const advanceHandoff = useCallback(() => {
    setState((previous) => {
      if (previous.activeBundleIndex >= previous.bundles.length) {
        return previous;
      }

      const nextBundles = previous.bundles.map((bundle, index) =>
        index === previous.activeBundleIndex && bundle.status === "pending"
          ? { ...bundle, status: "sent" as const }
          : bundle,
      );

      return {
        bundles: nextBundles,
        activeBundleIndex: firstPendingIndex(nextBundles),
      };
    });
  }, []);

  const skipBundle = useCallback((index: number) => {
    setState((previous) => {
      if (index < 0 || index >= previous.bundles.length) {
        return previous;
      }

      const targetBundle = previous.bundles[index];

      if (targetBundle.status !== "pending") {
        return previous;
      }

      const nextBundles = previous.bundles.map((bundle, bundleIndex) =>
        bundleIndex === index
          ? { ...bundle, status: "skipped" as const }
          : bundle,
      );

      return {
        bundles: nextBundles,
        activeBundleIndex: firstPendingIndex(nextBundles),
      };
    });
  }, []);

  const clearStaging = useCallback(() => {
    setState({
      bundles: [],
      activeBundleIndex: 0,
    });
  }, []);

  const value = useMemo<StagingContextValue>(() => ({
    bundles: state.bundles,
    activeBundleIndex: state.activeBundleIndex,
    stageCurrentCart,
    startBatchHandoff,
    advanceHandoff,
    skipBundle,
    clearStaging,
  }), [
    state.bundles,
    state.activeBundleIndex,
    stageCurrentCart,
    startBatchHandoff,
    advanceHandoff,
    skipBundle,
    clearStaging,
  ]);

  return <StagingContext.Provider value={value}>{children}</StagingContext.Provider>;
}

export function useStaging(): StagingContextValue {
  const context = useContext(StagingContext);

  if (!context) {
    throw new Error("useStaging must be used within a StagingProvider.");
  }

  return context;
}
