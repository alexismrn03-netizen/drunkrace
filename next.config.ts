import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@dicebear/core', '@dicebear/collection', '@resvg/resvg-js', 'web-push'],
};

export default nextConfig;
