import { v4 as uuidv4 } from 'uuid';
import { BLOCK_TYPES, BLOCK_TYPE_META } from '../lib/blockTypes.js';


// ============================================================
// Conversor Markdown -> HTML leve para migração de dados
// ============================================================
function markdownToHtml(md) {
    if (!md) return '';
    
    // Se já parecer HTML, não converte
    const trimmed = md.trimStart();
    if (trimmed.startsWith('<')) return md;

    // Normaliza quebras de linha e escapes legados de quebra de linha
    let text = md.replace(/\\\s*$/gm, '<br>')
                 .replace(/\\\\\s*$/gm, '<br>');

    const lines = text.split('\n');
    const blocks = [];
    let inList = false;
    let listType = null; // 'ul' | 'ol'
    let inCode = false;
    let codeContent = [];
    let codeLang = '';
    let inQuote = false;
    let quoteContent = [];

    const closeList = () => {
        if (inList) {
            blocks.push(`</${listType}>`);
            inList = false;
            listType = null;
        }
    };

    const closeCode = () => {
        if (inCode) {
            const escapedCode = codeContent.join('\n')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            const langAttr = codeLang ? ` class="language-${codeLang}"` : '';
            blocks.push(`<pre><code${langAttr}>${escapedCode}</code></pre>`);
            inCode = false;
            codeContent = [];
            codeLang = '';
        }
    };

    const closeQuote = () => {
        if (inQuote) {
            const innerHtml = quoteContent.map(line => `<p>${inlineMarkdownToHtml(line)}</p>`).join('');
            blocks.push(`<blockquote>${innerHtml}</blockquote>`);
            inQuote = false;
            quoteContent = [];
        }
    };

    const inlineMarkdownToHtml = (str) => {
        let t = str;
        // Negrito + Itálico (***)
        t = t.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
        // Negrito (**)
        t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        t = t.replace(/__(.+?)__/g, '<strong>$1</strong>');
        // Itálico (*)
        t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
        t = t.replace(/_([^_]+)_/g, '<em>$1</em>');
        // Código inline (`)
        t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
        // Links [text](url)
        t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
        return t;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Bloco de código
        if (line.trim().startsWith('```')) {
            if (inCode) {
                closeCode();
            } else {
                closeList();
                closeQuote();
                inCode = true;
                codeLang = line.trim().slice(3).trim();
            }
            continue;
        }
        if (inCode) {
            codeContent.push(line);
            continue;
        }

        // Citações (blockquote)
        const quoteMatch = line.match(/^>\s?(.*)/);
        if (quoteMatch) {
            closeList();
            closeCode();
            inQuote = true;
            quoteContent.push(quoteMatch[1]);
            continue;
        } else if (inQuote && line.trim() !== '') {
            quoteContent.push(line);
            continue;
        } else if (inQuote && line.trim() === '') {
            closeQuote();
            continue;
        }

        // Separador (hr)
        if (line.match(/^[-*_]{3,}$/)) {
            closeList();
            closeCode();
            closeQuote();
            blocks.push('<hr>');
            continue;
        }

        // Headings
        const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
            closeList();
            closeCode();
            closeQuote();
            const level = headingMatch[1].length;
            const content = inlineMarkdownToHtml(headingMatch[2].trim());
            blocks.push(`<h${level}>${content}</h${level}>`);
            continue;
        }

        // Listas
        const ulMatch = line.match(/^[-*+]\s+(.+)$/);
        const olMatch = line.match(/^(\d+)\.\s+(.+)$/);

        if (ulMatch) {
            if (!inList || listType !== 'ul') {
                closeList();
                closeCode();
                closeQuote();
                inList = true;
                listType = 'ul';
                blocks.push('<ul>');
            }
            blocks.push(`<li>${inlineMarkdownToHtml(ulMatch[1].trim())}</li>`);
            continue;
        }

        if (olMatch) {
            if (!inList || listType !== 'ol') {
                closeList();
                closeCode();
                closeQuote();
                inList = true;
                listType = 'ol';
                blocks.push('<ol>');
            }
            blocks.push(`<li>${inlineMarkdownToHtml(olMatch[2].trim())}</li>`);
            continue;
        }

        // Linha em branco
        if (line.trim() === '') {
            closeList();
            closeQuote();
            continue;
        }

        // Parágrafo normal
        closeList();
        closeCode();
        closeQuote();
        blocks.push(`<p>${inlineMarkdownToHtml(line.trim())}</p>`);
    }

    closeList();
    closeCode();
    closeQuote();

    return blocks.join('');
}

