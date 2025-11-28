/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  env: {
    API_URL: process.env.API_URL || 'http://localhost:8080',
    AUTH_URL: process.env.AUTH_URL || 'http://localhost:8081',
  },
}

module.exports = nextConfig
