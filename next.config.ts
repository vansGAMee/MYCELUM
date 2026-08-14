import type { NextConfig } from 'next';

const isItch = process.env.BUILD_TARGET === 'itch';

const nextConfig: NextConfig = {
  output: isItch ? 'export' : undefined,
  trailingSlash: isItch,
  // itch.io serves HTML5 uploads from a nested iframe URL. Relative assets keep
  // the game CSS and JavaScript inside that upload instead of requesting the
  // host site's root /_next directory.
  assetPrefix: isItch ? './' : undefined,
  images: { unoptimized: isItch },
};

export default nextConfig;
