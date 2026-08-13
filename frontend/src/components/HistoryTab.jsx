import { useState, useEffect, useCallback } from 'react';
import { useBackend } from '../hooks/useBackend.js';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import './HistoryTab.css';

// ── Helpers ──────────────────────────────────────────────────

/** Formata timestamp para data/hora legível */
export function formatDate(ts) {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);

    if (diffMin < 1) return 'Agora mesmo';
    if (diffMin < 60) return `${diffMin}min atrás`;
    if (diffHrs < 24) return `${diffHrs}h atrás`;

    return d.toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit',
        hour: '2-digit', minute: '2-digit'
    });
}

/** Traduz o tipo de mudança para label legível */
export function changeTypeLabel(type) {
    switch (type) {
        case 'ADDED': return 'Adicionado';
        case 'DELETED': return 'Removido';
        case 'MODIFIED': return 'Modificado';
        case 'REORDERED': return 'Reordenado';
        default: return type;
    }
}

/** Traduz block_type para label */
function blockTypeLabel(blockId, blockType) {
    if (blockId === '__metadata__') return 'Metadados';
    if (blockId === '__global_setup__') return 'Config. Global';
    if (blockId === '__order__') return 'Ordem dos Blocos';
    const labels = {
        chapter: 'Capítulo', content: 'Texto', image: 'Imagem',
        image_grid: 'Grade Imagens', quote: 'Citação', code: 'Código',
        toc: 'Sumário', separator: 'Separador', cover: 'Capa',
        testimonial: 'Depoimento', system: 'Sistema'
    };
    return labels[blockType] || blockType || 'Bloco';
}

/** Classe CSS para o badge de tipo de mudança */
export function changeTypeBadgeClass(type) {
    switch (type) {
        case 'ADDED': return 'diff-badge added';
        case 'DELETED': return 'diff-badge deleted';
        case 'MODIFIED': return 'diff-badge modified';
        case 'REORDERED': return 'diff-badge reordered';
        default: return 'diff-badge';
    }
}

// ── Componente de Visualização de Patch ──────────────────────

export function PatchViewer({ patch, changeType }) {
    if (!patch) return null;

    // Para ADDED/DELETED, mostrar o conteúdo diretamente
    if (changeType === 'ADDED' || changeType === 'DELETED') {
        try {
            const parsed = JSON.parse(patch);
            const content = parsed.content || '';
            if (!content) return <div className="patch-empty">Bloco sem conteúdo textual</div>;
            return (
                <div className="patch-viewer">
                    <div className={`patch-line ${changeType === 'ADDED' ? 'line-add' : 'line-del'}`}>
                        {content.split('\n').map((line, i) => (
                            <div key={i}>{changeType === 'ADDED' ? '+ ' : '- '}{line}</div>
                        ))}
                    </div>
                </div>
            );
        } catch {
            return <div className="patch-raw">{patch.substring(0, 500)}</div>;
        }
    }

    // Para REORDERED, mostrar de/para
    if (changeType === 'REORDERED') {
        const lines = patch.split('\n');
        return (
            <div className="patch-viewer">
                {lines.map((line, i) => (
                    <div key={i} className={`patch-line ${line.startsWith('-') ? 'line-del' : line.startsWith('+') ? 'line-add' : ''}`}>
                        {line.startsWith('-') ? '↩ Ordem anterior' : line.startsWith('+') ? '↪ Nova ordem' : line}
                    </div>
                ))}
            </div>
        );
    }

    // Para MODIFIED, parsear Unified Diff
    const lines = patch.split('\n');
    const displayLines = [];

    for (const line of lines) {
        // Skip headers
        if (line.startsWith('Index:') || line.startsWith('===') ||
            line.startsWith('---') || line.startsWith('+++')) continue;

        if (line.startsWith('@@')) {
            displayLines.push({ type: 'hunk', text: line });
        } else if (line.startsWith('-')) {
            displayLines.push({ type: 'del', text: line.substring(1) });
        } else if (line.startsWith('+')) {
            displayLines.push({ type: 'add', text: line.substring(1) });
        } else if (line.startsWith(' ')) {
            displayLines.push({ type: 'ctx', text: line.substring(1) });
        }
    }

    if (displayLines.length === 0) {
        return <div className="patch-empty">Alteração em propriedades (não textual)</div>;
    }

    return (
        <div className="patch-viewer">
            {displayLines.map((dl, i) => (
                <div key={i} className={`patch-line ${dl.type === 'del' ? 'line-del' : dl.type === 'add' ? 'line-add' : dl.type === 'hunk' ? 'line-hunk' : 'line-ctx'}`}>
                    {dl.type === 'del' && <span className="line-prefix">−</span>}
                    {dl.type === 'add' && <span className="line-prefix">+</span>}
                    {dl.type === 'ctx' && <span className="line-prefix"> </span>}
                    {dl.type === 'hunk' && <span className="line-prefix">⋯</span>}
                    <span className="line-text">{dl.text}</span>
                </div>
            ))}
        </div>
    );
}

