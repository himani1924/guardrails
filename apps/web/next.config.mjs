/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@guardrail/core'],
  typedRoutes: true,
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream'],
};

export default nextConfig;
