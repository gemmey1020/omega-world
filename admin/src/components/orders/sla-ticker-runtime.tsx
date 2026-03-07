'use client';

import { useEffect, useEffectEvent } from 'react';
import { useSlaTickerStore } from '@/stores/use-sla-ticker-store';

let tickerHandle: number | null = null;

export default function SlaTickerRuntime() {
  const started = useSlaTickerStore((state) => state.started);
  const markStarted = useSlaTickerStore((state) => state.markStarted);
  const markStopped = useSlaTickerStore((state) => state.markStopped);
  const setNow = useSlaTickerStore((state) => state.setNow);

  const onTick = useEffectEvent(() => {
    setNow(Date.now());
  });

  useEffect(() => {
    if (started && tickerHandle !== null) {
      return;
    }

    markStarted();
    onTick();

    tickerHandle = window.setInterval(() => {
      onTick();
    }, 1000);

    return () => {
      if (tickerHandle !== null) {
        window.clearInterval(tickerHandle);
        tickerHandle = null;
      }

      markStopped();
    };
  }, [markStarted, markStopped, onTick, started]);

  return null;
}
