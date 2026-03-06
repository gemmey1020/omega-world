const DEFAULT_SITE_URL = "http://localhost:3000";

export function getSiteBaseUrl(): URL {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!configuredUrl) {
    return new URL(DEFAULT_SITE_URL);
  }

  try {
    return new URL(configuredUrl);
  } catch {
    return new URL(DEFAULT_SITE_URL);
  }
}

export function getVendorCanonicalUrl(vendorId: number): string {
  return new URL(`/vendors/${vendorId}`, getSiteBaseUrl()).toString();
}
