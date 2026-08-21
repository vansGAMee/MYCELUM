import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Атлас Чёрного Субстрата',
  description: 'Большая русская энциклопедия MYCELIUM: пять грибных семейств, мутации, мхи, лишайники, существа, события реактора и полевые записи.',
  alternates: { canonical: '/wiki' },
  openGraph: {
    title: 'Атлас Чёрного Субстрата — MYCELIUM',
    description: 'Лор, биология и действующие правила живого мира MYCELIUM.',
    url: '/wiki',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Атлас Чёрного Субстрата — MYCELIUM',
    description: 'Лор, биология и действующие правила живого мира MYCELIUM.',
  },
};

export default function WikiLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