// ============================================================
// Default project structure
// ============================================================
export const DEFAULT_PROJECT = {
    metadata: {
        title: 'Meu Livro',
        author: 'Autor',
        date: '\\today',
        description: '',
    },
    global_setup: {
        paper: 'a5',
        mirror: true,
        font: 'default',
        baseSize: '11pt',
        bleed: false,
        engine: 'pdflatex',
        innerMargin: '25mm',
        outerMargin: '20mm',
        topMargin: '25mm',
        bottomMargin: '20mm',
        headerStyleEven: 'chapter', // 'none', 'title', 'author', 'chapter', 'custom'
        headerCustomEven: '',
        headerStyleOdd: 'chapter', // 'none', 'title', 'author', 'chapter', 'custom'
        headerCustomOdd: '',
        // ── Tipografia do corpo (aplicada apenas em blocos CHAPTER e CONTENT) ──
        parindent:      '0pt',       // recuo da 1ª linha do parágrafo
        parskip:        '8pt',       // espaço entre parágrafos
        bodyLinespread: null,        // null = herda do tema; ex: '1.25'
        bodyJustify:    'justified', // 'justified' | 'raggedright' | 'raggedleft' | 'centering'
        hyphenation:    true,        // false = desativa hifenização
        orphanWidow:    'moderate',  // 'light'(500) | 'moderate'(1000) | 'strict'(10000)
    },
    blocks: [],
};

// ============================================================
// Create a new block
// ============================================================
export function createBlock(type) {
    const meta = BLOCK_TYPE_META[type];

    // Define quebra padrão
    let defaultPageBreak = 'none';
    if (type === BLOCK_TYPES.CHAPTER || 
        type === BLOCK_TYPES.CONTENT || 
        type === BLOCK_TYPES.TOC || 
        type === BLOCK_TYPES.TESTIMONIAL) {
        defaultPageBreak = 'before';
    }

    return {
        id: uuidv4(),
        type,
        content: meta?.default_content || '',
        style_id: null,
        style_variables: {
            color: '#6366f1',
            caption: '',
            width: '0.8',
        },
        config: {
            toc_headers: { h1: true, h2: true, h3: false },
            toc_visible: true,
            page_break: defaultPageBreak, // 'none' | 'before' | 'isolated'
            valign: 'top', // 'top' | 'middle' | 'bottom'
        },
        collapsed: false,
    };
}

// ============================================================
// Project state manager (plain functions, no external lib)
// ============================================================
export class ProjectStore {
    constructor(initialProject = null) {
        this._project = initialProject ? structuredClone(initialProject) : structuredClone(DEFAULT_PROJECT);
        this._listeners = new Set();
        this._history = [structuredClone(this._project)];
        this._historyIndex = 0;
    }

    subscribe(listener) {
        this._listeners.add(listener);
        return () => this._listeners.delete(listener);
    }

    _notify() {
        // IMPORTANTE: cria uma nova referência para o React detectar a mudança
        const snapshot = { ...this._project, blocks: [...this._project.blocks] };
        this._listeners.forEach(fn => fn(snapshot));
    }

    _pushHistory() {
        // Remove any redo history
        this._history = this._history.slice(0, this._historyIndex + 1);
        this._history.push(structuredClone(this._project));
        
        const MAX_HISTORY = 50;
        if (this._history.length > MAX_HISTORY) {
            this._history = this._history.slice(-MAX_HISTORY);
        }
        this._historyIndex = this._history.length - 1;
    }

    get() {
        // Retorna snapshot para garantir imutabilidade e detecção de mudanças pelo React
        return { ...this._project, blocks: [...this._project.blocks] };
    }

    undo() {
        if (this._historyIndex > 0) {
            this._historyIndex--;
            this._project = structuredClone(this._history[this._historyIndex]);
            this._notify();
        }
    }

    redo() {
        if (this._historyIndex < this._history.length - 1) {
            this._historyIndex++;
            this._project = structuredClone(this._history[this._historyIndex]);
            this._notify();
        }
    }

    canUndo() { return this._historyIndex > 0; }
    canRedo() { return this._historyIndex < this._history.length - 1; }

    updateMetadata(metadata) {
        this._project.metadata = { ...this._project.metadata, ...metadata };
        this._pushHistory();
        this._notify();
    }

    updateGlobalSetup(setup) {
        this._project.global_setup = { ...this._project.global_setup, ...setup };
        this._pushHistory();
        this._notify();
    }

