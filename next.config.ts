import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['sharp'],
  devIndicators: false,
  // LP はビルド時に start.gg から実データを取って静的生成するため、既定の 60 秒より長く待つ
  staticPageGenerationTimeout: 180,
};

export default nextConfig;
