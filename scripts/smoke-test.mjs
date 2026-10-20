import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const indexPath = join(dist, 'index.html');
const experiencePath = join(dist, 'experience.html');

if (!existsSync(indexPath)) {
    throw new Error('dist/index.html is missing; run the production build first.');
}
if (!existsSync(experiencePath)) {
    throw new Error('dist/experience.html is missing; multi-page build is not configured.');
}

const html = readFileSync(indexPath, 'utf8');
const experienceHtml = readFileSync(experiencePath, 'utf8');
const runtimeSource = [
    'src/main.js',
    'src/data/portfolio.js',
    'src/experiments/robotics.js',
    'src/experiments/neural.js'
].map((file) => readFileSync(join(root, file), 'utf8')).join('\n');
const siteSource = `${html}\n${experienceHtml}\n${runtimeSource}`;
const requiredMarkers = [
    'Akshat Porwal',
    'createRoboticsLab',
    'createNeuralLab',
    'professional experience',
    'selected work',
    'positions of responsibility',
    'Akshat_Porwal_Resume.pdf',
    'experience.html?role='
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

for (const certificate of ['certificates/deutsche-bank-internship.pdf', 'certificates/iit-cybersecurity-internship.pdf']) {
    if (!existsSync(join(dist, certificate))) {
        throw new Error(`Certificate asset was not copied into dist: ${certificate}`);
    }
}

const sourceIndex = readFileSync(join(root, 'index.html'), 'utf8');
for (const marker of ['./src/styles.css', './src/experiments/robotics.css', './src/experiments/neural.css', './vendor/three.module.js']) {
    if (!sourceIndex.includes(marker)) {
        throw new Error(`Branch-root fallback is missing ${marker}.`);
    }
}

for (const file of ['Akshat_Porwal_Resume.pdf', 'assets/profile-photo.png', 'assets/iitm-logo.png', 'certificates/deutsche-bank-internship.pdf', 'certificates/iit-cybersecurity-internship.pdf', 'vendor/three.module.js']) {
    if (!existsSync(join(root, file))) {
        throw new Error(`Branch-root fallback asset is missing ${file}.`);
    }
}

console.log(`Smoke test passed: ${requiredMarkers.length} portfolio markers, experience page, certificates, profile assets, compiled assets, branch-root fallback, and legacy cleanup verified.`);
