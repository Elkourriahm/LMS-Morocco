import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
// Valide les variables d'environnement dès le chargement de la config
// (next dev, next build, next start) : une variable manquante arrête le
// démarrage au lieu d'échouer plus tard au rendu.
import './src/env';

const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts');

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
