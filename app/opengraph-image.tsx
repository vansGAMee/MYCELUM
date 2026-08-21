import { ImageResponse } from 'next/og';

export const alt = 'MYCELIUM — прочти колонию, замкни квадрат, защити Ядро';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const dynamic = 'force-static';

const cells = [
  '#66d9c8', '#112a26', '#d7bc77', '#10201d', '#66d9c8',
  '#183c35', '#d7bc77', '#66d9c8', '#183c35', '#d7bc77',
  '#d7bc77', '#183c35', '#66d9c8', '#10201d', '#66d9c8',
  '#10201d', '#66d9c8', '#183c35', '#d7bc77', '#183c35',
  '#66d9c8', '#10201d', '#d7bc77', '#183c35', '#66d9c8',
];

export default function Image() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#050706', color: '#f0eadc', padding: '70px 76px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: 690, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', color: '#66d9c8', fontSize: 24, letterSpacing: 8, textTransform: 'uppercase' }}>Чёрный Субстрат</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 106, fontWeight: 800, letterSpacing: -5 }}>MYCELIUM</div>
          <div style={{ display: 'flex', width: 630, fontSize: 35, lineHeight: 1.25, color: '#b8b8ae' }}>Прочти колонию. Замкни квадрат. Защити Ядро.</div>
        </div>
        <div style={{ display: 'flex', fontSize: 22, color: '#d7bc77', letterSpacing: 2 }}>БЕСПЛАТНАЯ БРАУЗЕРНАЯ СТРАТЕГИЯ</div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', width: 360, height: 360, margin: '65px 0 0 40px', transform: 'rotate(8deg)', boxShadow: '0 0 90px rgba(102, 217, 200, 0.18)' }}>
        {cells.map((color, index) => <div key={index} style={{ display: 'flex', width: 72, height: 72, background: color, border: '1px solid rgba(240,234,220,.08)' }} />)}
      </div>
    </div>,
    size,
  );
}
