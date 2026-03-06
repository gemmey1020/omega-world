export type HapticDuration = 50 | 80 | 100 | 150;

export function triggerHaptic(duration: HapticDuration = 50): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(duration);
  }
}
