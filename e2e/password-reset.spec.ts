// Réinitialisation du mot de passe de bout en bout (ADR 0008) : email lu
// dans Mailpit (outil mail de Supabase local), lien token_hash, nouveau mot
// de passe, puis retour au mot de passe du seed. Compte réservé à ce test :
// enseignant@exemple.test.
import {
  type APIRequestContext,
  type Page,
  expect,
  test,
} from '@playwright/test';
import { SEED_PASSWORD } from '../scripts/lib/seed-dev.mts';

const MAILPIT = 'http://127.0.0.1:54324';
const EMAIL = 'enseignant@exemple.test';

type MailpitList = { messages: { ID: string; Created: string }[] };

/** Lien du dernier email de réinitialisation reçu après `since`. */
async function resetLink(request: APIRequestContext, since: Date) {
  let link: string | undefined;
  await expect
    .poll(
      async () => {
        const list = (await (
          await request.get(`${MAILPIT}/api/v1/search`, {
            params: { query: `to:"${EMAIL}"`, limit: '5' },
          })
        ).json()) as MailpitList;
        const latest = list.messages.find(
          (message) => new Date(message.Created) >= since,
        );
        if (!latest) return undefined;
        const message = (await (
          await request.get(`${MAILPIT}/api/v1/message/${latest.ID}`)
        ).json()) as { HTML: string };
        link = /href="([^"]*reinitialisation\/confirmer[^"]*)"/
          .exec(message.HTML)?.[1]
          ?.replaceAll('&amp;', '&');
        return link;
      },
      { timeout: 15_000 },
    )
    .toBeTruthy();
  return link ?? '';
}

async function setNewPassword(page: Page, password: string) {
  await page.locator('#password').fill(password);
  await page.locator('#confirm').fill(password);
  await page.locator('form button[type="submit"]').click();
}

test('mot de passe oublié : email, lien, nouveau mot de passe, connexion', async ({
  page,
  request,
}) => {
  const since = new Date(Date.now() - 1000);
  await page.goto('/fr/mot-de-passe-oublie');
  await page.locator('#email').fill(EMAIL);
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByTestId('reset-sent')).toBeVisible();

  const link = await resetLink(request, since);
  expect(link).toMatch(
    /^http:\/\/127\.0\.0\.1:3000\/fr\/reinitialisation\/confirmer\?token_hash=/,
  );
  await page.goto(link);
  await expect(page).toHaveURL('/fr/nouveau-mot-de-passe');

  // Trop court : erreur sur le champ, focus dessus.
  await setNewPassword(page, '123456789');
  await expect(page.locator('#password')).toBeFocused();
  await expect(page.locator('#password-erreur')).toHaveText(
    'Le mot de passe doit contenir au moins 10 caractères.',
  );

  const temporary = `Temporaire-${Date.now()}`;
  await setNewPassword(page, temporary);
  await expect(page).toHaveURL('/fr/tableau-de-bord');

  // Le lien ne sert qu'une fois.
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await page.goto(link);
  await expect(page).toHaveURL('/fr/mot-de-passe-oublie?erreur=lien');

  // Connexion avec le nouveau mot de passe, puis retour à celui du seed.
  await page.goto('/fr/connexion');
  await page.locator('#email').fill(EMAIL);
  await page.locator('#password').fill(temporary);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL('/fr/tableau-de-bord');
  await page.goto('/fr/nouveau-mot-de-passe');
  await setNewPassword(page, SEED_PASSWORD);
  await expect(page).toHaveURL('/fr/tableau-de-bord');
});

test('lien de réinitialisation falsifié : refusé', async ({ page }) => {
  await page.goto(
    '/fr/reinitialisation/confirmer?token_hash=pkce_faux&type=recovery',
  );
  await expect(page).toHaveURL('/fr/mot-de-passe-oublie?erreur=lien');
  await expect(
    page.getByText('Ce lien de réinitialisation est invalide ou a expiré.'),
  ).toBeVisible();
});
