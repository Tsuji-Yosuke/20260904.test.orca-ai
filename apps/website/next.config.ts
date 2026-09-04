import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // @orca/component-meta はビルドを持たない TS ソース直 export のため Next 側で transpile する
  transpilePackages: ["@orca/component-meta"],
};

export default nextConfig;
