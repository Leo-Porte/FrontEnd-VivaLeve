# Guia visual do Pluma

O Pluma é um lugar calmo para notar como você está. A interface segue o desenho dos apps **Saúde** e **Ajustes** do iOS: fundo agrupado, listas agrupadas, título grande, fonte do sistema, uma cor de destaque só. O método vem do guia visual do Friday (`~/Projetos/friday/docs/VISUAL.md`): tokens fechados, cor só com papel, contraste medido, e uma lista explícita do que não entra.

Quando este guia não cobrir um caso, vale a [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) para comportamento e aparência. Este guia vence qualquer skill de design genérica.

Três ideias organizam tudo:

1. **O conteúdo é o herói; o cromo recua.** Hierarquia vem de layout e agrupamento, não de decoração (Apple, WWDC25 356).
2. **Uma cor, um papel.** Sálvia é ação principal e seleção. Cor de emoção só aparece em dado de humor.
3. **Desfoque e flutuação só na navegação.** O menu orbital é a camada de controle que flutua sobre o conteúdo; nunca no conteúdo (HIG Materials).

## Estrutura da tela

- `Screen` com fundo agrupado (`bg`), conteúdo centralizado na largura do mapa (`LAYOUT.md`).
- **Título grande** no topo (`Text variant="display"`, 34/41 bold), com uma linha de apoio em `textMuted` quando precisar. Nada acima do título além da data em `caption`.
- O corpo é feito de **`ListSection`** (cantos de 12, sombra suave, linhas com divisória fina recuada) e, quando o conteúdo não é lista (gráfico, exercício, campo de texto longo), de **`Card`**. **Todo grupo com título leva a faixa sálvia** (`Faixa`, em `components/ui/Faixa.tsx`): o título em maiúsculas pequenas sobre o sálvia, que se dissolve no grupo com um degradê de 12 px e desfoque de 1 px. Vale para `ListSection` (padrão quando há `header`), `Card` com `title`, diálogos (`Modal`/`ConfirmDialog`) e o calendário do diário. Grupo sem título fica só com cantos e sombra.
- Navegação: **menu orbital** (`components/ui/orbital`). Uma bolinha sálvia com a pluma, embaixo no telefone e no canto inferior direito na tela larga; ao tocar, a tela desfoca e os destinos orbitam o centro, cada um com uma cor clara própria (`menu.cores` no tema) e uma animação no ícone quando apontado. Com mouse, parar 3 s num destino desliza a roda para a esquerda e abre à direita um painel explicando o módulo. É o único lugar com material, sombra e cor por destino.
- Abertura da Home: o sol (manhã, tarde, entardecer) e a lua (noite) têm cores próprias (`abertura` no tema). Elas só aparecem na ilustração da abertura e no ícone ao lado da data; é a outra exceção à regra "uma cor". Movimento sem mola, curvas longas e suaves, como um carregamento.
- Estado vazio: uma frase curta que diz o próximo passo, dentro do grupo, centralizada. Nunca ilustração.

- **Diário**: é a terceira exceção. O conteúdo vira objeto físico: post-its de papel (`diario.papel`) presos por tachinha e ligados por barbante, sobre o fundo normal da tela, e uma caderneta pautada de capa sálvia com adesivos de emoção no pé da página. Papel, tinta, barbante, sombra do papel e a letra de mão (Caveat, carregada só nessa tela) moram em `diario` no tema. O papel não escurece no tema escuro. O calendário e os diálogos seguem o padrão da Home (faixa sálvia). Movimento: a tela rola para cima ao entrar num dia e para baixo ao voltar; a caderneta sobe e desce; ao guardar, a página é arrancada e o post-it é cravado com o barbante se desenhando; ao soltar pela tachinha, o post-it cai. Com "Reduzir movimento" tudo é instantâneo.

## Cor

Toda cor vem do tema (`src/theme/core.ts`). View nunca tem hexadecimal.

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `bg` | `#F2F2F7` | `#000000` | fundo agrupado da tela |
| `surface` | `#FFFFFF` | `#1C1C1E` | grupo, célula, card |
| `surfaceAlt` | `#E9E9EE` | `#2C2C2E` | campo, trilho, segmentado, botão neutro |
| `separator` | `#C6C6C8` | `#38383A` | divisória fina (decorativa) |
| `border` | `#8E8E93` | `#8E8E93` | contorno de controle (≥ 3:1) |
| `text` | `#000000` | `#FFFFFF` | texto principal |
| `textMuted` | `#636366` | `#AEAEB2` | apoio, valor, cabeçalho de grupo |
| `primary` | `#3D6B2F` | `#A9D18E` | ação principal, seleção, texto de ação |
| `primarySoft` | `#E4EEDF` | `#26331F` | fundo tingido (botão secundário, item selecionado) |
| `danger` | `#C00012` | `#FF6961` | ação destrutiva, erro |

Regras:

- **Sálvia só para o que se faz**: botão principal, texto de ação ("Ligar 188", "Ver todos"), item selecionado, ícone de linha. Se algo sálvia não é tocável nem selecionado, está errado.
- **Cor de emoção só em dado de humor** (seletor, selo, gráfico). Nunca em card, cabeçalho ou fundo.
- **Não existe** lilás, gradiente, cor decorativa, fundo colorido de card. `lilac`/`sage` no tema são apelidos neutros mantidos por compatibilidade; não use.
- **Cor nunca é a única pista**: emoção tem ícone e nome; seleção tem fundo e estado de acessibilidade.
- Contraste: texto ≥ 4,5:1 e controle ≥ 3:1, medidos nos testes de `src/theme/__tests__`. Token novo de texto só entra com teste.

