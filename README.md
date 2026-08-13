# BlockTeX IDE

> **IDE Web local** para criar livros profissionais em LaTeX usando uma arquitetura de blocos visuais.

---

## Visão Geral

BlockTeX abstrai a complexidade do LaTeX em uma interface de blocos intuitiva. Você escreve em Markdown, configura propriedades visuais por painel, e o sistema gera e compila o `.tex` automaticamente.

```
┌────────────────────────────────────────────────────────┐
│  📚 Biblioteca  │     🖊 Canvas de Blocos     │ 🔧 Inspector │
│  de Blocos      │                             │              │
│                 │  ┌─ 📖 Capítulo ──────────┐ │  • Formato   │
│  + Capítulo     │  │  # Meu Capítulo        │ │  • Margens   │
│  + Seção        │  └────────────────────────┘ │  • Fonte     │
│  + Citação      │  ┌─ 📝 Texto ─────────────┐ │  • Motor     │
│  + Imagem       │  │  ## Seção              │ │              │
│  + Código       │  │  Texto com **bold**    │ │  Bloco:      │
│  + TOC          │  └────────────────────────┘ │  • Paginação │
│  + Capa         │  ┌─ 💬 Citação ───────────┐ │  • TOC scan  │
│  + Separador    │  │  > "Frase..."          │ │  • Estilo    │
└─────────────────┴─────────────────────────────┴──────────────┘
                         ↓ Compilação via pdflatex/lualatex
                         ↓ PDF gerado localmente
```

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React + Vite |
| Conversor | Markdown → LaTeX (parser customizado) |
| Backend (Bridge) | Node.js + Express |
| Compilador | pdflatex / lualatex (instalado no sistema) |
| Comunicação | REST API + WebSocket (logs em tempo real) |
| Formato de Projeto | `.btx` (JSON estruturado) |

---

## Pré-requisitos

### Para rodar com Docker (Recomendado)
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Para rodar local (Manual)
- Node.js (v18+)
- LaTeX (`sudo apt install texlive-full`)

---

## Instalação e Execução

### Opção 1: Via Docker (Ambiente Completo)
A forma mais ágil de rodar contendo o NGINX, API Node e compilações de LaTeX isoladas.

1. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite as variáveis JWT_SECRET, PORT, etc. (Opcional)
```
2. Inicie tudo com Docker Compose:
```bash
docker-compose up -d --build
```
A IDE estará disponível em: **http://localhost**

O Docker cuidará de puxar um ambiente Node Alpine otimizado com TeX Live e hospedar tudo atrás de um proxy NGINX rodando na porta 80.

---

### Opção 2: Local Script Rápido
Uma maneira rápida caso tenha os [Pré-requisitos Livres](#para-rodar-local-manual).

```bash
# Inicialização com um script integrado:
./start.sh
```
A IDE estará disponível em: **http://localhost:5173**

---

### Opção 3: Modo Inicialização Manual (Desenvolvimento)

```bash
# Terminal 1 — Backend
cd backend
npm install
npm run dev

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

---

## Funcionalidades Implementadas

### Sistema de Blocos
- **TipTap WYSIWYG Editor** integrado com suporte a formatação avançada
- **Menu Drawer flutuante** elegante para edição focada do conteúdo
- **8 tipos de bloco**: Capa, Capítulo, Texto, Citação, Imagem (Única), Grade de Imagens, Índice, Separador
- **Drag-and-drop** para reordenamento
- **Colapso/expansão** de blocos individuais
- **Duplicação e exclusão** de blocos
- **Separador com Quebra de Página**: O bloco Separador agora pode ser opcionalmente marcado no Inspector como uma quebra de página (`\clearpage`), iniciando o próximo bloco em página nova sem desenhar a linha divisória.
- **Indicadores visuais de quebra de página** e status direto no Canvas

### Configurações Globais
- Formato físico: A4, A5, 16×23cm, 15×21cm, US Letter, customizado
- Páginas espelhadas (`twoside`) com controle assíncrono rigoroso do estilo `plain`
- Cabeçalhos personalizáveis (espelhados para páginas Ímpares/Pares) via pacote `fancyhdr`
- Sangria de 3mm (`bleed`) para impressão
- Motor de compilação: `pdflatex` ou `lualatex` com suporte UTF-8 estendido
- Tipografia: Palatino, Bookman, Charter, Helvetica, Computer Modern
- Margens individuais (superior, inferior, interna, externa)
- **Temas visuais de documento** (5 presets): Padrão, Editorial, Técnico, Minimalista, Corporativo
  - Cada tema define fonte, entrelinhamento e estilo de títulos automaticamente
  - Seleção de "Família Tipográfica" no Inspector sobrescreve a fonte do tema

