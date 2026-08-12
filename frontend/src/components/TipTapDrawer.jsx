import { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { diffWords } from 'diff';
import { useBackend } from '../hooks/useBackend.js';

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

const MenuBar = ({ editor, onImportClick, onZoomIn, onZoomOut, fontSize }) => {
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
        </div>
    );
};

export function TipTapDrawer({ block, open, onClose, onSave }) {
    const [content, setContent] = useState('');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [fontSize, setFontSize] = useState(15);

    const handleZoomIn = () => setFontSize(prev => Math.min(prev + 1, 30));
    const handleZoomOut = () => setFontSize(prev => Math.max(prev - 1, 12));

    // Sync state when drawer opens with a specific block
    useEffect(() => {
        if (open && block) {
            setContent(block.content || '');
            setHasUnsavedChanges(false);
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

    const handleSave = () => {
        onSave(block.id, content);
        setHasUnsavedChanges(false);
        onClose();
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
                    <div className="drawer-title">
                        <span style={{ color: 'var(--text-accent)' }}>TipTap Editor</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginLeft: '8px' }}>Bloco #{block.id.split('-')[0]}</span>
                        {hasUnsavedChanges && <span style={{ color: 'var(--accent-amber)', fontSize: '11px', marginLeft: '8px' }}>• Não salvo</span>}
                    </div>
                    <div className="drawer-actions">
                        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
                        <button className="btn btn-primary" onClick={handleSave}>Salvar & Fechar</button>
                    </div>
                </div>

                <MenuBar 
                    editor={editor} 
                    onImportClick={() => document.getElementById('import-markdown-file').click()} 
                    onZoomIn={handleZoomIn}
                    onZoomOut={handleZoomOut}
                    fontSize={fontSize}
                />

                <div className="drawer-body" style={{ display: 'flex', flexDirection: 'row', flex: 1, overflow: 'hidden', '--editor-zoom-level': `${fontSize}px` }}>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                        <EditorContent editor={editor} className="tiptap-editor-area" />
                    </div>
                    <AIPanel editor={editor} block={block} />
                </div>
            </div>
        </>
    );
}

function AIPanel({ editor, block }) {
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
