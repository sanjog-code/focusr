/**
 * Focusr IndexNow Real-Time Search Engine Ping (Bing, Microsoft Copilot, Yandex)
 */

const HOST = 'focusr-seven.vercel.app';
const KEY = 'focusr7e92b829bproduction2026';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

const URLS_TO_INDEX = [
    `https://${HOST}/`,
    `https://${HOST}/llms.txt`,
    `https://${HOST}/llms-full.txt`,
    `https://${HOST}/sitemap.xml`
];

const PAYLOAD = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: URLS_TO_INDEX
};

const ENDPOINTS = [
    'https://api.indexnow.org/indexnow',
    'https://www.bing.com/indexnow',
    'https://yandex.com/indexnow'
];

async function pingIndexNow() {
    console.log('🚀 Pinging IndexNow Search Engines for Focusr...');
    console.log(`   Host: ${HOST}`);
    console.log(`   Key Location: ${KEY_LOCATION}`);
    console.log(`   URLs Submitted (${URLS_TO_INDEX.length}):`);
    URLS_TO_INDEX.forEach(u => console.log(`     - ${u}`));
    console.log('');

    for (const endpoint of ENDPOINTS) {
        try {
            console.log(`📡 Sending to: ${endpoint}`);
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                },
                body: JSON.stringify(PAYLOAD)
            });

            if (res.status === 200 || res.status === 202) {
                console.log(`   ✅ Success (${res.status}): IndexNow accepted URL set for immediate crawl.`);
            } else {
                const text = await res.text();
                console.warn(`   ⚠️ Warning: Status ${res.status} ${res.statusText}: ${text}`);
            }
        } catch (err) {
            console.error(`   ❌ Failed to ping ${endpoint}:`, err.message);
        }
    }

    console.log('\n✨ IndexNow ping sequence complete! Bing & Microsoft Copilot crawlers alerted.');
}

pingIndexNow();