## Tipografia

Fonte do sistema (SF Pro no iPhone/Mac; a nativa no Android/Windows). Escala do iOS, sempre por `Text variant`:

| Variante | iOS | Tamanho / peso | Uso |
|---|---|---|---|
| `display` | Large Title | 34/41 bold, tracking −0,37 | título da tela |
| `title` | Title 2 | 22/28 bold | título dentro de card grande |
| `subtitle` | Headline | 17/22 semibold | título de card, botão grande |
| `body` | Body | 17/22 regular | texto e linha de lista |
| `label` | Subheadline | 15/20 semibold | rótulo, botão pequeno |
| `caption` | Footnote | 13/18 regular | apoio, cabeçalho e rodapé de grupo |

- No máximo três níveis por tela. Semibold/bold só em título; corpo é regular.
- Proibido `fontSize`/`fontFamily` solto na view.

## Espaçamento e forma

- Escala de `spacing` (4, 8, 16, 24, 32, 48) e a régua do `LAYOUT.md`. Entre grupos 32 (gap do `Screen`); dentro do grupo, a linha cuida do respiro.
- Raios (`radius`): 6 chip · 10 botão e campo · 12 grupo, célula e card · 16 folha. Cantos contínuos (`borderCurve: 'continuous'`).
- Sombra só a dos grupos (`useSombraGrupo`: `0 6px 18px` na cor `shadow` do tema), igual para lista, card e diálogo. Nada de sombra avulsa em outro elemento (exceção: os objetos do diário).
- Alvo de toque ≥ 44 pt; linha de lista ≥ 48.

## Componentes

- **Linha de lista (`ListRow`)**: ícone-glifo sálvia à esquerda (sem fundo), título em `body`, apoio em `caption`, valor em cinza à direita, seta `›` quando navega. É o componente padrão de navegação e de ação.
- **Botão (`Button`)**: `primary` preenchido sálvia (um por tela), `secondary` tingido, `ghost` só texto sálvia, `danger` texto vermelho em fundo neutro. Altura 50 (grande) ou 36 (pequeno), raio 10. Largura total só no telefone e no rodapé de formulário.
- **Toque**: realce por opacidade, como no iOS. Sem escala ao apertar (costume de web).
- **Ícones**: Lucide em traço 1,9, na cor de destaque, sem quadradinho colorido atrás. Título e botão não ganham ícone decorativo.
- **Seletor de emoção**: grade de células iguais; selecionada pinta a cor da emoção com texto em auto-contraste.
- **Segmentado** (7/30 dias): controle segmentado do iOS — trilho `surfaceAlt`, segmento ativo `surface`.
- Diálogos e confirmações: só para ação destrutiva, com o botão destrutivo em `danger`.

## Movimento

- Transição curta (150–250 ms), sem bounce. Entrada de tela: fade leve.
- Respeite "Reduzir movimento": troca deslocamento por fade.
- Nada pulsa, pisca ou flutua sem motivo. A única animação contínua permitida é o orbe do exercício de respiração, porque ela **é** o exercício.
- Exceção: a **Sessão com a Pluma** (`/chat`, aprovada no protótipo de 17/11/2026). Por pedido de produto: o campo começa no centro e desce até o rodapé (850 ms) com o botão de enviar se encaixando depois; a Pluma "pensa" por 4 a 5 s, com a pena balançando e trocadilhos de psicologia se revezando; a resposta é digitada em ritmo fixo (24 ms por caractere) com cursor piscando e o balão crescendo junto. No telefone, com a sessão aberta, a bolinha do menu afunda e sobra só uma alça com seta, que abre a roda direto. Ritmo em `RITMO_SESSAO` (`entities/catalogo.ts`). Com "Reduzir movimento" tudo é instantâneo e a resposta aparece inteira. Na interface a palavra é "sessão", nunca "chat".
- Exceção: a cena do login (folhas caindo e carrossel) é ilustração de boas-vindas, com cores próprias em `cenaLogin` (`theme/core.ts`). A troca abertura → formulário dura ~800 ms por pedido de produto. Com "Reduzir movimento" as folhas param e as trocas ficam instantâneas.

## Comunicação

- Português, frase curta, conclusão primeiro. Botão é verbo no infinitivo ("Registrar", "Começar").
- Sem emoji na interface. Sem exclamação gratuita.
- Erro diz o que aconteceu e o que fazer.

## O que não entra

Catálogo de vícios de interface gerada (Friday, "Identidade visual e vícios de IA"; Anthropic Cookbook):

- Sombra avulsa fora do padrão dos grupos; card dentro de card.
- Ícone dentro de quadradinho colorido; grade de "ícone + título + descrição" como atalho.
- Gradiente, roxo/lilás decorativo, brilho, fundo colorido de card, faixa colorida na borda.
- Rosca como peça central de dashboard sem pergunta clara.
- Pílula/badge em metadado (só a navegação é pílula ou bolinha).
- Emoji como ícone; escala ao apertar; bounce; tudo animando ao mesmo tempo.
- Inter/Poppins/fonte da moda: aqui é a fonte do sistema.

A checagem automática `src/__tests__/visual-slop.test.ts` falha o `npm test` quando o código volta a esses vícios.
