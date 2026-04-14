import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  // Prisma query engine must not be bundled; @pitchside/data-access imports generated client.
  serverExternalPackages: ["@prisma/client"],
  transpilePackages: [
    "@pitchside/board-engine",
    "@pitchside/data-access",
    "@pitchside/domain",
    "@pitchside/review-engine",
    "@pitchside/stats-engine",
    "@pitchside/types",
    "@pitchside/ui",
    "@pitchside/utils",
    "@pitchside/validation",
  ],
  typedRoutes: true,
};

export default nextConfig;
