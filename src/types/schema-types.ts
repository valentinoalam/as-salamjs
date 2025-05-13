import type {
    Article,
    BreadcrumbList,
    FAQPage,
    Organization,
    WebSite,
    WithContext,
  } from "schema-dts"
  
  // Export type definitions for all schema types
  export type SchemaArticle = WithContext<Article>
  export type SchemaBreadcrumb = WithContext<BreadcrumbList>
  export type SchemaFAQ = WithContext<FAQPage>
  export type SchemaOrganization = WithContext<Organization>
  export type SchemaWebsite = WithContext<WebSite>
  
  