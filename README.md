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

```bash
# Node.js (v18+)
node --version

# LaTeX (recomendado: texlive-full)
sudo apt install texlive-full

# Ou versão mínima:
sudo apt install texlive-latex-extra texlive-fonts-recommended texlive-lang-portuguese
```

---

## Instalação e Execução

```bash
# Clone ou navegue até o projeto
cd /home/usuario/Documentos/BlockTeX

# Inicialização com um comando:
./start.sh
```

A IDE estará disponível em: **http://localhost:5173**

### Manual (separado)

```bash
# Terminal 1 — Backend
cd backend
npm install
node server.js

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

---

## Funcionalidades Implementadas

### Sistema de Blocos
- **8 tipos de bloco**: Capa, Capítulo, Texto, Citação, Imagem, Código, Índice, Separador
- **Drag-and-drop** para reordenamento
- **Editor Markdown inline** em cada bloco
- **Colapso/expansão** de blocos individuais
- **Duplicação e exclusão** de blocos
- **Indicadores visuais** de quebra de página

### Configurações Globais
- Formato físico: A4, A5, 16×23cm, 15×21cm, US Letter, customizado
- Páginas espelhadas (`twoside`) com margens medianiz/externa
- Sangria de 3mm (`bleed`) para impressão
- Motor de compilação: `pdflatex` ou `lualatex`
- Tipografia: Palatino, Garamond, Libertine, Source Serif, Crimson, etc.
- Margens individuais (superior, inferior, interna, externa)

### Propriedades por Bloco
- Quebra de página: nenhuma / antes / isolada (sempre ímpar, `\cleardoublepage`)
- Visibilidade no Índice (`toc_visible`)
- Configuração de captura de títulos para o TOC (de H1 a H4)
- Cor de destaque para citações
- Largura e legenda para imagens

### Compilação LaTeX
- Geração do `.tex` completo com preâmbulo parametrizado
- Envio para backend `Node.js → pdflatex/lualatex`
- Logs de compilação em **tempo real via WebSocket**
- Mapeamento de erros com número de linha
- Download do PDF gerado

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
