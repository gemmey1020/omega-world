"use client";

import type { ButtonHTMLAttributes } from "react";
import { triggerHaptic } from "@/lib/haptic";

type OrangeLaserButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export default function OrangeLaserButton({
  className = "",
  onTouchStart,
  disabled,
  type = "button",
  ...rest
}: OrangeLaserButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled}
      onTouchStart={(event) => {
        if (!disabled) {
          triggerHaptic(50);
        }

        onTouchStart?.(event);
      }}
      className={`inline-flex min-h-14 items-center justify-center rounded-[var(--radius-secondary)] bg-laser px-4 py-3 text-sm font-semibold text-white transition hover:bg-laser/90 disabled:cursor-not-allowed disabled:bg-muted ${className}`}
    />
  );
}
