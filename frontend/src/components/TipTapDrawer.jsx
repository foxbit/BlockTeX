import { useEffect, useState, useRef, useCallback } from 'react';
import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Node, Extension, mergeAttributes } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { diffWords } from 'diff';
import { useBackend } from '../hooks/useBackend.js';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { TextSelection, PluginKey } from '@tiptap/pm/state';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Indent } from '../lib/indent.js';
import { migrateBlockContent } from '../lib/migrateContent.js';
import { formatHtml } from '../lib/formatHtml.js';
import { CodeEditor } from './CodeEditor.jsx';
import { PatchViewer, formatDate, changeTypeLabel, changeTypeBadgeClass } from './HistoryTab.jsx';
import './HistoryTab.css';

// Sanitiza a saída HTML do TipTap (entidades HTML são mantidas pelo getHTML)
const textBubbleMenuKey = new PluginKey('textBubbleMenu');
const tableBubbleMenuKey = new PluginKey('tableBubbleMenu');

function FlagNodeView({ node, updateAttributes, deleteNode }) {
    const { color, title } = node.attrs;
    const [isHovered, setIsHovered] = useState(false);

    const colors = {
        red: '#ef4444',
        yellow: '#eab308',
        green: '#22c55e',
        blue: '#3b82f6',
        purple: '#a855f7',
        indigo: '#6366f1'
    };

    const activeColor = colors[color] || colors.indigo;

    return (
        <NodeViewWrapper
            className="virtual-flag-wrapper"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                position: 'relative',
                margin: '24px 0',
                display: 'flex',
                alignItems: 'center',
                userSelect: 'none'
            }}
        >
            <div style={{ flex: 1, height: '2px', background: activeColor, opacity: 0.6 }} />
            
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--bg-elevated)',
                border: `1px solid ${activeColor}`,
                borderRadius: '20px',
                padding: '4px 10px',
                fontSize: '11px',
                color: 'var(--text-primary)',
                zIndex: 2,
                boxShadow: 'var(--shadow-sm)'
            }}>
                <span style={{ fontSize: '12px' }}>🚩</span>
                <input
                    type="text"
                    placeholder="Nota de revisão..."
                    value={title}
                    onChange={(e) => updateAttributes({ title: e.target.value })}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                        width: '180px'
                    }}
                />
            </div>

            <div style={{ flex: 1, height: '2px', background: activeColor, opacity: 0.6 }} />

            {isHovered && (
                <button
                    onClick={deleteNode}
                    style={{
                        position: 'absolute',
                        right: '0',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'var(--accent-rose)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '9px',
                        zIndex: 10
                    }}
                    title="Remover Marcação"
                    type="button"
                >
                    ✕
                </button>
            )}
        </NodeViewWrapper>
    );
}

const VirtualFlag = Node.create({
    name: 'virtualFlag',
    group: 'block',
    atom: true,

    addAttributes() {
        return {
            color: {
                default: 'indigo',
            },
            title: {
                default: '',
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="virtual-flag"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'virtual-flag' })];
    },

    addNodeView() {
        return ReactNodeViewRenderer(FlagNodeView);
    },

    addCommands() {
        return {
            insertFlag: (options) => ({ chain }) => {
                return chain()
                    .insertContent({
                        type: this.name,
                        attrs: options,
                    })
                    .run();
            },
        };
    },
});

// Busca de ocorrências no texto (declarada fora para evitar problemas de hoisting)
const findMatches = (doc, term) => {
    const matches = [];
    if (!term) return matches;
    doc.descendants((node, pos) => {
        if (node.isText) {
            const text = node.text;
            const escapedTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(escapedTerm, 'gi');
            let match;
            while ((match = regex.exec(text)) !== null) {
                matches.push({
                    start: pos + match.index,
                    end: pos + match.index + match[0].length
                });
            }
        }
    });
    return matches;
};

