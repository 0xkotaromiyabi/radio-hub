const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const net = require('net'); // Switched to raw net socket
const axios = require('axios');
const db = require('./database');
const { startScheduler } = require('./scheduler');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const BASE_DIR = '/home/shoutcast';
const LIBRARIES = {
    music: path.join(BASE_DIR, 'music'),
    jingles: path.join(BASE_DIR, 'jingles'),
    ads: path.join(BASE_DIR, 'ads')
};

const SHOUTCAST_URL = 'http://localhost:8000/stats?sid=1';

// Dynamic storage for Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const folder = req.params.folder || 'music';
        const dest = LIBRARIES[folder] || LIBRARIES.music;
        cb(null, dest);
    },
    filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

// Reliable Socket helper for Liquidsoap Telnet
async function sendLiquidsoapCommand(command) {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        let buffer = '';
        let resolved = false;

        const timeoutId = setTimeout(() => {
            if (!resolved) {
                client.destroy();
                console.error(`[Liquidsoap] Command '${command}' timed out`);
                reject(new Error('Telnet Timeout'));
            }
        }, 3000);

        client.connect(1234, '127.0.0.1', () => {
            client.write(command + '\nquit\n'); // Send command and quit in one go
        });

        client.on('data', (data) => {
            buffer += data.toString();
            if (buffer.includes('END')) {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeoutId);
                    client.destroy();
                    resolve(buffer.replace('END', '').replace('Bye!', '').trim());
                }
            }
        });

        client.on('error', (err) => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeoutId);
                client.destroy();
                reject(err);
            }
        });

        client.on('close', () => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeoutId);
                resolve(buffer.trim());
            }
        });
    });
}
async function getRidMetadata(rid) {
    try {
        const cleanRid = rid.includes(':') ? rid.split(':')[1] : rid;
        const output = await sendLiquidsoapCommand(`request.metadata ${cleanRid}`);
        if (!output || output.includes('Unknown command')) return null;

        const titleMatch = output.match(/title="(.*?)"/);
        const artistMatch = output.match(/artist="(.*?)"/);
        const filenameMatch = output.match(/filename="(.*?)"/);
        const uriMatch = output.match(/initial_uri="(.*?)"/);

        let title = titleMatch ? titleMatch[1] : null;
        let artist = artistMatch ? artistMatch[1] : null;
        let filename = filenameMatch ? path.basename(filenameMatch[1]) : (uriMatch ? path.basename(uriMatch[1]) : `RID:${rid}`);

        if (title && artist) return `${artist} - ${title}`;
        if (title) return title;
        return filename;
    } catch (e) {
        return `RID:${rid} (Pending)`;
    }
}

// API Routes
// Status Cache
let statusCache = {
    data: null,
    timestamp: 0
};

app.get('/api/status', async (req, res) => {
    try {
        const now = Date.now();
        // Return cached data if less than 5 seconds old
        if (statusCache.data && (now - statusCache.timestamp < 5000)) {
            return res.json({ status: 'online', data: statusCache.data, cached: true });
        }

        // Use 127.0.0.1 explicitly to avoid IPv6 issues
        const response = await axios.get('http://127.0.0.1:8000/stats?sid=1', { timeout: 2000 });

        // Simple manual XML to JSON parsing for key fields
        const xml = response.data;
        const getTag = (tag) => {
            const match = xml.match(new RegExp(`<${tag}>(.*?)</${tag}>`));
            return match ? match[1] : '';
        };

        const statusData = {
            currentlisteners: getTag('CURRENTLISTENERS'),
            peaklisteners: getTag('PEAKLISTENERS'),
            servergenre: getTag('SERVERGENRE'),
            serverurl: getTag('SERVERURL'),
            servertitle: getTag('SERVERTITLE'),
            songtitle: getTag('SONGTITLE'),
            streamstatus: getTag('STREAMSTATUS'),
            bitrate: getTag('BITRATE'),
            content: getTag('CONTENT')
        };

        // Update Cache
        statusCache = {
            data: statusData,
            timestamp: now
        };

        const nextItem = db.prepare('SELECT name FROM staged_queue ORDER BY position ASC LIMIT 1').get();
        res.json({
            status: 'online',
            data: statusData,
            next: nextItem ? nextItem.name : null
        });
    } catch (err) {
        console.error(`[Status Fetch Error] ${err.message}`);
        // Serve stale cache if available on error
        if (statusCache.data) {
            const nextItem = db.prepare('SELECT name FROM staged_queue ORDER BY position ASC LIMIT 1').get();
            return res.json({ status: 'online', data: statusCache.data, cached: true, stale: true, next: nextItem ? nextItem.name : null });
        }
        res.status(500).json({ status: 'offline', error: err.message });
    }
});

