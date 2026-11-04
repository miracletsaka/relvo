/** @type {import('next').NextConfig} */

// Backend the browser talks to *through* Vercel (same-site cookies).
// Override with BACKEND_URL in Vercel / .env.local (e.g. http://localhost:8000 for local proxying).
const BACKEND_URL = (process.env.BACKEND_URL || "https://relvo-backend-iker.onrender.com").replace(/\/$/, "");

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },

  // ── Proxy: browser calls /backend/* on the Vercel domain, Next forwards to the API ──
  // This makes the login cookie first-party, so middleware and document.cookie can see it.
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
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
