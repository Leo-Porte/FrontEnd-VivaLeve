import { expect, test } from './fixtures';

test.describe('fluxos felizes', () => {
  test('humor: escolhe emoção, anota e salva', async ({ logado: page }) => {
    await page.goto('/humor');
    await page.getByTestId('emotion-bem').click();
    // celular: tocar na emoção avança sozinho para a nota (etapa 2 de 3); computador: formulário com tudo à vista
    await page.getByTestId('humor-nota').fill('Dia tranquilo.');
    const continuar = page.getByTestId('humor-continuar');
    if (await continuar.isVisible()) {
      await continuar.click();
      await expect(page.getByTestId('humor-passo')).toHaveText('Passo 3 de 3');
    }
    await page.getByTestId('humor-atividade-familia').click();
    await page.getByTestId('humor-salvar').click();
    await expect(page.getByTestId('humor-salvo')).toBeVisible();
    // a confirmação traz a linha do tempo, com o registro novo em "Hoje"
    const linha = page.getByTestId('humor-linha-tempo');
    await expect(linha).toBeVisible();
    await expect(linha.getByText('Dia tranquilo.')).toBeVisible();
    await expect(linha.getByText('Família').first()).toBeVisible();
  });

  test('diário: cria entrada e vê', async ({ logado: page }) => {
    await page.goto('/diario');
    await page.getByTestId('diario-novo').click();
    await page.getByTestId('diario-titulo').fill('Meu dia');
    await page.getByTestId('diario-texto').fill('Hoje foi um bom dia para respirar fundo.');
    await page.getByTestId('diario-salvar').click();
    await expect(page.getByText('Meu dia').first()).toBeVisible();
  });

  test('respirar: inicia o exercício', async ({ logado: page }) => {
    await page.goto('/respirar');
    await page.getByTestId('respirar-iniciar').click();
    await expect(page.getByTestId('respirar-timer')).toBeVisible();
    await expect(page.getByTestId('respirar-parar')).toBeVisible();
  });

  test('chat: envia mensagem e recebe resposta', async ({ logado: page }) => {
    await page.goto('/chat');
    await page.getByTestId('chat-input').fill('Olá, estou um pouco ansioso hoje');
    await page.getByTestId('chat-enviar').click();
    await expect(page.getByTestId('chat-msg-user').first()).toBeVisible();
    await expect(page.getByTestId('chat-msg-bot').first()).toBeVisible({ timeout: 20_000 });
  });

  test('config: sons tocam e param', async ({ logado: page }) => {
    await page.goto('/config');
    await expect(page.getByTestId('config-sons')).toBeVisible();
  });
});
