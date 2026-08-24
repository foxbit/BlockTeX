# Plano de Refatoração — HTML Nativo do TipTap + Editor Completo

> **Branch:** `refactor/html-nativo`
> **Data:** 2026-08-24
> **Escopo:** Eliminar o formato Markdown intermediário (fonte dos bugs de renderização) e completar o editor TipTap com todas as suas ferramentas, com mapeamento fiel para LaTeX.
>
> **Status:** ✅ Fases 1, 2 e 4 concluídas e validadas (commit `4c91904`). Fases 3, 5 e 6 pendentes.

---

## 1. Contexto e motivação

O BlockTeX armazena o conteúdo de cada bloco (`block.content`) em **Markdown**, mas o editor (TipTap/ProseMirror) é nativamente **HTML/JSON**. Para fazer a ponte, o projeto mistura HTML *dentro* do Markdown (tags `<p align="center">`, `<hN align="...">`), cria placeholders (`@@BOLDSTART@@`, `\x00ALIGN:\x00`, `\x00NBSP\x00`) e mantém **três implementações paralelas de parser** (`mdToLatex`, `inlineToLatex`, `markdownToHtml`).

**Consequências (bugs relatados):**
1. `\{}` no PDF em texto negrito + centralizado (escape em camadas + bug de ordem no escape de chaves).
2. `**texto**` literal ao recarregar o bloco (round-trip HTML↔Markdown quebrado — a marca `bold` não é reconstruída).
3. Espaços múltiplos somem (ProseMirror colapsa espaços; Markdown não os representa fielmente).

**Decisão:** migrar o armazenamento para **HTML nativo do TipTap** e ter **um único** conversor `HTML → LaTeX`. Isso elimina a classe inteira de bugs e, de quebra, destrava a implementação **completa** do editor (cores, destaque, subscrito/sobrescrito, links, checklists etc.), que hoje é limitada pelas gambiarras do Markdown.

---

## 2. Estado atual — mapa dos pontos de contato

| Arquivo | Função/trecho | Papel no fluxo Markdown |
|---|---|---|
| `frontend/src/components/TipTapDrawer.jsx` | `Markdown` ext (L728), `CustomHeading`/`CustomParagraph` (L272–336), `sanitizeMarkdown` (L338), `getMarkdown()` (L743, 867, 905, 1289, 1341) | **Núcleo do problema** — serializa/parseia Markdown |
| `frontend/src/lib/latexGenerator.js` | `mdToLatex`, `inlineToLatex`, `tableToLatex`, `listToLatex`, `escapeLatex`, `escapeLatexTitle`, `markdownToHtml`, `generateHtmlPreview` | 3 parsers paralelos → serão **1** `htmlToLatex` |
| `frontend/src/lib/blockTypes.js` | `default_content` (L24–88) | Templates iniciais em Markdown → HTML |
| `frontend/src/store/projectStore.js` | `createBlock`, `loadProject` (migração de tipos) | Usa `default_content`; migração de conteúdo |
| `frontend/src/components/Canvas.jsx` | `getBlockH1` (L58), `getContentPreview` (L64), `getWordCount`/`getReadingTime` | Regex sobre Markdown → parse de HTML |
| `frontend/src/components/HistoryTab.jsx` | `PatchViewer` (L64–138) | Renderiza diff de `content` (texto) |
| `backend/database.js` | `extractComparableContent` (L166–182) | Diff linha-a-linha de `content` |
| `frontend/src/pages/Editor.jsx` | `onSave` (L509), `generateTex` | Repassa `content`; entrada do conversor |
| `frontend/src/pages/Dashboard.jsx` | migração localStorage | Migração de projetos legados |

**Recursos do TipTap já instalados mas NÃO usados:** `Link`, `FloatingMenu`, `Dropcursor`, `Gapcursor`, `HorizontalRule` (via StarterKit), `HardBreak`.

**Recursos não instalados:** `Highlight`, `Color`/`TextStyle`/`FontFamily`, `Subscript`, `Superscript`, `TaskList`/`TaskItem`, `Image`, `Placeholder`, `CharacterCount`, `Typography`.

---

## 3. Objetivo

