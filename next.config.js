/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build on low-RAM hosts (e.g. 1GB Cloudways): generate pages with a single
  // worker instead of one-per-CPU, which keeps peak memory low enough to avoid
  // the OOM-killer during "Collecting page data" / "Generating static pages".
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
  images: {
    domains: ["lh3.googleusercontent.com"],
  },
};

module.exports = nextConfig;
