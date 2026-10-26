import { mkdir, writeFile } from 'node:fs/promises';

const token = process.env.GOATCOUNTER_API_KEY;
const apiUrl = new URL(process.env.GOATCOUNTER_API_URL
    || 'https://akshat-1.goatcounter.com/api/v0/stats/total');
if (!process.env.GOATCOUNTER_API_URL) {
    const end = new Date();
    end.setUTCMinutes(0, 0, 0);
    apiUrl.searchParams.set('start', '2020-01-01T00:00:00Z');
    apiUrl.searchParams.set('end', end.toISOString());
}
const outputPaths = ['public/view-count.json', 'view-count.json'];

if (!token) {
    throw new Error('GOATCOUNTER_API_KEY is not set. Add the GOATCOUNTER_API GitHub Actions secret.');
}

const response = await fetch(apiUrl, {
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
    }
});

if (!response.ok) {
    const body = await response.text();
    if (response.status === 404) {
        console.warn(`GoatCounter stats endpoint returned HTTP 404 at ${response.url}; keeping the existing view count.`);
        process.exit(0);
    }
    throw new Error(`GoatCounter API failed with HTTP ${response.status} at ${response.url}: ${body.slice(0, 240)}`);
}

const payload = await response.json();
const count = Number(payload.total ?? payload.total_utc);
if (!Number.isFinite(count) || count < 0) {
    throw new Error('GoatCounter returned no valid total pageview count.');
}

await mkdir('public', { recursive: true });
const output = `${JSON.stringify({
    count: Math.floor(count),
    source: 'GoatCounter',
    updatedAt: new Date().toISOString()
}, null, 2)}\n`;
await Promise.all(outputPaths.map((outputPath) => writeFile(outputPath, output)));

console.log(`Updated ${outputPaths.join(' and ')} with ${Math.floor(count)} GoatCounter pageviews.`);
