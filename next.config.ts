import type { NextConfig } from "next";

/**
 * دو حالت اجرا:
 * 1) حالت عادی/توسعه (standalone) — پیش‌نمایش و اجرای محلی
 * 2) حالت استاتیک برای GitHub Pages:
 *    NEXT_STATIC_EXPORT=1 NEXT_PUBLIC_BASE_PATH=/repo-name bun run build:static
 */
const nextConfig: NextConfig = {
  output: process.env.NEXT_STATIC_EXPORT === "1" ? "export" : "standalone",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  images: { unoptimized: true },
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
