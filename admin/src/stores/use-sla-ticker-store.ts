'use client';

import { create } from 'zustand';

interface SlaTickerState {
  now: number;
  started: boolean;
  setNow: (now: number) => void;
  markStarted: () => void;
  markStopped: () => void;
}

export const useSlaTickerStore = create<SlaTickerState>((set) => ({
  now: Date.now(),
  started: false,
  setNow: (now) => set({ now }),
  markStarted: () => set({ started: true }),
  markStopped: () => set({ started: false }),
}));
