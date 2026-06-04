import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const DEMO_EMAIL = 'admin@blocktext.com.br';
const DEMO_PASSWORD = 'admin123';

export function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const { login } = useAuth();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            
            if (res.ok && data.success) {
                login(data.token);
            } else {
                setError(data.error || 'Erro ao realizar login.');
            }
        } catch (err) {
            setError('Falha na conexão com o servidor.');
        } finally {
            setLoading(false);
        }
    };

    const handleAutoFill = () => {
        setEmail(DEMO_EMAIL);
        setPassword(DEMO_PASSWORD);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <h1 className="login-title">BlockTeX Login</h1>
                
                {error && (
                    <div className="login-error">
                        {error}
                    </div>
                )}
                
                <form onSubmit={handleLogin} className="login-form">
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input 
                            type="email" 
                            className="form-input"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Senha</label>
                        <input 
                            type="password" 
                            className="form-input"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="btn btn-compile"
                        style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
                    >
                        {loading ? 'Entrando...' : 'Acessar IDE'}
                    </button>
                </form>

                {/* Credenciais de acesso padrão */}
                <div className="login-demo-box">
                    <div className="login-demo-header">
                        <span className="login-demo-icon">🔑</span>
                        <span className="login-demo-title">Acesso Padrão</span>
                    </div>
                    <div className="login-demo-credentials">
                        <div className="login-demo-row">
                            <span className="login-demo-label">Usuário</span>
                            <code className="login-demo-value">{DEMO_EMAIL}</code>
                        </div>
                        <div className="login-demo-row">
                            <span className="login-demo-label">Senha</span>
                            <code className="login-demo-value">{DEMO_PASSWORD}</code>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="login-demo-btn"
                        onClick={handleAutoFill}
                    >
                        {copied ? '✓ Preenchido!' : '⚡ Preencher automaticamente'}
                    </button>
                </div>
            </div>
        </div>
    );
}
