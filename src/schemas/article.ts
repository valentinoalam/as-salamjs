// export function generateArticleSchema({ headline, image, datePublished, author }) {
//     return {
//       "@context": "https://schema.org",
//       "@type": "Article",
//       headline,
//       image,
//       datePublished,
//       author: {
//         "@type": "Person",
//         name: author,
//       },
//     };
//   }
import { SchemaArticle } from '@/types/schema-types';

export interface ArticleSchemaProps {
  headline: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  authorName: string;
  publisherName: string;
  publisherLogo: string;
}

/**
 * Creates an article schema
 */
export function createArticleSchema({
  headline,
  description,
  image,
  datePublished,
  dateModified,
  authorName,
  publisherName,
  publisherLogo,
}: ArticleSchemaProps): SchemaArticle {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    image,
    datePublished,
    dateModified: dateModified || datePublished,
    author: {
      '@type': 'Person',
      name: authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: publisherName,
      logo: {
        '@type': 'ImageObject',
        url: publisherLogo,
      },
    },
  };
}
