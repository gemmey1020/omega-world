interface JsonLdProps {
  id: string;
  data: object;
}

const JSON_LD_ESCAPE_MAP: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

export default function JsonLd({ id, data }: JsonLdProps) {
  const serialized = JSON.stringify(data).replace(/[<>&\u2028\u2029]/g, (character) => JSON_LD_ESCAPE_MAP[character] ?? character);

  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialized }}
    />
  );
}
