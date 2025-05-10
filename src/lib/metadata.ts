import { METADATA } from '@/config/metadata';

export const generateMetaData = (pageKey: string = 'global', path?: string) => {
  const meta = METADATA[pageKey] || METADATA.global;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = `${baseUrl}${path}`;
  return {
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: url,
    },
    title: meta.title,
    category: meta.category,
    description: meta.description,
    keywords: Array.isArray(meta.keywords)? meta.keywords.join(', ') : meta.keywords,
    icons: meta.icons,
    manifest: meta.manifest,
    openGraph: meta.openGraph,
    twitter: meta.twitter,
    formatDetection: meta.formatDetection,
    robots: meta.robots,
    facebook: meta.facebook,
    verification: meta.verification,
    appLinks: meta.appLinks,
    other: meta.other,
    authors: meta.authors,
    creator: meta.creator,
    publisher: meta.publisher
  };
};
