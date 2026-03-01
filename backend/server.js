const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const os = require('os');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

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
app.post('/api/compile', async (req, res) => {
    const { tex_content, engine = 'pdflatex', job_id = uuidv4(), assets = {} } = req.body;

    if (!tex_content) {
        return res.status(400).json({ error: 'tex_content is obrigatório' });
    }

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

// Save project endpoint
app.post('/api/project/save', (req, res) => {
    const { project_data, filename } = req.body;
    const projectsDir = path.join(os.homedir(), 'BlockTeX_Projects');
    if (!fs.existsSync(projectsDir)) fs.mkdirSync(projectsDir, { recursive: true });

    const sanitizedName = (filename || 'untitled').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(projectsDir, `${sanitizedName}.btx`);
    fs.writeFileSync(filePath, JSON.stringify(project_data, null, 2), 'utf8');
    res.json({ success: true, path: filePath });
});

// Load project endpoint
app.get('/api/project/load/:filename', (req, res) => {
    const projectsDir = path.join(os.homedir(), 'BlockTeX_Projects');
    const filePath = path.join(projectsDir, `${req.params.filename}.btx`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Project not found' });
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json({ success: true, data });
});

// List projects
app.get('/api/projects', (req, res) => {
    const projectsDir = path.join(os.homedir(), 'BlockTeX_Projects');
    if (!fs.existsSync(projectsDir)) return res.json({ projects: [] });
    const files = fs.readdirSync(projectsDir).filter(f => f.endsWith('.btx'));
    res.json({ projects: files.map(f => ({ name: f.replace('.btx', ''), filename: f })) });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`✅ BlockTeX Backend running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket server on ws://localhost:${PORT}`);
});