### Propriedades por Bloco
- Quebra de página estrita baseada no Layout `oneside` vs `twoside` (garantindo `\cleardoublepage` isoladas corretas)
- Visibilidade no Índice (`toc_visible`) gerenciada assincronamente (evita heranças de TOC)
- Sistema de **Checkboxes para o TOC** (Captura seletiva de H1 protegido, H2 e H3 configuráveis)
- Cor de destaque para citações
- **Bloco de Imagem (Única)**:
  - **Inline**: Integração com fluxo de texto com suporte a `wrapfig` (esquerda/direita/centro/total), ajuste de largura deslizante e posição de float LaTeX.
  - **Página exclusiva**: Modo de preenchimento (`fit`, `stretch` ou `bleed`/sangria), opção de manter proporção (`keepRatio`), âncora de recorte configurável (topo/centro/base) usando uma macro preambular avançada `\btxcoverimg` (equivalente ao `object-fit: cover` do CSS) combinada com clipping via TikZ, estilos de página e título.
- **Bloco de Grade de Imagens (Multi-imagens)**:
  - Distribuição automática em **3 layouts**: Empilhadas verticalmente (2 fotos), Lado a lado (2 fotos em minipage) ou Grade 2×2 (até 4 fotos).
  - Slots de upload dinâmicos no Inspector, larguras de imagem unificadas, espaçamento configurável (pequeno, médio, grande) e legendas individuais ou coletiva.
  - Toggle de "Página própria" para isolar a grade em uma página exclusiva com controle de quebra.
- **Migração Automática**: Migração fluida de projetos legados contendo os blocos `image_inline`, `image_page`, `image_double` ou `image_stack` para a nova arquitetura de dois blocos unificados ao carregar o arquivo `.btx`.

### Compilação LaTeX
- Geração do `.tex` completo com preâmbulo parametrizado
- Inclusão inteligente do pacote `eso-pic` para sangrias em tela inteira e `tikz` para recortes de precisão
- Envio para backend `Node.js → pdflatex/lualatex`
- Logs de compilação em **tempo real via WebSocket**
- Mapeamento de erros com número de linha
- Download do PDF gerado
- **PDF começa diretamente no primeiro bloco** — capa automática removida (use o bloco Capa quando quiser)
- Linha separadora do cabeçalho removida por padrão
- Tratamento robusto de emojis e entidades HTML (`&gt;`, `&lt;`, `&amp;`) no conversor Markdown→LaTeX

### IDE Features
- **Preview HTML**: Aproximação visual imediata (sem LaTeX)
- **Preview PDF**: PDF real do LaTeX compilado
- **Exportar .tex**: Baixar código LaTeX bruto
- **Undo/Redo** (Ctrl+Z / Ctrl+Y)
- **Auto-save** no localStorage
- **Salvar/Abrir** projetos `.btx`
- **Atalhos de teclado**: Ctrl+Enter (compilar), Ctrl+S (salvar), Ctrl+P (preview)
- **Painel Lateral Clean**: Aba LaTeX removida para focar inteiramente na produtividade. Inspector simplificado contendo apenas a aba **Bloco** (primeira aba com foco principal) e aba **Documento**.
- **Importação de Markdown**: Botão `📥 Importar MD` adicionado à barra de ferramentas do editor TipTap para carregar e preencher os blocos instantaneamente a partir de arquivos `.md` ou `.txt` locais.

### Assistente de Escrita por IA (OpenCode)
- **Integração com OpenCode Go**: Conecte sua assinatura do gateway OpenCode para usar modelos de IA como o **DeepSeek V4 Flash** (`deepseek-v4-flash`).
- **Painel de Controle Lateral (AIPanel)**: Integrado diretamente à gaveta de edição de blocos (Capítulos e Conteúdos).
- **Ações Inteligentes**:
  - **Presets de Edição**: Melhorar escrita, Corrigir gramática, Traduzir para inglês, Resumir e Expandir texto com um clique.
  - **Prompt Livre**: Digite instruções personalizadas para a IA atuar sobre o seu texto.
- **Foco Seletivo**: Digite o prompt para o bloco inteiro ou selecione um trecho específico do texto no editor para atuar apenas sobre a seleção (com visualizador em tempo real no painel).
- **Visualizador de Diferenças (Diff)**: Exibição visual colorida contrastante das adições (verde) e remoções (vermelho) propostas pela IA antes de aceitar ou descartar as alterações.
- **Configuração Segura**: Chave de API configurada no arquivo `.env` local do servidor, preservando a segurança das suas credenciais.