app.get('/api/files/:folder', (req, res) => {
    const folder = req.params.folder || 'music';
    const targetDir = LIBRARIES[folder] || LIBRARIES.music;

    fs.readdir(targetDir, (err, files) => {
        if (err) return res.status(500).json({ error: err.message });
        const mp3s = files.filter(f => f.endsWith('.mp3'));
        res.json(mp3s);
    });
});

app.get('/api/files', (req, res) => {
    const targetDir = LIBRARIES.music;
    fs.readdir(targetDir, (err, files) => {
        if (err) return res.status(500).json({ error: err.message });
        const mp3s = files.filter(f => f.endsWith('.mp3'));
        res.json(mp3s);
    });
});

app.post('/api/upload/:folder', upload.single('file'), (req, res) => {
    res.json({ message: 'Uploaded successfully', file: req.file.filename, folder: req.params.folder });
});

app.post('/api/upload', upload.single('file'), (req, res) => {
    res.json({ message: 'Uploaded successfully', file: req.file.filename, folder: 'music' });
});

app.delete('/api/files/:folder/:name', (req, res) => {
    const folder = req.params.folder || 'music';
    const targetDir = LIBRARIES[folder] || LIBRARIES.music;
    const filePath = path.join(targetDir, req.params.name);

    fs.unlink(filePath, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted successfully' });
    });
});

