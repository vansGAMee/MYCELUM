import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MYCELIUM — Чёрный Субстрат',
    short_name: 'MYCELIUM',
    description: 'Живая территориальная стратегия о предвидении, геометрии и давлении.',
    lang: 'ru',
    start_url: '/',
    display: 'fullscreen',
    background_color: '#050706',
    theme_color: '#050706',
    icons: [{ src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' }],
  };
}