1. **`block.content` passa a armazenar HTML** (`editor.getHTML()`), com round-trip perfeito (sem perda de negrito, alinhamento, espaços).
2. **Um único conversor `htmlToLatex`** substitui `mdToLatex` + `inlineToLatex` + `markdownToHtml`.
3. **Editor TipTap completo**: todas as ferramentas visuais (formatação, cores, destaque, sub/super, listas, tarefas, links, tabelas, imagens inline, alinhamento, recuo) — cada uma com mapeamento LaTeX definido e testado.
4. **Migração transparente** dos projetos existentes (Markdown → HTML) no carregamento.
5. **Nenhuma regressão** nos 10 tipos de bloco, temas visuais, cabeçalhos/rodapé e compilação.

---

## 4. Arquitetura alvo

```
Editor TipTap (ProseMirror)
        │  editor.getHTML() / editor.commands.setContent(html)
        ▼
block.content  =  HTML  (persistido no SQLite, campo `blocks` JSON)
        │
        ├─ Preview HTML ──► usa o próprio content (sem re-parse)
        │
        └─ Conversor único ──► htmlToLatex(html) ──► generateTex ──► backend ──► PDF
```

**Princípio:** TipTap é a única fonte de verdade da estrutura do documento. HTML é o formato de persistência (legível, depurável, difável). LaTeX é só um *alvo de renderização*.

---

## 5. Fases de implementação

### Fase 1 — Armazenamento HTML nativo ✅
- [x] Remover `tiptap-markdown` e `Markdown.configure(...)`.
- [x] Remover `CustomHeading`/`CustomParagraph`.
- [x] `onUpdate`: `getMarkdown()` → `getHTML()`.
- [x] Re-inject (`useEffect`): `getMarkdown()` → `getHTML()`.
- [x] `handleSave`: assinatura mantida, agora recebendo HTML.
- [x] `handleExportMarkdown` → exporta HTML (`.html`).
- [x] Remover `sanitizeMarkdown`.

### Fase 2 — Conversor único `htmlToLatex` ✅
- [x] `frontend/src/lib/htmlToLatex.js` (DOM walk, sem lib externa).
- [x] Mapear nós → LaTeX (tabela Seção 6; riscado/marca-texto adiados para Fase 3 por falta de pacote no Alpine).
- [x] `generateHtmlPreview` usa `content` HTML direto — removido `markdownToHtml`.
- [x] `escapeLatex`/`escapeLatexTitle` corrigidos (bug de ordem → sem `\{}`).
- [x] Deletados `mdToLatex`, `inlineToLatex`, `tableToLatex`, `listToLatex`, `markdownToHtml`.

### Fase 3 — Editor TipTap completo (todas as ferramentas) ⏳
- [ ] `@tiptap/extension-link` — ligar na toolbar + `\href` (já mapeado no conversor).
- [ ] `@tiptap/extension-highlight` — destaque (requer pacote `soul` no Alpine).
- [ ] `@tiptap/extension-text-style` + `@tiptap/extension-color` — cor do texto.
- [ ] `@tiptap/extension-subscript` / `@tiptap/extension-superscript`.
- [ ] `@tiptap/extension-task-list` + `@tiptap/extension-task-item` — checklists.
- [ ] `@tiptap/extension-image` — imagem inline.
- [ ] `@tiptap/extension-placeholder`, `@tiptap/extension-character-count`, `@tiptap/extension-typography`.
- [ ] **Riscado (`\sout`)** — requer instalar pacote `ulem` no Alpine (Dockerfile) antes de re-ativar no conversor.
- [ ] Reorganizar a `MenuBar` com todos os grupos.

### Fase 4 — Migração de dados (Markdown → HTML) ✅
- [x] `migrateContent.js` com `markdownToHtml` + limpeza reversa de backslashes espúrios (`cleanSpuriousEscapes`).
- [x] Aplicado em `projectStore.loadProject` (detecção heurística).
- [x] `default_content` em `blockTypes.js` migrado para HTML.
- [x] Migração de importação `.md`/`.txt` no `handleImportMarkdown`.

### Fase 5 — Consumidores do `content` 🔶 (parcial)
- [x] `Canvas.jsx`: `getBlockH1`/`getContentPreview` parseiam HTML (novo `stripHtml`).
- [ ] `HistoryTab.jsx` `PatchViewer`: avaliar renderização de diffs de HTML.
- [ ] `backend/database.js` `extractComparableContent`: diff de HTML (funciona, mas revisar legibilidade).

