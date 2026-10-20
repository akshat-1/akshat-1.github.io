import { mkdir, writeFile } from 'node:fs/promises';

const token = process.env.GOATCOUNTER_API_KEY;
const apiUrl = process.env.GOATCOUNTER_API_URL
    || 'https://akshat-1.goatcounter.com/api/v0/stats/total?start=2000-01-01T00:00:00Z';
const outputPath = 'public/view-count.json';

if (!token) {
    throw new Error('GOATCOUNTER_API_KEY is not set. Add the goatcounter_api GitHub Actions secret.');
}

const response = await fetch(apiUrl, {
    headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`
    }
});

if (!response.ok) {
    const body = await response.text();
    throw new Error(`GoatCounter API failed with HTTP ${response.status}: ${body.slice(0, 240)}`);
}

const payload = await response.json();
const count = Number(payload.total ?? payload.total_utc);
if (!Number.isFinite(count) || count < 0) {
    throw new Error('GoatCounter returned no valid total pageview count.');
}

await mkdir('public', { recursive: true });
await writeFile(outputPath, `${JSON.stringify({
    count: Math.floor(count),
    source: 'GoatCounter',
    updatedAt: new Date().toISOString()
}, null, 2)}\n`);

console.log(`Updated ${outputPath} with ${Math.floor(count)} GoatCounter pageviews.`);