app.post('/api/control/push', async (req, res) => {
    const { folder, name } = req.body;
    if (!name) return res.status(400).json({ error: 'Filename is required' });

    console.log(`[API] Control Push (Play Next): ${name}`);
    const targetDir = LIBRARIES[folder] || LIBRARIES.music;
    const filePath = path.join(targetDir, name);

    try {
        // Insert into DB as 'pushed' immediately with high priority (position 0 or -1)
        const last = db.prepare('SELECT MIN(position) as minPos FROM staged_queue').get();
        const nextPos = (last.minPos || 0) - 1;

        const ridOutput = await sendLiquidsoapCommand(`manual_queue.push "${filePath}"`);
        const rid = ridOutput.trim().split('\n')[0].replace('END', '').trim();

        db.prepare(`
            INSERT INTO staged_queue (name, folder, path, position, rid, status)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(name, folder || 'music', filePath, nextPos, rid, 'pushed');

        console.log(`[API] Pushed directly to LS and DB. RID: ${rid}`);
        res.json({ message: 'Pushed to queue (Play Next)', rid });
    } catch (err) {
        console.error(`[API Push Error] ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/control/skip', async (req, res) => {
    try {
        // Skip the main source. If manual_queue is playing, it skips that.
        // If music is playing, it skips that to let manual_queue take over (if ready).
        // Using Web3_Radio_HQ.skip might skip the output, but better to skip the fallback source if possible.
        // radio.liq has radio = mksafe(radio).
        // The command broadcast.skip likely skips the current track on the output.
        // Let's try that first as it is most generic.
        const result = await sendLiquidsoapCommand('broadcast.skip');
        res.json({ message: 'Skipped successfully', result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/control/play-now', async (req, res) => {
    const { folder, name } = req.body;
    if (!name) return res.status(400).json({ error: 'Filename is required' });

    console.log(`[API] Play Now (Instant): ${name}`);
    const targetDir = LIBRARIES[folder] || LIBRARIES.music;
    const filePath = path.join(targetDir, name);

    try {
        // 1. Push to queue
        const ridOutput = await sendLiquidsoapCommand(`manual_queue.push "${filePath}"`);
        const rid = ridOutput.trim().split('\n')[0].replace('END', '').trim();

        // Insert into DB as playing
        db.prepare(`
            INSERT INTO staged_queue (name, folder, path, position, rid, status)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(name, folder || 'music', filePath, -999, rid, 'pushed');

        // 2. Skip current track
        setTimeout(async () => {
            try {
                await sendLiquidsoapCommand('broadcast.skip');
            } catch (e) { console.error('Skip failed', e); }
        }, 500);

        res.json({ message: 'Playing now', rid });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/control/queue/clear', async (req, res) => {
    try {
        const result = await sendLiquidsoapCommand('manual_queue.flush_and_skip');
        db.prepare('DELETE FROM staged_queue').run();
        res.json({ message: 'Queue cleared', result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Staged Queue APIs ---
app.get('/api/queue', async (req, res) => {
    try {
        const qOutput = await sendLiquidsoapCommand('manual_queue.queue');
        // Filter RIDs and normalize by removing 'ridge:' prefix
        const activeRids = qOutput.trim().split(/\s+/).filter(rid => rid && rid !== 'END').map(rid => rid.includes(':') ? rid.split(':')[1] : rid);

        const onAirOutput = await sendLiquidsoapCommand('request.on_air');
        const onAirRid = onAirOutput.trim().replace('END', '').trim();

        const dbItems = db.prepare('SELECT *, (strftime(\'%s\', \'now\') - strftime(\'%s\', created_at)) as age FROM staged_queue ORDER BY position ASC').all();

        if (dbItems.length > 0) {
            console.log(`[API] Processing ${dbItems.length} queue items. activeRids: [${activeRids}], onAirRid: ${onAirRid}`);
        }

        const finalItems = await Promise.all(dbItems.map(async (item) => {
            const cleanItemRid = item.rid && item.rid.includes(':') ? item.rid.split(':')[1] : item.rid;

            if (item.status === 'staged') return { ...item, status: 'staged' };

            if (item.status === 'pushed') {
                if (cleanItemRid === onAirRid) return { ...item, status: 'playing' };
                if (activeRids.includes(cleanItemRid)) return { ...item, status: 'committed' };

                if (item.age < 30) return { ...item, status: 'committed' };

                console.log(`[Cleanup] Deleting finished item: ${item.name} (RID: ${item.rid})`);
                db.prepare('DELETE FROM staged_queue WHERE id = ?').run(item.id);
                return null;
            }
            return item;
        }));

        const filtered = finalItems.filter(i => i !== null);
        res.json(filtered);
    } catch (err) {
        console.error('[API Queue Error]', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/queue', (req, res) => {
    const { name, folder } = req.body;
    console.log(`[API] Adding to staged_queue: ${name}`);
    if (!name || !folder) return res.status(400).json({ error: 'Name and folder are required' });

    const targetDir = LIBRARIES[folder] || LIBRARIES.music;
    const filePath = path.join(targetDir, name);

    try {
        const last = db.prepare('SELECT MAX(position) as maxPos FROM staged_queue').get();
        const nextPos = (last.maxPos || 0) + 1;

        const info = db.prepare(`
            INSERT INTO staged_queue (name, folder, path, position, status)
            VALUES (?, ?, ?, ?, 'staged')
        `).run(name, folder, filePath, nextPos);

        console.log(`[API] Success: DB ID ${info.lastInsertRowid}`);
        // Trigger feeder
        checkAndFeedQueue();
        res.json({ message: 'Added to staged queue', id: info.lastInsertRowid });
    } catch (err) {
        console.error(`[API Queue Error] ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/queue/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM staged_queue WHERE id = ?').run(req.params.id);
        res.json({ message: 'Removed from staged queue' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/queue/reorder', (req, res) => {
    const { items } = req.body; // Array of {id, position}
    if (!Array.isArray(items)) return res.status(400).json({ error: 'Items array required' });

    const update = db.prepare('UPDATE staged_queue SET position = ? WHERE id = ?');
    const transaction = db.transaction((list) => {
        for (const item of list) update.run(item.position, item.id);
    });

    try {
        transaction(items);
        res.json({ message: 'Queue reordered' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Auto-Feeder Logic ---
let isFeeding = false;
async function checkAndFeedQueue() {
    if (isFeeding) return;
    isFeeding = true;

    try {
        // 1. Check if Liquidsoap queue is empty
        const qOutput = await sendLiquidsoapCommand('manual_queue.queue');
        const isEmpty = !qOutput || qOutput.trim() === "" || qOutput.includes('END') && qOutput.length < 10;

        if (isEmpty) {
            // 2. Get next item from staged_queue that is NOT YET PUSHED
            const nextItem = db.prepare("SELECT * FROM staged_queue WHERE status = 'staged' ORDER BY position ASC LIMIT 1").get();
            if (nextItem) {
                console.log(`[Feeder] Feeding from DB: ${nextItem.name}`);
                const ridOutput = await sendLiquidsoapCommand(`manual_queue.push "${nextItem.path}"`);

                // Parse RID from output (should be a single number or ridge:X)
                const rid = ridOutput.trim().split('\n')[0].replace('END', '').trim();

                // 3. Mark as pushed instead of deleting
                db.prepare("UPDATE staged_queue SET rid = ?, status = 'pushed' WHERE id = ?").run(rid, nextItem.id);
                console.log(`[Feeder] Pushed RID: ${rid}`);
            }
        }
    } catch (err) {
        console.error('[Feeder Error]', err.message);
    } finally {
        isFeeding = false;
    }
}

// Schedule API
app.get('/api/schedule', (req, res) => {
    try {
        const items = db.prepare('SELECT * FROM schedule ORDER BY start_time ASC').all();
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/schedule', (req, res) => {
    const { title, folder, start_time, days, type } = req.body;
    try {
        const info = db.prepare(`
            INSERT INTO schedule (title, folder, start_time, days, type)
            VALUES (?, ?, ?, ?, ?)
        `).run(title, folder, start_time, JSON.stringify(days), type || 'playlist');
        res.json({ message: 'Event scheduled', id: info.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/schedule/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM schedule WHERE id = ?').run(req.params.id);
        res.json({ message: 'Event deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Archives API
const ARCHIVES_DIR = '/home/shoutcast/recordings';

app.get('/api/archives', (req, res) => {
    fs.readdir(ARCHIVES_DIR, (err, files) => {
        if (err) return res.status(500).json({ error: err.message });
        const archives = files
            .filter(f => f.endsWith('.mp3'))
            .map(f => {
                const stats = fs.statSync(path.join(ARCHIVES_DIR, f));
                return {
                    name: f,
                    size: stats.size,
                    created: stats.birthtime
                };
            })
            .sort((a, b) => b.created - a.created); // Newest first
        res.json(archives);
    });
});

app.get('/api/archives/:name', (req, res) => {
    const filePath = path.join(ARCHIVES_DIR, req.params.name);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    res.download(filePath);
});

app.delete('/api/archives/:name', (req, res) => {
    const filePath = path.join(ARCHIVES_DIR, req.params.name);
    fs.unlink(filePath, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted successfully' });
    });
});

// Recording Control API
app.post('/api/recording/start', async (req, res) => {
    try {
        const result = await sendLiquidsoapCommand('recording.start');
        res.json({ message: 'Recording started', result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/recording/stop', async (req, res) => {
    try {
        const result = await sendLiquidsoapCommand('recording.stop');
        res.json({ message: 'Recording stopped', result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/recording/status', async (req, res) => {
    try {
        // In some versions, output.file doesn't have .status. We use .remaining as a proxy or just check error.
        const result = await sendLiquidsoapCommand('recording.remaining');
        res.json({ status: result && !result.includes('ERROR') ? 'recording' : 'idle', raw: result });
    } catch (err) {
        // specific check if command fails (e.g. older liquidsoap)
        res.json({ status: 'unknown', error: err.message });
    }
});

// Playback Control API
app.post('/api/control/pause', async (req, res) => {
    try {
        const result = await sendLiquidsoapCommand('var.set control_var false');
        res.json({ message: 'Playback paused', result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/control/resume', async (req, res) => {
    try {
        const result = await sendLiquidsoapCommand('var.set control_var true');
        res.json({ message: 'Playback resumed', result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/control/playback-status', async (req, res) => {
    try {
        const result = await sendLiquidsoapCommand('var.get control_var');
        const isPlaying = result.trim() === 'true';
        res.json({ playing: isPlaying, raw: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend running on port ${PORT}`);
    startScheduler();

    // Start Auto-Feeder polling (every 2 seconds)
    setInterval(checkAndFeedQueue, 2000);
});

// --- WebSocket Audio Bridge ---
const WebSocket = require('ws');
const { spawn } = require('child_process');

const wss = new WebSocket.Server({ port: 3001 });
let activeBroadcastSession = null;

wss.on('connection', (ws) => {
    console.log('Client connected for broadcast');

    // Enforce Singleton: Verify if another session is active
    if (activeBroadcastSession) {
        console.warn('Rejecting new connection: Broadcast already active.');
        ws.send(JSON.stringify({ type: 'error', message: 'Broadcast Session Busy' }));
        ws.close();
        return;
    }

    let ffmpeg = null;
    activeBroadcastSession = ws;

    ws.on('message', (message) => {
        if (typeof message === 'string') {
            try {
                const data = JSON.parse(message);
                if (data.type === 'connect') {
                    // Start FFmpeg process to stream to Liquidsoap Harbor
                    // Input: raw float32le 44.1kHz stereo
                    // Output: mp3 via icecast protocol to localhost:8005
                    const ffmpegArgs = [
                        '-f', 'f32le',
                        '-ar', '44100',
                        '-ac', '2',
                        '-i', 'pipe:0',
                        '-c:a', 'libmp3lame',
                        '-b:a', '128k',
                        '-content_type', 'audio/mpeg',
                        '-f', 'mp3',
                        'icecast://source:changeme@127.0.0.1:8005/live' // Mount point must match Harbor
                    ];

                    // Check radio.liq for actual mount point. Usually "/" or "/live".
                    // Assuming "/" based on previous context, but Harbor often uses a path.
                    // If radio.liq has `input.harbor("/")`, then mount is `/`.
                    // The URL would be `icecast://source:changeme@127.0.0.1:8005/`

                    if (ffmpeg) ffmpeg.kill();

                    ffmpeg = spawn('ffmpeg', [
                        '-f', 'f32le',
                        '-ar', '44100',
                        '-ac', '2',
                        '-i', 'pipe:0',
                        '-c:a', 'libmp3lame',
                        '-b:a', '128k',
                        '-content_type', 'audio/mpeg',
                        '-f', 'mp3',
                        'icecast://source:web3radio24@127.0.0.1:8005/'
                    ]);

                    ffmpeg.on('error', (err) => {
                        console.error('FFmpeg Error:', err);
                        ws.send(JSON.stringify({ type: 'error', message: 'FFmpeg Error' }));
                    });

                    ffmpeg.on('close', (code) => {
                        console.log('FFmpeg exited with code', code);
                        // Do not close WS here, client might retry
                    });

                    ws.send(JSON.stringify({ type: 'connected' }));
                }
            } catch (e) {
                console.error('JSON Error:', e);
            }
        } else {
            // Binary audio data
            if (ffmpeg && ffmpeg.stdin.writable) {
                ffmpeg.stdin.write(message);
            }
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        if (ffmpeg) {
            ffmpeg.stdin.end();
            ffmpeg.kill();
        }
        if (activeBroadcastSession === ws) {
            activeBroadcastSession = null;
        }
    });

    ws.on('error', () => {
        if (ffmpeg) ffmpeg.kill();
        if (activeBroadcastSession === ws) {
            activeBroadcastSession = null;
        }
    });
});

console.log('WebSocket Audio Bridge running on port 3001');
