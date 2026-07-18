import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@remixicon/react"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async rewrites() {
    let backendUrl = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    if (backendUrl && !backendUrl.startsWith("http://") && !backendUrl.startsWith("https://") && !backendUrl.startsWith("/")) {
      backendUrl = `https://${backendUrl}`;
    }
    if (backendUrl && backendUrl.endsWith("/")) {
      backendUrl = backendUrl.slice(0, -1);
    }
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: "classphere",
  project: "classphere-web",
});
