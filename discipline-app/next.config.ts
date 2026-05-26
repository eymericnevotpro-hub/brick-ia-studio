import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app is a standalone project nested in a repo that has its own
  // lockfile at the root; pin the workspace root to this folder.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
