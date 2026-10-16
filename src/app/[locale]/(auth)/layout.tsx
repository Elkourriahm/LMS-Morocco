import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

// Pages d'authentification : colonne centrée, sélecteur de langue en tête.
export default function AuthLayout({ children }: LayoutProps<'/[locale]'>) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 px-6 py-12">
      <LanguageSwitcher />
      {children}
    </main>
  );
}
