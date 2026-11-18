# Mapa de tela: tamanhos e grade

Régua única para todas as telas. Código: `src/theme/layout.ts`, `src/components/ui/Grid.tsx`, `Screen`.

## Régua

| Breakpoint | Área de conteúdo* | Colunas | Margem (gutter) | Gap | Onde |
|---|---|---|---|---|---|
| `compact` | < 600 px | 4 | 16 | 12 | telefone |
| `medium` | 600–1023 px | 8 | 24 | 16 | tablet, janela estreita |
| `expanded` | ≥ 1024 px | 12 | 32 | 20 | desktop |

\* Área de conteúdo = a janela inteira. A bolinha do menu orbital flutua (embaixo no centro no telefone, canto inferior direito a partir de 900 px) e as telas reservam o espaço dela no fim da rolagem.

Containers (`<Screen width=…>`): `wide` 1120 · `regular` 880 · `narrow` 720.

## Regras

1. **Todo conjunto de cards lado a lado usa `<Grid columns={…}>`.** Proibido `flexWrap` com card na largura do próprio conteúdo, `flexBasis` em %, `minWidth` para forçar quebra.
2. **Mesma linha, mesma altura.** O Grid estica o item; o Card dentro recebe `style={{ flex: 1 }}`.
3. **Espaçamento só da régua:** entre seções `gap` do Screen (gap + 4); dentro de card `spacing.md` (16) no compact e `spacing.lg` (24) a partir do medium; entre itens de grade o `gap` do Grid. Nada de margem literal.
4. **Conteúdo do card alinhado à esquerda e ao topo**; ação principal do card no rodapé do card, alinhada à esquerda (não solta no meio).
5. **Tipografia por nível**: título de tela `title`, título de seção `subtitle`, título de card `label`/`subtitle`, apoio `caption`. Sem tamanhos de fonte literais.
6. **Botão de largura total só no compact** (e no rodapé de formulário). No medium+ o botão tem a largura do texto, alinhado à direita do formulário.
7. Para decidir layout use `useScreenLayout()` (`bp`, `r({compact, medium, expanded})`), nunca `useWindowDimensions` direto.

## Por tela

Notação de colunas: `compact / medium / expanded`.

### Home (`narrow`)
Uma coluna em todos os breakpoints (é um check-in, não um painel). Cabeçalho + três blocos no mesmo formato (`ListSection`: cabeçalho curto em maiúsculas + grupo), sem nada solto fora de grupo.
| Seção | Conteúdo | Observação |
|---|---|---|
| Cabeçalho | data, saudação (`display`) e frase do dia (itálico, `textMuted`) | a frase deixou de ser um bloco à parte |
| Hoje | sem registro: as 6 emoções (`EmotionPicker` 3 / 6 colunas, células `surfaceAlt`); com registro: emoção de hoje + semana em 7 bolinhas | tocar numa emoção abre `/humor?emocao=…` já na etapa da nota |
| Para agora | uma sugestão só (respirar em dia difícil ou sem registro; diário em dia bom) | um botão pequeno |
| Apoio | "Ligar 188" sempre à vista; "Mais apoio" abre Site do CVV, psicólogo, terapia online e ansiedade + aviso | o aviso aparece no rodapé ao abrir |

Atalhos de navegação ficam no menu orbital; privacidade fica em Ajustes. Meta: cerca de uma tela no telefone e sem rolagem em 1280×800.

**Abertura (`AberturaHome`, ~8 s, primeira entrada do dia)**: saudação palavra por palavra → frase → sol/lua do período (`Astro`) com a data → piscadinha → o astro encolhe até o ícone ao lado da data enquanto a cortina some e os blocos entram em cascata (200 ms entre eles). "Pular" no canto superior direito; barra fina de progresso embaixo; sem abertura com "reduzir movimento". Tocar no sol/lua do cabeçalho repete. Regra de quando mostrar: `controllers/abertura.ts`.

### Humor
Duas formas, conforme o breakpoint (`src/screens/humor/`):

**Celular (`compact`, `FluxoEtapas`, `regular`)**: uma pergunta por vez, com barra de progresso (3 partes) e voltar.
| Etapa | Conteúdo | Observação |
|---|---|---|
| 1. Como você está se sentindo? | `EmotionPicker` 2 colunas, células de 116 | tocar avança sozinho para a etapa 2 |
| 2. Nota | selo da emoção + campo multilinha | rodapé: Pular · Continuar |
| 3. O que você fez hoje? | chips em `Grid` de 2 colunas | rodapé: Salvar registro (largura total) |

