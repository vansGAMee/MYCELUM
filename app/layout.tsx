import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MYCELIUM - Microbial Conquest & Core Defense",
  description: "A dark tactical territory growth game rendered with PixiJS.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;800&family=Outfit:wght@500;700;900&display=swap" rel="stylesheet" />
      </head>
      <body style={{
        backgroundColor: '#030305',
        color: '#f4f4f5',
        fontFamily: '"Outfit", -apple-system, BlinkMacSystemFont, sans-serif',
        overflow: 'hidden',
        margin: 0,
        padding: 0,
        userSelect: 'none',
      }}>
        {children}
      </body>
    </html>
  );
}
