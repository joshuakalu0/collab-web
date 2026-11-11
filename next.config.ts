import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true
  },
  serverExternalPackages: ["@prisma/client"],
  transpilePackages: ["@booster/collab-contracts", "@booster/database"]
};

export default nextConfig;