### Fase 6 — Verificação e testes 🔶 (parcial)
- [x] Teste de migração com os 15 blocos reais do livro (backup) — sem perda de texto.
- [x] Conversor validado: negrito, alinhamento, espaços, math, links, listas, tabelas, código.
- [x] Compilação real do livro no container Docker — **0 erros**, PDF válido.
- [ ] `npm run build` e `npm run lint` completos (o lint global tem 362 erros pré-existentes não relacionados).
- [ ] Teste manual no navegador (editar bloco, recarregar, compilar).

---

## 6. Mapeamento Feature → LaTeX

| Recurso TipTap | Extensão | LaTeX alvo | Pacote necessário |
|---|---|---|---|
| Negrito | `bold` | `\textbf{}` ou `{\bfseries }` | — |
| Itálico | `italic` | `\textit{}` ou `{\itshape }` | — |
| Sublinhado | `underline` | `\underline{}` | — |
| **Riscado** | `strike` | `\sout{}` | `ulem` *(novo)* |
| Código inline | `code` | `\texttt{}` | — |
| Bloco de código | `codeBlock` | `lstlisting` | `listings` |
| H1–H4 | `heading` | `\chapter*` / `\section*` / `\subsection*` / `\subsubsection*` | — |
| Alinhamento | `textAlign` | `{\centering }` / `{\raggedleft }` / `{\justifying }` | `ragged2e` (justify) |
| Lista não ordenada | `bulletList` | `itemize` | — |
| Lista ordenada | `orderedList` | `enumerate` | — |
| Citação | `blockquote` | `quote` / `quotation` | — |
| Linha horizontal | `horizontalRule` | `\hrule` | — |
| Quebra de linha | `hardBreak` | `\\` | — |
| **Link** | `link` | `\href{url}{texto}` | `hyperref` *(já no preâmbulo)* |
| **Cor do texto** | `color` | `\textcolor{<cor>}{texto}` | `xcolor` *(já)* |
| **Destaque (marca-texto)** | `highlight` | `\hl{texto}` | `soul` *(novo)* |
| **Subscrito** | `subscript` | `\textsubscript{}` ou `$_{}$` | — |
| **Sobrescrito** | `superscript` | `\textsuperscript{}` ou `$^{}$` | — |
| **Checklist** | `taskList`/`taskItem` | `itemize` + `$\checkmark$` / `\square` | `amssymb` *(já)* |
| **Imagem inline** | `image` | `\includegraphics[width=...]{}` | `graphicx` *(já)* |
| Tabela | `table` | `tabularx` | `tabularx` *(já)* |
| Recuo | `indent` (custom) | `\hspace*{N em}` | — |
| Placeholder / contagem / tipografia | `placeholder`, `characterCount`, `typography` | *(editor-only, sem saída LaTeX)* | — |

**Pacotes novos no preâmbulo:** `ulem` (riscado), `soul` (destaque), `ragged2e` (justificação robusta) — verificar compatibilidade com `pdflatex`/`lualatex`.

---

## 7. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Migração Markdown→HTML imperfeita (conteúdo legado com gambiarras HTML embutidas) | Heurística de detecção + fallback de manter o conteúdo como está se não converter; migração idempotente |
| Regressão nos 10 tipos de bloco | Manter `blockToLatex` intacto para blocos não-textuais; trocar apenas o conversor de texto |
| Pacotes LaTeX novos (`ulem`, `soul`, `ragged2e`) | Testar compilação com `pdflatex` e `lualatex`; os pacotes são estáveis e padrão no TeX Live |
| Round-trip de imagens inline + base64 | Reutilizar o mecanismo de assets já existente (`compileAssets` no `Editor.jsx`) |
| Histórico/diffs legados em Markdown | Commits antigos seguem como estão (só leitura); novos commits já nascem em HTML |

---

## 8. Critérios de aceite (DoD)

1. Negrito, itálico, sublinhado e riscado renderizam corretamente no PDF, **sem** `\{}` ou escapes vazando.
2. Negrito e alinhamento **persistem** após recarregar o bloco (sem `**texto**` literal).
3. Espaços múltiplos são preservados no editor, no reload e no PDF.
4. Todas as ferramentas do editor TipTap (lista da Fase 3) aparecem na toolbar e produzem LaTeX válido.
5. Projetos existentes são migrados automaticamente ao abrir.
6. `npm run build` e `npm run lint` passam sem erros.
