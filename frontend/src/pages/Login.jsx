import React, { useState } from 'react';

export function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

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
                localStorage.setItem('blocktex_token', data.token);
                window.location.href = '/';
            } else {
                setError(data.error || 'Erro ao realizar login.');
            }
        } catch (err) {
            setError('Falha na conexão com o servidor.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f3f4f6' }}>
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
                <h1 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#111827', fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'sans-serif' }}>BlockTeX Login</h1>
                
                {error && (
                    <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem', fontFamily: 'sans-serif' }}>
                        {error}
                    </div>
                )}
                
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontFamily: 'sans-serif' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#374151' }}>Email</label>
                        <input 
                            type="email" 
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#374151' }}>Senha</label>
                        <input 
                            type="password" 
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box' }}
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={loading}
                        style={{ width: '100%', padding: '0.75rem', backgroundColor: '#111827', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '0.5rem' }}
                    >
                        {loading ? 'Entrando...' : 'Acessar IDE'}
                    </button>
                </form>
            </div>
        </div>
    );
}
