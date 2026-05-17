import { useRef, useEffect } from 'react';
import Lottie from 'lottie-react';
import fileSearchAnimation from '../assets/File Search.json';

export function LogConsole({ logs, open, onClose }) {
    const bodyRef = useRef(null);

    useEffect(() => {
        if (bodyRef.current && open) {
            bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
        }
    }, [logs, open]);

    const getLineClass = (type) => {
        switch (type) {
            case 'error': return 'log-line error';
            case 'success': return 'log-line success';
            case 'info': return 'log-line info';
            case 'warning': return 'log-line warning';
            default: return 'log-line';
        }
    };

    if (!open) return null;

    return (
        <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div className="modal" style={{ maxWidth: '600px', width: '100%', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-header" style={{ flexDirection: 'column', alignItems: 'center', borderBottom: 'none', paddingBottom: '0' }}>
                    <Lottie
                        animationData={fileSearchAnimation}
                        loop={true}
                        style={{ width: 120, height: 120 }}
                    />
                    <h2 className="modal-title" style={{ marginTop: '12px', textAlign: 'center' }}>
                        Compilando PDF...
                    </h2>
                </div>

                <div className="modal-body" style={{ padding: '20px' }}>
                    <div
                        className="log-body"
                        ref={bodyRef}
                        style={{
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            height: '200px',
                            overflowY: 'auto',
                            padding: '12px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '12px',
                        }}
                    >
                        {logs.length === 0 ? (
                            <div className="log-line" style={{ opacity: 0.5 }}>
                                Aguardando comunicação com o servidor...
                            </div>
                        ) : (
                            logs.map((log, i) => (
                                <div key={i} className={getLineClass(log.type)}>
                                    {log.content}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="modal-footer" style={{ justifyContent: 'center' }}>
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancelar e Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}
