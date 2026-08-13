import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: 'https://mycelium-game.vercel.app', changeFrequency: 'monthly', priority: 1 }, { url: 'https://mycelium-game.vercel.app/wiki/', changeFrequency: 'monthly', priority: 0.6 }];
}
