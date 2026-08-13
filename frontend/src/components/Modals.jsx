import { useState, useEffect } from 'react';
import { PAPER_SIZES, LATEX_ENGINES, DOCUMENT_THEMES, getFontCssFamily } from '../lib/blockTypes.js';

function Toggle({ value, onChange }) {
    return <div className={`toggle ${value ? 'on' : ''}`} onClick={() => onChange(!value)} />;
}

export function NewProjectModal({ onConfirm, onCancel }) {
    const [tab, setTab] = useState('documento');

    // Aba Documento
    const [title, setTitle]       = useState('Meu Livro');
    const [author, setAuthor]     = useState('');
    const [date, setDate]         = useState('\\today');
    const [paper, setPaper]       = useState('a5');
    const [baseSize, setBaseSize] = useState('11pt');
    const [mirror, setMirror]     = useState(true);
    const [bleed, setBleed]       = useState(false);

    // Aba Margens
    const [innerMargin,  setInnerMargin]  = useState('25mm');
    const [outerMargin,  setOuterMargin]  = useState('20mm');
    const [topMargin,    setTopMargin]    = useState('25mm');
    const [bottomMargin, setBottomMargin] = useState('20mm');

    // Aba Estilo
    const [theme,  setTheme]  = useState('default');
    const [engine, setEngine] = useState('pdflatex');

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm({
            title, author, date, paper, baseSize, mirror, bleed,
            innerMargin, outerMargin, topMargin, bottomMargin,
            theme, engine,
        });
    };

    const TABS = [
        { id: 'documento', label: '📋 Documento' },
        { id: 'margens',   label: '📐 Margens'   },
        { id: 'estilo',    label: '🎨 Estilo'     },
    ];

    const selectedTheme = DOCUMENT_THEMES.find(t => t.value === theme);

    return (
        <div className="modal-overlay">
            <form className="modal" onSubmit={handleSubmit} style={{ maxWidth: '580px' }}>
                {/* Header */}
                <div className="modal-header">
                    <div style={{
                        width: '40px', height: '40px', flexShrink: 0,
                        background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-violet))',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                    }}>📚</div>
                    <h2 className="modal-title">Novo Projeto</h2>
                    <button type="button" className="btn btn-ghost btn-icon" onClick={onCancel}>✕</button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', margin: '-4px -28px 20px' }}>
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setTab(t.id)}
                            style={{
                                flex: 1, padding: '10px 8px', fontSize: '12px', fontWeight: 500,
                                border: 'none', background: 'transparent', cursor: 'pointer',
                                borderBottom: tab === t.id ? '2px solid var(--accent-indigo)' : '2px solid transparent',
                                color: tab === t.id ? 'var(--accent-indigo)' : 'var(--text-muted)',
                                transition: 'all 0.15s',
                            }}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="modal-body" style={{ minHeight: '220px' }}>

                    {/* ── Documento ── */}
                    {tab === 'documento' && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Título do Livro *</label>
                                    <input
                                        className="form-input"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder="Ex: Introdução ao LaTeX"
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Autor</label>
                                    <input className="form-input" value={author} onChange={e => setAuthor(e.target.value)} placeholder="Seu nome" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Data</label>
                                    <input className="form-input" value={date} onChange={e => setDate(e.target.value)} placeholder="\today" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tamanho do Papel</label>
                                    <select className="form-select" value={paper} onChange={e => setPaper(e.target.value)}>
                                        {PAPER_SIZES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tamanho Base da Fonte</label>
                                    <select className="form-select" value={baseSize} onChange={e => setBaseSize(e.target.value)}>
                                        <option value="10pt">10pt — Compacto</option>
                                        <option value="11pt">11pt — Padrão</option>
                                        <option value="12pt">12pt — Confortável</option>
                                    </select>
                                </div>
                            </div>
                            <div className="toggle-group" style={{ marginTop: '8px' }}>
                                <span className="toggle-label">📖 Páginas Espelhadas (twoside)</span>
                                <Toggle value={mirror} onChange={setMirror} />
                            </div>
                            <div className="toggle-group">
                                <span className="toggle-label">✂️ Sangria de 3mm (bleed)</span>
                                <Toggle value={bleed} onChange={setBleed} />
                            </div>
                        </>
                    )}

                    {/* ── Margens ── */}
                    {tab === 'margens' && (
                        <>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 0, marginBottom: '16px' }}>
                                Defina as margens do documento. Use unidades LaTeX: <code style={{ fontFamily: 'var(--font-mono)' }}>mm</code>, <code style={{ fontFamily: 'var(--font-mono)' }}>cm</code> ou <code style={{ fontFamily: 'var(--font-mono)' }}>in</code>.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                {[
                                    { label: 'Medianiz (interna)', value: innerMargin, set: setInnerMargin, ph: '25mm' },
                                    { label: 'Externa',            value: outerMargin, set: setOuterMargin, ph: '20mm' },
                                    { label: 'Superior',           value: topMargin,   set: setTopMargin,   ph: '25mm' },
                                    { label: 'Inferior',           value: bottomMargin,set: setBottomMargin,ph: '20mm' },
                                ].map(({ label, value, set, ph }) => (
                                    <div className="form-group" key={label}>
                                        <label className="form-label">{label}</label>
                                        <input className="form-input" value={value} onChange={e => set(e.target.value)} placeholder={ph} />
                                    </div>
                                ))}
                            </div>
                            <div style={{
                                marginTop: '12px', padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                                background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
                                fontSize: '11px', color: 'var(--text-muted)',
                            }}>
                                💡 Com páginas espelhadas ativadas, "Medianiz" é a margem interna (lombada) e "Externa" é a borda exterior do livro.
                            </div>
                        </>
                    )}

                    {/* ── Estilo ── */}
                    {tab === 'estilo' && (
                        <>
                            <div className="form-group">
                                <label className="form-label">Estilo Visual / Tema</label>
                                <select className="form-select" value={theme} onChange={e => setTheme(e.target.value)}>
                                    {DOCUMENT_THEMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                                {selectedTheme && (
                                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{
                                            fontSize: '10px', fontFamily: 'var(--font-mono)',
                                            background: 'var(--bg-secondary)', color: 'var(--accent-indigo)',
                                            border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '2px 6px',
                                        }}>{selectedTheme.font}</span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{selectedTheme.description}</span>
                                    </div>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Motor LaTeX</label>
                                <select className="form-select" value={engine} onChange={e => setEngine(e.target.value)}>
                                    {LATEX_ENGINES.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                                </select>
                            </div>

                            <div style={{
                                marginTop: '16px',
                                padding: '16px',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--bg-primary)',
                                fontFamily: getFontCssFamily('default', theme),
                                transition: 'font-family 0.3s ease',
                            }}>
                                <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
                                    A tipografia é a voz do seu texto.
                                </div>
                                <div style={{ fontSize: '14px', opacity: 0.8, lineHeight: 1.5 }}>
                                    Esta é uma pré-visualização aproximada da fonte selecionada. A renderização final no PDF (gerada pelo LaTeX) será mais precisa e elegante, com kerning e hifenização profissionais.
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
                    <button type="submit" className="btn btn-primary">Criar Projeto →</button>
                </div>
            </form>
        </div>
    );
}


export function ExportTexModal({ texContent, onClose }) {
    const [url, setUrl] = useState('');

    useEffect(() => {
        const blob = new Blob([texContent], { type: 'text/plain' });
        const objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [texContent]);

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

export function SettingsModal({ getAISettings, saveAISettings, onClose }) {
    const [provider, setProvider] = useState('opencode');
    const [model, setModel] = useState('deepseek-v4-pro');
    const [availableProviders, setAvailableProviders] = useState({ opencode: false });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            setLoading(true);
            const res = await getAISettings();
            if (res.success) {
                setProvider(res.provider || 'opencode');
                setModel(res.model || 'deepseek-v4-pro');
                setAvailableProviders(res.availableProviders || { opencode: false });
            }
            setLoading(false);
        };
        loadSettings();
    }, [getAISettings]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        const res = await saveAISettings({ provider, model });
        setSaving(false);
        if (res.success) {
            alert('Configurações salvas com sucesso!');
            onClose();
        } else {
            alert('Erro ao salvar configurações: ' + res.error);
        }
    };

    return (
        <div className="modal-overlay">
            <form className="modal" onSubmit={handleSubmit} style={{ maxWidth: '480px' }}>
                <div className="modal-header">
                    <div style={{
                        width: '40px', height: '40px', flexShrink: 0,
                        background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-violet))',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                    }}>⚙️</div>
                    <h2 className="modal-title">Configurações do Sistema</h2>
                    <button type="button" className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
                </div>

                <div className="modal-body" style={{ minHeight: '180px' }}>
                    {loading ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Carregando configurações...
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="form-group">
                                <label className="form-label">Provedor de IA</label>
                                <select 
                                    className="form-input" 
                                    value={provider} 
                                    onChange={e => setProvider(e.target.value)}
                                >
                                    <option value="opencode">OpenCode Gateway</option>
                                </select>
                                {!availableProviders.opencode && (
                                    <div style={{ color: 'var(--accent-rose)', fontSize: '11px', marginTop: '6px', fontWeight: 500 }}>
                                        ⚠️ A chave OPENCODE_API_KEY não foi detectada no arquivo .env do servidor. O assistente não funcionará até que ela seja configurada.
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Modelo de IA</label>
                                <select 
                                    className="form-input" 
                                    value={model} 
                                    onChange={e => setModel(e.target.value)}
                                >
                                    <option value="deepseek-v4-pro">DeepSeek V4 Pro</option>
                                    <option value="deepseek-v4-flash">DeepSeek V4 Flash</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
                    <button type="submit" className="btn btn-primary" disabled={loading || saving}>
                        {saving ? 'Salvando...' : 'Salvar Configurações'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export function ConfirmDeleteModal({ onConfirm, onCancel, title = "Excluir Bloco", message = "Tem certeza de que deseja excluir este bloco? Esta ação não pode ser desfeita." }) {
    return (
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: '400px' }}>
                <div className="modal-header">
                    <h2 className="modal-title" style={{ color: 'var(--accent-rose)' }}>⚠️ {title}</h2>
                    <button type="button" className="close-btn" onClick={onCancel} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '18px' }}>✕</button>
                </div>
                <div className="modal-body">
                    <p style={{ color: 'var(--text-main)', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
                        {message}
                    </p>
                </div>
                <div className="modal-footer" style={{ gap: '10px' }}>
                    <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
                    <button type="button" className="btn btn-danger" onClick={onConfirm}>Excluir</button>
                </div>
            </div>
        </div>
    );
}
