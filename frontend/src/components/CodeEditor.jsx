import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { html } from '@codemirror/lang-html';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';

// Tema escuro integrado às variáveis CSS do BlockTeX (acompanha o seletor de temas)
const blocktexTheme = EditorView.theme({
    '&': {
        height: '100%',
        fontSize: '13px',
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-primary)'
    },
    '.cm-scroller': {
        fontFamily: 'var(--font-mono)',
        lineHeight: '1.6'
    },
    '.cm-content': {
        caretColor: 'var(--accent-indigo)',
        padding: '12px 0'
    },
    '.cm-gutters': {
        backgroundColor: 'transparent',
        color: 'var(--text-muted)',
        border: 'none',
        borderRight: '1px solid var(--border-subtle)'
    },
    '.cm-activeLine': {
        backgroundColor: 'rgba(99, 102, 241, 0.07)'
    },
    '.cm-activeLineGutter': {
        backgroundColor: 'transparent',
        color: 'var(--accent-indigo)'
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
        backgroundColor: 'var(--accent-indigo-glow)'
    },
    '.cm-cursor': {
        borderLeftColor: 'var(--accent-indigo)'
    },
    '.cm-matchingBracket': {
        backgroundColor: 'rgba(99, 102, 241, 0.3)'
    },
    '&.cm-focused .cm-matchingBracket': {
        backgroundColor: 'rgba(99, 102, 241, 0.4)',
        outline: '1px solid var(--accent-indigo)'
    },
    '.cm-panels': {
        backgroundColor: 'var(--bg-elevated)',
        color: 'var(--text-primary)'
    },
    '.cm-tooltip': {
        backgroundColor: 'var(--bg-elevated)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-default)'
    }
});

// Paleta de cores para HTML (otimizada para o fundo escuro do BlockTeX)
const htmlHighlightStyle = HighlightStyle.define([
    { tag: tags.comment, color: '#50566b', fontStyle: 'italic' },
    { tag: [tags.tagName, tags.angleBracket], color: '#f43f5e' },
    { tag: tags.attributeName, color: '#f59e0b' },
    { tag: [tags.string, tags.attributeValue], color: '#10b981' },
    { tag: tags.name, color: '#a5b4fc' },
    { tag: tags.meta, color: '#8b5cf6' },
    { tag: tags.link, color: '#14b8a6' }
]);

/**
 * Editor de código (CodeMirror 6) para o modo "Código" do drawer TipTap.
 * Props:
 *  - value: conteúdo HTML (string) exibido no editor
 *  - onChange: chamado com o novo texto a cada alteração
 *  - style: estilos aplicados ao container (precisa de altura definida)
 */
export function CodeEditor({ value, onChange, style }) {
    const containerRef = useRef(null);
    const viewRef = useRef(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    // Cria o editor uma única vez
    useEffect(() => {
        const view = new EditorView({
            parent: containerRef.current,
            state: EditorState.create({
                doc: value,
                extensions: [
                    basicSetup,
                    html({ autoCloseTags: true, matchClosingTags: true }),
                    blocktexTheme,
                    syntaxHighlighting(htmlHighlightStyle),
                    EditorView.lineWrapping,
                    EditorView.updateListener.of((update) => {
                        if (update.docChanged) {
                            onChangeRef.current(update.state.doc.toString());
                        }
                    })
                ]
            })
        });
        viewRef.current = view;
        return () => {
            view.destroy();
            viewRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sincroniza alterações externas do valor (troca de bloco, formatar, etc.)
    useEffect(() => {
        const view = viewRef.current;
        if (!view) return;
        const current = view.state.doc.toString();
        if (value !== current) {
            view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
        }
    }, [value]);

    // Mantém o editor medido corretamente se o container mudar de tamanho
    useEffect(() => {
        const view = viewRef.current;
        const el = containerRef.current;
        if (!view || !el || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(() => view.requestMeasure());
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    return <div ref={containerRef} className="tiptap-code-editor" style={style} />;
}
