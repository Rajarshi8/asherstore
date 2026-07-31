import type { NextConfig } from "next";

const resolvedEndpoint =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  process.env.APPWRITE_ENDPOINT ||
  "https://nyc.cloud.appwrite.io/v1";

const endpointUrl = (() => {
  try {
    return new URL(resolvedEndpoint);
  } catch {
    return new URL("https://nyc.cloud.appwrite.io/v1");
  }
})();

const nextConfig: NextConfig = {
  output: "standalone",   // 👈 ADD THIS

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "example.com",
      },
      {
        protocol: endpointUrl.protocol.replace(":", "") as "http" | "https",
        hostname: endpointUrl.hostname,
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "font-src 'self' data:;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;