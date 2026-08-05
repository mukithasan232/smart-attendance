/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow the backend's local snapshot images to be served via <img> tags
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/snapshots/**",
      },
    ],
  },
};

export default nextConfig;
