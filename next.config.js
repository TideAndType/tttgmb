/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {},
  images: {
    domains: ["lh3.googleusercontent.com"],
  },
};

module.exports = nextConfig;
