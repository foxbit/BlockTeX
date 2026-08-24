const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { createPatch } = require('diff');
const { v4: uuidv4 } = require('uuid');

const dbDir = process.env.DATABASE_DIR || path.join(os.homedir(), 'BlockTeX_Data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, 'database.sqlite');

let dbPromise = null;

async function getDb() {
    if (!dbPromise) {
        dbPromise = open({
            filename: dbPath,
            driver: sqlite3.Database
        }).then(async (db) => {
            await db.exec('PRAGMA foreign_keys = ON');
            await db.exec(`
                CREATE TABLE IF NOT EXISTS projects (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    updated_at INTEGER NOT NULL,
                    metadata TEXT,
                    global_setup TEXT,
                    blocks TEXT
                );
                
                CREATE TABLE IF NOT EXISTS committed_projects (
                    id TEXT PRIMARY KEY,
                    metadata TEXT,
                    global_setup TEXT,
                    blocks TEXT
                );
                
                CREATE TABLE IF NOT EXISTS global_styles (
                    key TEXT PRIMARY KEY,
                    value TEXT
                );

                CREATE TABLE IF NOT EXISTS users (
                    email TEXT PRIMARY KEY,
                    password TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS project_commits (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    message TEXT,
                    timestamp INTEGER NOT NULL,
                    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS commit_diffs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    commit_id TEXT NOT NULL,
                    block_id TEXT NOT NULL,
                    block_type TEXT,
                    change_type TEXT NOT NULL,
                    patch TEXT,
                    FOREIGN KEY(commit_id) REFERENCES project_commits(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_commits_project ON project_commits(project_id);
                CREATE INDEX IF NOT EXISTS idx_diffs_commit ON commit_diffs(commit_id);
            `);
            
            try {
                const count = await db.get('SELECT COUNT(*) as count FROM users');
                if (count.count === 0) {
                    const usersPath = path.join(__dirname, 'users.json');
                    if (fs.existsSync(usersPath)) {
                        const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
                        for (const u of users) {
                            await db.run('INSERT INTO users (email, password) VALUES (?, ?)', [u.email, u.password]);
                        }
                    }
                }
            } catch (e) { console.error('Migration error:', e); }
            return db;
        });
    }
    return dbPromise;
}

async function listProjects() {
    const db = await getDb();
    const rows = await db.all('SELECT id, title, updated_at FROM projects ORDER BY updated_at DESC');
    return rows;
}

async function getProject(id) {
    const db = await getDb();
    const row = await db.get('SELECT * FROM projects WHERE id = ?', id);
    if (!row) return null;

    return {
        id: row.id,
        metadata: JSON.parse(row.metadata || '{}'),
        global_setup: JSON.parse(row.global_setup || '{}'),
        blocks: JSON.parse(row.blocks || '[]'),
        title: row.title,
        updated_at: row.updated_at
    };
}

async function saveProject(projectData) {
    const db = await getDb();
    const { id, metadata, global_setup, blocks } = projectData;

    const title = metadata?.title || 'Sem Título';
    const now = Date.now();

    // UPSERT style using ON CONFLICT DO UPDATE to prevent CASCADE deletes on project_commits
    await db.run(`
        INSERT INTO projects (id, title, updated_at, metadata, global_setup, blocks)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            updated_at = excluded.updated_at,
            metadata = excluded.metadata,
            global_setup = excluded.global_setup,
            blocks = excluded.blocks
    `, [
        id,
        title,
        now,
        JSON.stringify(metadata || {}),
        JSON.stringify(global_setup || {}),
        JSON.stringify(blocks || [])
    ]);

    return { id, title, updated_at: now };
}

async function deleteProject(id) {
    const db = await getDb();
    await db.run('DELETE FROM projects WHERE id = ?', id);
    await db.run('DELETE FROM committed_projects WHERE id = ?', id);
}

// Universal Styles (e.g. default block configurations across projects)
async function getGlobalStyle(key) {
    const db = await getDb();
    const row = await db.get('SELECT value FROM global_styles WHERE key = ?', key);
    return row ? JSON.parse(row.value) : null;
}

async function setGlobalStyle(key, value) {
    const db = await getDb();
    await db.run('REPLACE INTO global_styles (key, value) VALUES (?, ?)', [key, JSON.stringify(value)]);
}

async function getUserByEmail(email) {
    const db = await getDb();
    return await db.get('SELECT * FROM users WHERE email = ?', email);
}

// ── Changelog: Campos base64 pesados a excluir do diff ──
const HEAVY_FIELDS = ['imageBase64', 'image1Base64', 'image2Base64', 'image3Base64', 'image4Base64'];

function extractComparableContent(block) {
    const clone = JSON.parse(JSON.stringify(block));
    if (clone.style_variables) {
        for (const field of HEAVY_FIELDS) {
            if (clone.style_variables[field]) {
                clone.style_variables[field] = '[binary]';
            }
        }
    }
    delete clone.collapsed;
    
    // Extrai o conteúdo textual (Markdown) para permitir diff linha por linha eficiente
    const content = clone.content || '';
    delete clone.content;
    
    return `[Metadata]\n${JSON.stringify(clone, null, 2)}\n\n[Content]\n${content}`;
}

async function createCommit(projectId, newData) {
    const db = await getDb();

    try {
        await db.exec('BEGIN TRANSACTION');

        // 1. Read old committed data, fallback to projects table if not found
        let oldRow = await db.get('SELECT blocks, metadata, global_setup FROM committed_projects WHERE id = ?', projectId);
        if (!oldRow) {
            oldRow = await db.get('SELECT blocks, metadata, global_setup FROM projects WHERE id = ?', projectId);
        }

        // 2. Write the new project data to projects (draft) table
        const title = newData.metadata?.title || 'Sem Título';
        const now = Date.now();
        await db.run(
            `INSERT INTO projects (id, title, updated_at, metadata, global_setup, blocks)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                 title = excluded.title,
                 updated_at = excluded.updated_at,
                 metadata = excluded.metadata,
                 global_setup = excluded.global_setup,
                 blocks = excluded.blocks`,
            [
                projectId,
                title,
                now,
                JSON.stringify(newData.metadata || {}),
                JSON.stringify(newData.global_setup || {}),
                JSON.stringify(newData.blocks || [])
            ]
        );

        // 3. Compute diffs between old committed data and newData
        // If firstCommit is true and there is no oldRow at all in projects, we just commit without diffs
        if (!oldRow) {
            // First save of a brand new project, write to committed_projects
            await db.run(
                'REPLACE INTO committed_projects (id, metadata, global_setup, blocks) VALUES (?, ?, ?, ?)',
                [
                    projectId,
                    JSON.stringify(newData.metadata || {}),
                    JSON.stringify(newData.global_setup || {}),
                    JSON.stringify(newData.blocks || [])
                ]
            );
            await db.exec('COMMIT');
            return { id: projectId, title, updated_at: now, commitId: null };
        }

        const oldBlocks = JSON.parse(oldRow.blocks || '[]');
        const oldMetadata = JSON.parse(oldRow.metadata || '{}');
        const oldSetup = JSON.parse(oldRow.global_setup || '{}');
        const newBlocks = newData.blocks || [];
        const newMetadata = newData.metadata || {};
        const newSetup = newData.global_setup || {};

        const oldMap = {};
        for (const b of oldBlocks) oldMap[b.id] = b;
        const newMap = {};
        for (const b of newBlocks) newMap[b.id] = b;

        const diffs = [];

        // Deleted or modified blocks
        for (const oldBlock of oldBlocks) {
            if (!newMap[oldBlock.id]) {
                diffs.push({
                    block_id: oldBlock.id,
                    block_type: oldBlock.type || 'unknown',
                    change_type: 'DELETED',
                    patch: extractComparableContent(oldBlock)
                });
            } else {
                const oldContent = extractComparableContent(oldBlock);
                const newContent = extractComparableContent(newMap[oldBlock.id]);
                if (oldContent !== newContent) {
                    const patch = createPatch(oldBlock.id, oldContent, newContent, 'anterior', 'atual');
                    diffs.push({
                        block_id: oldBlock.id,
                        block_type: oldBlock.type || 'unknown',
                        change_type: 'MODIFIED',
                        patch
                    });
                }
            }
        }

        // Added blocks
        for (const newBlock of newBlocks) {
            if (!oldMap[newBlock.id]) {
                diffs.push({
                    block_id: newBlock.id,
                    block_type: newBlock.type || 'unknown',
                    change_type: 'ADDED',
                    patch: extractComparableContent(newBlock)
                });
            }
        }

        // Reorder detection
        const oldOrder = oldBlocks.map(b => b.id).join(',');
        const newOrder = newBlocks.map(b => b.id).join(',');
        if (oldOrder !== newOrder && oldBlocks.length > 0 && newBlocks.length > 0) {
            diffs.push({
                block_id: '__order__',
                block_type: 'system',
                change_type: 'REORDERED',
                patch: `- ${oldOrder}\n+ ${newOrder}`
            });
        }

        // Metadata diff
        const oldMetaStr = JSON.stringify(oldMetadata, null, 2);
        const newMetaStr = JSON.stringify(newMetadata, null, 2);
        if (oldMetaStr !== newMetaStr) {
            const patch = createPatch('metadata', oldMetaStr, newMetaStr, 'anterior', 'atual');
            diffs.push({
                block_id: '__metadata__',
                block_type: 'system',
                change_type: 'MODIFIED',
                patch
            });
        }

        // Global setup diff
        const oldSetupStr = JSON.stringify(oldSetup, null, 2);
        const newSetupStr = JSON.stringify(newSetup, null, 2);
        if (oldSetupStr !== newSetupStr) {
            const patch = createPatch('global_setup', oldSetupStr, newSetupStr, 'anterior', 'atual');
            diffs.push({
                block_id: '__global_setup__',
                block_type: 'system',
                change_type: 'MODIFIED',
                patch
            });
        }

        // 4. Update committed_projects with the new committed state
        await db.run(
            'REPLACE INTO committed_projects (id, metadata, global_setup, blocks) VALUES (?, ?, ?, ?)',
            [
                projectId,
                JSON.stringify(newData.metadata || {}),
                JSON.stringify(newData.global_setup || {}),
                JSON.stringify(newData.blocks || [])
            ]
        );

        // 5. If no changes, just commit the transaction without creating a changelog entry
        if (diffs.length === 0) {
            await db.exec('COMMIT');
            return { id: projectId, title, updated_at: now, commitId: null };
        }

        // 6. Create commit record
        const commitId = uuidv4();
        const commitMessage = `Salvo em ${new Date(now).toLocaleString('pt-BR')}`;
        await db.run(
            'INSERT INTO project_commits (id, project_id, message, timestamp) VALUES (?, ?, ?, ?)',
            [commitId, projectId, commitMessage, now]
        );

        // 7. Insert diffs
        const stmt = await db.prepare(
            'INSERT INTO commit_diffs (commit_id, block_id, block_type, change_type, patch) VALUES (?, ?, ?, ?, ?)'
        );
        for (const d of diffs) {
            await stmt.run(commitId, d.block_id, d.block_type, d.change_type, d.patch);
        }
        await stmt.finalize();

        // 8. Cleanup old commits (keep last 100)
        await deleteOldCommits(projectId, 100);

        await db.exec('COMMIT');
        return { id: projectId, title, updated_at: now, commitId };

    } catch (err) {
        try { await db.exec('ROLLBACK'); } catch (rollbackErr) { /* ignore */ }
        throw err;
    }
}

async function listCommits(projectId, limit = 50) {
    const db = await getDb();
    return await db.all(
        'SELECT id, message, timestamp FROM project_commits WHERE project_id = ? ORDER BY timestamp DESC LIMIT ?',
        [projectId, limit]
    );
}

async function getCommitDiffs(commitId) {
    const db = await getDb();
    return await db.all(
        'SELECT id, block_id, block_type, change_type, patch FROM commit_diffs WHERE commit_id = ?',
        [commitId]
    );
}

async function getBlockHistory(projectId, blockId) {
    const db = await getDb();
    return await db.all(
        `SELECT pc.id as commit_id, pc.message, pc.timestamp, cd.change_type, cd.patch
         FROM project_commits pc
         JOIN commit_diffs cd ON pc.id = cd.commit_id
         WHERE pc.project_id = ? AND cd.block_id = ?
         ORDER BY pc.timestamp DESC`,
        [projectId, blockId]
    );
}

async function deleteOldCommits(projectId, keepLast = 100) {
    const db = await getDb();
    // Get IDs of commits to delete (older than the Nth most recent)
    const toDelete = await db.all(
        `SELECT id FROM project_commits WHERE project_id = ? ORDER BY timestamp DESC LIMIT -1 OFFSET ?`,
        [projectId, keepLast]
    );
    for (const row of toDelete) {
        await db.run('DELETE FROM commit_diffs WHERE commit_id = ?', row.id);
        await db.run('DELETE FROM project_commits WHERE id = ?', row.id);
    }
}

async function exportProjectBackup(projectId) {
    const db = await getDb();
    const project = await db.get('SELECT * FROM projects WHERE id = ?', projectId);
    if (!project) return null;

    const committedProject = await db.get('SELECT * FROM committed_projects WHERE id = ?', projectId);
    const commits = await db.all('SELECT * FROM project_commits WHERE project_id = ?', projectId);
    
    const diffs = [];
    if (commits.length > 0) {
        const commitIds = commits.map(c => c.id);
        for (const commitId of commitIds) {
            const commitDiffs = await db.all('SELECT * FROM commit_diffs WHERE commit_id = ?', commitId);
            diffs.push(...commitDiffs);
        }
    }

    return {
        version: '1.0',
        project,
        committedProject,
        commits,
        diffs
    };
}

async function importProjectBackup(backupData) {
    const db = await getDb();
    
    if (!backupData || !backupData.project) {
        throw new Error('Dados de backup inválidos');
    }

    const { project, committedProject, commits = [], diffs = [] } = backupData;
    
    let targetProjectId = project.id;
    let targetTitle = project.title;

    const existing = await db.get('SELECT id FROM projects WHERE id = ?', targetProjectId);
    const hasCollision = !!existing;

    if (hasCollision) {
        targetProjectId = uuidv4();
        targetTitle = `${project.title} (Restaurado)`;
    }

    let targetMetadata = project.metadata;
    if (hasCollision && targetMetadata) {
        try {
            const metaObj = JSON.parse(targetMetadata);
            metaObj.title = targetTitle;
            targetMetadata = JSON.stringify(metaObj);
        } catch (e) {
            // ignore
        }
    }

    await db.exec('BEGIN TRANSACTION');
    try {
        await db.run(
            `INSERT INTO projects (id, title, updated_at, metadata, global_setup, blocks)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                targetProjectId,
                targetTitle,
                project.updated_at || Date.now(),
                targetMetadata,
                project.global_setup,
                project.blocks
            ]
        );

        if (committedProject) {
            let targetCommittedMetadata = committedProject.metadata;
            if (hasCollision && targetCommittedMetadata) {
                try {
                    const metaObj = JSON.parse(targetCommittedMetadata);
                    metaObj.title = targetTitle;
                    targetCommittedMetadata = JSON.stringify(metaObj);
                } catch (e) {
                    // ignore
                }
            }
            await db.run(
                `INSERT INTO committed_projects (id, metadata, global_setup, blocks)
                 VALUES (?, ?, ?, ?)`,
                [
                    targetProjectId,
                    targetCommittedMetadata,
                    committedProject.global_setup,
                    committedProject.blocks
                ]
            );
        }

        const commitIdMap = {};
        for (const commit of commits) {
            const oldCommitId = commit.id;
            let newCommitId = oldCommitId;
            
            const commitExists = await db.get('SELECT id FROM project_commits WHERE id = ?', oldCommitId);
            if (commitExists) {
                newCommitId = uuidv4();
            }
            commitIdMap[oldCommitId] = newCommitId;

            await db.run(
                `INSERT INTO project_commits (id, project_id, message, timestamp)
                 VALUES (?, ?, ?, ?)`,
                [
                    newCommitId,
                    targetProjectId,
                    commit.message,
                    commit.timestamp
                ]
            );
        }

        for (const diff of diffs) {
            const newCommitId = commitIdMap[diff.commit_id] || diff.commit_id;
            await db.run(
                `INSERT INTO commit_diffs (commit_id, block_id, block_type, change_type, patch)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    newCommitId,
                    diff.block_id,
                    diff.block_type,
                    diff.change_type,
                    diff.patch
                ]
            );
        }

        await db.exec('COMMIT');
        return { success: true, id: targetProjectId, title: targetTitle };
    } catch (err) {
        try { await db.exec('ROLLBACK'); } catch (e) {}
        throw err;
    }
}

module.exports = {
    getDb,
    listProjects,
    getProject,
    saveProject,
    deleteProject,
    getGlobalStyle,
    setGlobalStyle,
    getUserByEmail,
    createCommit,
    listCommits,
    getCommitDiffs,
    getBlockHistory,
    deleteOldCommits,
    exportProjectBackup,
    importProjectBackup
};
