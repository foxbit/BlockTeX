import { useState } from 'react';
import { BLOCK_TYPE_META, BLOCK_TYPES, PAPER_SIZES, LATEX_FONTS, LATEX_ENGINES } from '../lib/blockTypes.js';

// ─── Toggle ──────────────────────────────────────────────────
function Toggle({ value, onChange }) {
    return (
        <div className={`toggle ${value ? 'on' : ''}`} onClick={() => onChange(!value)} />
    );
}

// ─── Global Settings Tab ─────────────────────────────────────
function GlobalTab({ project, onUpdateMetadata, onUpdateSetup }) {
    const { metadata, global_setup } = project;

    return (
        <div>
            <div className="inspector-section">
                <div className="inspector-section-title">Metadados</div>
                <div className="form-group">
                    <label className="form-label">Título do Livro</label>
                    <input
                        className="form-input"
                        value={metadata.title || ''}
                        onChange={e => onUpdateMetadata({ title: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Autor</label>
                    <input
                        className="form-input"
                        value={metadata.author || ''}
                        onChange={e => onUpdateMetadata({ author: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Data (ex: \today ou 2024)</label>
                    <input
                        className="form-input"
                        value={metadata.date || '\\today'}
                        onChange={e => onUpdateMetadata({ date: e.target.value })}
                    />
                </div>
            </div>

            <div className="divider" />

            <div className="inspector-section">
                <div className="inspector-section-title">Formato Físico</div>
                <div className="form-group">
                    <label className="form-label">Tamanho do Papel</label>
                    <select
                        className="form-select"
                        value={global_setup.paper || 'a5'}
                        onChange={e => onUpdateSetup({ paper: e.target.value })}
                    >
                        {PAPER_SIZES.map(p => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                    </select>
                </div>

                {global_setup.paper === 'custom' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div className="form-group">
                            <label className="form-label">Largura</label>
                            <input
                                className="form-input"
                                placeholder="148mm"
                                value={global_setup.customWidth || ''}
                                onChange={e => onUpdateSetup({ customWidth: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Altura</label>
                            <input
                                className="form-input"
                                placeholder="210mm"
                                value={global_setup.customHeight || ''}
                                onChange={e => onUpdateSetup({ customHeight: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                <div className="form-group">
                    <label className="form-label">Tamanho Base da Fonte</label>
                    <select
                        className="form-select"
                        value={global_setup.baseSize || '11pt'}
                        onChange={e => onUpdateSetup({ baseSize: e.target.value })}
                    >
                        <option value="10pt">10pt</option>
                        <option value="11pt">11pt</option>
                        <option value="12pt">12pt</option>
                    </select>
                </div>

                <div className="toggle-group">
                    <span className="toggle-label">📖 Páginas Espelhadas (twoside)</span>
                    <Toggle
                        value={global_setup.mirror}
                        onChange={v => onUpdateSetup({ mirror: v })}
                    />
                </div>

                <div className="toggle-group">
                    <span className="toggle-label">✂️ Sangria de 3mm (bleed)</span>
                    <Toggle
                        value={global_setup.bleed}
                        onChange={v => onUpdateSetup({ bleed: v })}
                    />
                </div>
            </div>

            <div className="divider" />

            <div className="inspector-section">
                <div className="inspector-section-title">Margens</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[
                        { key: 'innerMargin', label: 'Medianiz (interna)' },
                        { key: 'outerMargin', label: 'Externa' },
                        { key: 'topMargin', label: 'Superior' },
                        { key: 'bottomMargin', label: 'Inferior' },
                    ].map(({ key, label }) => (
                        <div className="form-group" key={key}>
                            <label className="form-label">{label}</label>
                            <input
                                className="form-input"
                                value={global_setup[key] || '20mm'}
                                onChange={e => onUpdateSetup({ [key]: e.target.value })}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="divider" />

            <div className="inspector-section">
                <div className="inspector-section-title">Cabeçalhos</div>
                <div className="form-group">
                    <label className="form-label">{global_setup.mirror ? 'Página Par (Esquerda)' : 'Todas as Páginas'}</label>
                    <select
                        className="form-select"
                        value={global_setup.headerStyleEven || 'chapter'}
                        onChange={e => onUpdateSetup({ headerStyleEven: e.target.value })}
                    >
                        <option value="none">Nenhum</option>
                        <option value="title">Título do Livro</option>
                        <option value="author">Nome do Autor</option>
                        <option value="chapter">Capítulo Atual</option>
                        <option value="custom">Texto Personalizado...</option>
                    </select>
                </div>
                {global_setup.headerStyleEven === 'custom' && (
                    <div className="form-group">
                        <input
                            className="form-input"
                            placeholder="Seu texto aqui..."
                            value={global_setup.headerCustomEven || ''}
                            onChange={e => onUpdateSetup({ headerCustomEven: e.target.value })}
                        />
                    </div>
                )}

                {global_setup.mirror && (
                    <>
                        <div className="form-group" style={{ marginTop: '12px' }}>
                            <label className="form-label">Página Ímpar (Direita)</label>
                            <select
                                className="form-select"
                                value={global_setup.headerStyleOdd || 'chapter'}
                                onChange={e => onUpdateSetup({ headerStyleOdd: e.target.value })}
                            >
                                <option value="none">Nenhum</option>
                                <option value="title">Título do Livro</option>
                                <option value="author">Nome do Autor</option>
                                <option value="chapter">Capítulo Atual</option>
                                <option value="custom">Texto Personalizado...</option>
                            </select>
                        </div>
                        {global_setup.headerStyleOdd === 'custom' && (
                            <div className="form-group">
                                <input
                                    className="form-input"
                                    placeholder="Seu texto aqui..."
                                    value={global_setup.headerCustomOdd || ''}
                                    onChange={e => onUpdateSetup({ headerCustomOdd: e.target.value })}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="divider" />

            <div className="inspector-section">
                <div className="inspector-section-title">Tipografia & Motor</div>
                <div className="form-group">
                    <label className="form-label">Motor LaTeX</label>
                    <select
                        className="form-select"
                        value={global_setup.engine || 'pdflatex'}
                        onChange={e => onUpdateSetup({ engine: e.target.value })}
                    >
                        {LATEX_ENGINES.map(e => (
                            <option key={e.value} value={e.value}>{e.label}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Família Tipográfica</label>
                    <select
                        className="form-select"
                        value={global_setup.font || 'default'}
                        onChange={e => onUpdateSetup({ font: e.target.value })}
                    >
                        {LATEX_FONTS.map(f => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
}

// ─── Block Properties Tab ────────────────────────────────────
function BlockTab({ block, onUpdateConfig, onUpdateStyleVars }) {
    if (!block) {
        return (
            <div className="inspector-empty">
                <div>🔍</div>
                <div>Selecione um bloco no canvas para ver suas propriedades</div>
            </div>
        );
    }

    const meta = BLOCK_TYPE_META[block.type] || {};
    const { config = {}, style_variables = {} } = block;

    return (
        <div>
            {/* Block type info */}
            <div className="inspector-section">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <div
                        className={`block-item-icon ${meta.iconClass}`}
                        style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}
                    >
                        {meta.icon}
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{meta.label}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)' }}>{block.id.substring(0, 12)}…</div>
                    </div>
                </div>
            </div>

            <div className="divider" />

            <div className="inspector-section">
                <div className="inspector-section-title">Paginação</div>
                <div className="form-group">
                    <label className="form-label">Quebra de Página</label>
                    <select
                        className="form-select"
                        value={config.page_break || 'none'}
                        onChange={e => onUpdateConfig({ page_break: e.target.value })}
                    >
                        <option value="none">Nenhuma (fluxo normal)</option>
                        <option value="before">Quebra antes do bloco</option>
                        <option value="isolated">Página isolada (sempre ímpar)</option>
                    </select>
                </div>

                <div className="toggle-group">
                    <span className="toggle-label">Visível no Índice (TOC)</span>
                    <div
                        className={`toggle ${config.toc_visible !== false ? 'on' : ''}`}
                        onClick={() => onUpdateConfig({ toc_visible: config.toc_visible === false ? true : false })}
                    />
                </div>
            </div>

            <div className="divider" />

            {/* Type-specific options */}
            {block.type === BLOCK_TYPES.CONTENT || block.type === BLOCK_TYPES.CHAPTER ? (
                <div className="inspector-section">
                    <div className="inspector-section-title">Captura no Índice</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-primary)', opacity: 0.6, cursor: 'not-allowed' }}>
                            <input type="checkbox" checked={true} disabled style={{ accentColor: 'var(--accent-indigo)' }} />
                            H1 (Título do capítulo)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={config.toc_headers?.h2 ?? true}
                                onChange={e => onUpdateConfig({ toc_headers: { ...(config.toc_headers || { h1: true, h2: true, h3: false }), h2: e.target.checked } })}
                                style={{ accentColor: 'var(--accent-indigo)', cursor: 'pointer' }}
                            />
                            H2 (Subtítulo do capítulo)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={config.toc_headers?.h3 ?? false}
                                onChange={e => onUpdateConfig({ toc_headers: { ...(config.toc_headers || { h1: true, h2: true, h3: false }), h3: e.target.checked } })}
                                style={{ accentColor: 'var(--accent-indigo)', cursor: 'pointer' }}
                            />
                            H3 (Título de parágrafo)
                        </label>
                    </div>
                </div>
            ) : null}

            {block.type === BLOCK_TYPES.QUOTE && (
                <div className="inspector-section">
                    <div className="inspector-section-title">Estilo da Citação</div>
                    <div className="form-group">
                        <label className="form-label">Cor de Destaque</label>
                        <div className="color-row">
                            <input
                                type="color"
                                value={style_variables.color || '#6366f1'}
                                onChange={e => onUpdateStyleVars({ color: e.target.value })}
                                style={{ width: '32px', height: '32px', border: 'none', background: 'none', cursor: 'pointer' }}
                            />
                            <input
                                className="form-input"
                                value={style_variables.color || '#6366f1'}
                                onChange={e => onUpdateStyleVars({ color: e.target.value })}
                                style={{ flex: 1 }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {block.type === BLOCK_TYPES.IMAGE && (
                <div className="inspector-section">
                    <div className="inspector-section-title">Configurações da Imagem</div>
                    <div className="form-group">
                        <label className="form-label">Legenda</label>
                        <input
                            className="form-input"
                            value={style_variables.caption || ''}
                            onChange={e => onUpdateStyleVars({ caption: e.target.value })}
                            placeholder="Legenda da figura..."
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Largura (fração da página)</label>
                        <input
                            className="form-input"
                            type="number"
                            min="0.1"
                            max="1.0"
                            step="0.05"
                            value={style_variables.width || '0.8'}
                            onChange={e => onUpdateStyleVars({ width: e.target.value })}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── LaTeX Preview Tab ───────────────────────────────────────
function LatexTab({ texContent }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(texContent || '').then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div className="inspector-section-title">Código LaTeX Gerado</div>
                <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={handleCopy}>
                    {copied ? '✓ Copiado' : '📋 Copiar'}
                </button>
            </div>
            <pre style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px',
                overflow: 'auto',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--text-secondary)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                maxHeight: '400px',
                lineHeight: 1.5,
            }}>
                {texContent || '(Sem conteúdo gerado ainda)'}
            </pre>
        </div>
    );
}

// ─── Main Inspector ──────────────────────────────────────────
export function Inspector({
    project,
    selectedBlock,
    texContent,
    onUpdateMetadata,
    onUpdateSetup,
    onUpdateConfig,
    onUpdateStyleVars,
}) {
    const [tab, setTab] = useState('global');

    const tabs = [
        { id: 'global', label: 'Documento' },
        { id: 'block', label: 'Bloco' },
        { id: 'latex', label: 'LaTeX' },
    ];

    return (
        <aside className="inspector">
            <div className="inspector-tabs">
                {tabs.map(t => (
                    <div
                        key={t.id}
                        className={`inspector-tab ${tab === t.id ? 'active' : ''}`}
                        onClick={() => setTab(t.id)}
                    >
                        {t.label}
                    </div>
                ))}
            </div>

            <div className="inspector-content">
                {tab === 'global' && (
                    <GlobalTab
                        project={project}
                        onUpdateMetadata={onUpdateMetadata}
                        onUpdateSetup={onUpdateSetup}
                    />
                )}
                {tab === 'block' && (
                    <BlockTab
                        block={selectedBlock}
                        onUpdateConfig={onUpdateConfig}
                        onUpdateStyleVars={onUpdateStyleVars}
                    />
                )}
                {tab === 'latex' && (
                    <LatexTab texContent={texContent} />
                )}
            </div>
        </aside>
    );
}