// ── Componente Principal ─────────────────────────────────────

function HistoryTabContent({ projectId }) {
    const { listCommits, getCommitDiffs } = useBackend();
    const [commits, setCommits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedCommit, setExpandedCommit] = useState(null);
    const [diffs, setDiffs] = useState([]);
    const [loadingDiffs, setLoadingDiffs] = useState(false);

    const fetchCommits = useCallback(async () => {
        if (!projectId || projectId === 'new') return;
        setLoading(true);
        const result = await listCommits(projectId);
        if (result.success) {
            setCommits(result.commits || []);
        }
        setLoading(false);
    }, [projectId, listCommits]);

    useEffect(() => {
        fetchCommits();
    }, [fetchCommits]);

    const handleExpandCommit = useCallback(async (commitId) => {
        if (expandedCommit === commitId) {
            setExpandedCommit(null);
            setDiffs([]);
            return;
        }
        setExpandedCommit(commitId);
        setLoadingDiffs(true);
        const result = await getCommitDiffs(commitId);
        if (result.success) {
            setDiffs(result.diffs || []);
        }
        setLoadingDiffs(false);
    }, [expandedCommit, getCommitDiffs]);

    if (!projectId || projectId === 'new') {
        return (
            <div className="history-empty">
                <div className="history-empty-icon">📝</div>
                <div>Salve o projeto para iniciar o histórico.</div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="history-loading">
                <div className="history-spinner" />
                <div>Carregando histórico...</div>
            </div>
        );
    }

    if (commits.length === 0) {
        return (
            <div className="history-empty">
                <div className="history-empty-icon">📋</div>
                <div>Nenhum registro ainda.</div>
                <div className="history-empty-hint">
                    Use <kbd>Ctrl+S</kbd> ou o botão Salvar para registrar alterações no histórico.
                </div>
            </div>
        );
    }

    return (
        <div className="history-tab">
            <div className="history-header">
                <span className="history-count">{commits.length} commit{commits.length !== 1 ? 's' : ''}</span>
                <button className="btn btn-ghost btn-sm" onClick={fetchCommits} title="Atualizar">↻</button>
            </div>

            <div className="history-timeline">
                {commits.map((commit) => (
                    <div key={commit.id} className={`history-commit ${expandedCommit === commit.id ? 'expanded' : ''}`}>
                        <button
                            className="history-commit-header"
                            onClick={() => handleExpandCommit(commit.id)}
                        >
                            <div className="commit-dot" />
                            <div className="commit-info">
                                <div className="commit-message">{commit.message}</div>
                                <div className="commit-time">{formatDate(commit.timestamp)}</div>
                            </div>
                            <div className={`commit-chevron ${expandedCommit === commit.id ? 'open' : ''}`}>▾</div>
                        </button>

                        {expandedCommit === commit.id && (
                            <div className="history-diffs">
                                {loadingDiffs ? (
                                    <div className="history-loading-inline">
                                        <div className="history-spinner small" />
                                    </div>
                                ) : diffs.length === 0 ? (
                                    <div className="diff-empty">Sem alterações registradas</div>
                                ) : (
                                    diffs.map((d) => (
                                        <div key={d.id} className="diff-entry">
                                            <div className="diff-header">
                                                <span className={changeTypeBadgeClass(d.change_type)}>
                                                    {changeTypeLabel(d.change_type)}
                                                </span>
                                                <span className="diff-block-type">
                                                    {blockTypeLabel(d.block_id, d.block_type)}
                                                </span>
                                            </div>
                                            <PatchViewer patch={d.patch} changeType={d.change_type} />
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Export com ErrorBoundary ──────────────────────────────────

export function HistoryTab({ projectId }) {
    return (
        <ErrorBoundary>
            <HistoryTabContent projectId={projectId} />
        </ErrorBoundary>
    );
}
