/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hide the floating "N" dev badge — it overlaps the sidebar in screenshots.
  // Build/runtime error overlays still appear.
  devIndicators: false,
};

export default nextConfig;
