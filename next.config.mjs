/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },

  // ── Silence the Turbopack warning ──
  turbopack: {},

  // ── Remotion: server-only packages ──
  experimental: {
    serverComponentsExternalPackages: [
      "@remotion/renderer",
      "@remotion/bundler",
    ],
  },

  // ── Webpack config is kept for non-Turbopack builds (CI, production) ──
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        "@remotion/renderer",
        "@remotion/bundler",
      ];
    }
    return config;
  },
};

export default nextConfig;