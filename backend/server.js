const fs = require('fs');
const path = require('path');

// Tenta carregar .env da raiz do projeto, ou do diretório atual
const rootEnvPath = path.join(__dirname, '../.env');
if (fs.existsSync(rootEnvPath)) {
    require('dotenv').config({ path: rootEnvPath });
} else {
    require('dotenv').config();
}

const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const { exec, spawn } = require('child_process');
const os = require('os');
const { GoogleGenAI } = require('@google/genai');

// Integração com Banco de Dados SQLite
const db = require('./database');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const url = require('url');
const { authenticate, SECRET_KEY } = require('./auth');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
    const parsedUrl = url.parse(request.url, true);
    const token = parsedUrl.query.token;

    if (!token) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
    }

    try {
        jwt.verify(token, SECRET_KEY);
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    } catch (err) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
    }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// WebSocket clients map
const wsClients = new Map();

wss.on('connection', (ws) => {
    const clientId = uuidv4();
    wsClients.set(clientId, ws);
    ws.send(JSON.stringify({ type: 'connected', clientId }));
    ws.on('close', () => wsClients.delete(clientId));
});

function broadcast(data) {
    const msg = JSON.stringify(data);
    wsClients.forEach((ws) => {
        if (ws.readyState === 1) ws.send(msg);
    });
}

// Temp directory for compilation jobs
const WORK_DIR = path.join(os.tmpdir(), 'blocktex');
if (!fs.existsSync(WORK_DIR)) fs.mkdirSync(WORK_DIR, { recursive: true });

// Cleanup de arquivos temporários órfãos
const cleanupOldJobs = () => {
    try {
        if (!fs.existsSync(WORK_DIR)) return;
        const dirs = fs.readdirSync(WORK_DIR);
        const now = Date.now();
        for (const dir of dirs) {
            const dirPath = path.join(WORK_DIR, dir);
            const stat = fs.statSync(dirPath);
            if (now - stat.mtimeMs > 10 * 60 * 1000) {
                fs.rmSync(dirPath, { recursive: true, force: true });
            }
        }
    } catch (e) {
        console.error('Erro no cleanup:', e);
    }
};
cleanupOldJobs();
setInterval(cleanupOldJobs, 5 * 60 * 1000);

let activeCompilations = 0;
const MAX_COMPILATIONS = 2;

// Login endpoint
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    let user;
    try {
        user = await db.getUserByEmail(email);
    } catch (err) {
        console.error('Error fetching user', err);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }

    if (!user) {
        return res.status(401).json({ error: 'Email ou senha inválidos.' });
    }

    const isValidPassword = bcrypt.compareSync(password, user.password);
    if (!isValidPassword) {
        return res.status(401).json({ error: 'Email ou senha inválidos.' });
    }

    const token = jwt.sign({ email: user.email }, SECRET_KEY, { expiresIn: '7d' });
    res.json({ success: true, token });
});

// Check if LaTeX is installed
app.get('/api/health', (req, res) => {
    exec('which pdflatex || which lualatex', (err, stdout) => {
        const engines = {};
        exec('which pdflatex', (e1, o1) => {
            engines.pdflatex = !e1 && o1.trim().length > 0;
            exec('which lualatex', (e2, o2) => {
                engines.lualatex = !e2 && o2.trim().length > 0;
                res.json({
                    status: 'ok',
                    latex_available: engines.pdflatex || engines.lualatex,
                    engines,
                    node_version: process.version,
                });
            });
        });
    });
});

