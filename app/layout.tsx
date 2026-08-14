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
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName: 'MYCELIUM',
    locale: 'ru_RU',
    type: 'website',
    images: [{ url: '/social-preview.svg', width: 1200, height: 630, alt: 'MYCELIUM — прочти колонию, замкни квадрат, защити Ядро' }],
  },
  twitter: { card: 'summary_large_image', title, description, images: ['/social-preview.svg'] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}<Analytics /></body></html>;
}
