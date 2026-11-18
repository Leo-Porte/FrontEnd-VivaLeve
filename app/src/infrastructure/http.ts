import { BASE_URL, TIMEOUT_MS } from './config';
import { erroApi } from './erros';
import type { Requisicao, Transporte } from './transporte';

export function criarTransporteHttp(baseUrl: string = BASE_URL): Transporte {
  return {
    async enviar(req: Requisicao) {
      const headers: Record<string, string> = {};
      let body: any;
      if (req.form) {
        const fd = new FormData();
        for (const [k, v] of Object.entries(req.form)) {
          (Array.isArray(v) ? v : [v]).forEach((x) => fd.append(k, x));
        }
        body = fd; // Content-Type com boundary é montado pelo fetch
      } else if (req.json !== undefined) {
        body = JSON.stringify(req.json);
        headers['Content-Type'] = 'application/json';
      }
      if (req.token) headers.Authorization = 'Bearer ' + req.token;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(baseUrl + req.endpoint, {
          method: req.metodo,
          headers,
          body,
          signal: controller.signal,
        });
      } catch (e: any) {
        const motivo = e?.name === 'AbortError' ? 'não respondeu a tempo' : 'não está acessível';
        throw erroApi(`A API em ${baseUrl} ${motivo}`, { offline: true });
      } finally {
        clearTimeout(timer);
      }

      const text = await response.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }
      if (!response.ok) {
        throw erroApi((data && data.message) || `Erro HTTP ${response.status}`, {
          status: response.status,
        });
      }
      return data;
    },
  };
}
