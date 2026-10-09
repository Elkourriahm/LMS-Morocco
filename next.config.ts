import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
// Valide les variables d'environnement dès le chargement de la config
// (next dev, next build, next start) : une variable manquante ou une clé
// service_role exposée arrête le démarrage au lieu d'échouer plus tard.
import { getServerEnv } from './src/env';

getServerEnv();

const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts');

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
