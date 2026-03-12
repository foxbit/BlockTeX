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
- **8 tipos de bloco**: Capa, Capítulo, Texto, Citação, Imagem, Código, Índice, Separador
- **Drag-and-drop** para reordenamento
- **Colapso/expansão** de blocos individuais
- **Duplicação e exclusão** de blocos
- **Indicadores visuais** de quebra de página

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
- Largura e legenda para imagens

### Compilação LaTeX
- Geração do `.tex` completo com preâmbulo parametrizado
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
