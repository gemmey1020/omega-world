export function formatSubscriptionReason(
  reason: string | null,
  fallback = "Waiting for availability",
): string {
  if (!reason || reason.trim() === "") {
    return fallback;
  }

  return reason
    .toLowerCase()
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}
