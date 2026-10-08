import type { NextConfig } from "next";

// F2.3 : fichiers joints jusqu'à 10 Mo. La limite par défaut des Server Actions
// est 1 Mo ; sans cette configuration, tout fichier plus gros est rejeté
// ("Body exceeded 1 MB limit") avant même le contrôle serveur de taille.
const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
