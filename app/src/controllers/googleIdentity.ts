/** Google Identity Services (só web). Carrega o script sob demanda. */

interface GoogleId {
  initialize(cfg: {
    client_id: string;
    callback: (r: { credential: string }) => void;
    ux_mode?: string;
  }): void;
  renderButton(el: HTMLElement, opts: Record<string, unknown>): void;
}
interface GoogleGlobal {
  accounts: { id: GoogleId };
}

const SRC = 'https://accounts.google.com/gsi/client';
let promessa: Promise<GoogleGlobal> | null = null;

export function carregarGoogleIdentity(): Promise<GoogleGlobal> {
  if (promessa) return promessa;
  promessa = new Promise<GoogleGlobal>((resolve, reject) => {
    const g = (window as unknown as { google?: GoogleGlobal }).google;
    if (g?.accounts?.id) return resolve(g);
    const script = document.createElement('script');
    script.src = SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const lib = (window as unknown as { google?: GoogleGlobal }).google;
      if (lib?.accounts?.id) resolve(lib);
      else reject(new Error('gsi indisponível'));
    };
    script.onerror = () => {
      promessa = null;
      reject(new Error('falha ao carregar gsi'));
    };
    document.head.appendChild(script);
  });
  return promessa;
}
