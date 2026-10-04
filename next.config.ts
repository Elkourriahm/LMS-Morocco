import type { NextConfig } from 'next';
// Valide les variables d'environnement dès le chargement de la config
// (next dev, next build, next start) : une variable manquante arrête le
// démarrage au lieu d'échouer plus tard au rendu.
import './src/env';

const nextConfig: NextConfig = {};

export default nextConfig;
