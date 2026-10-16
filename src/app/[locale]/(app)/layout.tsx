import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

// Pages du personnel. L'accès est vérifié page par page (getCurrentSchool ou
// getStaffContext) : un layout n'est pas réexécuté à chaque navigation.
export default function AppLayout({ children }: LayoutProps<'/[locale]'>) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <LanguageSwitcher />
      {children}
    </main>
  );
}
