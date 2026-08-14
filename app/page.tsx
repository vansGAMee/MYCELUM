import { Game } from '../components/Game';

const gameSchema = {
  '@context': 'https://schema.org',
  '@type': 'VideoGame',
  name: 'MYCELIUM',
  alternateName: 'Мицелий: Чёрный Субстрат',
  description: 'Бесплатная браузерная стратегия о живых колониях: исследуйте клетки, замыкайте квадраты, отражайте намерения противников и защищайте Ядро.',
  url: 'https://mycelum.vercel.app/',
  image: 'https://mycelum.vercel.app/social-preview.svg',
  applicationCategory: 'Game',
  gamePlatform: ['Web Browser', 'Desktop', 'Mobile'],
  genre: ['Стратегия', 'Головоломка', 'Территориальная стратегия'],
  inLanguage: 'ru',
  isAccessibleForFree: true,
  playMode: ['SinglePlayer', 'MultiPlayer'],
};

export default function Home() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(gameSchema) }} />
    <Game />
  </>;
}
