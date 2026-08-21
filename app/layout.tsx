import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const siteUrl = 'https://mycelum.vercel.app';
const title = 'MYCELIUM — стратегия о живых колониях';
const description = 'Бесплатная браузерная стратегия: исследуйте Чёрный Субстрат, замыкайте квадраты, читайте намерения врагов и защищайте своё Ядро.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: title, template: '%s — MYCELIUM' },
  description,
  applicationName: 'MYCELIUM',
  category: 'game',
  keywords: ['браузерная игра', 'стратегия', 'игра про грибы', 'мицелий', 'территориальная стратегия', 'онлайн игра 1 на 1', 'инди игра', 'головоломка'],
  alternates: { canonical: '/', languages: { 'ru-RU': '/' } },
  manifest: '/manifest.webmanifest',
  authors: [{ name: 'MYCELIUM' }],
  creator: 'MYCELIUM',
  publisher: 'MYCELIUM',
  verification: { google: 'z0GAcnNbZOQ6EJ5ePpWhk9x41IyAijIaLjU3Pv0d6Ic' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName: 'MYCELIUM',
    locale: 'ru_RU',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title, description },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}<Analytics /></body></html>;
}
