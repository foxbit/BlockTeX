import { Component } from 'react';

export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(err, info) {
        console.error('ErrorBoundary caught:', err, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-fallback" style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: 'var(--text-secondary, #888)',
                    fontSize: '13px'
                }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>⚠️</div>
                    <div>Não foi possível exibir este conteúdo.</div>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        style={{
                            marginTop: '12px',
                            padding: '6px 16px',
                            border: '1px solid var(--border, #333)',
                            borderRadius: '6px',
                            background: 'var(--bg-secondary, #1e1e1e)',
                            color: 'var(--text, #ccc)',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        Tentar novamente
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
