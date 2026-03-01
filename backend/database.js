const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const os = require('os');
const fs = require('fs');

const dbDir = path.join(os.homedir(), 'BlockTeX_Data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, 'database.sqlite');

let dbPromise = null;

async function getDb() {
    if (!dbPromise) {
        dbPromise = open({
            filename: dbPath,
            driver: sqlite3.Database
        }).then(async (db) => {
            // Setup tables
            await db.exec(`
                CREATE TABLE IF NOT EXISTS projects (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    updated_at INTEGER NOT NULL,
                    metadata TEXT,
                    global_setup TEXT,
                    blocks TEXT
                );
                
                CREATE TABLE IF NOT EXISTS global_styles (
                    key TEXT PRIMARY KEY,
                    value TEXT
                );
            `);
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

    // UPSERT style using REPLACE
    await db.run(`
        REPLACE INTO projects (id, title, updated_at, metadata, global_setup, blocks)
        VALUES (?, ?, ?, ?, ?, ?)
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

module.exports = {
    getDb,
    listProjects,
    getProject,
    saveProject,
    deleteProject,
    getGlobalStyle,
    setGlobalStyle
};
