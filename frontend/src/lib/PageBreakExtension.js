import { Node } from '@tiptap/core';

// Sentinela usada para substituir <!-- pagebreak --> ao carregar conteúdo no editor.
// Deve ser um texto único que o markdown-it não interprete de forma especial.
export const PAGE_BREAK_SENTINEL = 'BLOCKTEX_PAGEBREAK_9f3a';

// Marcador armazenado no campo content do bloco (markdown)
export const PAGE_BREAK_MD = '<!-- pagebreak -->';

// ── Extensão TipTap ────────────────────────────────────────────────────────────
export const PageBreak = Node.create({
    name: 'pageBreak',
    group: 'block',
    atom: true,   // leaf node, sem conteúdo editável

    parseHTML() {
        return [{ tag: 'div[data-type="page-break"]' }];
    },

    renderHTML() {
        return ['div', { 'data-type': 'page-break', class: 'page-break-node' }];
    },

    addCommands() {
        return {
            setPageBreak: () => ({ commands }) =>
                commands.insertContent({ type: 'pageBreak' }),
        };
    },
});

// ── Patcha o serializer do tiptap-markdown para emitir <!-- pagebreak --> ──────
export function patchMarkdownSerializer(editor) {
    try {
        const serializer = editor.storage?.markdown?.serializer;
        if (serializer?.nodes) {
            serializer.nodes.pageBreak = (state) => {
                state.write('\n\n<!-- pagebreak -->\n\n');
            };
        }
    } catch (e) {
        console.warn('[PageBreak] serializer patch failed:', e);
    }
}

// ── Carrega conteúdo com suporte a <!-- pagebreak --> ─────────────────────────
// Substitui os marcadores por um sentinel textual, carrega o markdown normalmente,
// depois percorre o documento e substitui parágrafos de sentinel por nós pageBreak.
export function loadContentWithPageBreaks(editor, markdown) {
    if (!markdown?.includes(PAGE_BREAK_MD)) {
        editor.commands.setContent(markdown || '');
        return;
    }

    // 1. Substitui <!-- pagebreak --> pelo sentinel
    const withSentinel = markdown.replace(/<!--\s*pagebreak\s*-->/g, PAGE_BREAK_SENTINEL);
    editor.commands.setContent(withSentinel);

    // 2. Coleta posições dos parágrafos que contêm apenas o sentinel
    const { state, view } = editor;
    const targets = [];

    state.doc.descendants((node, pos) => {
        if (node.type.name === 'paragraph' && node.textContent.trim() === PAGE_BREAK_SENTINEL) {
            targets.push({ pos, size: node.nodeSize });
        }
    });

    if (targets.length === 0) return;

    // 3. Substitui em ordem reversa para não deslocar posições anteriores
    let tr = state.tr;
    for (const { pos, size } of [...targets].reverse()) {
        const pbNode = state.schema.nodes.pageBreak?.create();
        if (pbNode) tr = tr.replaceWith(pos, pos + size, pbNode);
    }

    if (tr.docChanged) view.dispatch(tr);
}