### Histórico de Alterações (Changelog)
- **Histórico por Bloco no Editor (TipTap)**: Aba **🕒 Histórico** integrada diretamente na barra lateral de edição do bloco (TipTapDrawer), permitindo consultar o histórico de versões daquele bloco específico em tempo real.
- **Visualização de Diferenças (Diff)**: Exibição visual e colorida (estilo Git/Unified Diff) das adições (verde com `+`) e remoções (vermelho com `-`) de linhas de texto do bloco.
- **Armazenamento Otimizado (Delta)**: O sistema de comparação atua de forma precisa linha por linha sobre o conteúdo Markdown com quebras de linha reais (`\n`), gravando apenas as diferenças (patches) no SQLite para evitar inflação desnecessária do banco de dados.
- **Isolamento de Rascunho vs Versão Salva**: Uso de tabela separada (`committed_projects`) para garantir que os auto-saves silenciosos em segundo plano gravem o rascunho de trabalho (tabela `projects`) sem apagar ou poluir a cadeia de commits consolidada (gerada apenas ao salvar o bloco ou projeto manualmente).


---

## Formato do Arquivo de Projeto (.btx)

```json
{
  "metadata": {
    "title": "Meu Livro",
    "author": "Autor",
    "date": "\\today"
  },
  "global_setup": {
    "paper": "a5",
    "mirror": true,
    "font": "default",
    "theme": "default",
    "baseSize": "11pt",
    "engine": "pdflatex",
    "innerMargin": "25mm",
    "outerMargin": "20mm",
    "topMargin": "25mm",
    "bottomMargin": "20mm"
  },
  "blocks": [
    {
      "id": "uuid",
      "type": "content",
      "content": "# Capítulo\n\nTexto em **Markdown**.",
      "style_variables": { "color": "#6366f1" },
      "config": {
        "toc_scan": { "from": 1, "to": 2 },
        "toc_visible": true,
        "page_break": "none"
      }
    }
  ]
}
```

---

## Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `Ctrl+Enter` | Compilar PDF |
| `Ctrl+S` | Salvar projeto |
| `Ctrl+P` | Toggle Preview |
| `Ctrl+Z` | Desfazer |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Refazer |

---

## Estrutura do Projeto

```
BlockTeX/
├── backend/
│   ├── server.js          # Express + WebSocket bridge
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Componente principal
│   │   ├── components/
│   │   │   ├── BlockLibrary.jsx  # Sidebar de blocos
│   │   │   ├── Canvas.jsx        # Editor de blocos
│   │   │   ├── Inspector.jsx     # Painel de propriedades
│   │   │   ├── PreviewPanel.jsx  # Preview HTML/PDF
│   │   │   ├── LogConsole.jsx    # Console de compilação
│   │   │   └── Modals.jsx        # Modais do sistema
│   │   ├── hooks/
│   │   │   └── useBackend.js     # Hook de API + WebSocket
│   │   ├── lib/
│   │   │   ├── blockTypes.js     # Definições de tipos
│   │   │   └── latexGenerator.js # MD→LaTeX + gerador .tex
│   │   ├── store/
│   │   │   └── projectStore.js   # Estado + undo/redo
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css             # Design system
│   ├── index.html
│   └── vite.config.js
├── PRD/
│   └── PRD BlockTeX v2.md
├── start.sh               # Script de inicialização
└── README.md
```

---

## Desenvolvido com base no PRD BlockTeX v2

Implementação completa das especificações do `PRD/PRD BlockTeX v2.md`:
- ✅ Arquitetura Frontend React/Vite + Backend Node.js/Express
- ✅ Conversão Markdown → LaTeX no cliente
- ✅ Bridge local para execução de `pdflatex`/`lualatex`
- ✅ API REST + WebSocket para logs em tempo real
- ✅ Configurações globais (chassis do livro)
- ✅ Sistema de blocos com model `.btx` (JSON)
- ✅ Hierarquia TOC com mapeamento de títulos
- ✅ Paginação profissional (odd/even, `\cleardoublepage`)
- ✅ Gestão de assets e sanitização de nomes
- ✅ Fallback de preview HTML
- ✅ Temas visuais de documento (5 presets com fonte + tipografia coordenadas)
- ✅ Remoção da capa automática — PDF 100% controlado pelos blocos
- ✅ Suporte robusto a entidades HTML e emojis no conversor MD→LaTeX
