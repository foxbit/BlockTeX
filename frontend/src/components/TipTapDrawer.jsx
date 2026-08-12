import { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { diffWords } from 'diff';
import { useBackend } from '../hooks/useBackend.js';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { TextSelection } from '@tiptap/pm/state';

// Sanitiza a saída Markdown do TipTap, removendo entidades HTML
// que o ProseMirror às vezes injeta (ex: "> " vira "&gt; ").
// Isso mantém o conteúdo armazenado como Markdown puro.
function sanitizeMarkdown(md) {
    return md
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
}

const MenuBar = ({ editor, onImportClick, onZoomIn, onZoomOut, fontSize, onSearchToggle, showSearch }) => {
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
                >
                    ⫷
                </button>
                <button
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    className={`toolbar-btn ${editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}`}
                >
                    ≣
                </button>
                <button
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    className={`toolbar-btn ${editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}`}
                >
                    ⫸
                </button>
            </div>

            <div className="toolbar-sep" />

            <div className="toolbar-group">
                <button
                    onClick={onImportClick}
                    className="toolbar-btn"
                    title="Importar Arquivo Markdown"
                    style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', padding: '0 8px', fontWeight: 'normal' }}
                >
                    📥 Importar MD
                </button>
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

export function TipTapDrawer({ block, open, onClose, onSave, globalSetup }) {
    const [content, setContent] = useState('');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [fontSize, setFontSize] = useState(() => {
        const saved = localStorage.getItem('blocktex_editor_zoom');
        return saved ? parseInt(saved, 10) : 15;
    });
    const [lastSaveInfo, setLastSaveInfo] = useState({ time: null, type: null });
    const scrollContainerRef = useRef(null);

    // Estados da busca
    const [showSearch, setShowSearch] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

    const handleZoomIn = () => setFontSize(prev => Math.min(prev + 1, 30));
    const handleZoomOut = () => setFontSize(prev => Math.max(prev - 1, 12));

    // Persiste zoom no localStorage
    useEffect(() => {
        localStorage.setItem('blocktex_editor_zoom', fontSize.toString());
    }, [fontSize]);

    // Busca de ocorrências no texto
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

    const matches = editor ? findMatches(editor.state.doc, searchTerm) : [];

    const scrollToMatch = (index) => {
        if (!editor || !matches[index]) return;
        const match = matches[index];
        const { tr } = editor.state;
        const selection = TextSelection.create(editor.state.doc, match.start, match.end);
        tr.setSelection(selection).scrollIntoView();
        editor.view.dispatch(tr);
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
            StarterKit.configure({
                heading: { levels: [1, 2, 3, 4] },
            }),
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Markdown.configure({
                html: false,
                transformPastedText: true,
            }),
        ],
        content: block?.content || '',
        onUpdate: ({ editor }) => {
            const markdownOutput = sanitizeMarkdown(editor.storage.markdown.getMarkdown());
            setContent(markdownOutput);
            setHasUnsavedChanges(true);
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

                // 1. Renderiza realce de busca
                if (searchTerm) {
                    let matchIdx = 0;
                    state.doc.descendants((node, pos) => {
                        if (node.isText) {
                            const text = node.text;
                            const escapedTerm = searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                            const regex = new RegExp(escapedTerm, 'gi');
                            let match;
                            while ((match = regex.exec(text)) !== null) {
                                const start = pos + match.index;
                                const end = start + match[0].length;
                                const isCurrent = (matchIdx === currentMatchIndex);
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

    // Re-inject content when switching blocks if the editor instance survived
    useEffect(() => {
        if (editor && block && open) {
            const currentMarkdown = sanitizeMarkdown(editor.storage.markdown.getMarkdown());
            if (block.content !== currentMarkdown) {
                editor.commands.setContent(block.content || '');
            }
        }
    }, [block?.id, open]);

    if (!block) return null;

    const handleSave = (type = 'manual') => {
        onSave(block.id, content);
        setHasUnsavedChanges(false);
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSaveInfo({ time: timeStr, type });
    };

    const handleImportMarkdown = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            if (editor) {
                editor.commands.setContent(text);
                setHasUnsavedChanges(true);
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset so the same file can be selected again
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
                    <div ref={scrollContainerRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                        <EditorContent editor={editor} className="tiptap-editor-area" />
                    </div>
                    <AIPanel editor={editor} block={block} globalSetup={globalSetup} />
                </div>
            </div>
        </>
    );
}

function AIPanel({ editor, block, globalSetup }) {
    const { transformText, getAISettings } = useBackend();
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
        return { text: editor.storage.markdown.getMarkdown(), isSel: false };
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
        if (isSelection) {
            editor.chain().focus().insertContent(suggestedText).run();
        } else {
            editor.chain().focus().setContent(suggestedText).run();
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

    const rawMd = editor.storage.markdown.getMarkdown();
    const wordCount = rawMd.split(/\s+/).filter(Boolean).length;
    const charCount = rawMd.length;
    
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
            </div>

            {activeTab === 'ai' ? (
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
            ) : (
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
                            <li>Use <strong>**Negrito**</strong> para destacar termos importantes.</li>
                            <li>Use <em>*Itálico*</em> para estrangeirismos ou ênfase.</li>
                            <li>Títulos (H1, H2, H3) serão refletidos no Índice Automático do livro se ativados no Inspector.</li>
                            <li>O conversor do BlockTeX limpa automaticamente entidades HTML como emojis, garantindo compilação LaTeX sem erros.</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
