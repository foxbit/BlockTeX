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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div className="form-group">
                            <label className="form-label">Nível de (H)</label>
                            <select
                                className="form-select"
                                value={config.toc_scan?.from || 1}
                                onChange={e => onUpdateConfig({ toc_scan: { ...config.toc_scan, from: parseInt(e.target.value) } })}
                            >
                                <option value={1}>H1 (capítulo)</option>
                                <option value={2}>H2 (seção)</option>
                                <option value={3}>H3 (subseção)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Até (H)</label>
                            <select
                                className="form-select"
                                value={config.toc_scan?.to || 2}
                                onChange={e => onUpdateConfig({ toc_scan: { ...config.toc_scan, to: parseInt(e.target.value) } })}
                            >
                                <option value={1}>H1</option>
                                <option value={2}>H2</option>
                                <option value={3}>H3</option>
                                <option value={4}>H4</option>
                            </select>
                        </div>
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
