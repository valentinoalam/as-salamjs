import Script from "next/script";

/**
 * A component that renders JSON-LD schema markup
 */
export function JsonLd<T extends object>({ schema }: { schema: T }) {
  return <Script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}
  
  