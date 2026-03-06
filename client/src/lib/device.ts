const DEVICE_HASH_STORAGE_KEY = "omega_device_hash";

export function getDeviceHash(): string {
  if (typeof window === "undefined") {
    return "server-device";
  }

  const existing = localStorage.getItem(DEVICE_HASH_STORAGE_KEY);

  if (existing) {
    return existing;
  }

  const nextHash = crypto.randomUUID();
  localStorage.setItem(DEVICE_HASH_STORAGE_KEY, nextHash);

  return nextHash;
}
