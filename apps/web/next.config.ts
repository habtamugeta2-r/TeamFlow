import type { NextConfig } from "next";

const apiUrl = process.env.API_URL ?? "http://127.0.0.1:4000";
const parsedApiUrl = new URL(apiUrl);

if (
  !["http:", "https:"].includes(parsedApiUrl.protocol) ||
  parsedApiUrl.username ||
  parsedApiUrl.password ||
  parsedApiUrl.pathname !== "/" ||
  parsedApiUrl.search ||
  parsedApiUrl.hash
) {
  throw new Error(
    "API_URL must be an HTTP(S) origin, such as http://127.0.0.1:4000",
  );
}

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${parsedApiUrl.origin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
