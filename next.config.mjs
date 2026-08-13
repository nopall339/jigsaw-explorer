/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: false,
  },
  webpack: (config) => {
    // konva mencoba me-resolve paket `canvas` (khusus Node). Kita hanya render di
    // browser (semua komponen Konva dimuat dengan ssr: false), jadi di-external saja.
    config.externals = [...(config.externals ?? []), { canvas: 'canvas' }];
    return config;
  },
};

export default nextConfig;
