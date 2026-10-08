import type messages from '../messages/fr.json';
import type { routing } from '@/lib/i18n/routing';

// Typage des clés de traduction : messages/fr.json fait référence,
// messages/ar.json est aligné par `pnpm i18n:check`.
declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
