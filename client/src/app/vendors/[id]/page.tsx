import type { Metadata } from "next";
import { notFound } from "next/navigation";
import JsonLd from "@/components/seo/JsonLd";
import VendorCatalogClient from "@/components/vendors/VendorCatalogClient";
import { getVendorCatalog } from "@/lib/api";
import { getVendorCanonicalUrl } from "@/lib/site";
import { buildVendorLocalBusinessJsonLd, parseVendorId } from "@/lib/vendor-schema";
import type { VendorCatalogAPI } from "@/types/vendor";

interface VendorPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export function buildLocalBusinessJsonLd(
  vendor: VendorCatalogAPI,
  canonicalUrl: string,
): object {
  return buildVendorLocalBusinessJsonLd(vendor, canonicalUrl);
}

export async function generateMetadata({ params }: VendorPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const vendorId = parseVendorId(resolvedParams.id);

  if (vendorId === -1) {
    return {
      title: "Vendor Not Found | OMEGA World",
    };
  }

  try {
    const vendor = await getVendorCatalog(vendorId);
    const canonicalUrl = getVendorCanonicalUrl(vendorId);

    return {
      title: `${vendor.name} | OMEGA World`,
      description: `Order from ${vendor.name}. Hyper-local delivery within your secure perimeter.`,
      alternates: {
        canonical: canonicalUrl,
      },
    };
  } catch {
    const canonicalUrl = getVendorCanonicalUrl(vendorId);

    return {
      title: "Vendor | OMEGA World",
      description: "Hyper-local vendor catalog.",
      alternates: {
        canonical: canonicalUrl,
      },
    };
  }
}

export default async function VendorCatalogPage({ params }: VendorPageProps) {
  const resolvedParams = await params;
  const vendorId = parseVendorId(resolvedParams.id);

  if (vendorId === -1) {
    notFound();
  }

  const canonicalUrl = getVendorCanonicalUrl(vendorId);
  let vendor: VendorCatalogAPI;

  try {
    vendor = await getVendorCatalog(vendorId);
  } catch {
    notFound();
  }

  return (
    <>
      <JsonLd
        id={`vendor-jsonld-${vendor.id}`}
        data={buildLocalBusinessJsonLd(vendor, canonicalUrl)}
      />
      <VendorCatalogClient vendor={vendor} />
    </>
  );
}
