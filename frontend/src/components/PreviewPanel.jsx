import { useState, useEffect } from 'react';
import { generateHtmlPreview } from '../lib/latexGenerator.js';

export function PreviewPanel({ open, onClose, pdfBase64, blocks, compiling }) {
    const [mode, setMode] = useState('html'); // 'html' | 'pdf'

    useEffect(() => {
        if (pdfBase64) setMode('pdf');
    }, [pdfBase64]);

    const htmlContent = generateHtmlPreview(blocks);

    return (
        <div className={`preview-panel ${open ? 'open' : ''}`}>
            <div className="preview-header">
                <h3>Preview</h3>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                        className={`btn ${mode === 'html' ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => setMode('html')}
                    >
                        HTML
                    </button>
                    <button
                        className={`btn ${mode === 'pdf' ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => setMode('pdf')}
                        disabled={!pdfBase64}
                        title={!pdfBase64 ? 'Compile para ver o PDF' : 'Ver PDF'}
                    >
                        PDF {pdfBase64 ? '✓' : '🔒'}
                    </button>
                    {pdfBase64 && (
                        <a
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '11px' }}
                            href={`data:application/pdf;base64,${pdfBase64}`}
                            download="documento.pdf"
                        >
                            ⬇ Baixar
                        </a>
                    )}
                </div>
                <button className="btn btn-ghost btn-icon" onClick={onClose} title="Fechar preview">✕</button>
            </div>

            <div className="preview-body">
                {compiling && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(13,15,20,0.7)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        zIndex: 10,
                    }}>
                        <div className="spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
                        <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Compilando documento...</div>
                    </div>
                )}

                {mode === 'html' ? (
                    <div style={{ overflow: 'auto', height: '100%', padding: '0' }}>
                        <div
                            className="html-preview"
                            style={{ minHeight: '100%', padding: '48px 60px' }}
                            dangerouslySetInnerHTML={{ __html: htmlContent || '<p style="color:#aaa">Adicione blocos para ver o preview</p>' }}
                        />
                    </div>
                ) : (
                    pdfBase64 ? (
                        <iframe
                            className="preview-pdf"
                            src={`data:application/pdf;base64,${pdfBase64}`}
                            title="PDF Preview"
                        />
                    ) : (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            gap: '12px',
                            color: 'var(--text-muted)',
                        }}>
                            <div style={{ fontSize: '40px' }}>📄</div>
                            <div style={{ fontSize: '13px' }}>Compile o documento para ver o PDF</div>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
