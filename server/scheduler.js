const cron = require('node-cron');
const db = require('./database');
const { Telnet } = require('telnet-client');

async function sendLiquidsoapCommand(command) {
    const connection = new Telnet();
    const params = {
        host: '127.0.0.1',
        port: 1234,
        shellPrompt: '>',
        timeout: 1500
    };

    try {
        await connection.connect(params);
        const res = await connection.exec(command);
        await connection.end();
        return res;
    } catch (err) {
        console.error('Scheduler Telnet Error:', err);
    }
}

function startScheduler() {
    console.log('Radio Scheduler Worker Started...');

    // Run every minute
    cron.schedule('* * * * *', async () => {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const currentDay = now.getDay(); // 0 (Sun) - 6 (Sat)

        console.log(`[Scheduler] Checking events for ${currentTime} (Day: ${currentDay})`);

        // Find enabled events for today at this time
        const events = db.prepare(`
            SELECT * FROM schedule 
            WHERE enabled = 1 AND start_time = ?
        `).all(currentTime);

        for (const event of events) {
            const days = JSON.parse(event.days);
            if (days.includes(currentDay)) {
                console.log(`[Scheduler] Triggering Event: ${event.title} (${event.folder})`);

                try {
                    if (event.type === 'push') {
                        // Push a random file from the folder to the queue (jingle/ad)
                        // Note: Requires more complex logic to pick a file, for now we skip to the source
                        // In radio.liq we could have different queues
                        await sendLiquidsoapCommand(`${event.folder}.skip`);
                    } else {
                        // Switch to the folder (standard behavior)
                        // For now we just skip the main radio to force a refresh or trigger 
                        await sendLiquidsoapCommand('radio.skip');
                    }
                } catch (err) {
                    console.error(`Failed to trigger event ${event.id}:`, err);
                }
            }
        }
    });
}

module.exports = { startScheduler };
