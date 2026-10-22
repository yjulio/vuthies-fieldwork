import type { NextConfig } from "next";

const base = process.env.PAGES_BASE_PATH?.trim().replace(/^\/+|\/+$/g, "") ?? "";
const basePath = base ? `/${base}` : "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath,
};

export default nextConfig;
