# Pluma App: arquitetura e contratos

Front da Pluma em **Expo SDK 58 + React Native** (web, iOS e Android). Substituiu o front legado em HTML/CSS/JS,
que foi removido do repositório; a coluna "Legado" abaixo fica só como referência de origem de cada tela.

Antes de usar API de Expo/RN: leia `AGENTS.md` (docs versionadas, `npx expo install`).

## Camadas

```
src/
  app/              rotas do expo-router — FINAS: só importam a tela de src/screens
  screens/<tela>/   UI da tela. Só desenha; estado e regra vêm do controller
  controllers/      hooks useXController(): estado, regra, chamadas à infrastructure
  infrastructure/   tudo que fala com fora: http, endpoints, sessão, storage, mock
  models/           tipos de recepção (formato da API). Só tipos.
  entities/         dados FIXOS no código e imutáveis (catálogo: emoções, atividades, respiração 3-4-5,
                    sons, rede de apoio, frases e ritmo da sessão, regras) + estados de tela como
                    máquinas puras (Carregamento, Envio, Respiracao, EstadoLogin). Fonte única.
  components/ui/    design system reutilizável (sem regra de negócio)
  components/three/ cenas React Three Fiber
  components/icons3d/ ícones 3D (3dicons, CC0)
  theme/            tokens, auto-contraste, provider de tema
```

Regra de dependência (seta = pode importar):
`app → screens → controllers → infrastructure → models`; `screens → components → theme`.
Tela **nunca** importa infrastructure direto. Componente de `ui/` **nunca** importa controller.

## Contrato da infrastructure (`@/infrastructure`)

```ts
export const api: {
  auth: { login(email, password): Promise<User>; register(email, password, name?): Promise<User>;
          google(credential): Promise<User>; logado(): Promise<boolean>; sair(): Promise<void> };
  usuarios: { eu(): Promise<User> };
  estatisticas: { resumo(days): Promise<StatsSummary> };
  humor: { listar({page,size}?): Promise<Page<MoodLog>>; todos(): Promise<MoodLog[]>; hoje(): Promise<MoodLog[]>;
           criar(mood, note?, activities?): Promise<MoodLog>; atualizar(id, mood, note?, activities?): Promise<MoodLog>;
           apagar(id): Promise<void> };
  diario: { listar(q?): Promise<DiaryEntry[]>; buscar(id); criar(DiaryInput); atualizar(id, DiaryInput); apagar(id) };
  respiracao: { sessoes(); registrar(BreathingInput); apagarTodas(); stats(): Promise<BreathingStats> };
  historico: { distribuicao(days): Promise<MoodDistribution>; evolucao(days): Promise<EvolutionPoint[]>;
               resumo(): Promise<HistorySummary> };
  ia: { conversar(msg): Promise<AiResponse>; historico(): Promise<ChatMessage[]>;
        encerrar(): Promise<void>; retomar(id): Promise<void>; ativa(): Promise<number | null>; sessoes(): Promise<Conversation[]>;
        conversas(): Promise<Conversation[]>; mensagens(id): Promise<ChatMessage[]>; apagarConversa(id): Promise<void>;
        insightHumor(days?): Promise<AiResponse>; reflexaoRegistro(moodLogId): Promise<AiResponse> };
};
export function mensagemErro(e: unknown, padrao?: string): string;
export const sessao: { usuario(): Promise<User | null>; ... };
```

- Modo da API: `EXPO_PUBLIC_API_URL` = `mock` (padrão em dev) | URL. Produção: `https://back-end-vivaleve.onrender.com`.
- Mock: porta de `js/mock-api.js` (mesmas rotas, dados de exemplo, chat com detecção de crise).
- Sessão em AsyncStorage (funciona em web e mobile).

## Contrato do design system (`@/components/ui`)

`Screen`, `Text` (variantes: display, title, subtitle, body, caption, label), `Button` (primary|secondary|ghost|danger, loading),
`Card`, `TextField`, `Chip`, `EmotionPicker`, `EmotionBadge`, `StatTile`, `SectionHeader`, `EmptyState`, `ErrorState`,
`Loading`, `Modal`, `ConfirmDialog`, `ListItem`, `AppShell` (navegação: menu orbital, bolinha embaixo no mobile e no canto inferior direito na tela larga),
`FadeIn`/`Stagger` (Moti), `Icon3D` (de `@/components/icons3d`).

Tema (`@/theme`): `useTheme()` → `{ colors, spacing, radius, typography, scheme }`, claro/escuro;
`emotions` (id, label, emoji, cor, score) e `contrastText(bg)`/`ensureContrast(fg, bg, min=4.5)` (auto-contraste WCAG).

## Telas (paridade com o legado — nenhuma funcionalidade some)

| Rota | Legado | Funcionalidades |
|---|---|---|
| `/login` | login.html | email/senha, cadastro (8-64), Google (web), mostrar senha |
| `/` | index.html | saudação, atalhos, rede de apoio (CVV 188, psicólogos, terapia online, conteúdo) |
| `/humor` | humor.html | 6 emoções, atividades, nota, salvar, registros de hoje |
| `/diario` | diario.html | listar, buscar, criar, editar, ver, excluir, emoção |
| `/historico` | historico.html | resumo, sequências, evolução (linha) 7/30 dias, distribuição, predominante, lista |
| `/respirar` | respirar.html | exercício 3-4-5 guiado, ciclos, registrar sessão, stats, apagar sessões |
| `/chat` | chat.html | sessão com a IA: início centralizado, sessões anteriores, reabrir, aviso de crise |
| `/config` | config.html | usuário, tema, sons, links úteis, apagar tudo, sair |
| sons | js/sons.js | sons ambiente (tocar/pausar/volume) |

## Testes unitários

Jest (`jest-expo`) + `@testing-library/react-native`: `npm test`. Teste ao lado do código em `__tests__/`.
Obrigatório: entidades, theme/contraste, infrastructure (cliente, sessão, mock), cada controller (renderHook com
`@/infrastructure` mockado) e um render por tela/componente principal.

## Testes visuais

Playwright contra o build web (`npx expo export -p web` + servidor estático) em `e2e/`, mock ligado,
screenshot de cada tela em claro e escuro, viewport mobile e desktop.
