import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@dicebear/core', '@dicebear/collection', '@resvg/resvg-js'],
};

export default nextConfig;
