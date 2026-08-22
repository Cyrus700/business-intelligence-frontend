import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Role-prefixed dashboard URLs (/admin/dashboard/*, /manager/dashboard/*,
  // /<custom-role>/dashboard/*) are served transparently from the existing
  // /dashboard/* page tree — the browser URL keeps the role prefix, but no
  // page file is duplicated per role. proxy.ts is what enforces that a
  // visitor's role cookie actually matches the prefix; this rewrite only
  // decides which files answer the request.
  async rewrites() {
    return [
      { source: "/:role([a-z][a-z0-9_-]{1,31})/dashboard", destination: "/dashboard" },
      { source: "/:role([a-z][a-z0-9_-]{1,31})/dashboard/:path*", destination: "/dashboard/:path*" },
    ];
  },
};

export default nextConfig;
