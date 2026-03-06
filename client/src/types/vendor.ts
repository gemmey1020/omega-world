import type { GeoJSONPoint } from "@/types/zone";

export type VendorSubscriptionStatus = "active" | "expired" | "trial" | (string & {});

export interface VendorSubscriptionAPI {
  status: VendorSubscriptionStatus | null;
  reason: string | null;
  expires_at: string | null;
}

export interface ProductAPI {
  id: number;
  external_id: string;
  title: string;
  price: number;
  image_url: string | null;
}

export interface CategoryAPI {
  id: number;
  name: string;
  products: ProductAPI[];
}

export interface VendorAPI {
  id: number;
  zone_id: number;
  name: string;
  primary_category: string | null;
  whatsapp_number: string;
  coordinates: GeoJSONPoint | null;
  is_active: boolean;
  subscription: VendorSubscriptionAPI;
  is_checkout_available: boolean;
}

export interface VendorCatalogAPI extends VendorAPI {
  categories: CategoryAPI[];
}

export interface CatalogMetaAPI {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface CatalogLinksAPI {
  next: string | null;
  prev: string | null;
}

export interface VendorCatalogPageAPI {
  vendor: VendorCatalogAPI;
  meta: CatalogMetaAPI;
  links: CatalogLinksAPI;
}
