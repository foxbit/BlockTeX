import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackend } from '../hooks/useBackend';
import { NewProjectModal } from '../components/Modals';
import { DEFAULT_PROJECT } from '../store/projectStore';

export function Dashboard() {
    const navigate = useNavigate();
    const { listProjects, migrateLegacyProjects, saveProject, deleteProject, status, checkHealth } = useBackend();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [legacyProjectsFound, setLegacyProjectsFound] = useState([]);
    const [showNewModal, setShowNewModal] = useState(false);

    useEffect(() => {
        loadProjects();
        checkLegacyStorage();
    }, []);

    const loadProjects = async () => {
        setLoading(true);
        const data = await listProjects();
        setProjects(data);
        setLoading(false);
    };

    const checkLegacyStorage = () => {
        try {
            const saved = localStorage.getItem('blocktex_autosave');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed?.blocks && parsed?.metadata) {
                    setLegacyProjectsFound([parsed]);
                }
            }
        } catch { }
    };

    const handleCreateNew = () => {
        setShowNewModal(true);
    };

    const handleConfirmNewProject = async ({ title, author, paper, mirror }) => {
        const newProj = {
            ...DEFAULT_PROJECT,
            metadata: { ...DEFAULT_PROJECT.metadata, title, author },
            global_setup: { ...DEFAULT_PROJECT.global_setup, paper, mirror },
            blocks: []
        };
        const res = await saveProject(newProj);
        if (res.success) {
            navigate(`/editor/${res.id}`);
        } else {
            alert('Falha ao criar projeto no servidor');
        }
    };

    const handleOpenProject = (id) => {
        navigate(`/editor/${id}`);
    };

    const handleDeleteProject = async (e, id) => {
        e.stopPropagation();
        if (confirm('Tem certeza que deseja deletar permanentemente este projeto?')) {
            await deleteProject(id);
            loadProjects();
        }
    };

    const handleMigrate = async () => {
        const result = await migrateLegacyProjects(legacyProjectsFound);
        if (result.success) {
            localStorage.removeItem('blocktex_autosave');
            setLegacyProjectsFound([]);
            loadProjects();
            alert('Projeto local migrado com sucesso!');
        } else {
            alert('Falha ao migrar projeto local.');
        }
    };

    return (
        <div className="dashboard-page">
            <div className="dashboard-header">
                <h1 className="dashboard-title">Projetos no Servidor</h1>
                <div className="dashboard-header-right">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: status.connected ? '#10b981' : '#f43f5e' }}></div>
                        {status.connected ? `Backend Online (Node ${status.node_version})` : 'Backend Offline'}
                    </div>
                    <button onClick={handleCreateNew} className="btn btn-compile">
                        + Novo Projeto
                    </button>
                </div>
            </div>

            {showNewModal && (
                <NewProjectModal
                    onConfirm={handleConfirmNewProject}
                    onCancel={() => setShowNewModal(false)}
                />
            )}

            {legacyProjectsFound.length > 0 && (
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--accent-indigo)', padding: '20px', borderRadius: 'var(--radius-md)', marginBottom: '32px' }}>
                    <h3 style={{ marginTop: 0 }}>Projeto Local Encontrado!</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Um projeto salvo no navegador (localStorage) foi detectado. Deseja enviá-lo para o banco de dados do servidor de forma segura?</p>
                    <button onClick={handleMigrate} className="btn btn-secondary" style={{ marginTop: '12px' }}>
                        Migrar para o Servidor
                    </button>
                </div>
            )}

            {loading ? (
                <div>Carregando projetos...</div>
            ) : projects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)' }}>
                    <p>Nenhum projeto encontrado no banco de dados.</p>
                </div>
            ) : (
                <div className="project-grid">
                    {projects.map(proj => (
                        <div key={proj.id} style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'transform 0.2s', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }} onClick={() => handleOpenProject(proj.id)} className="project-card">
                            <button
                                onClick={(e) => handleDeleteProject(e, proj.id)}
                                className="btn-icon block-action-btn danger"
                                style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent' }}
                                title="Deletar Projeto"
                            >
                                🗑
                            </button>
                            <h3 style={{ margin: 0, fontSize: '18px', paddingRight: '24px' }}>{proj.title}</h3>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID: {proj.id?.substring(0, 8)}...</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'auto' }}>
                                Atualizado em: {new Date(proj.updated_at).toLocaleString('pt-BR')}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
