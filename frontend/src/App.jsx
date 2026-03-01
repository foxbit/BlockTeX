import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BlockLibrary } from './components/BlockLibrary.jsx';
import { Canvas } from './components/Canvas.jsx';
import { Inspector } from './components/Inspector.jsx';
import { LogConsole } from './components/LogConsole.jsx';
import { PreviewPanel } from './components/PreviewPanel.jsx';
import { NewProjectModal, SaveModal, ExportTexModal } from './components/Modals.jsx';
import { ProjectStore, DEFAULT_PROJECT } from './store/projectStore.js';
import { generateTex } from './lib/latexGenerator.js';
import { useBackend } from './hooks/useBackend.js';

function App() {
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
  const [notification, setNotification] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);

  const { status, logs, compile, saveProject, clearLogs } = useBackend();

  // Assina o store para re-renderizar quando os dados mudam
  useEffect(() => {
    const unsub = store.subscribe(setProject);
    // Sincroniza estado inicial (caso o store já tenha dados do autosave)
    setProject(store.get());
    return unsub;
  }, [store]);

  // Auto-save no localStorage sempre que o projeto mudar
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('blocktex_autosave', store.exportJson());
      } catch { }
    }, 1000); // 1s de debounce
    return () => clearTimeout(timer);
  }, [project, store]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey)) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); store.undo(); }
        if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); store.redo(); }
        if (e.key === 's') { e.preventDefault(); setModal('save'); }
        if (e.key === 'p') { e.preventDefault(); setShowPreview(p => !p); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [store]);

  // Gera o .tex a partir do estado atual do projeto (reativo)
  const texContent = useMemo(() => generateTex(project), [project]);

  const selectedBlock = useMemo(
    () => project.blocks.find(b => b.id === selectedBlockId) || null,
    [project.blocks, selectedBlockId]
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

    const result = await compile(texContent, project.global_setup.engine || 'pdflatex');

    setCompiling(false);

    if (result.success) {
      setPdfBase64(result.pdf_base64);
      setShowPreview(true);
      showNotification('✅ PDF compilado com sucesso!', 'success');
    } else {
      const errorMsg = result.errors?.[0]?.message || 'Erro desconhecido';
      showNotification(`❌ Erro: ${errorMsg}`, 'error');
    }
  }, [compiling, texContent, project.global_setup.engine, compile, clearLogs, showNotification]);

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

  const handleNewProject = useCallback(({ title, author, paper, mirror }) => {
    const newProject = {
      ...DEFAULT_PROJECT,
      metadata: { ...DEFAULT_PROJECT.metadata, title, author },
      global_setup: { ...DEFAULT_PROJECT.global_setup, paper, mirror },
      blocks: [],
    };
    store.loadProject(newProject);
    setPdfBase64(null);
    setSelectedBlockId(null);
    setModal(null);
    showNotification('Novo projeto criado!');
  }, [showNotification]);

  const handleSave = useCallback(async (filename) => {
    if (!status.connected) {
      // Fallback: download as JSON
      const blob = new Blob([store.exportJson()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.btx`;
      a.click();
      showNotification('Arquivo .btx baixado!');
    } else {
      const result = await saveProject(store.get(), filename);
      if (result.success) {
        showNotification(`💾 Salvo em ${result.path}`);
      } else {
        showNotification(`Erro ao salvar: ${result.error}`, 'error');
      }
    }
    setModal(null);
  }, [status.connected, saveProject, showNotification]);

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
      {modal === 'new' && (
        <NewProjectModal
          onConfirm={handleNewProject}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === 'save' && (
        <SaveModal
          projectTitle={project.metadata.title}
          onConfirm={handleSave}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === 'tex' && (
        <ExportTexModal
          texContent={texContent}
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

        <div className="topbar-sep" />

        {/* Project title */}
        <div className="topbar-title-area">
          <div className="topbar-title">{project.metadata.title || 'Sem título'}</div>
          <div className="topbar-subtitle">
            {project.blocks.length} blocos · {project.global_setup.paper?.toUpperCase()} · {project.global_setup.engine}
          </div>
        </div>

        {/* Backend status */}
        <div
          className={`status-chip ${status.connected ? 'online' : 'offline'}`}
          title={status.connected
            ? `Backend online • pdflatex: ${status.engines?.pdflatex ? '✓' : '✗'} • lualatex: ${status.engines?.lualatex ? '✓' : '✗'}`
            : 'Backend offline — inicie o servidor Node.js'}
        >
          <div className="dot" />
          {status.connected ? 'Backend' : 'Offline'}
        </div>

        <div className="topbar-actions">
          {/* Sidebar toggle */}
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setSidebarCollapsed(c => !c)}
            title="Toggle sidebar"
            data-tooltip="Sidebar"
          >
            ☰
          </button>

          {/* New */}
          <button className="btn btn-ghost" onClick={() => setModal('new')}>
            + Novo
          </button>

          {/* Import */}
          <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
            📂 Abrir
            <input type="file" accept=".btx,.json" style={{ display: 'none' }} onChange={handleImportBtx} />
          </label>

          {/* Save */}
          <button className="btn btn-secondary" onClick={() => setModal('save')}>
            💾 Salvar
          </button>

          {/* Export .tex */}
          <button className="btn btn-secondary" onClick={() => setModal('tex')} title="Ctrl+E">
            📄 .tex
          </button>

          {/* Preview */}
          <button
            className="btn btn-secondary"
            onClick={() => setShowPreview(p => !p)}
            title="Ctrl+P"
          >
            {showPreview ? '✕ Preview' : '👁 Preview'}
          </button>

          {/* Undo/Redo */}
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => store.undo()}
            title="Ctrl+Z"
            disabled={!store.canUndo()}
          >
            ↩
          </button>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => store.redo()}
            title="Ctrl+Y"
            disabled={!store.canRedo()}
          >
            ↪
          </button>

          {/* Inspector toggle */}
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setInspectorCollapsed(c => !c)}
            title="Toggle inspector"
          >
            ⊞
          </button>

          {/* Compile */}
          <button
            className="btn btn-compile"
            onClick={handleCompile}
            disabled={compiling || project.blocks.length === 0}
            title="Ctrl+Enter"
          >
            {compiling ? (
              <><div className="spinner" /> Compilando…</>
            ) : (
              <>⚡ Compilar PDF</>
            )}
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="app-body">
        {/* Block Library Sidebar */}
        <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <BlockLibrary
            onAddBlock={handleAddBlock}
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
            onContentChange={(id, val) => store.updateBlockContent(id, val)}
            onContentBlur={(id) => store.commitBlockContent(id)}
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
          />
        </div>

        {/* Inspector */}
        <div className={`inspector ${inspectorCollapsed ? 'collapsed' : ''}`}>
          <Inspector
            project={project}
            selectedBlock={selectedBlock}
            texContent={texContent}
            onUpdateMetadata={(m) => store.updateMetadata(m)}
            onUpdateSetup={(s) => store.updateGlobalSetup(s)}
            onUpdateConfig={(c) => selectedBlockId && store.updateBlockConfig(selectedBlockId, c)}
            onUpdateStyleVars={(v) => selectedBlockId && store.updateBlockStyleVars(selectedBlockId, v)}
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

      {/* Log Console */}
      <LogConsole
        logs={logs}
        open={showLog}
        onToggle={() => setShowLog(l => !l)}
        onClear={clearLogs}
      />
    </div>
  );
}

export default App;
