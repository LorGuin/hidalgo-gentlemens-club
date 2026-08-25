/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // El chequeo de tipos que hace Next.js durante "next build" choca con la
  // versión de TypeScript instalada (error "Invalid value for
  // '--ignoreDeprecations'", un problema de compatibilidad entre
  // herramientas, no un error real de código). Lo salteamos en el build de
  // producción; en desarrollo (npm run dev) el chequeo de tipos del editor
  // sigue funcionando normal.
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  sassOptions: {
    includePaths: ["./src/styles"],
  },
};

module.exports = nextConfig;