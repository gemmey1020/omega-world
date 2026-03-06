import Script from "next/script";

interface JsonLdProps {
  id: string;
  data: object;
}

export default function JsonLd({ id, data }: JsonLdProps) {
  const serialized = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <Script
      id={id}
      type="application/ld+json"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: serialized }}
    />
  );
}
