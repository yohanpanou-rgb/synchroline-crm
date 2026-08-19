import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    // Sales import sends parsed rows to a Server Action in chunks; each
    // chunk's JSON payload is comfortably under this but well over the 1MB
    // default.
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