    addBlock(type, afterId = null) {
        const block = createBlock(type);
        if (afterId) {
            const idx = this._project.blocks.findIndex(b => b.id === afterId);
            this._project.blocks.splice(idx + 1, 0, block);
        } else {
            this._project.blocks.push(block);
        }
        this._pushHistory();
        this._notify();
        return block.id;
    }

    updateBlock(id, updates) {
        const idx = this._project.blocks.findIndex(b => b.id === id);
        if (idx === -1) return;
        this._project.blocks[idx] = { ...this._project.blocks[idx], ...updates };
        this._pushHistory();
        this._notify();
    }

    updateBlockContent(id, content) {
        const idx = this._project.blocks.findIndex(b => b.id === id);
        if (idx === -1) return;
        // Cria novo array para o React detectar a mudança (imutabilidade)
        const newBlocks = [...this._project.blocks];
        newBlocks[idx] = { ...newBlocks[idx], content };
        this._project.blocks = newBlocks;
        this._notify(); // Don't push history on every keystroke
    }

    commitBlockContent(id) {
        // Call after editing is done (blur)
        this._pushHistory();
    }

    updateBlockConfig(id, config) {
        const idx = this._project.blocks.findIndex(b => b.id === id);
        if (idx === -1) return;
        this._project.blocks[idx].config = { ...this._project.blocks[idx].config, ...config };
        this._pushHistory();
        this._notify();
    }

    updateBlockStyleVars(id, vars) {
        const idx = this._project.blocks.findIndex(b => b.id === id);
        if (idx === -1) return;
        this._project.blocks[idx].style_variables = { ...this._project.blocks[idx].style_variables, ...vars };
        this._pushHistory();
        this._notify();
    }

    removeBlock(id) {
        this._project.blocks = this._project.blocks.filter(b => b.id !== id);
        this._pushHistory();
        this._notify();
    }

    moveBlock(fromId, toId, position = 'after') {
        const blocks = [...this._project.blocks];
        const fromIdx = blocks.findIndex(b => b.id === fromId);
        const toIdx = blocks.findIndex(b => b.id === toId);
        if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;

        const [moved] = blocks.splice(fromIdx, 1);
        const insertIdx = position === 'before'
            ? (fromIdx < toIdx ? toIdx - 1 : toIdx)
            : (fromIdx < toIdx ? toIdx : toIdx + 1);
        blocks.splice(insertIdx, 0, moved);
        this._project.blocks = blocks;
        this._pushHistory();
        this._notify();
    }

    duplicateBlock(id) {
        const idx = this._project.blocks.findIndex(b => b.id === id);
        if (idx === -1) return;
        const copy = structuredClone(this._project.blocks[idx]);
        copy.id = uuidv4();
        this._project.blocks.splice(idx + 1, 0, copy);
        this._pushHistory();
        this._notify();
        return copy.id;
    }

    loadProject(projectData) {
        const existingId = this._project?.id;
        this._project = structuredClone(projectData);
        if (!this._project.id && existingId) {
            this._project.id = existingId;
        }

        // Migração de blocos legados e conversão Markdown -> HTML nativo
        if (this._project.blocks) {
            this._project.blocks.forEach(b => {
                // Converte conteúdo legado Markdown para HTML nativo
                if (b.content && typeof b.content === 'string') {
                    b.content = markdownToHtml(b.content);
                }

                // Nomenclatura antiga
                if (b.type === 'depoimento') b.type = 'testimonial';
                if (b.type === 'image')       b.type = 'image';

                // Unificação: bloco 'content' (Texto) agora é 'chapter'
                if (b.type === 'content') b.type = 'chapter';

                // image_inline → image (sem página própria)
                if (b.type === 'image_inline') {
                    b.type = 'image';
                    b.style_variables = { ...(b.style_variables || {}), exclusivePage: false };
                }

                // image_page → image (com página própria ativada)
                if (b.type === 'image_page') {
                    b.type = 'image';
                    b.style_variables = { ...(b.style_variables || {}), exclusivePage: true };
                }

                // image_double → image_grid (layout side-by-side)
                if (b.type === 'image_double') {
                    b.type = 'image_grid';
                    b.style_variables = {
                        ...(b.style_variables || {}),
                        gridLayout: 'side-by-side',
                    };
                }

                // image_stack → image_grid (layout stacked)
                if (b.type === 'image_stack') {
                    b.type = 'image_grid';
                    b.style_variables = {
                        ...(b.style_variables || {}),
                        gridLayout: 'stacked',
                    };
                }
            });
        }

        this._history = [structuredClone(this._project)];
        this._historyIndex = 0;
        this._notify();
    }

    exportJson() {
        return JSON.stringify(this._project, null, 2);
    }
}
