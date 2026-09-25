import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // GitHub Pages serves this project as a static export. Keep the base path
  // configurable so the same source still runs at `/` during local preview.
  output: "export",
  basePath: process.env.NEXT_BASE_PATH ?? "",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;

