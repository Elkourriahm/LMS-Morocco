import { expect, test } from '@playwright/test';

test.describe('page d’accueil', () => {
  test('affiche le placeholder traduit en français', async ({ page }) => {
    await page.goto('/fr');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'LMS Maroc',
    );
    await expect(
      page.getByText('Le socle de l’application est prêt.'),
    ).toBeVisible();
    await expect(page.getByTestId('example-date')).toHaveText(
      '14 septembre 2026',
    );
    await expect(page.getByTestId('example-amount')).toContainText('1.250,50');
  });

  test('affiche le placeholder traduit en arabe, chiffres latins', async ({
    page,
  }) => {
    await page.goto('/ar');

    await expect(page.getByText('أساس التطبيق جاهز.')).toBeVisible();
    await expect(page.getByTestId('example-date')).toHaveText('14 شتنبر 2026');
    await expect(page.getByTestId('example-amount')).toContainText('1.250,50');
  });
});
