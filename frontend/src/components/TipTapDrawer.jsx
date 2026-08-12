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

const MenuBar = ({ editor }) => {
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

    return (
        <>
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

                <MenuBar editor={editor} />

                <div className="drawer-body" style={{ display: 'flex', flexDirection: 'row', flex: 1, overflow: 'hidden' }}>
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
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [originalText, setOriginalText] = useState('');
    const [suggestedText, setSuggestedText] = useState('');
    const [isSelection, setIsSelection] = useState(false);
    const [showDiff, setShowDiff] = useState(false);
    const [hasApiKey, setHasApiKey] = useState(false);

    useEffect(() => {
        const checkConfig = async () => {
            const settings = await getAISettings();
            if (settings.success && settings.availableProviders?.gemini) {
                setHasApiKey(true);
            } else {
                setHasApiKey(false);
            }
        };
        checkConfig();
    }, [getAISettings]);

    if (!editor || (block.type !== 'CHAPTER' && block.type !== 'CONTENT')) {
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

    return (
        <div className="ai-assistant-panel">
            <h3 className="ai-panel-title">🪄 Assistente de Escrita IA</h3>
            
            {!hasApiKey && (
                <div style={{ background: '#f43f5e1c', color: '#f43f5e', border: '1px solid #f43f5e3b', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '11px', marginBottom: '16px', lineHeight: 1.4 }}>
                    ⚠️ Chave API do Gemini não configurada no servidor. Configure o arquivo `.env` para usar a IA.
                </div>
            )}

            {!showDiff ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Selecione um trecho de texto no editor ao lado ou deixe em branco para atuar em todo o bloco.
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
        </div>
    );
}
