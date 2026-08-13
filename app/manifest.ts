import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return { name: 'MYCELIUM', short_name: 'MYCELIUM', description: 'A living territory strategy about prediction, geometry, and pressure.', start_url: '/', display: 'fullscreen', background_color: '#050706', theme_color: '#050706', icons: [{ src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' }] };
}