**Tablet e computador (`medium`+, `FormularioHumor`, `wide`)**: as três perguntas numa página, sem cartão, separadas por divisória fina; no expanded a pergunta fica à esquerda (280) e a resposta à direita. O número da pergunta vira ✓ quando respondida. Rodapé: dica + Salvar à direita.

**Depois de salvar (os dois)**: confirmação ("Novo registro", "Ver histórico") e a **linha do tempo** (`LinhaDoTempo`): até 10 registros agrupados por dia, do mais novo ao mais antigo; no celular a data é cabeçalho, no largo fica numa coluna de 200 à esquerda da linha. O registro recém-salvo ganha fundo `surface`.

### Diário (`wide`)
| Seção | Colunas | Observação |
|---|---|---|
| Cabeçalho + busca + "Nova anotação" | 1 | busca e botão na mesma linha a partir do medium |
| Calendário do mês | 7 | grupo com faixa sálvia (mês, Hoje, ‹ ›); célula 60 no compact com mini post-it, 128 a partir do medium com o título da anotação |
| Mural do dia (toque num dia) | 2 / auto / auto | post-its 150×156 em zigue-zague no compact; 196×200 em fileiras de vai-e-volta (2 a 6 colunas pela largura) no medium+; barbante liga na ordem do dia |
| Busca | igual ao mural | resultados de todos os dias, post-it com data e hora |
| Caderneta (nova, ler, editar) | — | folha por cima da tela, até 620×780; no compact ocupa a altura |

Telas: calendário → (sobe) mural do dia → (sobe) caderneta. Voltar desce. Código: `src/screens/diario/` (regras puras em `regras.ts`).

### Histórico (`wide`)
| Seção | Colunas | Observação |
|---|---|---|
| 4 indicadores | 2 / 4 / 4 | StatTile de altura igual |
| Período 7/30 | — | controle segmentado à direita do título da seção no medium+ |
| Evolução + Emoções (donut) | 1 / 1 / 3 | evolução span 2, donut span 1 no expanded |
| Distribuição por emoção | 1 / 2 / 2 | |
| Registros | 1 / 1 / 1 | lista |

### Respirar (`wide`)
| Seção | Colunas | Observação |
|---|---|---|
| Exercício (orbe + texto + Iniciar) | 1 / 1 / 3 | span 2 no expanded |
| Indicadores (hoje, total, minutos) | 3 / 3 / 1 | no expanded empilham na coluna da direita, ao lado do exercício; "Apagar sessões" abaixo deles |

### Conversar (`narrow`)
| Seção | Colunas | Observação |
|---|---|---|
| Cabeçalho | 1 | |
| Mensagens | 1 | balões até 80% da largura |
| Sugestões | — | rolagem horizontal, não quebra linha |
| Campo + Enviar | 1 | fixos embaixo, acima da navegação |

### Ajustes (`wide`)
| Seção | Colunas | Observação |
|---|---|---|
| Conta | 1 / 2 / 3 | span 1 |
| Aparência (tema) + Sons | 1 / 2 / 3 | Sons span 2 no expanded |
| Links úteis + Zona de perigo + Sobre | 1 / 2 / 3 | |

### Login (sem navegação, tela cheia)
`src/screens/login/` — cena (`CenaLogin`: fundo sálvia, folhas caindo, duas colinas), carrossel de 5 slides (`CarrosselLogin`, troca a cada 6 s) e formulário (`FormularioLogin`: abas Entrar/Criar conta com segmento deslizante, campo Nome que entra e sai com animação).

**Computador (`expanded`)**: cena + marca + carrossel com setas ocupando a esquerda; painel do formulário com 480 de largura à direita (formulário até 400). Na divisa, o fundo da cena continua por 120 px dentro do painel e some, com leve desfoque.

**Celular e tablet (`compact`/`medium`)**: abertura com a cena em tela cheia e os botões Entrar e Criar conta imersos na colina escura. Tocar num deles: os botões sobem e somem, a cena sai por cima, o painel do formulário sobe e toma a tela (~800 ms) e a marca desliza do canto para o centro, acima do formulário. O botão tocado define o modo. "Voltar" (canto superior esquerdo) desfaz.
