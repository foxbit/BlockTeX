import { useState } from 'react';

export function NewProjectModal({ onConfirm, onCancel }) {
    const [title, setTitle] = useState('Meu Livro');
    const [author, setAuthor] = useState('');
    const [paper, setPaper] = useState('a5');
    const [mirror, setMirror] = useState(true);

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm({ title, author, paper, mirror });
    };

    return (
        <div className="modal-overlay">
            <form className="modal" onSubmit={handleSubmit}>
                <div className="modal-header">
                    <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-violet))',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                    }}>
                        📚
                    </div>
                    <h2 className="modal-title">Novo Projeto</h2>
                    <button type="button" className="btn btn-ghost btn-icon" onClick={onCancel}>✕</button>
                </div>

                <div className="modal-body">
                    <div className="form-group">
                        <label className="form-label">Título do Livro *</label>
                        <input
                            className="form-input"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Ex: Introdução ao LaTeX"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Autor</label>
                        <input
                            className="form-input"
                            value={author}
                            onChange={e => setAuthor(e.target.value)}
                            placeholder="Seu nome"
                        />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="form-group">
                            <label className="form-label">Formato</label>
                            <select className="form-select" value={paper} onChange={e => setPaper(e.target.value)}>
                                <option value="a4">A4</option>
                                <option value="a5">A5</option>
                                <option value="16x23">16×23cm</option>
                                <option value="letter">US Letter</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Páginas espelhadas</label>
                            <div
                                className={`toggle ${mirror ? 'on' : ''}`}
                                style={{ marginTop: '6px' }}
                                onClick={() => setMirror(m => !m)}
                            />
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
                    <button type="submit" className="btn btn-primary">Criar Projeto →</button>
                </div>
            </form>
        </div>
    );
}

export function SaveModal({ projectTitle, onConfirm, onCancel }) {
    const [filename, setFilename] = useState(
        projectTitle?.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'meu_livro'
    );

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: '400px' }}>
                <div className="modal-header">
                    <h2 className="modal-title">💾 Salvar Projeto</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onCancel}>✕</button>
                </div>
                <div className="modal-body">
                    <div className="form-group">
                        <label className="form-label">Nome do arquivo (.btx)</label>
                        <input
                            className="form-input"
                            value={filename}
                            onChange={e => setFilename(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '_'))}
                        />
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                        Será salvo em: ~/BlockTeX_Projects/{filename}.btx
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
                    <button className="btn btn-primary" onClick={() => onConfirm(filename)}>💾 Salvar</button>
                </div>
            </div>
        </div>
    );
}

export function ExportTexModal({ texContent, onClose }) {
    const blob = new Blob([texContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h2 className="modal-title">📄 Exportar .tex</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    <pre style={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '12px',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-secondary)',
                        maxHeight: '300px',
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap',
                    }}>
                        {texContent}
                    </pre>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            navigator.clipboard.writeText(texContent);
                        }}
                    >
                        📋 Copiar
                    </button>
                    <a className="btn btn-primary" href={url} download="documento.tex">
                        ⬇ Baixar .tex
                    </a>
                </div>
            </div>
        </div>
    );
}
