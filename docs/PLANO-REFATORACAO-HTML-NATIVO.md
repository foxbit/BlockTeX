# Plano de Refatoração — HTML Nativo do TipTap + Editor Completo

> **Branch:** `refactor/html-nativo`
> **Data:** 2026-08-24
> **Escopo:** Eliminar o formato Markdown intermediário (fonte dos bugs de renderização) e completar o editor TipTap com todas as suas ferramentas, com mapeamento fiel para LaTeX.

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

### Fase 1 — Armazenamento HTML nativo
- [ ] Remover `tiptap-markdown` e `Markdown.configure(...)`.
- [ ] Remover `CustomHeading`/`CustomParagraph` (o `TextAlign` + `Heading`/`Paragraph` nativos já cobrem alinhamento via atributo `textAlign`).
- [ ] `onUpdate`: trocar `editor.storage.markdown.getMarkdown()` → `editor.getHTML()`.
- [ ] Re-inject (`useEffect` L864): trocar `getMarkdown()` → `getHTML()`.
- [ ] `handleSave`: manter assinatura, agora recebendo HTML.
- [ ] `handleExportMarkdown` → renomear para exportar HTML (ou manter export de Markdown via conversor HTML→MD separado — decidir na implementação; sugestão: exportar HTML, já que é o formato canônico).
- [ ] Remover `sanitizeMarkdown` (não é mais necessário; se entidades HTML surgirem, o próprio `getHTML` as gerencia).

### Fase 2 — Conversor único `htmlToLatex`
- [ ] Criar `frontend/src/lib/htmlToLatex.js` com um *walk* no DOM (usando `DOMParser` do navegador, sem lib externa).
- [ ] Mapear nós → LaTeX (ver tabela na Seção 6).
- [ ] Preservar o preâmbulo (`generatePreamble`) e os blocos não-textuais (`blockToLatex` para IMAGE, IMAGE_GRID, TESTIMONIAL, TOC, SEPARATOR) — apenas o conteúdo textual dos blocos `chapter`/`content`/`quote`/`code`/`cover` passa pelo novo conversor.
- [ ] `generateHtmlPreview`: usar `content` (HTML) diretamente — remover `markdownToHtml`.
- [ ] `escapeLatex`/`escapeLatexTitle`: corrigir o **bug de ordem** (escapar `\` por último, ou usar placeholder, para não re-escapar `{}` dos comandos recém-gerados).
- [ ] Deletar `mdToLatex`, `inlineToLatex`, `tableToLatex`, `listToLatex`, `markdownToHtml`.

### Fase 3 — Editor TipTap completo (todas as ferramentas)
Instalar extensões faltantes e ligá-las à toolbar + mapeamento LaTeX:
- [ ] `@tiptap/extension-link` (já instalado) — **ligar na toolbar** (botão de link + popover de URL) e ao `htmlToLatex` (`\href`).
- [ ] `@tiptap/extension-highlight` — destaque de texto.
- [ ] `@tiptap/extension-text-style` + `@tiptap/extension-color` — cor do texto.
- [ ] `@tiptap/extension-subscript` / `@tiptap/extension-superscript`.
- [ ] `@tiptap/extension-task-list` + `@tiptap/extension-task-item` — checklists.
- [ ] `@tiptap/extension-image` — imagem inline (complementa os blocos de imagem).
- [ ] `@tiptap/extension-placeholder` — placeholder de edição.
- [ ] `@tiptap/extension-character-count` — contagem (substitui o cálculo manual de palavras, ou coexiste).
- [ ] `@tiptap/extension-typography` — aspas/reticências inteligentes.
- [ ] `FloatingMenu` (já instalado) — se desejado, menu flutuante de bloco.
- [ ] **Strike (riscado)**: adicionar mapeamento LaTeX (`\sout{}` via pacote `ulem` — hoje está na toolbar mas não converte).
- [ ] Reorganizar a `MenuBar` com todos os grupos de botões (estilo, listas, alinhamento, inserir, recuo, link, cor, destaque, sub/super, tarefa, imagem).

### Fase 4 — Migração de dados (Markdown → HTML)
- [ ] Função `migrateContentToHtml(markdown)`: usar `remark`+`rehype` (ou o próprio `tiptap-markdown` uma única vez, apenas no caminho de migração) para converter conteúdo legado → HTML.
- [ ] Aplicar em `projectStore.loadProject` (detecção: `content` contém Markdown e não HTML — heurística: presença de `# `, `**`, ou ausência de tags `<p>`/`<h1>`).
- [ ] Migrar também `default_content` em `blockTypes.js` para HTML.
- [ ] Migrar autosave no `localStorage` e backups `.btx` importados.

### Fase 5 — Consumidores do `content`
- [ ] `Canvas.jsx`: `getBlockH1` (extrair `<h1>` via DOM), `getContentPreview` (strip de tags HTML), `getWordCount`/`getReadingTime` (contar texto visível).
- [ ] `HistoryTab.jsx` `PatchViewer`: renderizar diffs de HTML (continuar mostrando texto plano via strip, ou diffs visuais).
- [ ] `backend/database.js` `extractComparableContent`: diff de HTML funciona; garantir que campos `base64` seguem excluídos.
- [ ] `AIPanel` (TipTapDrawer L1289, 1341): trocar `getMarkdown()` → `getHTML()`/`getText()` para texto enviado à IA e contagem.

### Fase 6 — Verificação e testes
- [ ] Compilar um documento de teste com **todos** os recursos: negrito, itálico, sublinhado, riscado, cor, destaque, sub/super, link, lista, checklist, tabela, código, imagem inline, alinhamentos, recuo.
- [ ] Verificar os 3 bugs originais resolvidos: (1) sem `\{}`, (2) negrito persiste no reload, (3) espaços múltiplos preservados.
- [ ] `npm run build` sem erros; `npm run lint`.
- [ ] Testar migração de um projeto legado com Markdown.

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
