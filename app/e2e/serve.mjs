// Servidor estático mínimo p/ o build web (SPA): serve ./dist, com fallback para index.html.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'dist');
const porta = Number(process.env.E2E_PORT || 8099);
const tipos = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.map': 'application/json',
};

async function arquivo(p) {
  try { return (await stat(p)).isFile() ? p : null; } catch { return null; }
}

createServer(async (req, res) => {
  const caminho = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  const alvo = (await arquivo(join(raiz, caminho))) ?? (await arquivo(join(raiz, `${caminho}.html`))) ?? join(raiz, 'index.html');
  try {
    const corpo = await readFile(alvo);
    res.writeHead(200, { 'content-type': tipos[extname(alvo)] ?? 'application/octet-stream' });
    res.end(corpo);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(porta, () => console.log(`e2e: servindo ${raiz} em http://localhost:${porta}`));
