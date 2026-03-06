import { useCallback, useState } from "react";

const SCARCITY_STORAGE_KEY = "omega_join_remaining_seats";
const DEFAULT_SEATS = 10;

export function useScarcityCounter() {
  const [remainingSeats, setRemainingSeats] = useState<number>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_SEATS;
    }

    const cached = localStorage.getItem(SCARCITY_STORAGE_KEY);

    if (!cached) {
      return DEFAULT_SEATS;
    }

    const parsed = Number.parseInt(cached, 10);

    if (!Number.isNaN(parsed) && parsed >= 0) {
      return parsed;
    }

    return DEFAULT_SEATS;
  });

  const decrement = useCallback(() => {
    setRemainingSeats((previous) => {
      const nextValue = Math.max(0, previous - 1);
      localStorage.setItem(SCARCITY_STORAGE_KEY, String(nextValue));
      return nextValue;
    });
  }, []);

  return { remainingSeats, decrement };
}
