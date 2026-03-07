import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Allow cross-device mobile testing in local dev.
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://192.168.1.10:3000",
  ],

  async rewrites() {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!baseUrl) {
      return [];
    }

    return [
      {
        source: "/api/:path*",
        destination: `${baseUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
