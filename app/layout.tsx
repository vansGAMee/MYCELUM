import type { Metadata } from 'next';
import './globals.css';

const title = 'MYCELIUM — Living Territory Strategy';
const description = 'Reveal uncertain cells, attack neighboring colonies, close same-color squares, read enemy intentions, and protect your Core.';

export const metadata: Metadata = {
  metadataBase: new URL('https://mycelium-game.vercel.app'),
  title,
  description,
  applicationName: 'MYCELIUM',
  keywords: ['strategy game', 'browser game', 'territory game', 'puzzle strategy', 'multiplayer'],
  manifest: '/manifest.webmanifest',
  openGraph: { title, description, type: 'website', images: [{ url: '/social-preview.svg', width: 1200, height: 630, alt: 'MYCELIUM — Read the colony. Close the square. Protect the Core.' }] },
  twitter: { card: 'summary_large_image', title, description, images: ['/social-preview.svg'] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
