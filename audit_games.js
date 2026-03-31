const fs = require('fs');
const https = require('https');
const path = require('path');

const GAMES_HTML_PATH = './public/games.html';
const OUTPUT_FILE = './game_availability_audit.json';

const BASE_URL = 'https://mathlearnhub.github.io';
const PATHS = {
    'normal game': '/files/',
    'other': '/files/other/',
    'Learning-Tools': '/Learning-Tools/',
    'flash': '/files/flash/files/'
};

// Regex to extract game ID from window.location.href='game/#...'
// Handles potential spaces around = and different quote types
const GAME_ID_REGEX = /window\.location\.href\s*=\s*(?:'|")game\/#([^'"]+)(?:'|")/g;

function parseGamesHtml() {
    try {
        const content = fs.readFileSync(GAMES_HTML_PATH, 'utf8');
        const gameIds = [];
        let match;
        while ((match = GAME_ID_REGEX.exec(content)) !== null) {
            gameIds.push(match[1]);
        }
        // Remove duplicates if any
        return [...new Set(gameIds)];
    } catch (error) {
        console.error("Error reading games.html:", error);
        process.exit(1);
    }
}

function checkUrl(url) {
    return new Promise((resolve) => {
        const req = https.request(url, { method: 'HEAD', timeout: 5000 }, (res) => {
            resolve(res.statusCode === 200);
        });

        req.on('error', () => {
            resolve(false);
        });

        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });

        req.end();
    });
}

async function checkGame(id) {
    // Check in order: Learning-Tools -> other -> normal (or any order? logic in iframe.js checks manifests order...)
    // But user asks "which one". We can check all and see which returns 200.
    // If multiple return 200, we might want to prioritize based on iframe.js logic, but for now knowing it exists is key.
    // iframe.js priority: folders.json (normal?), other.json, Learning-Tools/listfolders.json
    // Actually iframe.js logic iterates manifests: folders.json, other.json, Learning-Tools.
    // So priority: Normal? -> Other? -> Learning?
    // Wait, let's just check all 3.

    // We strictly check for /index.html as requested "check ... which one of the maifest dirs /index.html"
    const checks = [
        { type: 'Learning-Tools', path: `${BASE_URL}/Learning-Tools/${id}/index.html` },
        { type: 'other', path: `${BASE_URL}/files/other/${id}/index.html` },
        { type: 'normal game', path: `${BASE_URL}/files/${id}/index.html` },
        { type: 'flash', path: `${BASE_URL}/files/flash/files/${id}.swf` }
    ];

    for (const check of checks) {
        const exists = await checkUrl(check.path);
        if (exists) {
            return { in_manifest: true, which_manifest: check.type };
        }
    }

    return { in_manifest: false, which_manifest: "none" }; // User asked for "other or Learning...". "none" or null if false.
}

async function main() {
    console.log("Parsing games.html...");
    const gameIds = parseGamesHtml();
    console.log(`Found ${gameIds.length} games.`);

    const results = {};
    const batchSize = 10;

    // Process in batches
    for (let i = 0; i < gameIds.length; i += batchSize) {
        const batch = gameIds.slice(i, i + batchSize);
        console.log(`Processing batch ${i / batchSize + 1} / ${Math.ceil(gameIds.length / batchSize)}...`);

        const promises = batch.map(async (id) => {
            const result = await checkGame(id);
            results[id] = result;
        });

        await Promise.all(promises);
    }

    // Format results to match user request better if needed?
    // "create a json that says name : {in_mainfest :true or flase which_manifest : "other or Learning-Tools or normal game"}"
    // My results object structure is already { "gameId": { "in_manifest": ..., "which_manifest": ... } }

    console.log(`Writing results to ${OUTPUT_FILE}...`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 4));
    console.log("Done.");
}

main();
