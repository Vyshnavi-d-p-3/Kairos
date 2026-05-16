/** @type {import('next').NextConfig} */
const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      // SSE doesn't go through this — see /api/stream route handler
      { source: "/api/proxy/:path*", destination: `${apiBase}/api/v1/:path*` },
    ];
  },
};

export default nextConfig;
