import { expect, test } from '@playwright/test';

test.describe('attributs lang et dir', () => {
  test('/fr est en français, de gauche à droite', async ({ page }) => {
    await page.goto('/fr');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  });

  test('/ar est en arabe, de droite à gauche', async ({ page }) => {
    await page.goto('/ar');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });
});

test.describe('redirection de la racine', () => {
  test('redirige / vers /fr par défaut', async ({ request }) => {
    const response = await request.get('/', {
      headers: { 'Accept-Language': 'en-US,en;q=0.9' },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(307);
    expect(response.headers()['location']).toMatch(/\/fr$/);
  });

  test('redirige / vers /ar avec Accept-Language: ar', async ({ request }) => {
    const response = await request.get('/', {
      headers: { 'Accept-Language': 'ar' },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(307);
    expect(response.headers()['location']).toMatch(/\/ar$/);
  });

  test('un navigateur en arabe arrive sur /ar', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'ar-MA' });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page).toHaveURL(/\/ar$/);
    await context.close();
  });

  test('un navigateur sans préférence connue arrive sur /fr', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/fr$/);
  });
});

test.describe('sélecteur de langue', () => {
  test('bascule de /fr vers /ar sur la même page', async ({ page }) => {
    await page.goto('/fr');
    const switcher = page.getByRole('navigation', { name: 'Langue' });
    await expect(
      switcher.getByRole('link', { name: 'Français' }),
    ).toHaveAttribute('aria-current', 'true');

    await switcher.getByRole('link', { name: 'العربية' }).click();

    await expect(page).toHaveURL(/\/ar$/);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(
      page
        .getByRole('navigation', { name: 'اللغة' })
        .getByRole('link', { name: 'العربية' }),
    ).toHaveAttribute('aria-current', 'true');
  });
});
