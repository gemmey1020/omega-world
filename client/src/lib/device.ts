// src/lib/device.ts

/**
 * Ω OMEGA Standard Device Hash Generator
 * Hardened to support non-secure contexts (Mobile Dev IP)
 */
export const getDeviceHash = (): string => {
  const DEVICE_HASH_STORAGE_KEY = 'OMEGA_DEVICE_HASH';
  const existingHash = localStorage.getItem(DEVICE_HASH_STORAGE_KEY);

  if (existingHash) return existingHash;

  // الخطة البديلة في حالة البيئة غير الآمنة (HTTP over IP)
  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    // Manual RFC4122 v4 UUID generator for Insecure Contexts
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const nextHash = generateUUID();
  localStorage.setItem(DEVICE_HASH_STORAGE_KEY, nextHash);

  return nextHash;
};