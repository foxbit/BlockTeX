import { useState, useRef, useCallback } from 'react';
import { BLOCK_TYPE_META, BLOCK_TYPES } from '../lib/blockTypes.js';

// ─── Markdown Preview / Stats Helper ───────────────────────────
function getReadingTime(text) {
    const words = text.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min`;
}

function getWordCount(text) {
    if (!text.trim()) return 0;
    return text.trim().split(/\s+/).length;
}

// ─── Single Block Card ───────────────────────────────────────
export function BlockCard({
    block,
    index,
    isSelected,
    onSelect,
    onEditContent,
    onDelete,
    onDuplicate,
    onMoveUp,
    onMoveDown,
    onDragStart,
    onDrop,
    onAddAfter,
    isFirst,
    isLast,
}) {
    const [collapsed, setCollapsed] = useState(block.collapsed || false);
    const [dragOver, setDragOver] = useState(null); // 'top' | 'bottom' | null
    const cardRef = useRef(null);
    const meta = BLOCK_TYPE_META[block.type] || BLOCK_TYPE_META[BLOCK_TYPES.CONTENT];

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = cardRef.current?.getBoundingClientRect();
        if (rect) {
            const mid = rect.top + rect.height / 2;
            setDragOver(e.clientY < mid ? 'top' : 'bottom');
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        const draggedType = e.dataTransfer.getData('blockType');
        const draggedId = e.dataTransfer.getData('blockId');
        onDrop({ targetId: block.id, position: dragOver, draggedType, draggedId });
        setDragOver(null);
    }, [block.id, dragOver, onDrop]);

    const getContentPreview = () => {
        const text = block.content || '';
        const preview = text.replace(/^#+ /gm, '').replace(/[*_`]/g, '').replace(/\n/g, ' ');
        return preview.substring(0, 80) + (preview.length > 80 ? '…' : '');
    };

    return (
        <div className="block-wrapper">
            {/* Insert connector between blocks */}
            <div className="block-connector" onClick={() => onAddAfter && onAddAfter(block.id, 'before')}>
                <div className="block-connector-btn">+</div>
            </div>

            {/* Page break indicator */}
            {block.config?.page_break === 'isolated' && (
                <div className="page-break-indicator">
                    <div className="page-break-decorator" />
                    <span className="page-break-label">⟶ Nova página (ímpar)</span>
                    <div className="page-break-decorator" />
                </div>
            )}
            {block.config?.page_break === 'before' && (
                <div className="page-break-indicator">
                    <div className="page-break-decorator" />
                    <span className="page-break-label">⟶ Quebra de página</span>
                    <div className="page-break-decorator" />
                </div>
            )}

            <div
                ref={cardRef}
                className={`block-card ${isSelected ? 'selected' : ''} ${dragOver === 'top' ? 'drag-over-top' : ''} ${dragOver === 'bottom' ? 'drag-over-bottom' : ''}`}
                onClick={() => onSelect(block.id)}
                draggable
                onDragStart={(e) => {
                    e.dataTransfer.setData('blockId', block.id);
                    onDragStart(block.id);
                }}
                onDragOver={handleDragOver}
                onDragLeave={() => setDragOver(null)}
                onDrop={handleDrop}
                onDragEnd={() => setDragOver(null)}
            >
                {/* Block header */}
                <div className="block-header">
                    {/* Drag handle */}
                    <div
                        className="block-drag-handle"
                        title="Arrastar bloco"
                        onMouseDown={e => e.stopPropagation()}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="8" y="4" width="2" height="2" rx="1" />
                            <rect x="14" y="4" width="2" height="2" rx="1" />
                            <rect x="8" y="10" width="2" height="2" rx="1" />
                            <rect x="14" y="10" width="2" height="2" rx="1" />
                            <rect x="8" y="16" width="2" height="2" rx="1" />
                            <rect x="14" y="16" width="2" height="2" rx="1" />
                        </svg>
                    </div>

                    {/* Type badge */}
                    <div
                        className={`block-type-badge ${meta.tagClass}`}
                        style={{ fontSize: '9px' }}
                    >
                        <span>{meta.icon}</span>
                        {meta.label}
                    </div>

                    {/* Block id */}
                    <span className="block-id-label">#{index + 1}</span>

                    {/* Actions */}
                    <div className="block-actions">
                        <button
                            className="block-action-btn"
                            onClick={e => { e.stopPropagation(); setCollapsed(c => !c); }}
                            title={collapsed ? 'Expandir' : 'Recolher'}
                        >
                            {collapsed ? '▼' : '▲'}
                        </button>
                        <button
                            className="block-action-btn"
                            onClick={e => { e.stopPropagation(); onMoveUp && onMoveUp(block.id); }}
                            title="Mover para cima"
                            disabled={isFirst}
                        >
                            ↑
                        </button>
                        <button
                            className="block-action-btn"
                            onClick={e => { e.stopPropagation(); onMoveDown && onMoveDown(block.id); }}
                            title="Mover para baixo"
                            disabled={isLast}
                        >
                            ↓
                        </button>
                        <button
                            className="block-action-btn"
                            onClick={e => { e.stopPropagation(); onDuplicate && onDuplicate(block.id); }}
                            title="Duplicar bloco"
                        >
                            ⎘
                        </button>
                        <button
                            className="block-action-btn danger"
                            onClick={e => { e.stopPropagation(); onDelete(block.id); }}
                            title="Excluir bloco"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Block body */}
                {collapsed ? (
                    <div
                        className="block-body"
                        style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'var(--font-mono)', cursor: 'pointer' }}
                        onClick={() => setCollapsed(false)}
                    >
                        {getContentPreview() || '(vazio)'}
                    </div>
                ) : (
                    <div className="block-body" onClick={e => e.stopPropagation()}>
                        {block.type === BLOCK_TYPES.TOC ? (
                            <div style={{
                                padding: '16px',
                                background: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--text-muted)',
                                fontSize: '12px',
                                textAlign: 'center',
                            }}>
                                📋 Índice automático será gerado pelo LaTeX
                                <br />
                                <small style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                                    Configurável no painel de propriedades →
                                </small>
                            </div>
                        ) : block.type === BLOCK_TYPES.SEPARATOR ? (
                            <div style={{ padding: '8px 0' }}>
                                <hr style={{ border: 'none', borderTop: '1px solid var(--border-default)' }} />
                            </div>
                        ) : block.type === BLOCK_TYPES.DEPOIMENTO ? (
                            <div className="block-content-summary" onClick={() => onEditContent(block.id)}>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    {block.style_variables?.imageBase64 ? (
                                        <img
                                            src={block.style_variables.imageBase64}
                                            style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px' }}
                                        />
                                    ) : (
                                        <div style={{ width: '48px', height: '48px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', borderRadius: '4px' }}>
                                            👤
                                        </div>
                                    )}
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ fontWeight: 600, fontSize: '12px' }}>{block.style_variables?.personName || 'Sem Nome'}</div>
                                        <div style={{ fontSize: '11px', fontStyle: 'italic', color: 'var(--text-muted)' }}>"{block.style_variables?.quote || 'Sem Citação'}"</div>
                                    </div>
                                </div>
                                <div className="summary-preview" style={{ marginTop: '12px' }}>
                                    {getContentPreview() || 'Bloco vazio. Clique para escrever o texto principal.'}
                                </div>
                                <div className="summary-stats">
                                    <span className="stat-pill" title="Contagem de palavras">
                                        📝 {getWordCount(block.content || '')} palavras
                                    </span>
                                </div>
                                <button className="btn btn-secondary btn-edit-overlay">
                                    ✍️ Editar Texto
                                </button>
                            </div>
                        ) : (
                            <div className="block-content-summary" onClick={() => onEditContent(block.id)}>
                                <div className="summary-preview">
                                    {getContentPreview() || 'Bloco vazio. Clique para escrever.'}
                                </div>
                                <div className="summary-stats">
                                    <span className="stat-pill" title="Contagem de palavras">
                                        📝 {getWordCount(block.content || '')} palavras
                                    </span>
                                    <span className="stat-pill" title="Tempo de leitura estimado">
                                        ⏱️ {getReadingTime(block.content || '')}
                                    </span>
                                    {block.config?.toc_visible && (
                                        <span className="stat-pill" title="Visível no sumário">
                                            📑 No Sumário
                                        </span>
                                    )}
                                </div>
                                <button className="btn btn-secondary btn-edit-overlay">
                                    ✍️ Editar Conteúdo
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Canvas (all blocks) ─────────────────────────────────────
export function Canvas({
    blocks,
    selectedId,
    onSelect,
    onEditContent,
    onDelete,
    onDuplicate,
    onMove,
    onAddBlock,
    onDropBlock,
}) {
    const [canvasDragging, setCanvasDragging] = useState(false);

    const handleCanvasDrop = (e) => {
        e.preventDefault();
        const blockType = e.dataTransfer.getData('blockType');
        if (blockType) {
            onAddBlock(blockType);
        }
        setCanvasDragging(false);
    };

    const handleBlockDrop = ({ targetId, position, draggedType, draggedId }) => {
        if (draggedType && !draggedId) {
            // New block from library
            onDropBlock({ type: 'new', blockType: draggedType, targetId, position });
        } else if (draggedId) {
            // Reorder existing block
            onDropBlock({ type: 'reorder', draggedId, targetId, position });
        }
    };

    const handleMoveUp = (id) => {
        const idx = blocks.findIndex(b => b.id === id);
        if (idx > 0) onMove(id, blocks[idx - 1].id, 'before');
    };

    const handleMoveDown = (id) => {
        const idx = blocks.findIndex(b => b.id === id);
        if (idx < blocks.length - 1) onMove(id, blocks[idx + 1].id, 'after');
    };

    if (blocks.length === 0) {
        return (
            <div
                className={`canvas-scroll ${canvasDragging ? 'drag-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setCanvasDragging(true); }}
                onDragLeave={() => setCanvasDragging(false)}
                onDrop={handleCanvasDrop}
            >
                <div className="onboarding-card">
                    <div className="onboarding-title">Comece seu livro</div>
                    <div className="onboarding-desc">
                        Arraste blocos da biblioteca à esquerda ou clique neles para adicionar ao documento.
                    </div>
                    <div className="onboarding-steps">
                        <div className="onboarding-step">
                            <div className="onboarding-step-num">1</div>
                            Configure as <strong>Propriedades Globais</strong> do livro
                        </div>
                        <div className="onboarding-step">
                            <div className="onboarding-step-num">2</div>
                            Adicione <strong>Blocos</strong> de conteúdo
                        </div>
                        <div className="onboarding-step">
                            <div className="onboarding-step-num">3</div>
                            <strong>Compile</strong> para gerar o PDF
                        </div>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => onAddBlock('chapter')}
                    >
                        📖 Adicionar primeiro capítulo
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className="canvas-scroll"
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={handleCanvasDrop}
        >
            <div className="canvas-drop-zone">
                {blocks.map((block, index) => (
                    <BlockCard
                        key={block.id}
                        block={block}
                        index={index}
                        isSelected={selectedId === block.id}
                        onSelect={onSelect}
                        onEditContent={onEditContent}
                        onDelete={onDelete}
                        onDuplicate={onDuplicate}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                        onDragStart={() => { }}
                        onDrop={handleBlockDrop}
                        onAddAfter={onAddBlock}
                        isFirst={index === 0}
                        isLast={index === blocks.length - 1}
                    />
                ))}

                {/* End connector */}
                <div
                    className="block-connector"
                    style={{ marginTop: '4px' }}
                    onClick={() => onAddBlock('content')}
                >
                    <div className="block-connector-btn">+</div>
                </div>
            </div>
        </div>
    );
}
