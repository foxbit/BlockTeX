import { useState, useMemo } from 'react';
import { BLOCK_TYPE_META, BLOCK_TYPES, PAPER_SIZES, LATEX_ENGINES, DOCUMENT_THEMES, getFontCssFamily } from '../lib/blockTypes.js';
import { HistoryTab } from './HistoryTab.jsx';

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
                <div className="inspector-section-title">Cabeçalhos e Rodapés</div>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                    <div className="form-group">
                        <label className="form-label">Fonte Cab. (pt)</label>
                        <input
                            type="number"
                            className="form-input"
                            min="6"
                            max="14"
                            step="0.5"
                            value={global_setup.headerFontSize ?? 9}
                            onChange={e => onUpdateSetup({ headerFontSize: parseFloat(e.target.value) || 9 })}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Fonte Rod. (pt)</label>
                        <input
                            type="number"
                            className="form-input"
                            min="6"
                            max="14"
                            step="0.5"
                            value={global_setup.footerFontSize ?? 9}
                            onChange={e => onUpdateSetup({ footerFontSize: parseFloat(e.target.value) || 9 })}
                        />
                    </div>
                </div>
            </div>

            <div className="divider" />

            <div className="inspector-section">
                <div className="inspector-section-title">Tema do Documento</div>
                <div className="form-group">
                    <label className="form-label">Estilo Visual</label>
                    <select
                        className="form-select"
                        value={global_setup.theme || 'default'}
                        onChange={e => {
                            onUpdateSetup({ theme: e.target.value });
                        }}
                    >
                        {DOCUMENT_THEMES.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </div>
                {(() => {
                    const selected = DOCUMENT_THEMES.find(t => t.value === (global_setup.theme || 'default'));
                    return selected ? (
                        <div style={{ marginTop: '6px' }}>
                            <span style={{
                                display: 'inline-block',
                                fontSize: '10px',
                                fontFamily: 'var(--font-mono)',
                                background: 'var(--bg-tertiary)',
                                color: 'var(--accent-indigo)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                marginBottom: '6px',
                            }}>
                                {selected.font}
                            </span>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                                {selected.description}
                            </p>
                        </div>
                    ) : null;
                })()}
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

                <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-elevated)',
                    fontFamily: getFontCssFamily('default', global_setup.theme || 'default'),
                    transition: 'font-family 0.3s ease',
                }}>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '6px' }}>
                        A tipografia é a voz do seu texto.
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.8, lineHeight: 1.5 }}>
                        Esta é uma pré-visualização web da fonte. A renderização final no PDF terá ajustes precisos.
                    </div>
                </div>
            </div>

            <div className="divider" />

            <div className="inspector-section">
                <div className="inspector-section-title">Tipografia do Corpo</div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '-4px 0 14px', lineHeight: 1.5 }}>
                    Aplicado apenas nos blocos <strong style={{ color: 'var(--text-primary)' }}>Capítulo</strong> e <strong style={{ color: 'var(--text-primary)' }}>Texto</strong>.<br />
                    Capa, índice e blocos especiais usam estilo próprio.
                </p>

                {/* Justificação */}
                <div className="form-group">
                    <label className="form-label">Justificação do texto</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '5px' }}>
                        {[
                            { value: 'justified', label: '≡ Just.',  title: 'Justificado (padrão livro)' },
                            { value: 'raggedright', label: '← Esq.', title: 'Alinhado à esquerda' },
                            { value: 'raggedleft',  label: '→ Dir.', title: 'Alinhado à direita' },
                            { value: 'centering',   label: '= Cen.', title: 'Centralizado' },
                        ].map(opt => {
                            const isActive = (global_setup.bodyJustify || 'justified') === opt.value;
                            return (
                                <button key={opt.value} title={opt.title}
                                    onClick={() => onUpdateSetup({ bodyJustify: opt.value })}
                                    style={{
                                        padding: '7px 4px', fontSize: '10px', textAlign: 'center',
                                        border: '1px solid', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                        background: isActive ? 'var(--accent-indigo)' : 'var(--bg-elevated)',
                                        borderColor: isActive ? 'var(--accent-indigo)' : 'var(--border-subtle)',
                                        color: isActive ? 'white' : 'var(--text-secondary)',
                                        transition: 'all 0.15s',
                                    }}>{opt.label}</button>
                            );
                        })}
                    </div>
                </div>

                {/* Entrelinhas */}
                <div className="form-group">
                    <label className="form-label">Espaçamento entrelinhas</label>
                    <select
                        className="form-select"
                        value={
                            global_setup.bodyLinespread == null ? '__theme__' :
                            ['1.0','1.15','1.25','1.5','2.0'].includes(global_setup.bodyLinespread)
                                ? global_setup.bodyLinespread : '__custom__'
                        }
                        onChange={e => {
                            if (e.target.value === '__theme__') onUpdateSetup({ bodyLinespread: null });
                            else if (e.target.value === '__custom__') onUpdateSetup({ bodyLinespread: '1.3' });
                            else onUpdateSetup({ bodyLinespread: e.target.value });
                        }}
                    >
                        <option value="__theme__">Herdado do tema visual</option>
                        <option value="1.0">1.0 — Simples</option>
                        <option value="1.15">1.15 — Compacto</option>
                        <option value="1.25">1.25 — Confortável</option>
                        <option value="1.5">1.5 — Amplo</option>
                        <option value="2.0">2.0 — Duplo</option>
                        <option value="__custom__">Personalizado…</option>
                    </select>
                    {global_setup.bodyLinespread != null &&
                     !['1.0','1.15','1.25','1.5','2.0'].includes(global_setup.bodyLinespread) && (
                        <input
                            className="form-input"
                            style={{ marginTop: '6px' }}
                            value={global_setup.bodyLinespread || ''}
                            onChange={e => onUpdateSetup({ bodyLinespread: e.target.value })}
                            placeholder="ex: 1.3"
                        />
                    )}
                </div>

                {/* Recuo e Espaço entre parágrafos */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div className="form-group">
                        <label className="form-label">Recuo de ¶</label>
                        <input
                            className="form-input"
                            value={global_setup.parindent ?? '0pt'}
                            onChange={e => onUpdateSetup({ parindent: e.target.value })}
                            placeholder="0pt"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Espaço entre ¶</label>
                        <input
                            className="form-input"
                            value={global_setup.parskip ?? '8pt'}
                            onChange={e => onUpdateSetup({ parskip: e.target.value })}
                            placeholder="8pt"
                        />
                    </div>
                </div>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '-8px 0 12px', lineHeight: 1.5 }}>
                    Use unidades LaTeX: <code style={{ background: 'var(--bg-tertiary)', padding: '1px 4px', borderRadius: '3px' }}>pt</code>, <code style={{ background: 'var(--bg-tertiary)', padding: '1px 4px', borderRadius: '3px' }}>mm</code>, <code style={{ background: 'var(--bg-tertiary)', padding: '1px 4px', borderRadius: '3px' }}>em</code>
                </p>

                <div className="divider" style={{ margin: '12px 0' }} />
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                    Controle Avançado
                </div>

                {/* Hifenização */}
                <div className="toggle-group">
                    <span className="toggle-label">✂️ Hifenização automática</span>
                    <Toggle
                        value={global_setup.hyphenation !== false}
                        onChange={v => onUpdateSetup({ hyphenation: v })}
                    />
                </div>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '-4px 0 12px', lineHeight: 1.5 }}>
                    {global_setup.hyphenation !== false
                        ? 'LaTeX quebra palavras longas normalmente.'
                        : 'Desativada — espaçamento pode ficar irregular.'}
                </p>

                {/* Viúvos e Órfãos */}
                <div className="form-group">
                    <label className="form-label">Viúvos & Órfãos</label>
                    <select
                        className="form-select"
                        value={global_setup.orphanWidow || 'moderate'}
                        onChange={e => onUpdateSetup({ orphanWidow: e.target.value })}
                    >
                        <option value="light">Leve — permite viúvos/órfãos</option>
                        <option value="moderate">Moderado — evita quando possível</option>
                        <option value="strict">Estrito — proíbe completamente</option>
                    </select>
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.5 }}>
                        Viúvo: última linha de ¶ no topo da página. Órfão: primeira linha no rodapé.
                    </p>
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

            {block.type === BLOCK_TYPES.TOC && (
                <div className="inspector-section">
                    <div className="inspector-section-title">Configurações do Índice</div>

                    <div className="toggle-group">
                        <span className="toggle-label">🔗 Itens com link (clicáveis)</span>
                        <Toggle
                            value={!!style_variables.tocLinks}
                            onChange={v => onUpdateStyleVars({ tocLinks: v })}
                        />
                    </div>
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '-4px 0 12px', lineHeight: 1.5 }}>
                        {style_variables.tocLinks
                            ? 'Os itens do índice serão links para a seção correspondente.'
                            : 'Itens do índice sem link (padrão).'}
                    </p>

                    <div className="form-group">
                        <label className="form-label">Preenchimento entre texto e número</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px' }}>
                            {[
                                { value: 'empty', label: 'Vazio', preview: '——' },
                                { value: 'dots',  label: 'Pontos', preview: '......' },
                                { value: 'line',  label: 'Linha', preview: '______' },
                            ].map(opt => {
                                const isActive = (style_variables.tocFill || 'empty') === opt.value;
                                return (
                                    <button key={opt.value}
                                        onClick={() => onUpdateStyleVars({ tocFill: opt.value })}
                                        style={{
                                            padding: '7px 4px', fontSize: '10px', textAlign: 'center',
                                            border: '1px solid', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                            background: isActive ? 'var(--accent-indigo)' : 'var(--bg-elevated)',
                                            borderColor: isActive ? 'var(--accent-indigo)' : 'var(--border-subtle)',
                                            color: isActive ? 'white' : 'var(--text-secondary)',
                                            transition: 'all 0.15s',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                                        }}>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', opacity: 0.7 }}>{opt.preview}</span>
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {block.type === BLOCK_TYPES.SEPARATOR && (
                <div className="inspector-section">
                    <div className="inspector-section-title">Separador</div>
                    <label style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer',
                        padding: '10px', borderRadius: 'var(--radius-sm)',
                        background: style_variables.pageBreak ? 'rgba(99,102,241,0.08)' : 'transparent',
                        border: '1px solid',
                        borderColor: style_variables.pageBreak ? 'var(--accent-indigo)' : 'var(--border-subtle)',
                        transition: 'all 0.15s',
                    }}>
                        <input
                            type="checkbox"
                            checked={!!style_variables.pageBreak}
                            onChange={e => onUpdateStyleVars({ pageBreak: e.target.checked })}
                            style={{ accentColor: 'var(--accent-indigo)', width: '15px', height: '15px', cursor: 'pointer' }}
                        />
                        <div>
                            <div style={{ fontWeight: 600, marginBottom: '2px' }}>Quebra de página</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                                O próximo bloco inicia em uma nova página. O separador visual (linha) não será exibido.
                            </div>
                        </div>
                    </label>
                </div>
            )}

            {block.type === BLOCK_TYPES.CHAPTER ? (
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

            {block.type === BLOCK_TYPES.TESTIMONIAL && (
                <div className="inspector-section">
                    <div className="inspector-section-title">Dados do Depoimento</div>

                    <div className="form-group">
                        <label className="form-label">Nome da Pessoa</label>
                        <input
                            className="form-input"
                            value={style_variables.personName || ''}
                            onChange={e => onUpdateStyleVars({ personName: e.target.value })}
                            placeholder="Ex: Maria"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Citação / Frase Fixa (Negrito)</label>
                        <input
                            className="form-input"
                            value={style_variables.quote || ''}
                            onChange={e => onUpdateStyleVars({ quote: e.target.value })}
                            placeholder='Ex: "Sigo por paixão"'
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Intro (Itálico)</label>
                        <textarea
                            className="form-input"
                            value={style_variables.intro || ''}
                            onChange={e => onUpdateStyleVars({ intro: e.target.value })}
                            placeholder="Texto introdutório menor..."
                            rows={3}
                        />
                    </div>

                    <div className="divider" style={{ margin: '16px 0' }} />
                    <div className="inspector-section-title">Imagem (Retrato)</div>

                    <div className="form-group">
                        <label className="form-label">Upload de Imagem</label>
                        <input
                            type="file"
                            accept="image/*"
                            style={{ fontSize: '11px' }}
                            onChange={e => {
                                const file = e.target.files[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => onUpdateStyleVars({ imageBase64: ev.target.result });
                                    reader.readAsDataURL(file);
                                }
                            }}
                        />
                    </div>

                    {style_variables.imageBase64 && (
                        <>
                            <div className="form-group">
                                <label className="form-label">Largura do Quadro (ex: 0.3 ou 4cm)</label>
                                <input
                                    className="form-input"
                                    value={style_variables.frameWidth || '4cm'}
                                    onChange={e => onUpdateStyleVars({ frameWidth: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tamanho/Zoom na renderização (ex: \textwidth ou 6cm)</label>
                                <input
                                    className="form-input"
                                    value={style_variables.imageZoom || '\\textwidth'}
                                    onChange={e => onUpdateStyleVars({ imageZoom: e.target.value })}
                                />
                            </div>
                        </>
                    )}
                </div>
            )}

                        {block.type === BLOCK_TYPES.IMAGE && (
                <div className="inspector-section">
                    <div className="inspector-section-title">Imagem</div>

                    {/* Upload */}
                    <div className="form-group">
                        <label className="form-label">Upload de Imagem</label>
                        <input type="file" accept="image/*" style={{ fontSize: '11px' }}
                            onChange={e => {
                                const file = e.target.files[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = ev => onUpdateStyleVars({
                                        imageBase64: ev.target.result,
                                        filename: (style_variables.filename || file.name.replace(/[^a-zA-Z0-9._-]/g, '_')),
                                    });
                                    reader.readAsDataURL(file);
                                }
                            }}
                        />
                    </div>
                    {style_variables.imageBase64 && (
                        <div style={{ marginBottom: '12px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                            <img src={style_variables.imageBase64} alt="preview" style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', display: 'block' }} />
                        </div>
                    )}

                    {/* Exclusive page toggle */}
                    <div className="toggle-group" style={{ marginBottom: '8px' }}>
                        <span className="toggle-label" style={{ fontWeight: 600 }}>📄 Página própria</span>
                        <div className={`toggle ${style_variables.exclusivePage ? 'on' : ''}`}
                            onClick={() => onUpdateStyleVars({ exclusivePage: !style_variables.exclusivePage })} />
                    </div>

                    {/* ── INLINE mode controls ────────────────── */}
                    {!style_variables.exclusivePage && (
                        <>
                            <div className="form-group">
                                <label className="form-label">Layout no texto</label>
                                <select className="form-select" value={style_variables.layout || 'center'}
                                    onChange={e => onUpdateStyleVars({ layout: e.target.value })}>
                                    <option value="center">Centro (bloco flutuante)</option>
                                    <option value="full">Largura total</option>
                                    <option value="left">Flutua à esquerda (texto ao redor)</option>
                                    <option value="right">Flutua à direita (texto ao redor)</option>
                                </select>
                            </div>
                            {(style_variables.layout === 'center' || !style_variables.layout) && (
                                <div className="form-group">
                                    <label className="form-label">Largura <span style={{ float:'right', color:'var(--text-muted)', fontWeight:400 }}>{Math.round((parseFloat(style_variables.width) || 0.8)*100)}%</span></label>
                                    <input type="range" min="0.2" max="1.0" step="0.05"
                                        value={style_variables.width || '0.8'}
                                        onChange={e => onUpdateStyleVars({ width: e.target.value })}
                                        style={{ width: '100%', accentColor: 'var(--accent-indigo)' }} />
                                </div>
                            )}
                            <div className="form-group">
                                <label className="form-label">Posição (float LaTeX)</label>
                                <select className="form-select" value={style_variables.floatPos || 'h'}
                                    onChange={e => onUpdateStyleVars({ floatPos: e.target.value })}>
                                    <option value="h">h — preferencialmente aqui</option>
                                    <option value="H">H — exatamente aqui (fixo)</option>
                                    <option value="t">t — topo da página</option>
                                    <option value="b">b — rodapé da página</option>
                                </select>
                            </div>
                        </>
                    )}

                    {/* ── EXCLUSIVE PAGE mode controls ─────────── */}
                    {style_variables.exclusivePage && (
                        <>
                            <div className="form-group">
                                <label className="form-label">Modo de preenchimento</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px' }}>
                                    {[
                                        { value: 'fit',     label: '⬜ Fit',     desc: 'Mantém proporção, cabe na área (pode ter margens brancas)' },
                                        { value: 'stretch', label: '⬛ Stretch', desc: 'Preenche a área de texto — mantém proporção com crop' },
                                        { value: 'bleed',   label: '◼ Sangria', desc: 'Preenche toda a página incluindo margens' },
                                    ].map(opt => {
                                        const isActive = (style_variables.fillMode || 'fit') === opt.value;
                                        return (
                                            <button key={opt.value} title={opt.desc}
                                                onClick={() => onUpdateStyleVars({ fillMode: opt.value })}
                                                style={{
                                                    padding: '7px 4px', fontSize: '10px', textAlign: 'center',
                                                    border: '1px solid', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                                    background: isActive ? 'var(--accent-indigo)' : 'var(--bg-elevated)',
                                                    borderColor: isActive ? 'var(--accent-indigo)' : 'var(--border-subtle)',
                                                    color: isActive ? 'white' : 'var(--text-secondary)',
                                                    transition: 'all 0.15s',
                                                }}>{opt.label}</button>
                                        );
                                    })}
                                </div>
                            </div>

                            {(style_variables.fillMode === 'stretch' || style_variables.fillMode === 'bleed') && (
                                <>
                                    <div className="toggle-group">
                                        <span className="toggle-label">Manter proporção (recortar excesso)</span>
                                        <div className={`toggle ${style_variables.keepRatio !== false ? 'on' : ''}`}
                                            onClick={() => onUpdateStyleVars({ keepRatio: style_variables.keepRatio === false })} />
                                    </div>
                                    {style_variables.keepRatio !== false && (
                                        <div className="form-group" style={{ marginTop: '8px' }}>
                                            <label className="form-label">Origem do recorte</label>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                {[{ value: 'top', label: '▲ Topo' }, { value: 'center', label: '● Centro' }, { value: 'bottom', label: '▼ Base' }].map(opt => {
                                                    const isActive = (style_variables.cropAnchor || 'center') === opt.value;
                                                    return (
                                                        <button key={opt.value}
                                                            onClick={() => onUpdateStyleVars({ cropAnchor: opt.value })}
                                                            style={{
                                                                flex: 1, padding: '6px 4px', fontSize: '10px',
                                                                border: '1px solid', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                                                background: isActive ? 'var(--accent-indigo)' : 'var(--bg-elevated)',
                                                                borderColor: isActive ? 'var(--accent-indigo)' : 'var(--border-subtle)',
                                                                color: isActive ? 'white' : 'var(--text-secondary)',
                                                                transition: 'all 0.15s',
                                                            }}>{opt.label}</button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="form-group">
                                <label className="form-label">Título (opcional)</label>
                                <input className="form-input" value={style_variables.title || ''}
                                    onChange={e => onUpdateStyleVars({ title: e.target.value })}
                                    placeholder="Título sobre a imagem" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Estilo da página</label>
                                <select className="form-select" value={style_variables.pageStyle || 'empty'}
                                    onChange={e => onUpdateStyleVars({ pageStyle: e.target.value })}>
                                    <option value="empty">Sem cabeçalho/rodapé</option>
                                    <option value="plain">Apenas numeração</option>
                                </select>
                            </div>
                        </>
                    )}

                    <div className="form-group">
                        <label className="form-label">Legenda</label>
                        <input className="form-input" value={style_variables.caption || ''}
                            onChange={e => onUpdateStyleVars({ caption: e.target.value })}
                            placeholder="Legenda opcional" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Nome do arquivo (export)</label>
                        <input className="form-input" value={style_variables.filename || ''}
                            onChange={e => onUpdateStyleVars({ filename: e.target.value.replace(/[^a-zA-Z0-9._-]/g, '_') })}
                            placeholder="foto.jpg" />
                    </div>
                </div>
            )}

            {block.type === BLOCK_TYPES.IMAGE_GRID && (
                <div className="inspector-section">
                    <div className="inspector-section-title">Grade de Imagens</div>

                    {/* Layout selector */}
                    <div className="form-group">
                        <label className="form-label">Layout</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px' }}>
                            {[
                                { value: 'stacked',      label: '☰ Empilhadas',   desc: '2 fotos uma sobre a outra' },
                                { value: 'side-by-side', label: '⊟ Lado a lado',  desc: '2 fotos lado a lado' },
                                { value: 'grid-4',       label: '⊞ Grade 2×2',    desc: '4 fotos em grid' },
                            ].map(opt => {
                                const isActive = (style_variables.gridLayout || 'side-by-side') === opt.value;
                                return (
                                    <button key={opt.value} title={opt.desc}
                                        onClick={() => onUpdateStyleVars({ gridLayout: opt.value })}
                                        style={{
                                            padding: '7px 4px', fontSize: '10px', textAlign: 'center',
                                            border: '1px solid', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                            background: isActive ? 'var(--accent-indigo)' : 'var(--bg-elevated)',
                                            borderColor: isActive ? 'var(--accent-indigo)' : 'var(--border-subtle)',
                                            color: isActive ? 'white' : 'var(--text-secondary)',
                                            transition: 'all 0.15s',
                                        }}>{opt.label}</button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Image slots */}
                    {[1, 2, ...(style_variables.gridLayout === 'grid-4' ? [3, 4] : [])].map(i => (
                        <div key={i} style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
                            <div className="inspector-section-title" style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                                Imagem {i}
                            </div>
                            <input type="file" accept="image/*" style={{ fontSize: '11px', marginBottom: '6px' }}
                                onChange={e => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onload = ev => onUpdateStyleVars({
                                            [`image${i}Base64`]: ev.target.result,
                                            [`filename${i}`]: style_variables[`filename${i}`] || file.name.replace(/[^a-zA-Z0-9._-]/g, '_'),
                                        });
                                        reader.readAsDataURL(file);
                                    }
                                }}
                            />
                            {style_variables[`image${i}Base64`] && (
                                <div style={{ marginBottom: '6px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                                    <img src={style_variables[`image${i}Base64`]} style={{ width: '100%', maxHeight: '70px', objectFit: 'cover', display: 'block' }} />
                                </div>
                            )}
                            <input className="form-input" value={style_variables[`caption${i}`] || ''}
                                onChange={e => onUpdateStyleVars({ [`caption${i}`]: e.target.value })}
                                placeholder={`Legenda da imagem ${i}`}
                                style={{ fontSize: '11px' }} />
                        </div>
                    ))}

                    {/* Shared controls */}
                    <div className="form-group">
                        <label className="form-label">
                            Largura de cada imagem
                            <span style={{ float: 'right', color: 'var(--text-muted)', fontWeight: 400 }}>
                                {Math.round((parseFloat(style_variables.imageWidth) || (style_variables.gridLayout === 'grid-4' ? 0.47 : 0.48)) * 100)}%
                            </span>
                        </label>
                        <input type="range" min="0.3" max="0.75" step="0.02"
                            value={style_variables.imageWidth || (style_variables.gridLayout === 'grid-4' ? '0.47' : '0.48')}
                            onChange={e => onUpdateStyleVars({ imageWidth: e.target.value })}
                            style={{ width: '100%', accentColor: 'var(--accent-indigo)' }} />
                    </div>

                    {(style_variables.gridLayout === 'stacked' || style_variables.gridLayout === 'grid-4') && (
                        <div className="form-group">
                            <label className="form-label">Espaçamento entre imagens</label>
                            <select className="form-select" value={style_variables.spacing || '1em'}
                                onChange={e => onUpdateStyleVars({ spacing: e.target.value })}>
                                <option value="0.5em">Pequeno</option>
                                <option value="1em">Médio</option>
                                <option value="2em">Grande</option>
                            </select>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Legenda geral (opcional)</label>
                        <input className="form-input" value={style_variables.caption || ''}
                            onChange={e => onUpdateStyleVars({ caption: e.target.value })}
                            placeholder="Legenda para o conjunto de imagens" />
                    </div>

                    <div className="divider" style={{ margin: '12px 0' }} />

                    {/* Exclusive page toggle */}
                    <div className="toggle-group">
                        <span className="toggle-label" style={{ fontWeight: 600 }}>📄 Página própria</span>
                        <div className={`toggle ${style_variables.exclusivePage ? 'on' : ''}`}
                            onClick={() => onUpdateStyleVars({ exclusivePage: !style_variables.exclusivePage })} />
                    </div>
                    {style_variables.exclusivePage && (
                        <p style={{ fontSize: '10px', color: 'var(--accent-indigo)', marginTop: '6px', lineHeight: 1.5, background: 'rgba(99,102,241,0.08)', padding: '6px 8px', borderRadius: 'var(--radius-sm)' }}>
                            As imagens ocuparão uma página isolada no documento.
                        </p>
                    )}
                </div>
            )}

{block.type === BLOCK_TYPES.TESTIMONIAL && (
                <div className="inspector-section">
                    <div className="inspector-section-title">Dados do Depoimento</div>

                    <div className="form-group">
                        <label className="form-label">Nome da Pessoa</label>
                        <input
                            className="form-input"
                            value={style_variables.personName || ''}
                            onChange={e => onUpdateStyleVars({ personName: e.target.value })}
                            placeholder="Ex: Maria"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Citação / Frase Fixa (Negrito)</label>
                        <input
                            className="form-input"
                            value={style_variables.quote || ''}
                            onChange={e => onUpdateStyleVars({ quote: e.target.value })}
                            placeholder='Ex: "Sigo por paixão"'
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Intro (Itálico)</label>
                        <textarea
                            className="form-input"
                            value={style_variables.intro || ''}
                            onChange={e => onUpdateStyleVars({ intro: e.target.value })}
                            placeholder="Texto introdutório menor..."
                            rows={3}
                        />
                    </div>

                    <div className="divider" style={{ margin: '16px 0' }} />
                    <div className="inspector-section-title">Imagem (Retrato)</div>

                    <div className="form-group">
                        <label className="form-label">Upload de Imagem</label>
                        <input
                            type="file"
                            accept="image/*"
                            style={{ fontSize: '11px' }}
                            onChange={e => {
                                const file = e.target.files[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => onUpdateStyleVars({ imageBase64: ev.target.result });
                                    reader.readAsDataURL(file);
                                }
                            }}
                        />
                    </div>

                    {style_variables.imageBase64 && (
                        <>
                            <div className="form-group">
                                <label className="form-label">Largura do Quadro (ex: 0.3 ou 4cm)</label>
                                <input
                                    className="form-input"
                                    value={style_variables.frameWidth || '4cm'}
                                    onChange={e => onUpdateStyleVars({ frameWidth: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tamanho/Zoom na renderização (ex: \textwidth ou 6cm)</label>
                                <input
                                    className="form-input"
                                    value={style_variables.imageZoom || '\\textwidth'}
                                    onChange={e => onUpdateStyleVars({ imageZoom: e.target.value })}
                                />
                            </div>
                        </>
                    )}
                </div>
            )}

            {block.type === BLOCK_TYPES.IMAGE_INLINE && (
                <div className="inspector-section">
                    <div className="inspector-section-title">Configurações da Imagem</div>

                    {/* Upload */}
                    <div className="form-group">
                        <label className="form-label">Upload de Imagem</label>
                        <input
                            type="file"
                            accept="image/*"
                            style={{ fontSize: '11px' }}
                            onChange={e => {
                                const file = e.target.files[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => onUpdateStyleVars({
                                        imageBase64: ev.target.result,
                                        filename: style_variables.filename || file.name.replace(/[^a-zA-Z0-9._-]/g, '_'),
                                    });
                                    reader.readAsDataURL(file);
                                }
                            }}
                        />
                    </div>

                    {style_variables.imageBase64 && (
                        <div style={{ marginBottom: '12px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                            <img src={style_variables.imageBase64} alt="preview" style={{ width: '100%', maxHeight: '120px', objectFit: 'cover', display: 'block' }} />
                        </div>
                    )}

                    {/* Layout */}
                    <div className="form-group">
                        <label className="form-label">Diagramação no PDF</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '4px' }}>
                            {[
                                { value: 'center', label: '⬛ Centralizado', desc: 'Bloco no centro da página' },
                                { value: 'full', label: '◼ Largura total', desc: 'Ocupa toda a largura da página' },
                                { value: 'left', label: '◧ Wrap esquerda', desc: 'Imagem à esquerda, texto flui à direita' },
                                { value: 'right', label: '◨ Wrap direita', desc: 'Imagem à direita, texto flui à esquerda' },
                            ].map(opt => {
                                const isActive = (style_variables.layout || 'center') === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        onClick={() => onUpdateStyleVars({ layout: opt.value })}
                                        title={opt.desc}
                                        style={{
                                            padding: '8px 6px',
                                            fontSize: '10px',
                                            textAlign: 'center',
                                            border: '1px solid',
                                            borderRadius: 'var(--radius-sm)',
                                            cursor: 'pointer',
                                            background: isActive ? 'var(--accent-indigo)' : 'var(--bg-elevated)',
                                            borderColor: isActive ? 'var(--accent-indigo)' : 'var(--border-subtle)',
                                            color: isActive ? 'white' : 'var(--text-secondary)',
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                        {(style_variables.layout === 'left' || style_variables.layout === 'right') && (
                            <p style={{ fontSize: '10px', color: 'var(--accent-indigo)', marginTop: '8px', lineHeight: 1.5, background: 'rgba(99,102,241,0.08)', padding: '6px 8px', borderRadius: 'var(--radius-sm)' }}>
                                💡 Modo wrap: escreva o texto do parágrafo no campo de conteúdo do bloco. Ele fluirá ao lado da imagem no PDF.
                            </p>
                        )}
                    </div>

                    {/* Largura */}
                    <div className="form-group">
                        <label className="form-label">
                            Largura da imagem
                            <span style={{ float: 'right', color: 'var(--text-muted)', fontWeight: 400 }}>
                                {Math.round((parseFloat(style_variables.width) || 0.8) * 100)}% da página
                            </span>
                        </label>
                        <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.05"
                            value={style_variables.width || '0.8'}
                            onChange={e => onUpdateStyleVars({ width: e.target.value })}
                            style={{ width: '100%', accentColor: 'var(--accent-indigo)' }}
                        />
                    </div>

                    {/* Posição LaTeX — só para modos não-wrap */}
                    {(style_variables.layout || 'center') !== 'left' && (style_variables.layout || 'center') !== 'right' && (
                        <div className="form-group">
                            <label className="form-label">Posição no fluxo (LaTeX float)</label>
                            <select
                                className="form-select"
                                value={style_variables.floatPos || 'h'}
                                onChange={e => onUpdateStyleVars({ floatPos: e.target.value })}
                            >
                                <option value="h">h — preferencialmente aqui</option>
                                <option value="H">H — exatamente aqui (fixo)</option>
                                <option value="t">t — topo da página</option>
                                <option value="b">b — rodapé da página</option>
                                <option value="p">p — página exclusiva de floats</option>
                            </select>
                        </div>
                    )}

                    {/* Legenda */}
                    <div className="form-group">
                        <label className="form-label">Legenda da figura</label>
                        <input
                            className="form-input"
                            value={style_variables.caption || ''}
                            onChange={e => onUpdateStyleVars({ caption: e.target.value })}
                            placeholder="Ex: Figura 1 — Diagrama do processo"
                        />
                    </div>

                    {/* Nome do arquivo */}
                    <div className="form-group">
                        <label className="form-label">Nome do arquivo (export)</label>
                        <input
                            className="form-input"
                            value={style_variables.filename || ''}
                            onChange={e => onUpdateStyleVars({ filename: e.target.value.replace(/[^a-zA-Z0-9._-]/g, '_') })}
                            placeholder="Ex: grafico_vendas.jpg"
                        />
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                            Referência para o arquivo gerado no PDF
                        </span>
                    </div>
                </div>
            )}

            {block.type === BLOCK_TYPES.IMAGE_PAGE && (
                <div className="inspector-section">
                    <div className="inspector-section-title">Página de Imagem</div>

                    <div className="form-group">
                        <label className="form-label">Upload de Imagem</label>
                        <input type="file" accept="image/*" style={{ fontSize: '11px' }}
                            onChange={e => {
                                const file = e.target.files[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => onUpdateStyleVars({
                                        imageBase64: ev.target.result,
                                        filename: style_variables.filename || file.name.replace(/[^a-zA-Z0-9._-]/g, '_'),
                                    });
                                    reader.readAsDataURL(file);
                                }
                            }}
                        />
                    </div>

                    {style_variables.imageBase64 && (
                        <div style={{ marginBottom: '12px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                            <img src={style_variables.imageBase64} alt="preview" style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', display: 'block' }} />
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Título (opcional)</label>
                        <input className="form-input" value={style_variables.title || ''}
                            onChange={e => onUpdateStyleVars({ title: e.target.value })}
                            placeholder="Ex: Capítulo 3 — O Início" />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Legenda (opcional)</label>
                        <input className="form-input" value={style_variables.caption || ''}
                            onChange={e => onUpdateStyleVars({ caption: e.target.value })}
                            placeholder="Créditos ou legenda da imagem" />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Modo de preenchimento</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px', marginTop: '4px' }}>
                            {[
                                { value: 'fit',     label: '⬜ Fit',      desc: 'Mantém proporção, cabe na página (pode ter margens brancas)' },
                                { value: 'stretch', label: '⬛ Stretch',  desc: 'Estica para preencher a área de texto (pode distorcer)' },
                                { value: 'bleed',   label: '◼ Sangria',  desc: 'Preenche toda a página incluindo margens (full bleed)' },
                            ].map(opt => {
                                const isActive = (style_variables.fillMode || 'fit') === opt.value;
                                return (
                                    <button key={opt.value} title={opt.desc}
                                        onClick={() => onUpdateStyleVars({ fillMode: opt.value })}
                                        style={{
                                            padding: '7px 4px', fontSize: '10px', textAlign: 'center',
                                            border: '1px solid', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                            background: isActive ? 'var(--accent-indigo)' : 'var(--bg-elevated)',
                                            borderColor: isActive ? 'var(--accent-indigo)' : 'var(--border-subtle)',
                                            color: isActive ? 'white' : 'var(--text-secondary)',
                                            transition: 'all 0.15s',
                                        }}
                                    >{opt.label}</button>
                                );
                            })}
                        </div>
                        <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.5 }}>
                            {{
                                fit:     '⬜ Fit — imagem respeitará as margens do documento.',
                                stretch: '⬛ Stretch — imagem preencherá a área de texto (possível distorção).',
                                bleed:   '◼ Sangria — imagem cobre a página inteira, incluindo margens.',
                            }[style_variables.fillMode || 'fit']}
                        </p>
                    </div>

                    {/* Keep ratio toggle — only relevant for Stretch and Bleed modes */}
                    {(style_variables.fillMode === 'stretch' || style_variables.fillMode === 'bleed') && (
                        <>
                            <div className="toggle-group" style={{ marginTop: '4px' }}>
                                <span className="toggle-label">
                                    Manter proporção (recortar excesso)
                                </span>
                                <div
                                    className={`toggle ${style_variables.keepRatio !== false ? 'on' : ''}`}
                                    onClick={() => onUpdateStyleVars({ keepRatio: style_variables.keepRatio === false ? true : false })}
                                />
                            </div>
                            {style_variables.keepRatio !== false && (
                                <div className="form-group" style={{ marginTop: '8px' }}>
                                    <label className="form-label">Origem do recorte</label>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        {[
                                            { value: 'top',    label: '▲ Topo' },
                                            { value: 'center', label: '● Centro' },
                                            { value: 'bottom', label: '▼ Base' },
                                        ].map(opt => {
                                            const isActive = (style_variables.cropAnchor || 'center') === opt.value;
                                            return (
                                                <button key={opt.value}
                                                    onClick={() => onUpdateStyleVars({ cropAnchor: opt.value })}
                                                    style={{
                                                        flex: 1, padding: '6px 4px', fontSize: '10px',
                                                        border: '1px solid', borderRadius: 'var(--radius-sm)',
                                                        cursor: 'pointer', textAlign: 'center',
                                                        background: isActive ? 'var(--accent-indigo)' : 'var(--bg-elevated)',
                                                        borderColor: isActive ? 'var(--accent-indigo)' : 'var(--border-subtle)',
                                                        color: isActive ? 'white' : 'var(--text-secondary)',
                                                        transition: 'all 0.15s',
                                                    }}
                                                >{opt.label}</button>
                                            );
                                        })}
                                    </div>
                                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                                        Define qual parte da imagem aparece quando o excesso é recortado.
                                    </p>
                                </div>
                            )}
                            {style_variables.keepRatio === false && (
                                <p style={{ fontSize: '10px', color: 'rgba(244,63,94,0.8)', marginTop: '4px', lineHeight: 1.4 }}>
                                    ⚠️ Sem proporção: a imagem será esticada para preencher a área, podendo distorcer.
                                </p>
                            )}
                        </>
                    )}

                    <div className="form-group">
                        <label className="form-label">Estilo da página</label>
                        <select className="form-select" value={style_variables.pageStyle || 'empty'}
                            onChange={e => onUpdateStyleVars({ pageStyle: e.target.value })}>
                            <option value="empty">Sem cabeçalho/rodapé</option>
                            <option value="plain">Apenas numeração</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Nome do arquivo (export)</label>
                        <input className="form-input" value={style_variables.filename || ''}
                            onChange={e => onUpdateStyleVars({ filename: e.target.value.replace(/[^a-zA-Z0-9._-]/g, '_') })}
                            placeholder="Ex: pagina_foto.jpg" />
                    </div>

                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.5, background: 'rgba(99,102,241,0.06)', padding: '6px 8px', borderRadius: 'var(--radius-sm)' }}>
                        📄 Este bloco gera uma página exclusiva com a imagem centralizada, sem interferir no fluxo do texto ao redor.
                    </p>
                </div>
            )}

            {block.type === BLOCK_TYPES.IMAGE_DOUBLE && (
                <div className="inspector-section">
                    <div className="inspector-section-title">Imagem Dupla — Lado a lado</div>

                    {/* Image 1 */}
                    <div className="inspector-section-title" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px' }}>Imagem 1 (esquerda)</div>
                    <div className="form-group">
                        <input type="file" accept="image/*" style={{ fontSize: '11px' }}
                            onChange={e => {
                                const file = e.target.files[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => onUpdateStyleVars({
                                        image1Base64: ev.target.result,
                                        filename1: style_variables.filename1 || file.name.replace(/[^a-zA-Z0-9._-]/g, '_'),
                                    });
                                    reader.readAsDataURL(file);
                                }
                            }}
                        />
                    </div>
                    {style_variables.image1Base64 && (
                        <div style={{ marginBottom: '8px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                            <img src={style_variables.image1Base64} style={{ width: '100%', maxHeight: '80px', objectFit: 'cover', display: 'block' }} />
                        </div>
                    )}
                    <div className="form-group">
                        <input className="form-input" value={style_variables.caption1 || ''}
                            onChange={e => onUpdateStyleVars({ caption1: e.target.value })}
                            placeholder="Legenda da imagem 1" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Largura 1 <span style={{ float:'right', color:'var(--text-muted)', fontWeight:400 }}>{Math.round((parseFloat(style_variables.width1) || 0.48)*100)}%</span></label>
                        <input type="range" min="0.2" max="0.75" step="0.02"
                            value={style_variables.width1 || '0.48'}
                            onChange={e => onUpdateStyleVars({ width1: e.target.value })}
                            style={{ width: '100%', accentColor: 'var(--accent-indigo)' }} />
                    </div>

                    <div className="divider" style={{ margin: '12px 0' }} />

                    {/* Image 2 */}
                    <div className="inspector-section-title" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Imagem 2 (direita)</div>
                    <div className="form-group">
                        <input type="file" accept="image/*" style={{ fontSize: '11px' }}
                            onChange={e => {
                                const file = e.target.files[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => onUpdateStyleVars({
                                        image2Base64: ev.target.result,
                                        filename2: style_variables.filename2 || file.name.replace(/[^a-zA-Z0-9._-]/g, '_'),
                                    });
                                    reader.readAsDataURL(file);
                                }
                            }}
                        />
                    </div>
                    {style_variables.image2Base64 && (
                        <div style={{ marginBottom: '8px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                            <img src={style_variables.image2Base64} style={{ width: '100%', maxHeight: '80px', objectFit: 'cover', display: 'block' }} />
                        </div>
                    )}
                    <div className="form-group">
                        <input className="form-input" value={style_variables.caption2 || ''}
                            onChange={e => onUpdateStyleVars({ caption2: e.target.value })}
                            placeholder="Legenda da imagem 2" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Largura 2 <span style={{ float:'right', color:'var(--text-muted)', fontWeight:400 }}>{Math.round((parseFloat(style_variables.width2) || 0.48)*100)}%</span></label>
                        <input type="range" min="0.2" max="0.75" step="0.02"
                            value={style_variables.width2 || '0.48'}
                            onChange={e => onUpdateStyleVars({ width2: e.target.value })}
                            style={{ width: '100%', accentColor: 'var(--accent-indigo)' }} />
                    </div>


                    <div className="divider" style={{ margin: '16px 0' }} />
                    <div className="toggle-group">
                        <span className="toggle-label" style={{ fontWeight: 600 }}>
                            📄 Página própria
                        </span>
                        <div
                            className={`toggle ${style_variables.exclusivePage ? 'on' : ''}`}
                            onClick={() => onUpdateStyleVars({ exclusivePage: !style_variables.exclusivePage })}
                        />
                    </div>
                    {style_variables.exclusivePage && (
                        <p style={{ fontSize: '10px', color: 'var(--accent-indigo)', marginTop: '6px', lineHeight: 1.5, background: 'rgba(99,102,241,0.08)', padding: '6px 8px', borderRadius: 'var(--radius-sm)' }}>
                            O bloco ocupará uma página isolada — o conteúdo anterior e posterior serão quebrados ao redor dele.
                        </p>
                    )}
                    <div className="form-group">
                        <label className="form-label">Posição (float)</label>
                        <select className="form-select" value={style_variables.floatPos || 'h'}
                            onChange={e => onUpdateStyleVars({ floatPos: e.target.value })}
                            disabled={style_variables.exclusivePage}>
                            <option value="h">h — preferencialmente aqui</option>
                            <option value="H">H — exatamente aqui (fixo)</option>
                            <option value="t">t — topo</option>
                            <option value="b">b — rodapé</option>
                        </select>
                    </div>
                </div>
            )}

            {block.type === BLOCK_TYPES.IMAGE_STACK && (
                <div className="inspector-section">
                    <div className="inspector-section-title">Imagens Empilhadas — Uma sobre a outra</div>

                    {/* Image 1 */}
                    <div className="inspector-section-title" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px' }}>Imagem 1 (superior)</div>
                    <div className="form-group">
                        <input type="file" accept="image/*" style={{ fontSize: '11px' }}
                            onChange={e => {
                                const file = e.target.files[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => onUpdateStyleVars({
                                        image1Base64: ev.target.result,
                                        filename1: style_variables.filename1 || file.name.replace(/[^a-zA-Z0-9._-]/g, '_'),
                                    });
                                    reader.readAsDataURL(file);
                                }
                            }}
                        />
                    </div>
                    {style_variables.image1Base64 && (
                        <div style={{ marginBottom: '8px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                            <img src={style_variables.image1Base64} style={{ width: '100%', maxHeight: '80px', objectFit: 'cover', display: 'block' }} />
                        </div>
                    )}
                    <div className="form-group">
                        <input className="form-input" value={style_variables.caption1 || ''}
                            onChange={e => onUpdateStyleVars({ caption1: e.target.value })}
                            placeholder="Legenda da imagem 1" />
                    </div>

                    <div className="divider" style={{ margin: '12px 0' }} />

                    {/* Image 2 */}
                    <div className="inspector-section-title" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Imagem 2 (inferior)</div>
                    <div className="form-group">
                        <input type="file" accept="image/*" style={{ fontSize: '11px' }}
                            onChange={e => {
                                const file = e.target.files[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => onUpdateStyleVars({
                                        image2Base64: ev.target.result,
                                        filename2: style_variables.filename2 || file.name.replace(/[^a-zA-Z0-9._-]/g, '_'),
                                    });
                                    reader.readAsDataURL(file);
                                }
                            }}
                        />
                    </div>
                    {style_variables.image2Base64 && (
                        <div style={{ marginBottom: '8px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                            <img src={style_variables.image2Base64} style={{ width: '100%', maxHeight: '80px', objectFit: 'cover', display: 'block' }} />
                        </div>
                    )}
                    <div className="form-group">
                        <input className="form-input" value={style_variables.caption2 || ''}
                            onChange={e => onUpdateStyleVars({ caption2: e.target.value })}
                            placeholder="Legenda da imagem 2" />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Largura de ambas <span style={{ float:'right', color:'var(--text-muted)', fontWeight:400 }}>{Math.round((parseFloat(style_variables.width) || 0.85)*100)}%</span></label>
                        <input type="range" min="0.3" max="1.0" step="0.05"
                            value={style_variables.width || '0.85'}
                            onChange={e => onUpdateStyleVars({ width: e.target.value })}
                            style={{ width: '100%', accentColor: 'var(--accent-indigo)' }} />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Espaçamento entre imagens</label>
                        <select className="form-select" value={style_variables.spacing || '1em'}
                            onChange={e => onUpdateStyleVars({ spacing: e.target.value })}>
                            <option value="0.5em">Pequeno (0.5em)</option>
                            <option value="1em">Médio (1em)</option>
                            <option value="2em">Grande (2em)</option>
                            <option value="3em">Muito grande (3em)</option>
                        </select>
                    </div>


                    <div className="divider" style={{ margin: '16px 0' }} />
                    <div className="toggle-group">
                        <span className="toggle-label" style={{ fontWeight: 600 }}>
                            📄 Página própria
                        </span>
                        <div
                            className={`toggle ${style_variables.exclusivePage ? 'on' : ''}`}
                            onClick={() => onUpdateStyleVars({ exclusivePage: !style_variables.exclusivePage })}
                        />
                    </div>
                    {style_variables.exclusivePage && (
                        <p style={{ fontSize: '10px', color: 'var(--accent-indigo)', marginTop: '6px', lineHeight: 1.5, background: 'rgba(99,102,241,0.08)', padding: '6px 8px', borderRadius: 'var(--radius-sm)' }}>
                            O bloco ocupará uma página isolada — o conteúdo anterior e posterior serão quebrados ao redor dele.
                        </p>
                    )}
                    <div className="form-group">
                        <label className="form-label">Posição (float)</label>
                        <select className="form-select" value={style_variables.floatPos || 'h'}
                            onChange={e => onUpdateStyleVars({ floatPos: e.target.value })}
                            disabled={style_variables.exclusivePage}>
                            <option value="h">h — preferencialmente aqui</option>
                            <option value="H">H — exatamente aqui (fixo)</option>
                            <option value="t">t — topo</option>
                            <option value="b">b — rodapé</option>
                        </select>
                    </div>
                </div>
            )}

        </div>
    );
}

// ─── LaTeX Preview Tab ───────────────────────────────────────
function LatexTab({ getTexContent }) {
    const texContent = useMemo(() => getTexContent(), [getTexContent]);
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

export function Inspector({
    project,
    selectedBlock,
    getTexContent,
    onUpdateMetadata,
    onUpdateSetup,
    onUpdateConfig,
    onUpdateStyleVars,
    tab = 'block',
    onTabChange,
    collapsed,
    onCollapse,
    projectId
}) {
    const tabs = [
        { id: 'block',  label: 'Bloco' },
        { id: 'global', label: 'Documento' },
        { id: 'history', label: 'Histórico' },
    ];

    const currentTab = onTabChange ? tab : 'block';
    const setCurrentTab = onTabChange || (() => {});

    return (
        <aside className="inspector">
            <div className="inspector-tabs">
                {onCollapse && (
                    <button
                        className="btn btn-ghost btn-icon"
                        onClick={onCollapse}
                        title={collapsed ? 'Expandir propriedades' : 'Recolher propriedades'}
                        style={{ fontSize: '11px', flexShrink: 0, padding: '0 8px' }}
                    >
                        {collapsed ? '◀' : '▶'}
                    </button>
                )}
                {tabs.map(t => (
                    <div
                        key={t.id}
                        className={`inspector-tab ${currentTab === t.id ? 'active' : ''}`}
                        onClick={() => setCurrentTab(t.id)}
                    >
                        {t.label}
                    </div>
                ))}
            </div>

            <div className="inspector-content">
                {currentTab === 'block' && (
                    <BlockTab
                        block={selectedBlock}
                        onUpdateConfig={onUpdateConfig}
                        onUpdateStyleVars={onUpdateStyleVars}
                    />
                )}
                {currentTab === 'global' && (
                    <GlobalTab
                        project={project}
                        onUpdateMetadata={onUpdateMetadata}
                        onUpdateSetup={onUpdateSetup}
                    />
                )}
                {currentTab === 'history' && (
                    <HistoryTab projectId={projectId} />
                )}
            </div>
        </aside>
    );
}
