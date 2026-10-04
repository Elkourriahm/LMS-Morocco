import { expect, test } from '@playwright/test';

test('la page d’accueil affiche le placeholder', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'LMS Maroc' })).toBeVisible();
  await expect(
    page.getByText('Le socle de l’application est prêt.'),
  ).toBeVisible();
});
