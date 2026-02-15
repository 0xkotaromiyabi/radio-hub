const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'radio.db');
const db = new Database(dbPath);

// Initialize schema
db.exec(`
    CREATE TABLE IF NOT EXISTS schedule (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        folder TEXT NOT NULL,
        start_time TEXT NOT NULL, -- HH:mm format
        days TEXT NOT NULL,       -- JSON array of day indices [0-6]
        type TEXT DEFAULT 'playlist', -- 'playlist' (switch to) or 'push' (play once)
        enabled INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS staged_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        folder TEXT NOT NULL,
        path TEXT NOT NULL,
        position INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

console.log('Database initialized at:', dbPath);

module.exports = db;
