import type { VendorCatalogAPI } from "@/types/vendor";

interface SchemaProduct {
  "@type": "Product";
  name: string;
  sku: string;
  image?: string;
}

interface SchemaOffer {
  "@type": "Offer";
  name: string;
  priceCurrency: "EGP";
  price: number;
  itemOffered: SchemaProduct;
}

interface SchemaOfferCatalog {
  "@type": "OfferCatalog";
  name: string;
  itemListElement: Array<SchemaOfferCatalog | SchemaOffer>;
}

interface LocalBusinessSchema {
  "@context": "https://schema.org";
  "@type": "LocalBusiness";
  "@id": string;
  url: string;
  name: string;
  telephone: string;
  address: {
    "@type": "PostalAddress";
    addressLocality: string;
    addressCountry: "EG";
  };
  geo?: {
    "@type": "GeoCoordinates";
    latitude: number;
    longitude: number;
  };
  isAccessibleForFree: boolean;
  potentialAction: {
    "@type": "OrderAction";
    target: string;
  };
  hasOfferCatalog: SchemaOfferCatalog;
}

function normalizeDigits(input: string): string {
  return input.replace(/[^\d]/g, "");
}

function toTelephoneUri(rawNumber: string): string {
  const digits = normalizeDigits(rawNumber);

  if (!digits) {
    return "tel:";
  }

  return `tel:+${digits}`;
}

export function parseVendorId(rawId: string): number {
  const vendorId = Number.parseInt(rawId, 10);

  if (Number.isNaN(vendorId) || vendorId <= 0) {
    return -1;
  }

  return vendorId;
}

export function buildVendorLocalBusinessJsonLd(
  vendor: VendorCatalogAPI,
  canonicalUrl: string,
): LocalBusinessSchema {
  const whatsappDigits = normalizeDigits(vendor.whatsapp_number);

  const geoCoordinates = vendor.coordinates
    ? {
        "@type": "GeoCoordinates" as const,
        latitude: vendor.coordinates.coordinates[1],
        longitude: vendor.coordinates.coordinates[0],
      }
    : undefined;

  const offerCatalog: SchemaOfferCatalog = {
    "@type": "OfferCatalog",
    name: `${vendor.name} Catalog`,
    itemListElement: vendor.categories.map((category) => ({
      "@type": "OfferCatalog",
      name: category.name,
      itemListElement: category.products.map((product) => ({
        "@type": "Offer",
        name: product.title,
        priceCurrency: "EGP",
        price: Number(product.price),
        itemOffered: {
          "@type": "Product",
          name: product.title,
          sku: product.external_id,
          ...(product.image_url ? { image: product.image_url } : {}),
        },
      })),
    })),
  };

  const schema: LocalBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": canonicalUrl,
    url: canonicalUrl,
    name: vendor.name,
    telephone: toTelephoneUri(vendor.whatsapp_number),
    address: {
      "@type": "PostalAddress",
      addressLocality: `Zone ${vendor.zone_id}`,
      addressCountry: "EG",
    },
    geo: geoCoordinates,
    isAccessibleForFree: true,
    potentialAction: {
      "@type": "OrderAction",
      target: whatsappDigits ? `https://wa.me/${whatsappDigits}` : "https://wa.me/",
    },
    hasOfferCatalog: offerCatalog,
  };

  return schema;
}