// Compile LaTeX endpoint
app.post('/api/compile', authenticate, async (req, res) => {
    if (activeCompilations >= MAX_COMPILATIONS) {
        return res.status(429).json({ error: 'Servidor ocupado. Tente novamente em instantes.' });
    }

    const { tex_content, engine = 'pdflatex', job_id = uuidv4(), assets = {} } = req.body;

    if (!tex_content) {
        return res.status(400).json({ error: 'tex_content is obrigatório' });
    }

    activeCompilations++;
    try {

    // ──── Verifica se o LaTeX está disponível ────────────────
    const latexBin = engine === 'lualatex' ? 'lualatex' : 'pdflatex';

    const latexAvailable = await new Promise((resolve) => {
        exec(`which ${latexBin}`, (err, stdout) => resolve(!err && stdout.trim().length > 0));
    });

    if (!latexAvailable) {
        const installMsg = `❌ ${latexBin} não encontrado no sistema.\n\nInstale o TeX Live executando no terminal:\n\n  sudo apt install texlive-latex-extra texlive-fonts-recommended texlive-lang-portuguese\n\nOu, para instalação completa (recomendado):\n  sudo apt install texlive-full`;
        broadcast({ type: 'log', job_id, message: installMsg });
        broadcast({ type: 'compile_error', job_id });
        return res.json({
            success: false,
            job_id,
            errors: [{ message: `${latexBin} não instalado. Execute: sudo apt install texlive-latex-extra texlive-lang-portuguese` }],
            log: installMsg,
        });
    }

    // ──── Prepara diretório de trabalho ─────────────────────
    const jobDir = path.join(WORK_DIR, job_id);
    fs.mkdirSync(jobDir, { recursive: true });

    // Escreve assets (imagens base64)
    const assetsDir = path.join(jobDir, 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });

    for (const [filename, base64data] of Object.entries(assets)) {
        const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const dataBuffer = Buffer.from(base64data.replace(/^data:[^;]+;base64,/, ''), 'base64');
        fs.writeFileSync(path.join(assetsDir, sanitized), dataBuffer);
    }

    // Escreve o arquivo .tex
    const texFile = path.join(jobDir, 'document.tex');
    fs.writeFileSync(texFile, tex_content, 'utf8');

    broadcast({ type: 'compile_start', job_id });
    broadcast({ type: 'log', job_id, message: `> Iniciando compilação com ${latexBin}...\n` });

    // ──── Função para executar uma passada do LaTeX ──────────
    const runLatex = () => new Promise((resolve) => {
        let logOutput = '';

        const proc = spawn(latexBin, [
            '-interaction=nonstopmode',
            '-halt-on-error',
            `-output-directory=${jobDir}`,
            texFile,
        ]);

        proc.stdout.on('data', (data) => {
            const chunk = data.toString();
            logOutput += chunk;
            broadcast({ type: 'log', job_id, message: chunk });
        });

        proc.stderr.on('data', (data) => {
            const chunk = data.toString();
            logOutput += chunk;
            broadcast({ type: 'log', job_id, message: chunk });
        });

        proc.on('close', (code) => resolve({ code, log: logOutput }));
        proc.on('error', (err) => resolve({ code: -1, log: err.message }));
    });

    // ──── Executa LaTeX 2x (para TOC e referências) ─────────
    broadcast({ type: 'log', job_id, message: `> Passada 1/2...\n` });
    const run1 = await runLatex();

    let finalLog = run1.log;
    const pdfPath = path.join(jobDir, 'document.pdf');

    if (run1.code === 0 && fs.existsSync(pdfPath)) {
        // Segunda passada para índice e referências cruzadas
        broadcast({ type: 'log', job_id, message: `\n> Passada 2/2 (TOC e referências)...\n` });
        const run2 = await runLatex();
        finalLog += '\n' + run2.log;
    }

    const pdfExists = fs.existsSync(pdfPath);

    if (pdfExists) {
        broadcast({ type: 'compile_success', job_id });
        broadcast({ type: 'log', job_id, message: `\n✅ PDF gerado com sucesso!\n` });
        const pdfBuffer = fs.readFileSync(pdfPath);
        const pdfBase64 = pdfBuffer.toString('base64');
        res.json({
            success: true,
            job_id,
            pdf_base64: pdfBase64,
            log: finalLog,
        });
    } else {
        const errors = parseLatexErrors(finalLog);
        broadcast({ type: 'compile_error', job_id, errors });
        if (errors.length === 0) {
            errors.push({ message: 'Compilação falhou. Verifique o console para detalhes.' });
        }
        res.json({
            success: false,
            job_id,
            errors,
            log: finalLog,
        });
    }

    // Limpa após 5 minutos
    setTimeout(() => {
        try { fs.rmSync(jobDir, { recursive: true }); } catch (e) { }
    }, 5 * 60 * 1000);

    } finally {
        activeCompilations--;
    }
});


// Parse LaTeX error log
function parseLatexErrors(log) {
    const errors = [];
    const lines = log.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('!')) {
            const errorMsg = line.substring(1).trim();
            let lineNum = null;
            // Look for line number in context
            for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
                const match = lines[j].match(/l\.(\d+)/);
                if (match) {
                    lineNum = parseInt(match[1]);
                    break;
                }
            }
            errors.push({ message: errorMsg, line: lineNum });
        }
    }
    return errors;
}

// ────────────────────────────────────────────────────────────
// API de Múltiplos Projetos e Banco de Dados
// ────────────────────────────────────────────────────────────

