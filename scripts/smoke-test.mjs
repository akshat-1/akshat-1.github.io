import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const indexPath = join(dist, 'index.html');

if (!existsSync(indexPath)) {
    throw new Error('dist/index.html is missing; run the production build first.');
}

const html = readFileSync(indexPath, 'utf8');
const runtimeSource = [
    'src/main.js',
    'src/data/portfolio.js',
    'src/experiments/robotics.js',
    'src/experiments/neural.js'
].map((file) => readFileSync(join(root, file), 'utf8')).join('\n');
const siteSource = `${html}\n${runtimeSource}`;
const requiredMarkers = [
    'Akshat Porwal',
    '5DOF Robotics Lab',
    'Neural Lab',
    'professional experience',
    'selected work',
    'positions of responsibility',
    'Akshat_Porwal_Resume.pdf'
];

const missing = requiredMarkers.filter((marker) => !siteSource.toLowerCase().includes(marker.toLowerCase()));
if (missing.length) {
    throw new Error(`Generated site is missing: ${missing.join(', ')}`);
}

if (/MangaReader|MangaDex|mangadex/i.test(siteSource)) {
    throw new Error('Legacy MangaReader/MangaDex references remain in the portfolio source.');
}

if (!existsSync(join(dist, 'Akshat_Porwal_Resume.pdf'))) {
    throw new Error('The resume PDF was not copied into dist.');
}

console.log(`Smoke test passed: ${requiredMarkers.length} portfolio markers, resume asset, and legacy cleanup verified.`);
