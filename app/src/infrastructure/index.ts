import type { User } from '@/models';
import { MODO_API } from './config';
import { erroApi } from './erros';
import { auth } from './recursos/auth';
import { diario } from './recursos/diario';
import { estatisticas } from './recursos/estatisticas';
import { historico } from './recursos/historico';
import { humor } from './recursos/humor';
import { ia } from './recursos/ia';
import { respiracao } from './recursos/respiracao';
import { usuarios } from './recursos/usuarios';

/** Só no mock: entra como teste@pluma.dev (usado pelos testes visuais). */
export async function entrarComoTeste(): Promise<User> {
  if (MODO_API !== 'mock') throw erroApi('entrarComoTeste só funciona com a API mock');
  return auth.login('teste@pluma.dev', '12345678');
}

export const api = { auth, usuarios, estatisticas, humor, diario, respiracao, historico, ia };

export { BASE_URL, GOOGLE_CLIENT_ID, MODO_API, PRODUCAO_URL } from './config';
export { erroApi, mensagemErro } from './erros';
export { ATIVIDADE_PARA_API, dataLocal, emocao } from './helpers';
export { resetarMock } from './mock';
export { sessao } from './sessao';
