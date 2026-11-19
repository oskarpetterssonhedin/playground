import type { NextConfig } from "next";

// cacheComponents is intentionally OFF. It forbids `dynamicParams = false`,
// requires non-empty generateStaticParams, and fails prerender on
// Math.random()/Date.now(), which prototypes use constantly. See CLAUDE.md.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
