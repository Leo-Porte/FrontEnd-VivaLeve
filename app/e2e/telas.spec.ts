import { TELAS, expandirViewport, expect, mascaras, test } from './fixtures';

test.describe('telas (mock logado)', () => {
  for (const t of TELAS) {
    test(`screenshot ${t.nome}`, async ({ logado: page }) => {
      await page.goto(t.rota);
      await expect(page.getByTestId(t.pronta)).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(400);
      await expandirViewport(page);
      await expect(page).toHaveScreenshot(`${t.nome}.png`, { fullPage: true, mask: mascaras(page) });
    });
  }

  test('login sem sessão', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-11-17T10:00:00-03:00') });
    await page.goto('/login');
    await expect(page.getByTestId('login-entrar')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot('login.png', { fullPage: true });
  });

  test('navega por todas as telas sem erro de console', async ({ logado: page }) => {
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(e.message));
    page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
    for (const t of TELAS) {
      await page.goto(t.rota);
      await expect(page.getByTestId(t.pronta)).toBeVisible();
    }
    expect(erros).toEqual([]);
  });
});
