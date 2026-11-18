import AxeBuilder from '@axe-core/playwright';

import { TELAS, expect, test } from './fixtures';

test.describe('axe (contraste)', () => {
  for (const t of TELAS) {
    test(`axe color-contrast ${t.nome}`, async ({ logado: page }) => {
      await page.goto(t.rota);
      await expect(page.getByTestId(t.pronta)).toBeVisible();
      await page.waitForTimeout(1500);
      const r = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
      const msgs = r.violations.flatMap((v) => v.nodes.map((n) => `${n.target.join(' ')}: ${n.any[0]?.message ?? v.help}`));
      expect(msgs).toEqual([]);
    });
  }
});
