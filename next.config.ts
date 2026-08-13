import type { NextConfig } from 'next';

const isItch = process.env.BUILD_TARGET === 'itch';

const nextConfig: NextConfig = {
  output: isItch ? 'export' : undefined,
  trailingSlash: isItch,
  images: { unoptimized: isItch },
};

export default nextConfig;
