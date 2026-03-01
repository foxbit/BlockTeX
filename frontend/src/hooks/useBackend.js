import { useState, useEffect, useCallback } from 'react';

// Usa caminhos relativos → passa pelo proxy do Vite (evita CORS)
// Em dev: Vite redireciona /api/* → http://localhost:3001/api/*
const API_BASE = '/api';

// WebSocket aponta direto para o backend (WS não passa por proxy Vite)
const WS_HOST = 'ws://localhost:3001';

// Helper: fetch com timeout configurável
async function fetchWithTimeout(url, options = {}, timeoutMs = 120000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timer);
        return res;
    } catch (e) {
        clearTimeout(timer);
        if (e.name === 'AbortError') throw new Error(`Timeout: o servidor demorou mais de ${timeoutMs / 1000}s para responder`);
        throw e;
    }
}

export function useBackend() {
    const [status, setStatus] = useState({ connected: false, engines: {}, checking: true });
    const [ws, setWs] = useState(null);
    const [logs, setLogs] = useState([]);

    // Health check
    const checkHealth = useCallback(async () => {
        try {
            const res = await fetchWithTimeout(`${API_BASE}/health`, {}, 8000);
            const data = await res.json();
            setStatus({ connected: true, ...data, checking: false });
        } catch (e) {
            setStatus({ connected: false, checking: false, engines: {} });
        }
    }, []);

    useEffect(() => {
        checkHealth();
        const interval = setInterval(checkHealth, 15000);
        return () => clearInterval(interval);
    }, [checkHealth]);

    // WebSocket for real-time logs
    useEffect(() => {
        let socket;
        let retryTimeout;

        const connect = () => {
            try {
                socket = new WebSocket(WS_HOST);
                socket.onopen = () => setWs(socket);
                socket.onmessage = (e) => {
                    try {
                        const data = JSON.parse(e.data);
                        if (data.type === 'log') {
                            setLogs(prev => [...prev.slice(-500), { type: 'log', content: data.message, ts: Date.now() }]);
                        } else if (data.type === 'compile_success') {
                            setLogs(prev => [...prev, { type: 'success', content: '✅ Compilação concluída com sucesso!', ts: Date.now() }]);
                        } else if (data.type === 'compile_error') {
                            setLogs(prev => [...prev, { type: 'error', content: `❌ Erro de compilação detectado.`, ts: Date.now() }]);
                        } else if (data.type === 'compile_start') {
                            setLogs(prev => [...prev, { type: 'info', content: `🔄 Iniciando compilação (job: ${data.job_id?.substring(0, 8)}...)`, ts: Date.now() }]);
                        }
                    } catch { }
                };
                socket.onclose = () => {
                    setWs(null);
                    retryTimeout = setTimeout(connect, 5000);
                };
                socket.onerror = () => socket.close();
            } catch { }
        };

        connect();
        return () => {
            clearTimeout(retryTimeout);
            if (socket) socket.close();
        };
    }, []);

    // Compile
    const compile = useCallback(async (texContent, engine = 'pdflatex', assets = {}) => {
        setLogs(prev => [...prev, { type: 'info', content: `> Enviando documento para compilação...`, ts: Date.now() }]);
        try {
            const res = await fetchWithTimeout(`${API_BASE}/compile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tex_content: texContent, engine, assets }),
            }, 120000); // 2 min timeout para compilações grandes
            const data = await res.json();
            return data;
        } catch (e) {
            const msg = e.message.includes('Failed to fetch')
                ? 'Backend offline. Inicie o servidor: cd backend && node server.js'
                : `Erro: ${e.message}`;
            setLogs(prev => [...prev, { type: 'error', content: `❌ ${msg}`, ts: Date.now() }]);
            return { success: false, errors: [{ message: msg }] };
        }
    }, []);

    // Save project
    const saveProject = useCallback(async (projectData, filename) => {
        try {
            const res = await fetchWithTimeout(`${API_BASE}/project/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_data: projectData, filename }),
            }, 10000);
            return await res.json();
        } catch (e) {
            return { success: false, error: e.message };
        }
    }, []);

    // Load project list
    const listProjects = useCallback(async () => {
        try {
            const res = await fetchWithTimeout(`${API_BASE}/projects`, {}, 8000);
            const data = await res.json();
            return data.projects || [];
        } catch {
            return [];
        }
    }, []);

    const clearLogs = useCallback(() => setLogs([]), []);

    return { status, logs, compile, saveProject, listProjects, clearLogs, checkHealth };
}
