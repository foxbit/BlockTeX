import { useRef, useEffect } from 'react';

export function LogConsole({ logs, open, onToggle, onClear }) {
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

    return (
        <div className={`log-console ${open ? 'open' : ''}`}>
            <div className="log-header">
                <span className="log-title">
                    🖥 Console de Compilação
                    {logs.length > 0 && (
                        <span style={{ marginLeft: '8px', color: 'var(--text-muted)', fontWeight: 400 }}>
                            ({logs.length} eventos)
                        </span>
                    )}
                </span>
                <button
                    className="btn btn-ghost"
                    style={{ padding: '2px 8px', fontSize: '11px' }}
                    onClick={onClear}
                >
                    Limpar
                </button>
                <button
                    className="btn btn-ghost btn-icon"
                    onClick={onToggle}
                    title={open ? 'Fechar console' : 'Abrir console'}
                >
                    {open ? '↓' : '↑'}
                </button>
            </div>

            {open && (
                <div className="log-body" ref={bodyRef}>
                    {logs.length === 0 ? (
                        <div className="log-line" style={{ opacity: 0.5 }}>
                            Aguardando compilação...
                        </div>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i} className={getLineClass(log.type)}>
                                {log.content}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
