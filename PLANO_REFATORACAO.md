# 🔧 Plano de Refatoração — BlockTeX IDE

> Documento gerado em 15/05/2026 após análise completa do codebase.
> Cada item contém: **problema detectado**, **impacto**, **solução proposta** e **arquivos afetados**.

---

## Índice

1. [Crítico — Bugs e Riscos de Segurança](#1-crítico--bugs-e-riscos-de-segurança)
2. [Estrutural — Organização de Código](#2-estrutural--organização-de-código)
3. [Arquitetura Frontend — Componentes](#3-arquitetura-frontend--componentes)
4. [Arquitetura Backend — Servidor](#4-arquitetura-backend--servidor)
5. [Performance e Otimização](#5-performance-e-otimização)
6. [CSS e Design System](#6-css-e-design-system)
7. [Developer Experience (DX)](#7-developer-experience-dx)
8. [Ordem de Execução Sugerida](#8-ordem-de-execução-sugerida)

---

## 1. Crítico — Bugs e Riscos de Segurança

### 1.1 ❌ Import de CSS após o `render()` em `main.jsx`

**Problema:** O `import './drawer.css'` está na **linha 11**, depois do `ReactDOM.createRoot(...).render(...)`. Imports devem ficar no topo do módulo.

**Impacto:** Pode causar FOUC (Flash of Unstyled Content) e é semanticamente incorreto.

**Solução:**
```diff
// main.jsx
 import React from 'react'
 import ReactDOM from 'react-dom/client'
 import App from './App.jsx'
 import './index.css'
+import './drawer.css'

 ReactDOM.createRoot(document.getElementById('root')).render(
   <React.StrictMode>
     <App />
   </React.StrictMode>,
 )
-import './drawer.css';
```

**Arquivo:** `frontend/src/main.jsx`

---

### 1.2 ❌ Autenticação no `App.jsx` não é reativa

**Problema:** O `App.jsx` lê `localStorage.getItem('blocktex_token')` **uma única vez** no corpo da função, fora de qualquer `useState` ou `useEffect`. Se o token mudar (login/logout), o componente não re-renderiza.

**Impacto:** Após login, o app força `window.location.href = '/'` (reload completo da SPA) ao invés de atualizar o estado React. Perde-se o benefício de uma SPA.

**Solução:** Criar um `AuthContext` com estado reativo:
```
frontend/src/contexts/AuthContext.jsx  (novo)
```
- Prover `token`, `login()`, `logout()` via Context API.
- Eliminar o `window.location.href` e `window.location.reload()` espalhados em `Login.jsx` e `useBackend.js`.

**Arquivos:** `App.jsx`, `pages/Login.jsx`, `hooks/useBackend.js`

---

### 1.3 ❌ Usuários armazenados em arquivo JSON estático

**Problema:** `backend/users.json` contém credenciais hardcoded. Não há API para registro, troca de senha, nem multi-tenancy. O backend já usa SQLite — os users deveriam estar lá também.

**Impacto:** Segurança fraca, impossibilidade de escalar.

**Solução:**
1. Criar tabela `users` no SQLite (`database.js`).
2. Migrar credenciais existentes com script one-off.
3. Remover `users.json` do repositório.
4. Criar endpoints `/api/register` e `/api/change-password`.

**Arquivos:** `backend/database.js`, `backend/server.js`, `backend/users.json`

---

### 1.4 ⚠️ Secret key hardcoded como fallback

**Problema:** Em `auth.js`, o fallback `'blocktex-secret-random-key'` é previsível:
```js
const SECRET_KEY = process.env.JWT_SECRET || 'blocktex-secret-random-key';
```

**Solução:** Em produção, **falhar** se `JWT_SECRET` não estiver definido:
```js
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET obrigatório em produção');
}
```

**Arquivo:** `backend/auth.js`

---

### 1.5 ⚠️ Memory leak no `ExportTexModal`

**Problema:** O `URL.createObjectURL(blob)` em `Modals.jsx:119` nunca é revogado com `URL.revokeObjectURL()`.

**Solução:** Usar `useEffect` com cleanup:
```js
useEffect(() => {
    const url = URL.createObjectURL(blob);
    return () => URL.revokeObjectURL(url);
}, [texContent]);
```

**Arquivo:** `frontend/src/components/Modals.jsx`

---

### 1.6 ⚠️ Callback `exec` aninhado (Callback Hell) no `/api/health`

**Problema:** O endpoint `/api/health` usa 3 níveis de `exec` callbacks aninhados para checar pdflatex e lualatex. O primeiro `exec` (`which pdflatex || which lualatex`) nem é usado.

**Solução:** Usar `Promise` + `Promise.all`:
```js
app.get('/api/health', async (req, res) => {
    const checkEngine = (name) => new Promise((resolve) => {
        exec(`which ${name}`, (err, out) => resolve(!err && out.trim().length > 0));
    });
    const [pdflatex, lualatex] = await Promise.all([
        checkEngine('pdflatex'), checkEngine('lualatex')
    ]);
    res.json({
        status: 'ok',
        latex_available: pdflatex || lualatex,
        engines: { pdflatex, lualatex },
        node_version: process.version,
    });
});
```

**Arquivo:** `backend/server.js` (linhas 97–113)

---

## 2. Estrutural — Organização de Código

### 2.1 `App.css` é lixo do template Vite

**Problema:** O arquivo `frontend/src/App.css` contém estilos do boilerplate React+Vite (`.logo`, `.logo-spin`, `.read-the-docs`) que **não são usados em lugar nenhum** do projeto.

**Solução:** Deletar `App.css`.

**Arquivo:** `frontend/src/App.css`

---

### 2.2 `package.json` do backend aponta `main` errado

**Problema:** `"main": "index.js"` mas o entrypoint real é `server.js`.

**Solução:** Corrigir para `"main": "server.js"`.

**Arquivo:** `backend/package.json`

---

### 2.3 `multer` é dependência não utilizada

**Problema:** `multer` está em `backend/package.json` e importado em `server.js` (linha 3), mas **nenhuma rota usa upload de arquivo via multer**. Os assets são recebidos via base64 no JSON.

**Solução:** Remover o `require('multer')` e desinstalar o pacote.

**Arquivo:** `backend/server.js`, `backend/package.json`

---

### 2.4 `dotenv` nunca é carregado

**Problema:** `dotenv` está nas dependências do backend mas nunca é chamado (`require('dotenv').config()`). As variáveis de ambiente só funcionam porque o Docker passa `.env` via `env_file`.

**Solução:** Adicionar `require('dotenv').config()` no topo do `server.js`, ou remover a dependência se confiar exclusivamente no Docker.

**Arquivo:** `backend/server.js`

---

### 2.5 Docker Compose usa nomes genéricos

**Problema:** Os serviços se chamam `meu-projeto-web` e `meu-projeto-api` — nomes genéricos de template.

**Solução:** Renomear para `blocktex-web` e `blocktex-api`.

**Arquivo:** `docker-compose.yml`

---

### 2.6 `react.svg` não utilizado

**Problema:** `frontend/src/assets/react.svg` é resíduo do template Vite.

**Solução:** Deletar o arquivo.

**Arquivo:** `frontend/src/assets/react.svg`

---

## 3. Arquitetura Frontend — Componentes

### 3.1 `Editor.jsx` é um "God Component" (446 linhas)

**Problema:** O `Editor.jsx` gerencia: estado do projeto, compilação, notificações, modal, sidebar toggle, inspector toggle, atalhos de teclado, importação de arquivo, auto-save, drawer — tudo em um único componente.

**Impacto:** Difícil de manter, testar e reaproveitar.

**Solução — Extrair responsabilidades:**

| Responsabilidade | Destino |
|---|---|
| Notificações toast | `hooks/useNotification.js` |
| Atalhos de teclado | `hooks/useKeyboardShortcuts.js` |
| Lógica de compilação | `hooks/useCompilation.js` |
| Auto-save | `hooks/useAutoSave.js` |
| Topbar com botões | `components/EditorTopbar.jsx` |

**Arquivo:** `frontend/src/pages/Editor.jsx`

---

### 3.2 `Inspector.jsx` contém 4 componentes internos (592 linhas)

**Problema:** `Toggle`, `GlobalTab`, `BlockTab`, `LatexTab` e `Inspector` estão todos no mesmo arquivo. O `GlobalTab` sozinho tem ~260 linhas de JSX com muitos inline styles.

**Solução:** Separar em:
```
components/inspector/
├── Inspector.jsx        # Componente principal com tabs
├── GlobalTab.jsx        # Configurações globais
├── BlockTab.jsx         # Propriedades do bloco
├── LatexTab.jsx         # Preview do código LaTeX
└── Toggle.jsx           # Componente reutilizável de toggle
```

**Arquivo:** `frontend/src/components/Inspector.jsx`

---

### 3.3 `Canvas.jsx` exporta 2 componentes (382 linhas)

**Problema:** `BlockCard` e `Canvas` estão no mesmo arquivo. `BlockCard` sozinho tem ~200 linhas com lógica de drag-and-drop, preview e rendering condicional por tipo de bloco.

**Solução:** Extrair `BlockCard` para `components/BlockCard.jsx`.

**Arquivo:** `frontend/src/components/Canvas.jsx`

---

### 3.4 `latexGenerator.js` é monolítico (796 linhas)

**Problema:** O arquivo contém: escape de LaTeX, conversão inline Markdown→LaTeX, conversão de tabelas, conversão de listas, geração de preâmbulo, geração de bloco, geração de documento completo, e preview HTML. Tudo junto.

**Solução:** Dividir em:
```
lib/latex/
├── escape.js          # stripEmojis, escapeLatex, escapeLatexTitle
├── inline.js          # inlineToLatex
├── blocks.js          # mdToLatex, listToLatex, tableToLatex
├── preamble.js        # generatePreamble, getThemeConfig
├── generator.js       # generateTex, blockToLatex (re-exporta tudo)
└── htmlPreview.js     # generateHtmlPreview, markdownToHtml
```

**Arquivo:** `frontend/src/lib/latexGenerator.js`

---

### 3.5 Inline styles excessivos (especialmente Login.jsx e Dashboard.jsx)

**Problema:** `Login.jsx` é 100% inline styles, sem usar **nenhuma** classe CSS do design system. `Dashboard.jsx` mistura inline styles com variáveis CSS. O `Inspector.jsx` tem dezenas de `style={{...}}` repetidos.

**Impacto:** Impossível de tema-rizar, difícil de manter, zero reusabilidade.

**Solução:**
1. Criar classes no `index.css` para Login (`.login-page`, `.login-card`, `.login-form`).
2. Criar classes para Dashboard (`.dashboard`, `.project-grid`, `.project-card`).
3. No Inspector, migrar inline styles repetidos para classes CSS.

**Arquivos:** `Login.jsx`, `Dashboard.jsx`, `Inspector.jsx`, `index.css`

---

### 3.6 `SaveModal` em `Modals.jsx` não é usado

**Problema:** O componente `SaveModal` é exportado mas **nunca importado** em nenhum outro arquivo. O save agora vai direto para o backend via `saveProject()`.

**Solução:** Remover `SaveModal` de `Modals.jsx`.

**Arquivo:** `frontend/src/components/Modals.jsx`

---

## 4. Arquitetura Backend — Servidor

### 4.1 `server.js` é monolítico (335 linhas)

**Problema:** Autenticação, WebSocket, compilação LaTeX, CRUD de projetos e migração — todos em um arquivo.

**Solução:** Separar em módulos de rotas:
```
backend/
├── server.js              # Setup Express + WS + middleware
├── auth.js                # (já existe)
├── database.js            # (já existe)
├── routes/
│   ├── health.js          # GET /api/health
│   ├── auth.js            # POST /api/login
│   ├── compile.js         # POST /api/compile
│   └── projects.js        # CRUD /api/project/*
└── lib/
    └── latexErrors.js     # parseLatexErrors()
```

**Arquivo:** `backend/server.js`

---

### 4.2 Sem tratamento de erro global (Express error handler)

**Problema:** Não há middleware de erro. Se um handler assíncrono lançar exceção não tratada, o Express responde com HTML genérico de erro 500.

**Solução:** Adicionar error handler no final:
```js
app.use((err, req, res, next) => {
    console.error('[Server Error]', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
});
```

**Arquivo:** `backend/server.js`

---

### 4.3 Cleanup de diretórios temporários usa `setTimeout` frágil

**Problema:** Na linha 232 do `server.js`, um `setTimeout` de 5 minutos limpa o diretório de compilação. Se o processo reiniciar, os diretórios ficam órfãos.

**Solução:** Adicionar cleanup na inicialização do servidor que limpa jobs antigos no `WORK_DIR`:
```js
// Na inicialização do server
const cleanupOldJobs = () => {
    // Remove diretórios com mais de 10 minutos
};
setInterval(cleanupOldJobs, 5 * 60 * 1000);
```

**Arquivo:** `backend/server.js`

---

### 4.4 Sem rate limiting no endpoint de compilação

**Problema:** `/api/compile` executa um processo de sistema (`spawn`) sem nenhum limite. Um client pode disparar múltiplas compilações simultâneas e sobrecarregar o servidor.

**Solução:** Implementar um semaphore simples ou usar `express-rate-limit`:
```js
// Limitar a 2 compilações simultâneas
let activeCompilations = 0;
const MAX_COMPILATIONS = 2;
```

**Arquivo:** `backend/server.js`

---

## 5. Performance e Otimização

### 5.1 `generateTex()` recalcula a cada mudança mínima

**Problema:** Em `Editor.jsx:111`:
```js
const texContent = useMemo(() => generateTex(project), [project]);
```
Porém `project` muda a cada keystroke (via `updateBlockContent`), e `generateTex` processa **todos** os blocos. Isso é desnecessário para o Inspector (que só exibe na tab LaTeX).

**Solução:** Mover a geração para quando for efetivamente necessária (compilação e tab LaTeX). Usar lazy computation ou `useCallback` com trigger manual.

**Arquivo:** `frontend/src/pages/Editor.jsx`

---

### 5.2 `ProjectStore` faz `JSON.parse(JSON.stringify(...))` excessivos

**Problema:** Cada operação no store serializa/deserializa o projeto inteiro via JSON para deep clone. Em `_pushHistory()`, `undo()`, `redo()`, `loadProject()` — acumulando overhead.

**Impacto:** Com projetos grandes (muitos blocos com imagens base64), isso pode causar freezes.

**Solução:** Usar `structuredClone()` (nativo, mais rápido) ou uma lib como `immer` para patches imutáveis sem clonar tudo.

**Arquivo:** `frontend/src/store/projectStore.js`

---

### 5.3 Histórico de undo/redo cresce sem limite

**Problema:** `_history` acumula snapshots completos do projeto sem limite. Com imagens base64 nos blocos, isso pode consumir centenas de MB de RAM.

**Solução:** Limitar o histórico a ~50 entradas:
```js
const MAX_HISTORY = 50;
if (this._history.length > MAX_HISTORY) {
    this._history = this._history.slice(-MAX_HISTORY);
    this._historyIndex = this._history.length - 1;
}
```

**Arquivo:** `frontend/src/store/projectStore.js`

---

### 5.4 `PreviewPanel` recalcula HTML preview a cada render

**Problema:** Em `PreviewPanel.jsx:11`:
```js
const htmlContent = generateHtmlPreview(blocks);
```
Chamado fora de `useMemo`, recalcula toda vez que o componente re-renderiza (que acontece a cada keystroke, pois `blocks` muda).

**Solução:**
```js
const htmlContent = useMemo(() => generateHtmlPreview(blocks), [blocks]);
```

**Arquivo:** `frontend/src/components/PreviewPanel.jsx`

---

### 5.5 Health check a cada 15 segundos é agressivo

**Problema:** `useBackend.js:57` faz polling a cada 15s. Combinado com WebSocket já ativo, é redundante.

**Solução:** Aumentar para 60s ou usar o WebSocket para detectar conexão/desconexão.

**Arquivo:** `frontend/src/hooks/useBackend.js`

---

## 6. CSS e Design System

### 6.1 CSS dividido sem estratégia clara

**Problema:** Estilos estão em 3 arquivos (`index.css`, `drawer.css`, `App.css`) sem critério claro de separação. O `App.css` não é usado. O `drawer.css` contém estilos de `BlockCard` (`.block-content-summary`) que não são do drawer.

**Solução:**
1. Deletar `App.css`.
2. Mover estilos de `.block-content-summary`, `.summary-preview`, `.stat-pill` e `.btn-edit-overlay` do `drawer.css` para `index.css` (onde ficam os estilos de blocos).
3. Renomear `drawer.css` para `tiptap.css` para refletir seu conteúdo real.

**Arquivos:** `App.css`, `drawer.css`, `index.css`

---

### 6.2 Classe CSS `.sidebar` duplicada semanticamente

**Problema:** A classe `.sidebar` é usada tanto pelo container externo no `Editor.jsx` (div wrapper do `BlockLibrary`) quanto internamente pelo próprio `BlockLibrary.jsx` (que renderiza `<aside className="sidebar">`). Isso causa dupla aplicação de estilos.

**Solução:** Renomear a classe interna do `BlockLibrary` para `.block-library` e ajustar o CSS.

**Arquivos:** `BlockLibrary.jsx`, `index.css`

---

### 6.3 Classe `.inspector` duplicada no JSX

**Problema:** Similar ao sidebar — `Editor.jsx` aplica `className="inspector"` no wrapper div, e `Inspector.jsx` aplica `className="inspector"` no `<aside>`.

**Solução:** Remover a classe do wrapper externo em `Editor.jsx` ou renomear para `.inspector-wrapper`.

**Arquivos:** `Editor.jsx`, `Inspector.jsx`

---

## 7. Developer Experience (DX)

### 7.1 Sem `nodemon` ou auto-reload no backend dev

**Problema:** O script `"dev": "node server.js"` não tem watch mode. Toda alteração no backend exige reiniciar manualmente.

**Solução:** Usar `node --watch`:
```json
"dev": "node --watch server.js"
```

**Arquivo:** `backend/package.json`

---

### 7.2 Sem `.env` loader ativo

**Problema:** Como mencionado em 2.4, `dotenv` está instalado mas não é chamado. Rodar localmente sem Docker ignora o `.env`.

**Solução:** Adicionar no topo do `server.js`:
```js
require('dotenv').config();
```

**Arquivo:** `backend/server.js`

---

### 7.3 Tipos de bloco com nomes inconsistentes (PT/EN)

**Problema:** A maioria dos tipos de bloco usa nomes em inglês (`content`, `chapter`, `quote`), mas `DEPOIMENTO` está em português. Mistura de idiomas no código.

**Solução:** Padronizar para inglês no código (renomear para `testimonial`), mantendo o label em português na UI.

**Arquivos:** `blockTypes.js`, `latexGenerator.js`, `Canvas.jsx`, `Inspector.jsx`, `Editor.jsx`

---

### 7.4 Blocos `IMAGE` e `QUOTE` faltam no `BLOCK_CATEGORIES`

**Problema:** Em `blockTypes.js`, os tipos `IMAGE`, `QUOTE` e `CODE` existem em `BLOCK_TYPE_META` mas **não aparecem** no array `BLOCK_CATEGORIES`. Logo, não são visíveis na `BlockLibrary`.

**Solução:** Adicionar à categoria "Conteúdo":
```js
{ label: 'Conteúdo', types: [BLOCK_TYPES.CONTENT, BLOCK_TYPES.QUOTE, BLOCK_TYPES.IMAGE, BLOCK_TYPES.CODE, BLOCK_TYPES.DEPOIMENTO] }
```

**Arquivo:** `frontend/src/lib/blockTypes.js`

---

## 8. Ordem de Execução Sugerida

Priorizado por impacto e risco:

| Fase | Itens | Esforço |
|------|-------|---------|
| **Fase 1 — Quick Fixes** | 1.1, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 7.1, 7.4 | ~1h |
| **Fase 2 — Segurança** | 1.3, 1.4 | ~2h |
| **Fase 3 — Auth Reativa** | 1.2 | ~2h |
| **Fase 4 — Separar Backend** | 4.1, 4.2, 1.6 | ~2h |
| **Fase 5 — Separar Componentes** | 3.1, 3.2, 3.3 | ~3h |
| **Fase 6 — Separar latexGenerator** | 3.4 | ~2h |
| **Fase 7 — Performance** | 5.1, 5.2, 5.3, 5.4, 5.5 | ~2h |
| **Fase 8 — CSS Cleanup** | 3.5, 6.1, 6.2, 6.3 | ~2h |
| **Fase 9 — Padronização** | 7.3, 3.6, 4.3, 4.4, 7.2 | ~2h |

**Tempo total estimado: ~18 horas de trabalho.**

---

> 💡 **Nota:** Nenhuma das refatorações acima altera funcionalidade visível ao usuário. São todas melhorias internas de qualidade, segurança e manutenibilidade.
