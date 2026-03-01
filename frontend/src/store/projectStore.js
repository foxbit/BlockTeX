import { v4 as uuidv4 } from 'uuid';
import { BLOCK_TYPES, BLOCK_TYPE_META } from '../lib/blockTypes.js';

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
    },
    blocks: [],
};

// ============================================================
// Create a new block
// ============================================================
export function createBlock(type) {
    const meta = BLOCK_TYPE_META[type];
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
            page_break: 'none', // 'none' | 'before' | 'isolated'
        },
        collapsed: false,
    };
}

// ============================================================
// Project state manager (plain functions, no external lib)
// ============================================================
export class ProjectStore {
    constructor(initialProject = null) {
        this._project = initialProject ? JSON.parse(JSON.stringify(initialProject)) : JSON.parse(JSON.stringify(DEFAULT_PROJECT));
        this._listeners = new Set();
        this._history = [JSON.parse(JSON.stringify(this._project))];
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
        this._history.push(JSON.parse(JSON.stringify(this._project)));
        this._historyIndex = this._history.length - 1;
    }

    get() {
        // Retorna snapshot para garantir imutabilidade e detecção de mudanças pelo React
        return { ...this._project, blocks: [...this._project.blocks] };
    }

    undo() {
        if (this._historyIndex > 0) {
            this._historyIndex--;
            this._project = JSON.parse(JSON.stringify(this._history[this._historyIndex]));
            this._notify();
        }
    }

    redo() {
        if (this._historyIndex < this._history.length - 1) {
            this._historyIndex++;
            this._project = JSON.parse(JSON.stringify(this._history[this._historyIndex]));
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
        const copy = JSON.parse(JSON.stringify(this._project.blocks[idx]));
        copy.id = uuidv4();
        this._project.blocks.splice(idx + 1, 0, copy);
        this._pushHistory();
        this._notify();
        return copy.id;
    }

    loadProject(projectData) {
        this._project = JSON.parse(JSON.stringify(projectData));
        this._history = [JSON.parse(JSON.stringify(this._project))];
        this._historyIndex = 0;
        this._notify();
    }

    exportJson() {
        return JSON.stringify(this._project, null, 2);
    }
}
