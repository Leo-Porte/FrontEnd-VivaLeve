import { defineConfig, devices } from '@playwright/test';

const PORTA = Number(process.env.E2E_PORT || 8099);

/**
 * Build web (expo export -p web, API mock) servido estaticamente.
 * Requer app.json web.output = "single" (SPA).
 * Projetos: mobile (390x844) e desktop (1280x800), cada um em claro e escuro.
 */
const viewports = {
  mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { viewport: { width: 1280, height: 800 } },
} as const;

const projetos = (['mobile', 'desktop'] as const).flatMap((vp) =>
  (['light', 'dark'] as const).map((scheme) => ({
    name: `${vp}-${scheme}`,
    use: { ...devices['Desktop Chrome'], ...viewports[vp], colorScheme: scheme },
  })),
);

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.resultados',
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000, toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: 'disabled' } },
  reporter: [['list'], ['html', { outputFolder: 'e2e/.relatorio', open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORTA}`,
    trace: 'retain-on-failure',
    reducedMotion: 'reduce',
    locale: 'pt-BR',
  },
  projects: projetos,
  webServer: {
    command: `EXPO_PUBLIC_API_URL=mock npx expo export -p web && E2E_PORT=${PORTA} node e2e/serve.mjs`,
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: !process.env.CI,
    timeout: 600_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
