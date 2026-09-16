import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

const nextConfig = (phase: string): NextConfig => ({
  // Keep production builds from overwriting a running development server's chunks.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
  reactStrictMode: true,
  transpilePackages: ['xlsx'],
  serverExternalPackages: ['bullmq', 'ioredis', '@prisma/client'],
});

export default nextConfig;
