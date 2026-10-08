import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from 'next/font/google';

// Même famille typographique en latin et en arabe (ADR 0005). Les polices
// sont téléchargées au build puis servies par l'application.
export const latinFont = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: 'variable',
  display: 'swap',
  variable: '--font-latin',
});

export const arabicFont = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '600'],
  display: 'swap',
  variable: '--font-arabic',
});
