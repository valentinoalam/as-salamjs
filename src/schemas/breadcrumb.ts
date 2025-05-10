import { SchemaBreadcrumb } from "@/types/schema-types"

export interface BreadcrumbItem {
  name: string
  url: string
}

/**
 * Creates a breadcrumb schema
 */
export function createBreadcrumbSchema(items: BreadcrumbItem[]): SchemaBreadcrumb {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

