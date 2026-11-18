import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { api } from '@/infrastructure';
import { ThemeProvider } from '@/theme';

import { ChatScreen } from '../chat/ChatScreen';
import { DiarioScreen } from '../diario/DiarioScreen';
import { HistoricoScreen } from '../historico/HistoricoScreen';
import { RespirarScreen } from '../respirar/RespirarScreen';

jest.mock('react-native-reanimated', () => require('@/test-utils/reanimated'));
jest.mock('moti', () => ({ MotiView: require('react-native').View, AnimatePresence: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('@expo-google-fonts/caveat', () => ({ useFonts: () => [false], Caveat_500Medium: 1, Caveat_700Bold: 1 }));
jest.mock('expo-blur', () => ({ BlurView: require('react-native').View }));
jest.mock('expo-router', () => {
  const replace = jest.fn();
  return { useRouter: () => ({ replace }), usePathname: () => '/' };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/infrastructure', () => ({
  mensagemErro: (e: any, p?: string) => e?.message || p || 'erro',
  api: {
    auth: { logado: jest.fn(), sair: jest.fn() },
    diario: { listar: jest.fn(), criar: jest.fn(), atualizar: jest.fn(), apagar: jest.fn() },
    historico: { resumo: jest.fn(), evolucao: jest.fn(), distribuicao: jest.fn() },
    humor: { todos: jest.fn() },
    respiracao: { stats: jest.fn(), registrar: jest.fn(), apagarTodas: jest.fn() },
    ia: { conversar: jest.fn(), historico: jest.fn(), sessoes: jest.fn(), ativa: jest.fn(), encerrar: jest.fn(), retomar: jest.fn(), mensagens: jest.fn(), apagarConversa: jest.fn() },
  },
}));

const a = api as any;
const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

beforeEach(() => jest.clearAllMocks());

it('Diário: calendário → dia com os post-its → caderneta', async () => {
  const agora = new Date();
  agora.setHours(10, 0, 0, 0);
  const dia = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
  a.diario.listar.mockResolvedValue([{ id: 1, title: 'Meu dia', text: 'foi bom', emotion: 'BEM', createdAt: agora.toISOString(), updatedAt: '' }]);
  await wrap(<DiarioScreen />);
  // abre no calendário do mês; o dia com anotação vira um botão
  await fireEvent.press(await screen.findByTestId(`diario-dia-${dia}`));
  // mural do dia: o post-it mostra a hora no topo
  expect(await screen.findByText('10:00')).toBeTruthy();
  expect(screen.getByTestId('diario-dia-titulo')).toBeTruthy();
  expect(screen.getByTestId('diario-pino-1')).toBeTruthy();
  // a tachinha pede confirmação antes de soltar
  await fireEvent.press(screen.getByTestId('diario-pino-1'));
  expect(await screen.findByText('Soltar este post-it?')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('soltar-cancelar'));
  // nova anotação abre a caderneta com a pauta e os adesivos
  await fireEvent.press(screen.getByTestId('diario-novo'));
  expect(await screen.findByTestId('diario-titulo')).toBeTruthy();
  expect(screen.getByTestId('diario-salvar')).toBeTruthy();
  expect(screen.getByTestId('diario-adesivo-bem')).toBeTruthy();
});

it('Histórico: mostra resumo e períodos', async () => {
  a.historico.resumo.mockResolvedValue({ totalRecords: 4, currentStreak: 2, bestStreak: 3, breathingSessions: 0 });
  a.humor.todos.mockResolvedValue([{ id: 1, mood: 'BEM', note: 'ok', createdAt: '2026-01-01T10:00:00Z' }]);
  a.respiracao.stats.mockResolvedValue({ todaySessions: 0, totalSessions: 2, totalMinutes: 2 });
  a.historico.evolucao.mockResolvedValue([{ date: '2026-01-01', averageScore: 4, count: 1 }]);
  a.historico.distribuicao.mockResolvedValue({ items: [{ mood: 'BEM', count: 1, percentage: 100 }], total: 1, predominant: 'BEM', predominantPercentage: 100 });
  await wrap(<HistoricoScreen />);
  await waitFor(() => expect(screen.getByTestId('historico-periodo-30')).toBeTruthy());
  expect(screen.getByTestId('historico-total')).toBeTruthy();
  expect(screen.getByText('100% dos registros')).toBeTruthy();
});

it('Respirar: mostra botão iniciar e estatísticas', async () => {
  a.respiracao.stats.mockResolvedValue({ todaySessions: 1, totalSessions: 5, totalMinutes: 7 });
  await wrap(<RespirarScreen />);
  expect(screen.getByTestId('respirar-iniciar')).toBeTruthy();
  await waitFor(() => expect(screen.getByTestId('respirar-stat-total')).toBeTruthy());
  await fireEvent.press(screen.getByTestId('respirar-iniciar'));
  expect(await screen.findByText('Inspire')).toBeTruthy();
});

it('Sessão: início com nome, campo e atalhos quando logado', async () => {
  a.auth.logado.mockResolvedValue(true);
  a.ia.historico.mockResolvedValue([]);
  a.ia.ativa.mockResolvedValue(null);
  a.ia.sessoes.mockResolvedValue([{ id: 7, useCase: 'CHAT', title: 'Noites sem dormir', createdAt: '2026-11-10T20:00:00Z', lastMessageAt: '2026-11-10T20:10:00Z' }]);
  await wrap(<ChatScreen />);
  expect(await screen.findByTestId('chat-boas-vindas')).toBeTruthy();
  expect(screen.getByTestId('chat-input')).toBeTruthy();
  expect(screen.queryByTestId('chat-anteriores')).toBeNull();
  expect(screen.getByTestId('chat-reabrir-ultima')).toBeTruthy();
  expect(screen.queryByText(/chat/i)).toBeNull();
  // telefone: a lista de sessões fica na gaveta
  expect(screen.queryByText('Noites sem dormir')).toBeNull();
  await fireEvent.press(screen.getByTestId('chat-abrir-sessoes'));
  expect(screen.getByText('Noites sem dormir')).toBeTruthy();
});

it('Sessão: envia, mostra "pensando" e a resposta da Pluma', async () => {
  a.auth.logado.mockResolvedValue(true);
  a.ia.historico.mockResolvedValue([]);
  a.ia.ativa.mockResolvedValue(null);
  a.ia.sessoes.mockResolvedValue([]);
  a.ia.encerrar.mockResolvedValue(undefined);
  a.ia.conversar.mockResolvedValue({ conversationId: 3, reply: 'Estou aqui com você.', status: 'SUCCESS', createdAt: '2026-11-17T10:00:00Z' });
  await wrap(<ChatScreen />);
  await fireEvent.changeText(await screen.findByTestId('chat-input'), 'oi');
  await fireEvent.press(screen.getByTestId('chat-enviar'));
  expect(await screen.findByTestId('chat-msg-user')).toBeTruthy();
  expect(screen.getByTestId('chat-pensando')).toBeTruthy();
  expect(screen.getByTestId('chat-encerrar')).toBeTruthy();
  expect(await screen.findByText('Estou aqui com você.', {}, { timeout: 7000 })).toBeTruthy();
}, 10000);

it('Chat: pede login quando deslogado', async () => {
  a.auth.logado.mockResolvedValue(false);
  await wrap(<ChatScreen />);
  expect(await screen.findByTestId('chat-sem-login')).toBeTruthy();
  expect(screen.getByTestId('chat-entrar')).toBeTruthy();
});
