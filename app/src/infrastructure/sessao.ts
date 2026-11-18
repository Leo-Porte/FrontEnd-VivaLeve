import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthResponse, User } from '@/models';

const K = {
  TOKEN: 'pluma_token',
  EXPIRA: 'pluma_token_expires',
  USER: 'pluma_user',
  CONVERSA_PREFIXO: 'pluma_chat_conversa_',
};

type Ouvinte = (usuario: User | null) => void;
const ouvintes = new Set<Ouvinte>();
const avisar = (u: User | null) => ouvintes.forEach((f) => f(u));

async function lerUsuario(): Promise<User | null> {
  try {
    const raw = await AsyncStorage.getItem(K.USER);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function normalizar(u: Partial<User>): User {
  const nome = u.name || (u.email ? u.email.split('@')[0] : '');
  return { id: u.id as number, email: u.email as string, name: nome, pictureUrl: u.pictureUrl ?? null };
}

export const sessao = {
  /** Usuário guardado (null se deslogado). */
  usuario: lerUsuario,

  /** Token válido, ou null (token vencido é apagado). */
  async token(): Promise<string | null> {
    const [t, exp] = await Promise.all([AsyncStorage.getItem(K.TOKEN), AsyncStorage.getItem(K.EXPIRA)]);
    if (!t) return null;
    const expira = Date.parse(exp || '');
    if (!Number.isNaN(expira) && expira <= Date.now()) {
      await sessao.limpar();
      return null;
    }
    return t;
  },

  async logado(): Promise<boolean> {
    return (await sessao.token()) !== null;
  },

  /** Salva a resposta de login/cadastro/google. */
  async salvar(auth: AuthResponse): Promise<User> {
    const u = normalizar(auth.user);
    const pares: [string, string][] = [
      [K.TOKEN, auth.token],
      [K.USER, JSON.stringify(u)],
    ];
    if (auth.expiresAt) pares.push([K.EXPIRA, auth.expiresAt]);
    await AsyncStorage.multiSet(pares);
    avisar(u);
    return u;
  },

  /** Atualiza só o usuário guardado (ex.: depois de /users/me). */
  async guardarUsuario(u: User): Promise<User> {
    const n = normalizar(u);
    await AsyncStorage.setItem(K.USER, JSON.stringify(n));
    avisar(n);
    return n;
  },

  /** Sai: apaga token e usuário. A conversa do chat fica (é por usuário). */
  async limpar(): Promise<void> {
    await AsyncStorage.multiRemove([K.TOKEN, K.EXPIRA, K.USER]);
    avisar(null);
  },

  /** Avisa quando o usuário muda (login/logout/401). Devolve a função de cancelar. */
  aoMudar(f: Ouvinte): () => void {
    ouvintes.add(f);
    return () => ouvintes.delete(f);
  },

  // ---- conversa do chat, por usuário

  async chaveConversa(): Promise<string> {
    const u = await lerUsuario();
    return K.CONVERSA_PREFIXO + (u?.id ?? 'anon');
  },
  async conversaSalva(): Promise<number | null> {
    const v = await AsyncStorage.getItem(await sessao.chaveConversa());
    return v ? Number(v) : null;
  },
  async salvarConversa(id: number): Promise<void> {
    await AsyncStorage.setItem(await sessao.chaveConversa(), String(id));
  },
  async limparConversa(): Promise<void> {
    await AsyncStorage.removeItem(await sessao.chaveConversa());
  },
};
