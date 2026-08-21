import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';
const siteUrl = 'https://mycelum.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${siteUrl}/`, lastModified: new Date('2026-08-21'), changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/wiki`, lastModified: new Date('2026-08-21'), changeFrequency: 'monthly', priority: 0.9 },
  ];
}