const MenuBar = ({ editor, onImportClick, onExportClick, onZoomIn, onZoomOut, fontSize, onSearchToggle, showSearch }) => {
    const [showFlagSelector, setShowFlagSelector] = useState(false);
    if (!editor) return null;

    return (
        <div className="tiptap-toolbar">
            <div className="toolbar-group">
                <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`toolbar-btn ${editor.isActive('bold') ? 'is-active' : ''}`}
                    title="Negrito"
                >
                    <b>B</b>
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`toolbar-btn ${editor.isActive('italic') ? 'is-active' : ''}`}
                    title="Itálico"
                >
                    <i>I</i>
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={`toolbar-btn ${editor.isActive('underline') ? 'is-active' : ''}`}
                    title="Sublinhado"
                >
                    <u>U</u>
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={`toolbar-btn ${editor.isActive('strike') ? 'is-active' : ''}`}
                    title="Riscado"
                >
                    <s>S</s>
                </button>
            </div>

            <div className="toolbar-sep" />

            <div className="toolbar-group">
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={`toolbar-btn ${editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}`}
                >
                    H1
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}`}
                >
                    H2
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={`toolbar-btn ${editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}`}
                >
                    H3
                </button>
            </div>

            <div className="toolbar-sep" />

            <div className="toolbar-group">
                <button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`toolbar-btn ${editor.isActive('bulletList') ? 'is-active' : ''}`}
                    title="Lista"
                >
                    • List
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`toolbar-btn ${editor.isActive('orderedList') ? 'is-active' : ''}`}
                    title="Lista Num."
                >
                    1. List
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={`toolbar-btn ${editor.isActive('blockquote') ? 'is-active' : ''}`}
                    title="Citação"
                >
                    " "
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    className={`toolbar-btn ${editor.isActive('codeBlock') ? 'is-active' : ''}`}
                    title="Código"
                >
                    &lt;/&gt;
                </button>
            </div>

            <div className="toolbar-sep" />

            <div className="toolbar-group">
                <button
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    className={`toolbar-btn ${editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}`}
                    title="Alinhar à Esquerda"
                >
                    ⫷
                </button>
                <button
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    className={`toolbar-btn ${editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}`}
                    title="Centralizar"
                >
                    ≣
                </button>
                <button
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    className={`toolbar-btn ${editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}`}
                    title="Alinhar à Direita"
                >
                    ⫸
                </button>
            </div>

            <div className="toolbar-sep" />

            <div className="toolbar-group">
                <button
                    onClick={() => editor.chain().focus().outdent().run()}
                    disabled={!editor.can().outdent()}
                    className="toolbar-btn"
                    title="Retroceder Espaçamento / Diminuir Recuo (Shift+Tab)"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="21" y1="6" x2="11" y2="6"/>
                        <line x1="21" y1="12" x2="13" y2="12"/>
                        <line x1="21" y1="18" x2="11" y2="18"/>
                        <polyline points="7 8 3 12 7 16"/>
                        <line x1="3" y1="12" x2="15" y2="12"/>
                    </svg>
                </button>
                <button
                    onClick={() => editor.chain().focus().indent().run()}
                    disabled={!editor.can().indent()}
                    className="toolbar-btn"
                    title="Avançar Espaçamento / Aumentar Recuo (Tab)"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="21" y1="6" x2="11" y2="6"/>
                        <line x1="21" y1="12" x2="13" y2="12"/>
                        <line x1="21" y1="18" x2="11" y2="18"/>
                        <polyline points="13 8 17 12 13 16"/>
                        <line x1="5" y1="12" x2="17" y2="12"/>
                    </svg>
                </button>
            </div>

            <div className="toolbar-sep" />

            <div className="toolbar-group">
                <button
                    onClick={onImportClick}
                    className="toolbar-btn"
                    title="Importar Arquivo Markdown (convertido para HTML)"
                    style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', padding: '0 8px', fontWeight: 'normal' }}
                >
                    📥 Importar MD
                </button>
                <button
                    onClick={onExportClick}
                    className="toolbar-btn"
                    title="Exportar HTML"
                    style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', padding: '0 8px', fontWeight: 'normal' }}
                >
                    📤 Exportar HTML
                </button>
            </div>

            <div className="toolbar-sep" />

            <div className="toolbar-group" style={{ position: 'relative' }}>
                <button
                    onClick={() => setShowFlagSelector(prev => !prev)}
                    className={`toolbar-btn ${showFlagSelector ? 'is-active' : ''}`}
                    title="Adicionar Marcação/Flag"
                    style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', padding: '0 8px' }}
                >
                    🚩 Flag
                </button>
                {showFlagSelector && (
                    <div
                        className="flag-color-popover"
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            marginTop: '4px',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-default)',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: 'var(--shadow-md)',
                            padding: '6px',
                            display: 'flex',
                            gap: '4px',
                            zIndex: 100
                        }}
                    >
                        {[
                            { name: 'Vermelho', key: 'red', color: '#ef4444' },
                            { name: 'Amarelo', key: 'yellow', color: '#eab308' },
                            { name: 'Verde', key: 'green', color: '#22c55e' },
                            { name: 'Azul', key: 'blue', color: '#3b82f6' },
                            { name: 'Roxo', key: 'purple', color: '#a855f7' },
                            { name: 'Índigo', key: 'indigo', color: '#6366f1' }
                        ].map(c => (
                            <button
                                key={c.key}
                                onClick={() => {
                                    editor.chain().focus().insertFlag({ color: c.key }).run();
                                    setShowFlagSelector(false);
                                }}
                                style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    background: c.color,
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                                title={c.name}
                                type="button"
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="toolbar-sep" />

            <div className="toolbar-group">
                <button
                    onClick={onZoomOut}
                    className="toolbar-btn"
                    title="Diminuir Zoom da Letra (A-)"
                    style={{ fontSize: '11px', fontWeight: 600 }}
                >
                    A-
                </button>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '0 4px', minWidth: '35px', textAlign: 'center' }}>
                    {fontSize}px
                </span>
                <button
                    onClick={onZoomIn}
                    className="toolbar-btn"
                    title="Aumentar Zoom da Letra (A+)"
                    style={{ fontSize: '11px', fontWeight: 600 }}
                >
                    A+
                </button>
            </div>

            <div style={{ flex: 1 }} />

            <div className="toolbar-group">
                <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="toolbar-btn">
                    ↩
                </button>
                <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="toolbar-btn">
                    ↪
                </button>
            </div>

            <div className="toolbar-sep" />

            <div className="toolbar-group">
                <button 
                    onClick={onSearchToggle} 
                    className={`toolbar-btn ${showSearch ? 'is-active' : ''}`}
                    title="Localizar Palavra"
                    style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                    🔍 Buscar
                </button>
            </div>
        </div>
    );
};

export function TipTapDrawer({ block, open, onClose, onSave, globalSetup, projectId }) {
    const [content, setContent] = useState('');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [fontSize, setFontSize] = useState(() => {
        const saved = localStorage.getItem('blocktex_editor_zoom');
        return saved ? parseInt(saved, 10) : 15;
    });
    const [lastSaveInfo, setLastSaveInfo] = useState({ time: null, type: null });
    const scrollContainerRef = useRef(null);
    const [selectionTick, setSelectionTick] = useState(0);
    const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);

    // Estados da busca
    const [showSearch, setShowSearch] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

    const searchTermRef = useRef(searchTerm);
    const currentMatchIndexRef = useRef(currentMatchIndex);

    // Modo de visualização do editor: 'visual' (WYSIWYG) | 'code' (HTML bruto)
    const [viewMode, setViewMode] = useState('visual');
    const [codeValue, setCodeValue] = useState('');



    const handleZoomIn = () => setFontSize(prev => Math.min(prev + 1, 30));
    const handleZoomOut = () => setFontSize(prev => Math.max(prev - 1, 12));

    // Persiste zoom no localStorage
    useEffect(() => {
        localStorage.setItem('blocktex_editor_zoom', fontSize.toString());
    }, [fontSize]);

    // Salva a posição de rolagem quando o usuário rola o editor
    const handleScroll = (e) => {
        if (block?.id) {
            localStorage.setItem(`blocktex_scroll_${block.id}`, e.target.scrollTop.toString());
        }
    };

    // Auto-save debounced effect (5 seconds without editing)
    useEffect(() => {
        if (!hasUnsavedChanges) return;

        const timer = setTimeout(() => {
            handleSave('automático');
        }, 5000);

        return () => clearTimeout(timer);
    }, [content, hasUnsavedChanges]);

    // Sync state and restore scroll position when switching blocks
    useEffect(() => {
        if (open && block) {
            setContent(block.content || '');
            setHasUnsavedChanges(false);
            setLastSaveInfo({ time: null, type: null });
            // Volta ao modo visual e limpa o buffer de código ao trocar de bloco
            setViewMode('visual');
            setCodeValue('');

            // Restaura posição de rolagem salva
            const savedScroll = localStorage.getItem(`blocktex_scroll_${block.id}`);
            setTimeout(() => {
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTop = savedScroll ? parseInt(savedScroll, 10) : 0;
                }
            }, 50);
        }
    }, [open, block?.id]);

    const editor = useEditor({
        extensions: [
            StarterKit,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Indent,
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
            VirtualFlag,
        ],
        content: block?.content || '',
        onUpdate: ({ editor }) => {
            setContent(editor.getHTML());
            setHasUnsavedChanges(true);
        },
        onSelectionUpdate: () => {
            // Força a re-renderização do React para atualizar os estados ativos (highlight) dos botões de formatação
            setSelectionTick(prev => prev + 1);
        },
        onFocus: ({ editor }) => {
            // Força a reavaliação de decorações do ProseMirror ao focar
            editor.view.dispatch(editor.state.tr);
        },
        onBlur: ({ editor }) => {
            // Força a reavaliação de decorações do ProseMirror ao perder o foco
            editor.view.dispatch(editor.state.tr);
        },
        editorProps: {
            decorations(state) {
                const { selection } = state;
                const isFocused = document.activeElement && document.activeElement.closest('.ProseMirror');
                const decs = [];

                // 1. Renderiza realce de busca usando os valores mais recentes das refs
                const currentTerm = searchTermRef.current;
                const activeIndex = currentMatchIndexRef.current;

                if (currentTerm) {
                    let matchIdx = 0;
                    state.doc.descendants((node, pos) => {
                        if (node.isText) {
                            const text = node.text;
                            const escapedTerm = currentTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                            const regex = new RegExp(escapedTerm, 'gi');
                            let match;
                            while ((match = regex.exec(text)) !== null) {
                                const start = pos + match.index;
                                const end = start + match[0].length;
                                const isCurrent = (matchIdx === activeIndex);
                                decs.push(
                                    Decoration.inline(start, end, {
                                        class: isCurrent ? 'tiptap-search-match-active' : 'tiptap-search-match'
                                    })
                                );
                                matchIdx++;
                            }
                        }
                    });
                }

                // 2. Se o editor estiver fora de foco e houver seleção, desenha a decoração de foco
                if (!isFocused && !selection.empty) {
                    decs.push(
                        Decoration.inline(selection.from, selection.to, {
                            class: 'tiptap-blur-selection-highlight'
                        })
                    );
                }

                return DecorationSet.create(state.doc, decs);
            }
        },
    });

    const matches = (editor && editor.state) ? findMatches(editor.state.doc, searchTerm) : [];

    const scrollToMatch = (index) => {
        if (!editor || !editor.state || !matches[index]) return;
        const match = matches[index];
        const { tr } = editor.state;
        const selection = TextSelection.create(editor.state.doc, match.start, match.end);
        
        // Atualiza a seleção e foca no editor para destacar nativamente
        tr.setSelection(selection);
        editor.view.dispatch(tr);
        editor.commands.focus();

        // Rolagem suave no DOM até o elemento pai do nó de texto correspondente
        setTimeout(() => {
            try {
                const resolved = editor.view.domAtPos(match.start);
                if (resolved && resolved.node) {
                    const el = resolved.node.nodeType === Node.TEXT_NODE ? resolved.node.parentElement : resolved.node;
                    if (el && typeof el.scrollIntoView === 'function') {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            } catch (err) {
                console.warn('Erro ao rolar para o termo buscado:', err);
            }
        }, 30);
    };

    const handleNextMatch = () => {
        if (matches.length === 0) return;
        const nextIndex = (currentMatchIndex + 1) % matches.length;
        setCurrentMatchIndex(nextIndex);
        scrollToMatch(nextIndex);
    };

    const handlePrevMatch = () => {
        if (matches.length === 0) return;
        const prevIndex = (currentMatchIndex - 1 + matches.length) % matches.length;
        setCurrentMatchIndex(prevIndex);
        scrollToMatch(prevIndex);
    };

    // Sincroniza referências com o estado e dispara transações de atualização visual ao editor após sua inicialização
    useEffect(() => {
        searchTermRef.current = searchTerm;
        if (editor) {
            editor.view.dispatch(editor.state.tr);
        }
    }, [searchTerm, editor]);

    useEffect(() => {
        currentMatchIndexRef.current = currentMatchIndex;
        if (editor) {
            editor.view.dispatch(editor.state.tr);
        }
    }, [currentMatchIndex, editor]);

    // Re-inject content when switching blocks if the editor instance survived
    useEffect(() => {
        if (editor && block && open) {
            const currentHtml = editor.getHTML();
            if (block.content !== currentHtml) {
                editor.commands.setContent(block.content || '');
            }
        }
    }, [block?.id, open]);

    if (!block) return null;

    const handleSave = async (type = 'manual') => {
        // Se estiver no modo código, aplica o código editado ao editor antes de salvar
        let contentToSave = content;
        if (viewMode === 'code') {
            editor.commands.setContent(codeValue);
            contentToSave = codeValue;
        }
        await onSave(block.id, contentToSave, type === 'manual');
        setHasUnsavedChanges(false);
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSaveInfo({ time: timeStr, type });
        if (type === 'manual') {
            setHistoryRefreshTrigger(prev => prev + 1);
        }
    };

    // Alterna para o modo código: popula o editor com o HTML atual do editor
    const handleSwitchToCode = () => {
        if (!editor) return;
        setCodeValue(formatHtml(editor.getHTML()));
        setViewMode('code');
    };

    // Alterna para o modo visual: aplica o HTML editado ao editor
    const handleSwitchToVisual = () => {
        if (!editor) return;
        editor.commands.setContent(codeValue);
        setContent(codeValue);
        setHasUnsavedChanges(true);
        setViewMode('visual');
    };

    const handleImportMarkdown = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            if (editor) {
                // Arquivos .md/.txt legados são convertidos para HTML antes de inserir
                const html = migrateBlockContent(text);
                editor.commands.setContent(html);
                setHasUnsavedChanges(true);
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset so the same file can be selected again
    };

    const handleExportMarkdown = () => {
        if (!editor) return;
        const html = editor.getHTML();
        const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        
        const blockIdShort = block?.id ? block.id.split('-')[0] : 'bloco';
        const filename = `block-${blockIdShort}.html`;
        
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <>
            <input
                type="file"
                id="import-markdown-file"
                accept=".md,.txt"
                style={{ display: 'none' }}
                onChange={handleImportMarkdown}
            />
            {/* Backdrop overlay */}
            <div
                className={`drawer-backdrop ${open ? 'open' : ''}`}
                onClick={onClose}
            />

            {/* Drawer Container */}
            <div className={`drawer-container ${open ? 'open' : ''}`}>
                <div className="drawer-header">
                    <div className="drawer-title" style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: 'var(--text-accent)' }}>TipTap Editor</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Bloco #{block.id.split('-')[0]}</span>
                        </div>
                        <div style={{ fontSize: '11px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {hasUnsavedChanges ? (
                                <span style={{ color: 'var(--accent-amber)' }}>● Não salvo (editando...)</span>
                            ) : (
                                <span style={{ color: 'var(--accent-green)' }}>
                                    ● Salvo {lastSaveInfo.time && `(${lastSaveInfo.type} às ${lastSaveInfo.time})`}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="drawer-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="toolbar-group" style={{
                            display: 'flex',
                            alignItems: 'center',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            overflow: 'hidden'
                        }}>
                            <button
                                onClick={handleSwitchToVisual}
                                className={`toolbar-btn ${viewMode === 'visual' ? 'is-active' : ''}`}
                                style={{ fontSize: '11px', padding: '4px 10px', border: 'none', borderRadius: 0 }}
                                title="Modo visual (WYSIWYG)"
                            >
                                👁 Visual
                            </button>
                            <button
                                onClick={handleSwitchToCode}
                                className={`toolbar-btn ${viewMode === 'code' ? 'is-active' : ''}`}
                                style={{ fontSize: '11px', padding: '4px 10px', border: 'none', borderRadius: 0 }}
                                title="Modo código (HTML bruto editável)"
                            >
                                &lt;/&gt; Código
                            </button>
                        </div>
                        <button className="btn btn-primary" onClick={() => handleSave('manual')}>Salvar</button>
                        <button 
                            className="btn btn-ghost" 
                            onClick={onClose}
                            style={{ 
                                fontSize: '18px', 
                                padding: '4px 8px', 
                                minWidth: 'auto', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                border: 'none', 
                                background: 'transparent',
                                cursor: 'pointer',
                                color: 'var(--text-muted)'
                            }}
                            title="Fechar Editor"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <MenuBar 
                    editor={editor} 
                    onImportClick={() => document.getElementById('import-markdown-file').click()} 
                    onExportClick={handleExportMarkdown}
                    onZoomIn={handleZoomIn}
                    onZoomOut={handleZoomOut}
                    fontSize={fontSize}
                    onSearchToggle={() => {
                        setShowSearch(prev => !prev);
                        if (showSearch) {
                            setSearchTerm('');
                        }
                    }}
                    showSearch={showSearch}
                />

                {showSearch && (
                    <div className="search-bar" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 16px',
                        background: 'var(--bg-elevated)',
                        borderBottom: '1px solid var(--border-subtle)',
                        fontSize: '11px'
                    }}>
                        <span style={{ color: 'var(--text-muted)' }}>Localizar:</span>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Buscar palavra..."
                            style={{ height: '24px', fontSize: '11px', flex: 1, maxWidth: '200px', padding: '2px 8px' }}
                            value={searchTerm}
                            onChange={e => {
                                setSearchTerm(e.target.value);
                                setCurrentMatchIndex(0);
                            }}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    if (e.shiftKey) {
                                        handlePrevMatch();
                                    } else {
                                        handleNextMatch();
                                    }
                                    e.preventDefault();
                                }
                            }}
                            autoFocus
                        />
                        <span style={{ color: 'var(--text-muted)', fontSize: '10px', minWidth: '40px' }}>
                            {matches.length > 0 ? `${currentMatchIndex + 1}/${matches.length}` : '0/0'}
                        </span>
                        <button className="btn btn-ghost" style={{ padding: '2px 6px', minWidth: 'auto', fontSize: '10px' }} onClick={handlePrevMatch} disabled={matches.length === 0} title="Anterior (Shift+Enter)">↑</button>
                        <button className="btn btn-ghost" style={{ padding: '2px 6px', minWidth: 'auto', fontSize: '10px' }} onClick={handleNextMatch} disabled={matches.length === 0} title="Próximo (Enter)">↓</button>
                        <button className="btn btn-ghost" style={{ padding: '2px 4px', minWidth: 'auto', color: 'var(--accent-rose)', fontSize: '10px' }} onClick={() => {
                            setShowSearch(false);
                            setSearchTerm('');
                        }}>✕</button>
                    </div>
                )}

                <div className="drawer-body" style={{ display: 'flex', flexDirection: 'row', flex: 1, overflow: 'hidden', '--editor-zoom-level': `${fontSize}px` }}>
                    <div ref={scrollContainerRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: viewMode === 'code' ? '0' : '24px' }}>
                        {viewMode === 'code' ? (
                            <CodeEditor
                                value={codeValue}
                                onChange={(newValue) => {
                                    setCodeValue(newValue);
                                    setHasUnsavedChanges(true);
                                }}
                            />
                        ) : (
                            <>
                                {editor && (
                                    <BubbleMenu
                                        pluginKey={textBubbleMenuKey}
                                        className="bubble-menu"
                                        editor={editor}
                                        tippyOptions={{ duration: 100 }}
                                        shouldShow={({ editor }) => {
                                            // Mostra menu de texto se houver seleção de caracteres E não estiver dentro de uma tabela
                                            return !editor.state.selection.empty && !editor.isActive('table');
                                        }}
                                    >
                                        <button
                                            onClick={() => editor.chain().focus().toggleBold().run()}
                                            className={editor.isActive('bold') ? 'is-active' : ''}
                                            type="button"
                                            title="Negrito"
                                        >
                                            <b>B</b>
                                        </button>
                                        <button
                                            onClick={() => editor.chain().focus().toggleItalic().run()}
                                            className={editor.isActive('italic') ? 'is-active' : ''}
                                            type="button"
                                            title="Itálico"
                                        >
                                            <i>I</i>
                                        </button>
                                        <button
                                            onClick={() => editor.chain().focus().toggleUnderline().run()}
                                            className={editor.isActive('underline') ? 'is-active' : ''}
                                            type="button"
                                            title="Sublinhado"
                                        >
                                            <u>U</u>
                                        </button>
                                        <button
                                            onClick={() => editor.chain().focus().toggleStrike().run()}
                                            className={editor.isActive('strike') ? 'is-active' : ''}
                                            type="button"
                                            title="Tachado"
                                        >
                                            <s>S</s>
                                        </button>
                                    </BubbleMenu>
                                )}
                                {editor && (
                                    <BubbleMenu
                                        pluginKey={tableBubbleMenuKey}
                                        className="bubble-menu table-bubble-menu"
                                        editor={editor}
                                        tippyOptions={{ duration: 100 }}
                                        shouldShow={({ editor }) => {
                                            // Mostra menu de tabelas apenas se o cursor estiver ativo dentro de uma célula
                                            return editor.isActive('table');
                                        }}
                                    >
                                        <button onClick={() => editor.chain().focus().addColumnBefore().run()} type="button" title="Inserir Coluna à Esquerda">
                                            ➕🔲
                                        </button>
                                        <button onClick={() => editor.chain().focus().addColumnAfter().run()} type="button" title="Inserir Coluna à Direita">
                                            🔲➕
                                        </button>
                                        <button onClick={() => editor.chain().focus().deleteColumn().run()} type="button" title="Excluir Coluna" style={{ color: 'var(--accent-rose)' }}>
                                            🗑️🔲
                                        </button>
                                        <div style={{ width: '1px', background: 'var(--border-default)', margin: '4px 2px' }} />
                                        <button onClick={() => editor.chain().focus().addRowBefore().run()} type="button" title="Inserir Linha Acima">
                                            ➕➖
                                        </button>
                                        <button onClick={() => editor.chain().focus().addRowAfter().run()} type="button" title="Inserir Linha Abaixo">
                                            ➖➕
                                        </button>
                                        <button onClick={() => editor.chain().focus().deleteRow().run()} type="button" title="Excluir Linha" style={{ color: 'var(--accent-rose)' }}>
                                            🗑️➖
                                        </button>
                                        <div style={{ width: '1px', background: 'var(--border-default)', margin: '4px 2px' }} />
                                        <button onClick={() => editor.chain().focus().deleteTable().run()} type="button" title="Excluir Tabela Inteira" style={{ color: 'var(--accent-rose)', fontWeight: 'bold' }}>
                                            🗑️ Tabela
                                        </button>
                                    </BubbleMenu>
                                )}
                                <EditorContent editor={editor} className="tiptap-editor-area" />
                            </>
                        )}
                    </div>
                    <AIPanel editor={editor} block={block} globalSetup={globalSetup} projectId={projectId} historyRefreshTrigger={historyRefreshTrigger} />
                </div>
            </div>
        </>
    );
}

function BlockHistoryTab({ projectId, blockId, refreshTrigger }) {
    const { listBlockHistory } = useBackend();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedCommit, setExpandedCommit] = useState(null);

    const fetchHistory = useCallback(async () => {
        if (!projectId || projectId === 'new' || !blockId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const res = await listBlockHistory(projectId, blockId);
        if (res.success) {
            setHistory(res.history || []);
        }
        setLoading(false);
    }, [projectId, blockId, listBlockHistory]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory, refreshTrigger]);

    const handleExpandCommit = (commitId) => {
        setExpandedCommit(expandedCommit === commitId ? null : commitId);
    };

    if (!projectId || projectId === 'new') {
        return (
            <div className="history-empty" style={{ padding: '20px 10px' }}>
                <div className="history-empty-icon">📝</div>
                <div>Salve o projeto para iniciar o histórico.</div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="history-loading" style={{ padding: '20px 10px' }}>
                <div className="history-spinner" />
                <div>Carregando histórico...</div>
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="history-empty" style={{ padding: '20px 10px' }}>
                <div className="history-empty-icon">📋</div>
                <div>Nenhuma alteração neste bloco ainda.</div>
                <div className="history-empty-hint">
                    Use <kbd>Ctrl+S</kbd> ou o botão Salvar no painel para registrar alterações.
                </div>
            </div>
        );
    }

    return (
        <div className="history-tab" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div className="history-header" style={{ padding: '4px 0 8px 0' }}>
                <span className="history-count">{history.length} versão{history.length !== 1 ? 'ões' : 'ão'}</span>
                <button className="btn btn-ghost btn-sm" onClick={fetchHistory} title="Atualizar">↻</button>
            </div>

            <div className="history-timeline" style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
                {history.map((item) => (
                    <div key={item.commit_id} className={`history-commit ${expandedCommit === item.commit_id ? 'expanded' : ''}`}>
                        <button
                            className="history-commit-header"
                            onClick={() => handleExpandCommit(item.commit_id)}
                            style={{ padding: '8px 4px' }}
                        >
                            <div className="commit-dot" />
                            <div className="commit-info">
                                <div className="commit-message" style={{ fontSize: '11px' }}>{item.message}</div>
                                <div className="commit-time" style={{ fontSize: '9px' }}>{formatDate(item.timestamp)}</div>
                            </div>
                            <div className={`commit-chevron ${expandedCommit === item.commit_id ? 'open' : ''}`}>▾</div>
                        </button>

                        {expandedCommit === item.commit_id && (
                            <div className="history-diffs" style={{ padding: '4px 4px 8px 16px' }}>
                                <div className="diff-entry">
                                    <div className="diff-header" style={{ padding: '4px 8px' }}>
                                        <span className={changeTypeBadgeClass(item.change_type)} style={{ fontSize: '9px', padding: '1px 4px' }}>
                                            {changeTypeLabel(item.change_type)}
                                        </span>
                                    </div>
                                    <PatchViewer patch={item.patch} changeType={item.change_type} />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function AIPanel({ editor, block, globalSetup, projectId, historyRefreshTrigger }) {
    const { transformText, getAISettings, listBlockHistory } = useBackend();
    const [activeTab, setActiveTab] = useState('ai');
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [originalText, setOriginalText] = useState('');
    const [suggestedText, setSuggestedText] = useState('');
    const [isSelection, setIsSelection] = useState(false);
    const [showDiff, setShowDiff] = useState(false);
    const [hasApiKey, setHasApiKey] = useState(false);
    const [selectionText, setSelectionText] = useState('');

    useEffect(() => {
        if (!editor) return;

        const updateSelection = () => {
            const { from, to } = editor.state.selection;
            if (from !== to) {
                const text = editor.state.doc.textBetween(from, to, ' ');
                setSelectionText(text);
            } else {
                setSelectionText('');
            }
        };

        // Run initially
        updateSelection();

        // Listen for selection updates
        editor.on('selectionUpdate', updateSelection);
        return () => {
            editor.off('selectionUpdate', updateSelection);
        };
    }, [editor]);

    useEffect(() => {
        const checkConfig = async () => {
            const settings = await getAISettings();
            if (settings.success && settings.availableProviders?.opencode) {
                setHasApiKey(true);
            } else {
                setHasApiKey(false);
            }
        };
        checkConfig();
    }, [getAISettings]);

    if (!editor || (block.type !== 'chapter' && block.type !== 'content')) {
        return null;
    }

    const getSelectionOrFullText = () => {
        const { state } = editor;
        const { from, to } = state.selection;
        if (from !== to) {
            const selectedText = state.doc.textBetween(from, to, ' ');
            return { text: selectedText, isSel: true };
        }
        return { text: editor.getText(), isSel: false };
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setLoading(true);
        setError(null);
        setShowDiff(false);

        const { text, isSel } = getSelectionOrFullText();
        setOriginalText(text);
        setIsSelection(isSel);

        const res = await transformText(text, prompt);
        setLoading(false);
        if (res.success) {
            setSuggestedText(res.transformedText);
            setShowDiff(true);
        } else {
            setError(res.error || 'Erro desconhecido ao chamar a IA.');
        }
    };

    const handleApply = () => {
        // A IA retorna Markdown; converte para HTML antes de inserir no editor
        const html = migrateBlockContent(suggestedText);
        if (isSelection) {
            editor.chain().focus().insertContent(html).run();
        } else {
            editor.chain().focus().setContent(html).run();
        }
        setShowDiff(false);
        setPrompt('');
    };

    const handleDiscard = () => {
        setShowDiff(false);
        setSuggestedText('');
    };

    const applyPreset = (presetText) => {
        setPrompt(presetText);
    };

    const PRESETS = [
        { label: '📝 Melhorar Escrita', text: 'Melhore a clareza, coesão e estilo deste texto.' },
        { label: '🔍 Corrigir Gramática', text: 'Corrija erros de ortografia, gramática e pontuação.' },
        { label: '🇬🇧 Traduzir para Inglês', text: 'Traduza o texto para o idioma Inglês.' },
        { label: '✂️ Resumir', text: 'Resuma o texto mantendo as ideias principais de forma concisa.' },
        { label: '➕ Expandir', text: 'Expanda o texto adicionando mais detalhes relevantes e desenvolvimento.' },
    ];

    const differences = showDiff ? diffWords(originalText, suggestedText) : [];

    const rawText = editor.getText();
    const wordCount = rawText.split(/\s+/).filter(Boolean).length;
    const charCount = rawText.length;
    
    // Calcula estimativa avançada de páginas com base no globalSetup
    const getEstimatedPages = () => {
        if (!globalSetup || !wordCount) return "0.0";
        
        // 1. Dimensões padrão em mm do papel
        let w = 148, h = 210; // A5 default fallback
        const paper = globalSetup.paper || 'a5';
        if (paper === 'a4') { w = 210; h = 297; }
        else if (paper === 'letter') { w = 216; h = 279; }
        else if (paper === '16x23') { w = 160; h = 230; }
        else if (paper === '15x21') { w = 150; h = 210; }
        
        // 2. Parse das margens
        const parseMargin = (val) => {
            if (!val) return 20; // default 20mm
            const num = parseFloat(val);
            if (String(val).includes('cm')) return num * 10;
            return num; // assume mm
        };
        
        const inner = parseMargin(globalSetup.innerMargin);
        const outer = parseMargin(globalSetup.outerMargin);
        const top = parseMargin(globalSetup.topMargin);
        const bottom = parseMargin(globalSetup.bottomMargin);
        
        // 3. Área imprimível real em mm²
        const printW = Math.max(50, w - (inner + outer));
        const printH = Math.max(50, h - (top + bottom));
        const printArea = printW * printH;
        
        // 4. Fator da fonte (LaTeX standard bases: 10pt, 11pt, 12pt)
        let baseSize = 11;
        if (globalSetup.baseSize) {
            baseSize = parseFloat(globalSetup.baseSize) || 11;
        }
        // A densidade de caracteres varia inversamente com o quadrado do tamanho da fonte
        const fontScale = Math.pow(11 / baseSize, 1.6); 
        
        // 5. Linha de base de referência:
        // A4 (210x297) com margens de 20mm tem área imprimível de 170 * 257 = 43690 mm².
        // Uma folha dessa a 11pt comporta tipicamente ~450 palavras (~2700 a 3000 caracteres com espaços).
        const baselineArea = 43690;
        const baselineWords = 450;
        
        const wordsPerPage = baselineWords * (printArea / baselineArea) * fontScale;
        if (wordsPerPage <= 0) return "0.0";
        
        return (wordCount / wordsPerPage).toFixed(1);
    };

    const estimatedPages = getEstimatedPages();

    return (
        <div className="ai-assistant-panel" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="sidebar-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: '16px', gap: '4px' }}>
                <button
                    type="button"
                    onClick={() => setActiveTab('ai')}
                    style={{
                        flex: 1,
                        padding: '8px 4px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'ai' ? '2px solid var(--accent-indigo)' : '2px solid transparent',
                        color: activeTab === 'ai' ? 'var(--text-accent)' : 'var(--text-muted)',
                        fontWeight: activeTab === 'ai' ? 600 : 'normal',
                        cursor: 'pointer',
                        fontSize: '11px',
                        textAlign: 'center',
                        transition: 'all 0.2s'
                    }}
                >
                    🪄 Assistente IA
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('info')}
                    style={{
                        flex: 1,
                        padding: '8px 4px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'info' ? '2px solid var(--accent-indigo)' : '2px solid transparent',
                        color: activeTab === 'info' ? 'var(--text-accent)' : 'var(--text-muted)',
                        fontWeight: activeTab === 'info' ? 600 : 'normal',
                        cursor: 'pointer',
                        fontSize: '11px',
                        textAlign: 'center',
                        transition: 'all 0.2s'
                    }}
                >
                    ℹ️ Info do Bloco
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    style={{
                        flex: 1,
                        padding: '8px 4px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'history' ? '2px solid var(--accent-indigo)' : '2px solid transparent',
                        color: activeTab === 'history' ? 'var(--text-accent)' : 'var(--text-muted)',
                        fontWeight: activeTab === 'history' ? 600 : 'normal',
                        cursor: 'pointer',
                        fontSize: '11px',
                        textAlign: 'center',
                        transition: 'all 0.2s'
                    }}
                >
                    🕒 Histórico
                </button>
            </div>

            {activeTab === 'ai' && (
                <>
                    <h3 className="ai-panel-title" style={{ marginTop: 0 }}>🪄 Assistente de Escrita IA</h3>
                    
                    {!hasApiKey && (
                        <div style={{ background: '#f43f5e1c', color: '#f43f5e', border: '1px solid #f43f5e3b', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '11px', marginBottom: '16px', lineHeight: 1.4 }}>
                            ⚠️ Chave API da OpenCode não configurada no servidor. Configure o arquivo `.env` para usar a IA.
                        </div>
                    )}

                    {!showDiff ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {selectionText ? (
                                    <div style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(139, 92, 246, 0.2)', marginBottom: '4px', lineHeight: 1.4 }}>
                                        <span style={{ fontWeight: 600, display: 'block', marginBottom: '2px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>✨ Trecho Selecionado</span>
                                        "{selectionText.length > 90 ? selectionText.substring(0, 90) + '...' : selectionText}"
                                    </div>
                                ) : (
                                    "Selecione um trecho de texto no editor ao lado ou deixe em branco para atuar em todo o bloco."
                                )}
                            </div>

                            <div className="presets-container">
                                {PRESETS.map((p, i) => (
                                    <button 
                                        key={i} 
                                        type="button" 
                                        className="btn btn-ghost" 
                                        style={{ fontSize: '11px', padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}
                                        onClick={() => applyPreset(p.text)}
                                        disabled={!hasApiKey}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>

                            <textarea
                                className="form-input"
                                style={{ height: '80px', fontSize: '12px', fontFamily: 'inherit', resize: 'none' }}
                                placeholder="O que a IA deve fazer com o texto? (Ex: Reescreva de forma mais formal)"
                                value={prompt}
                                onChange={e => setPrompt(e.target.value)}
                                disabled={loading || !hasApiKey}
                            />

                            {error && (
                                <div style={{ color: 'var(--accent-rose)', fontSize: '11px', whiteSpace: 'pre-wrap' }}>
                                    {error}
                                </div>
                            )}

                            <button
                                type="button"
                                className="btn btn-primary"
                                style={{ background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-violet))', color: 'white' }}
                                onClick={handleGenerate}
                                disabled={loading || !prompt.trim() || !hasApiKey}
                            >
                                {loading ? 'Processando...' : 'Reescrever com IA →'}
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-accent)' }}>
                                {isSelection ? 'Alterações na seleção:' : 'Alterações no bloco inteiro:'}
                            </div>

                            <div className="diff-viewer">
                                {differences.map((part, index) => {
                                    if (part.added) return <ins key={index} className="diff-added">{part.value}</ins>;
                                    if (part.removed) return <del key={index} className="diff-removed">{part.value}</del>;
                                    return <span key={index}>{part.value}</span>;
                                })}
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={handleDiscard}>
                                    Descartar
                                </button>
                                <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={handleApply}>
                                    Aceitar
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {activeTab === 'info' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <h3 className="ai-panel-title" style={{ marginTop: 0 }}>ℹ️ Detalhes do Bloco</h3>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                        <span>Tipo de Bloco:</span>
                        <span className="tag tag-violet" style={{ textTransform: 'capitalize', fontSize: '10px', padding: '2px 6px' }}>{block.type}</span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                        <span>Total de Palavras:</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{wordCount}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                        <span>Total de Caracteres:</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{charCount}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                        <span title="Cálculo matemático baseado na área de impressão física e tamanho base da fonte (10pt, 11pt, 12pt)">Pág. Estimadas ({globalSetup?.paper?.toUpperCase() || 'A5'}):</span>
                        <strong style={{ color: 'var(--text-primary)' }}>~{estimatedPages} {estimatedPages === "1.0" ? 'pág' : 'págs'}</strong>
                    </div>

                    <div style={{ marginTop: '6px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '8px', fontSize: '11px' }}>Dicas de Formatação:</span>
                        <ul style={{ paddingLeft: '16px', margin: 0, lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                            <li>Use <strong>Negrito</strong> para destacar termos importantes.</li>
                            <li>Use <em>Itálico</em> para estrangeirismos ou ênfase.</li>
                            <li>Títulos (H1, H2, H3) serão refletidos no Índice Automático do livro se ativados no Inspector.</li>
                            <li>O conversor do BlockTeX limpa automaticamente emojis, garantindo compilação LaTeX sem erros.</li>
                        </ul>
                    </div>
                </div>
            )}

            {activeTab === 'history' && (
                <BlockHistoryTab projectId={projectId} blockId={block.id} refreshTrigger={historyRefreshTrigger} />
            )}
        </div>
    );
}
