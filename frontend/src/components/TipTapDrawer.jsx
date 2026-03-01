import { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';

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
            const markdownOutput = editor.storage.markdown.getMarkdown();
            setContent(markdownOutput);
            setHasUnsavedChanges(true);
        },
    });

    // Re-inject content when switching blocks if the editor instance survived
    useEffect(() => {
        if (editor && block && open) {
            const currentMarkdown = editor.storage.markdown.getMarkdown();
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

                <div className="drawer-body">
                    <EditorContent editor={editor} className="tiptap-editor-area" />
                </div>
            </div>
        </>
    );
}
