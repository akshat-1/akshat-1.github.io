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

const sourceIndex = readFileSync(join(root, 'index.html'), 'utf8');
for (const marker of ['./src/styles.css', './src/experiments/robotics.css', './src/experiments/neural.css', './vendor/three.module.js']) {
    if (!sourceIndex.includes(marker)) {
        throw new Error(`Branch-root fallback is missing ${marker}.`);
    }
}

for (const file of ['Akshat_Porwal_Resume.pdf', 'assets/profile-placeholder.svg', 'vendor/three.module.js']) {
    if (!existsSync(join(root, file))) {
        throw new Error(`Branch-root fallback asset is missing ${file}.`);
    }
}

console.log(`Smoke test passed: ${requiredMarkers.length} portfolio markers, compiled assets, branch-root fallback, and legacy cleanup verified.`);