// Salvar/Criar Projeto
app.post('/api/project/save', authenticate, async (req, res) => {
    try {
        const { project_data } = req.body;
        // Assegurar ID para novos projetos que não têm
        if (!project_data.id) {
            project_data.id = uuidv4();
        }

        const result = await db.saveProject(project_data);
        res.json({ success: true, id: result.id, message: 'Projeto salvo no banco de dados' });
    } catch (err) {
        console.error('Erro ao salvar:', err);
        res.status(500).json({ error: 'Erro interno no banco de dados' });
    }
});

// Carregar Projeto (por ID)
app.get('/api/project/load/:id', authenticate, async (req, res) => {
    try {
        const data = await db.getProject(req.params.id);
        if (!data) return res.status(404).json({ error: 'Project not found' });
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: 'Database fetch error' });
    }
});

// Listar Projetos
app.get('/api/projects', authenticate, async (req, res) => {
    try {
        const projects = await db.listProjects();
        res.json({ projects });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Deletar Projeto
app.delete('/api/project/:id', authenticate, async (req, res) => {
    try {
        await db.deleteProject(req.params.id);
        res.json({ success: true, id: req.params.id });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete' });
    }
});

// Migrar legado (do localStorage para SQLite)
app.post('/api/project/migrate', authenticate, async (req, res) => {
    try {
        const { projects } = req.body; // array de object project_data legados
        const migratedIds = [];
        for (const p of projects || []) {
            if (!p.id) p.id = uuidv4();
            await db.saveProject(p);
            migratedIds.push(p.id);
        }
        res.json({ success: true, migrated: migratedIds });
    } catch (err) {
        console.error('Migration error', err);
        res.status(500).json({ error: 'Migration failed' });
    }
});

// ────────────────────────────────────────────────────────────
// API do Assistente de IA
// ────────────────────────────────────────────────────────────

// Obter configurações de IA do sistema (sem expor as chaves)
app.get('/api/ai/settings', authenticate, async (req, res) => {
    try {
        const hasOpenCodeKey = !!(process.env.OPENCODE_API_KEY && process.env.OPENCODE_API_KEY.trim());
        const provider = await db.getGlobalStyle('settings_ai_provider') || 'opencode';
        const model = await db.getGlobalStyle('settings_ai_model') || 'deepseek-v4-flash';
        res.json({
            success: true,
            provider,
            model,
            availableProviders: {
                opencode: hasOpenCodeKey
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao carregar configurações de IA' });
    }
});

// Salvar configurações de IA do sistema
app.post('/api/ai/settings', authenticate, async (req, res) => {
    try {
        const { provider, model } = req.body;
        if (provider) await db.setGlobalStyle('settings_ai_provider', provider);
        if (model) await db.setGlobalStyle('settings_ai_model', model);
        res.json({ success: true, message: 'Configurações salvas com sucesso' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao salvar configurações de IA' });
    }
});

// Transformação de texto usando IA (OpenCode / DeepSeek)
app.post('/api/ai/transform', authenticate, async (req, res) => {
    try {
        const { text, prompt } = req.body;
        
        if (!text || !prompt) {
            return res.status(400).json({ error: 'Texto e instrução do prompt são obrigatórios.' });
        }

        const apiKey = process.env.OPENCODE_API_KEY ? process.env.OPENCODE_API_KEY.trim() : null;
        if (!apiKey) {
            return res.status(400).json({ 
                error: 'A chave da API da OpenCode (OPENCODE_API_KEY) não está configurada no arquivo .env do servidor.' 
            });
        }

        const baseUrl = (process.env.OPENCODE_BASE_URL || 'https://console.opencode.ai/inference/openai/v1').trim();
        const model = await db.getGlobalStyle('settings_ai_model') || 'deepseek-v4-flash';

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: `Você é um assistente de edição de textos integrado ao BlockTeX. 
Sua tarefa é modificar o texto original fornecido seguindo estritamente a instrução do prompt do usuário. 
Retorne APENAS o texto modificado final em formato Markdown, sem comentários, sem explicações adicionais e sem blocos de código markdown.`
                    },
                    {
                        role: 'user',
                        content: `Texto Original:
"""
${text}
"""

Instrução/Prompt do usuário:
"${prompt}"`
                    }
                ],
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenCode API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const transformedText = data.choices?.[0]?.message?.content || '';
        res.json({ success: true, transformedText });
    } catch (err) {
        console.error('Erro na chamada da API de IA:', err);
        res.status(500).json({ error: `Erro no assistente de IA: ${err.message}` });
    }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`✅ BlockTeX Backend running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket server on ws://localhost:${PORT}`);
});
