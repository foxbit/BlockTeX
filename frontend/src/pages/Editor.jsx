import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BlockLibrary } from '../components/BlockLibrary.jsx';
import { Canvas } from '../components/Canvas.jsx';
import { Inspector } from '../components/Inspector.jsx';
import { LogConsole } from '../components/LogConsole.jsx';
import { PreviewPanel } from '../components/PreviewPanel.jsx';
import { ExportTexModal } from '../components/Modals.jsx';
import { ProjectStore, DEFAULT_PROJECT } from '../store/projectStore.js';
import { generateTex } from '../lib/latexGenerator.js';
import { useBackend } from '../hooks/useBackend.js';
import { TipTapDrawer } from '../components/TipTapDrawer.jsx';
import { BLOCK_TYPES } from '../lib/blockTypes.js';

// ── Gear icon SVG ──────────────────────────────────────────────
const ChevronDown = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  // ── Store via useRef: sobrevive ao HMR do Vite ──────────────
  const storeRef = useRef(null);
  if (!storeRef.current) {
    // Tenta carregar autosave do localStorage na criação inicial
    let initialProject = null;
    try {
      const saved = localStorage.getItem('blocktex_autosave');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.blocks && parsed?.metadata) initialProject = parsed;
      }
    } catch { }
    storeRef.current = new ProjectStore(initialProject);
  }
  const store = storeRef.current;

  const [project, setProject] = useState(() => store.get());
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [pdfBase64, setPdfBase64] = useState(null);
  const [modal, setModal] = useState(null); // 'new' | 'save' | 'tex' | null
  const [editingBlockId, setEditingBlockId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [inspectorTab, setInspectorTab] = useState('block');
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef(null);

  const { status, logs, compile, saveProject, loadProject, clearLogs } = useBackend();
  const [loading, setLoading] = useState(true);

  // Load project by ID or init new
  useEffect(() => {
    async function init() {
      setLoading(true);
      if (id === 'new') {
        const metadataString = localStorage.getItem('blocktex_new_meta');
        let initialData = { ...DEFAULT_PROJECT };
        if (metadataString) {
          try {
            const parsedMeta = JSON.parse(metadataString);
            initialData.metadata = { ...initialData.metadata, ...parsedMeta.metadata };
            initialData.global_setup = { ...initialData.global_setup, ...parsedMeta.global_setup };
          } catch { }
          localStorage.removeItem('blocktex_new_meta');
        }
        store.loadProject(initialData);
      } else {
        const res = await loadProject(id);
        if (res.success && res.data) {
          store.loadProject(res.data);
        } else {
          showNotification('Erro ao carregar projeto ou não encontrado', 'error');
          setTimeout(() => navigate('/'), 2000);
          return;
        }
      }
      setProject(store.get());
      setLoading(false);
    }
    init();
  }, [id, loadProject, navigate, store]);

  // Assina o store para re-renderizar quando os dados mudam
  useEffect(() => {
    const unsub = store.subscribe(setProject);
    return unsub;
  }, [store]);

  // Auto-save no backend (ao invés de localStorage) em background para UX suave
  useEffect(() => {
    if (loading || id === 'new') return; // Não dá auto-save em projeto "New" sem ID ainda
    const timer = setTimeout(() => {
      saveProject(store.get());
    }, 2000); // 2s debounce
    return () => clearTimeout(timer);
  }, [project, store, loading, id, saveProject]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey)) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); store.undo(); }
        if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); store.redo(); }
        if (e.key === 's') { e.preventDefault(); handleSave(); }
        if (e.key === 'p') { e.preventDefault(); setShowPreview(p => !p); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [store]);

  // Gera o .tex a partir do estado atual do projeto (reativo)
  const getTexContent = useCallback(() => generateTex(project), [project]);

  const selectedBlock = useMemo(
    () => project.blocks.find(b => b.id === selectedBlockId) || null,
    [project.blocks, selectedBlockId]
  );

  const editingBlock = useMemo(
    () => project.blocks.find(b => b.id === editingBlockId) || null,
    [project.blocks, editingBlockId]
  );

  const showNotification = useCallback((msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Compile
  const handleCompile = useCallback(async () => {
    if (compiling) return;
    setCompiling(true);
    setShowLog(true);
    setPdfBase64(null);
    clearLogs();

    const compileAssets = {};
    project.blocks.forEach(block => {
      const sv = block.style_variables || {};
      if (block.type === BLOCK_TYPES.TESTIMONIAL && sv.imageBase64) {
        compileAssets[`depo_img_${block.id}.jpg`] = sv.imageBase64;
      }
      if (block.type === BLOCK_TYPES.IMAGE && sv.imageBase64) {
        const fn = (sv.filename || `img_${block.id}.jpg`).replace(/[^a-zA-Z0-9._-]/g, '_');
        compileAssets[fn] = sv.imageBase64;
      }
      if (block.type === BLOCK_TYPES.IMAGE_GRID) {
        [1, 2, 3, 4].forEach(i => {
          if (sv[`image${i}Base64`]) {
            const fn = (sv[`filename${i}`] || `img_grid_${i}_${block.id}.jpg`).replace(/[^a-zA-Z0-9._-]/g, '_');
            compileAssets[fn] = sv[`image${i}Base64`];
          }
        });
      }
    });

    const texContent = getTexContent();
    const result = await compile(texContent, project.global_setup.engine || 'pdflatex', compileAssets);

    setCompiling(false);

    if (result.success) {
      setPdfBase64(result.pdf_base64);
      setShowPreview(true);
      showNotification('✅ PDF compilado com sucesso!', 'success');
      setShowLog(false); // Fecha o modal automaticamente em caso de sucesso
    } else {
      const errorMsg = result.errors?.[0]?.message || 'Erro desconhecido';
      showNotification(`❌ Erro: ${errorMsg}`, 'error');
      // Opcional: Manter aberto se houver erro para o usuário ler, ou fechar
      // setShowLog(false); 
    }
  }, [compiling, getTexContent, project.global_setup.engine, compile, clearLogs, showNotification]);

  // Block operations
  const handleAddBlock = useCallback((type, afterId = null) => {
    const newId = store.addBlock(type, afterId);
    setSelectedBlockId(newId);
  }, [store]);

  const handleDropBlock = useCallback(({ type: dropType, blockType, draggedId, targetId, position }) => {
    if (dropType === 'new') {
      const newId = store.addBlock(blockType, targetId);
      setSelectedBlockId(newId);
    } else if (dropType === 'reorder') {
      store.moveBlock(draggedId, targetId, position);
    }
  }, [store]);

  const handleSave = useCallback(async () => {
    showNotification('Salvando...', 'success');
    const saveData = store.get();
    const result = await saveProject(saveData);
    if (result.success) {
      if (id === 'new') {
        // Redireciona para o ID definitivo para não criar duplicatas em futuros saves
        navigate(`/editor/${result.id}`, { replace: true });
      } else {
        showNotification('Projeto salvo com sucesso!', 'success');
      }
    } else {
      showNotification(`Erro ao salvar: ${result.error}`, 'error');
    }
  }, [store, saveProject, id, navigate, showNotification]);

  const handleImportBtx = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        store.loadProject(data);
        setPdfBase64(null);
        setSelectedBlockId(null);
        showNotification('Projeto importado!');
      } catch {
        showNotification('Arquivo inválido!', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [showNotification]);

  const handleExportJson = useCallback(() => {
    const data = store.get();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const title = (data.metadata?.title || 'projeto').replace(/[^a-z0-9]/gi, '_');
    a.download = `${title}.btx.json`;
    a.click();
    URL.revokeObjectURL(url);
    setActionsOpen(false);
    showNotification('JSON exportado!');
  }, [store, showNotification]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    if (!actionsOpen) return;
    const handler = (e) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target)) {
        setActionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [actionsOpen]);

  return (
    <div className="app-layout">
      {/* Notification toast */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: notification.type === 'error' ? 'rgba(244,63,94,0.9)' : 'rgba(16,185,129,0.9)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '99px',
          fontSize: '13px',
          fontWeight: 500,
          zIndex: 9999,
          backdropFilter: 'blur(8px)',
          boxShadow: 'var(--shadow-lg)',
          animation: 'slideUp 200ms ease',
        }}>
          {notification.msg}
        </div>
      )}

      {/* Modals */}
      {modal === 'tex' && (
        <ExportTexModal
          texContent={getTexContent()}
          onClose={() => setModal(null)}
        />
      )}

      {/* Topbar */}
      <header className="topbar">
        {/* Logo */}
        <div className="topbar-logo">
          <div className="logo-icon">Bₜ</div>
          <span>BlockTeX</span>
        </div>

        {/* Back to Dashboard - antes do título */}
        <button className="btn btn-ghost" onClick={() => navigate('/')} style={{ flexShrink: 0 }}>
          ← Voltar
        </button>

        <div className="topbar-sep" />

        {/* Project title */}
        <div className="topbar-title-area">
          <div className="topbar-title">{project.metadata.title || 'Sem título'}</div>
          <div className="topbar-subtitle">
            {project.blocks.length} blocos · {project.global_setup.paper?.toUpperCase()} · {project.global_setup.engine}
          </div>
        </div>



        <div className="topbar-actions">
          {/* Undo/Redo */}
          <button className="btn btn-ghost btn-icon" onClick={() => store.undo()} title="Ctrl+Z" disabled={!store.canUndo()}>↩</button>
          <button className="btn btn-ghost btn-icon" onClick={() => store.redo()} title="Ctrl+Y" disabled={!store.canRedo()}>↪</button>

          {/* Save - standalone */}
          <button className="btn btn-secondary" onClick={handleSave}>💾 Salvar</button>

          {/* Actions dropdown */}
          <div style={{ position: 'relative' }} ref={actionsRef}>
            <button
              className="btn btn-secondary"
              onClick={() => setActionsOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              Ações <ChevronDown />
            </button>
            {actionsOpen && (
              <div className="actions-dropdown">
                <label className="dropdown-item" style={{ cursor: 'pointer' }}>
                  📂 Importar JSON
                  <input type="file" accept=".btx,.json" style={{ display: 'none' }}
                    onChange={(e) => { handleImportBtx(e); setActionsOpen(false); }} />
                </label>
                <button className="dropdown-item" onClick={handleExportJson}>
                  📤 Exportar JSON
                </button>
                <div className="dropdown-divider" />
                <button className="dropdown-item" onClick={() => { setModal('tex'); setActionsOpen(false); }}>
                  📄 Exportar .tex
                </button>
                <div className="dropdown-divider" />
                <button className="dropdown-item" onClick={() => { setShowPreview(p => !p); setActionsOpen(false); }}>
                  👁 {showPreview ? 'Fechar Preview' : 'Abrir Preview'}
                </button>
              </div>
            )}
          </div>

          {/* Compile - standalone */}
          <button
            className="btn btn-compile"
            onClick={handleCompile}
            disabled={compiling || project.blocks.length === 0}
            title="Compilar PDF"
          >
            {compiling ? <><div className="spinner" /> Compilando…</> : <>⚡ Compilar PDF</>}
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="app-body">
        {/* Block Library Sidebar */}
        <div className={`block-library-wrapper ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <BlockLibrary
            onAddBlock={handleAddBlock}
            collapsed={sidebarCollapsed}
            onCollapse={() => setSidebarCollapsed(c => !c)}
          />
        </div>

        {/* Canvas area */}
        <div className="canvas-area">
          {/* Canvas toolbar */}
          <div className="canvas-toolbar">
            <div className="canvas-toolbar-left">
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {project.blocks.length} bloco{project.blocks.length !== 1 ? 's' : ''}
                {selectedBlockId && ` · Selecionado: #${project.blocks.findIndex(b => b.id === selectedBlockId) + 1}`}
              </span>
            </div>
            <div className="canvas-toolbar-right">
              <button
                className="btn btn-ghost"
                style={{ fontSize: '11px', padding: '4px 8px' }}
                onClick={() => setShowLog(l => !l)}
              >
                🖥 Console {logs.length > 0 ? `(${logs.length})` : ''}
              </button>
            </div>
          </div>

          {/* Canvas scroll */}
          <Canvas
            blocks={project.blocks}
            selectedId={selectedBlockId}
            onSelect={setSelectedBlockId}
            onEditContent={(id) => setEditingBlockId(id)}
            onDelete={(id) => {
              store.removeBlock(id);
              if (selectedBlockId === id) setSelectedBlockId(null);
            }}
            onDuplicate={(id) => {
              const newId = store.duplicateBlock(id);
              setSelectedBlockId(newId);
            }}
            onMove={(fromId, toId, pos) => store.moveBlock(fromId, toId, pos)}
            onAddBlock={handleAddBlock}
            onDropBlock={handleDropBlock}
            onEditBlockProperties={(id) => {
              setSelectedBlockId(id);
              setInspectorTab('block');
              setInspectorCollapsed(false);
            }}
          />
        </div>

        {/* Inspector */}
        <div className={`inspector-wrapper ${inspectorCollapsed ? 'collapsed' : ''}`}>
          <Inspector
            project={project}
            selectedBlock={selectedBlock}
            getTexContent={getTexContent}
            onUpdateMetadata={(m) => store.updateMetadata(m)}
            onUpdateSetup={(s) => store.updateGlobalSetup(s)}
            onUpdateConfig={(c) => selectedBlockId && store.updateBlockConfig(selectedBlockId, c)}
            onUpdateStyleVars={(v) => selectedBlockId && store.updateBlockStyleVars(selectedBlockId, v)}
            tab={inspectorTab}
            onTabChange={setInspectorTab}
            collapsed={inspectorCollapsed}
            onCollapse={() => setInspectorCollapsed(c => !c)}
          />
        </div>
      </div>

      {/* Preview Panel */}
      <PreviewPanel
        open={showPreview}
        onClose={() => setShowPreview(false)}
        pdfBase64={pdfBase64}
        blocks={project.blocks}
        compiling={compiling}
      />

      {/* Log Console (Modal) */}
      <LogConsole
        logs={logs}
        open={showLog}
        onClose={() => setShowLog(false)}
      />

      {/* TipTap Editor Drawer */}
      <TipTapDrawer
        block={editingBlock}
        open={!!editingBlockId}
        onClose={() => setEditingBlockId(null)}
        onSave={(id, content) => {
          store.updateBlockContent(id, content);
          store.commitBlockContent(id);
        }}
      />
    </div>
  );
}
