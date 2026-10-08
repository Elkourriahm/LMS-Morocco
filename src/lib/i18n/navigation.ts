import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Équivalents de next/link et next/navigation qui gèrent le préfixe de locale.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
