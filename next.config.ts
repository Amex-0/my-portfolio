import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
  experimental: {
    optimizePackageImports: ["gsap", "react-icons"],
  },
};

export default nextConfig;
