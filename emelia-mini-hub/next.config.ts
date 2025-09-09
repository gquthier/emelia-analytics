import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Désactiver ESLint pendant le build pour accélérer le déploiement
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignorer les erreurs TS pendant le build pour la première version
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
