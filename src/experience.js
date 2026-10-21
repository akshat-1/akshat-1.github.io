import { portfolio } from './data/portfolio.js';
import { loadViewCount, setupProfileMenu, setupThemeToggle } from './theme.js';

const escapeHtml = (value) => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const requestedRole = new URLSearchParams(window.location.search).get('role');
const item = portfolio.experience.find((entry) => entry.slug === requestedRole) || portfolio.experience[0];
const detail = item.detail;
const content = document.querySelector('[data-detail-content]');
const isDeutscheBankCaseFile = item.slug === 'deutsche-bank';
if (isDeutscheBankCaseFile) {
    document.querySelector('.brand-institute-logo')?.remove();
}
const zoomLevels = [
    { label: '80%', scale: 0.8 },
    { label: '100%', scale: 1 },
    { label: '125%', scale: 1.25 },
    { label: '150%', scale: 1.5 },
    { label: '175%', scale: 1.75 },
    { label: '200%', scale: 2 }
];
let zoomIndex = 1;
const certificateUrl = detail.certificate;
const pdfjsSources = [
    {
        module: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs',
        worker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs'
    },
    {
        module: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs',
        worker: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs'
    }
];
const renderContext = detail.context.map((entry) => {
    if (typeof entry === 'string') {
        return `<p>${escapeHtml(entry)}</p>`;
    }
    return `<div class="detail-week"><p class="detail-week-label">${escapeHtml(entry.period)}</p><p>${escapeHtml(entry.text)}</p></div>`;
}).join('');

setupThemeToggle();
setupProfileMenu();
loadViewCount();

document.title = `${item.company} — ${item.role} — Akshat Porwal`;

content.innerHTML = `
    <header class="detail-hero">
        <div class="detail-hero-copy">
            <p class="eyebrow">${escapeHtml(detail.eyebrow)}</p>
            <h1>${escapeHtml(detail.title)}</h1>
            <p class="detail-intro">${escapeHtml(detail.intro)}</p>
            <div class="detail-meta"><span>${escapeHtml(item.company)}</span><span>${escapeHtml(item.period)}</span><span>${escapeHtml(item.role)}</span></div>
        </div>
        ${isDeutscheBankCaseFile ? '' : '<img class="detail-institute-logo" src="./assets/iitm-logo.png" alt="Indian Institute of Technology Madras logo">'}
    </header>

    <div class="detail-layout">
        <article class="detail-story">
            <p class="micro-label">Context &amp; contribution</p>
            ${renderContext}
            <div class="detail-workstreams"><p class="micro-label">Workstreams</p><div class="tag-row">${detail.workstreams.map((stream) => `<span>${escapeHtml(stream)}</span>`).join('')}</div></div>
        </article>
        <aside class="certificate-column">
            <div class="certificate-header"><div><p class="micro-label">Document vault</p><h2>${escapeHtml(detail.certificateLabel)}</h2></div><span class="view-only-badge">VIEW ONLY</span></div>
            <div class="certificate-frame" oncontextmenu="return false">
                <canvas class="certificate-canvas" aria-label="${escapeHtml(detail.certificateLabel)}" data-certificate-canvas></canvas>
                <p class="certificate-status" data-certificate-status>Loading certificate…</p>
            </div>
            <div class="certificate-controls" aria-label="Certificate zoom controls">
                <button type="button" data-certificate-zoom-out aria-label="Zoom certificate out">−</button>
                <output data-certificate-zoom-value>${zoomLevels[zoomIndex].label}</output>
                <button type="button" data-certificate-zoom-in aria-label="Zoom certificate in">+</button>
            </div>
            <p class="certificate-note">This certificate is locked for viewing. It uses a permanently rasterized, destructive non-linear mosaic treatment; the controls below are limited to zooming, and comment, draw, download, print, and other editing actions are disabled.</p>
        </aside>
    </div>
`;

const certificateFrame = content.querySelector('.certificate-frame');
const certificateCanvas = content.querySelector('[data-certificate-canvas]');
const certificateStatus = content.querySelector('[data-certificate-status]');
const zoomValue = content.querySelector('[data-certificate-zoom-value]');
let certificatePage = null;
let pdfDocument = null;

const renderCertificate = async () => {
    if (!certificatePage) {
        return;
    }
    const baseViewport = certificatePage.getViewport({ scale: 1 });
    const fitScale = Math.max((certificateFrame.clientWidth - 2) / baseViewport.width, 0.1);
    const zoom = zoomLevels[zoomIndex].scale;
    const viewport = certificatePage.getViewport({ scale: fitScale * zoom });
    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    certificateCanvas.width = Math.ceil(viewport.width * devicePixelRatio);
    certificateCanvas.height = Math.ceil(viewport.height * devicePixelRatio);
    certificateCanvas.style.width = `${viewport.width}px`;
    certificateCanvas.style.height = `${viewport.height}px`;
    await certificatePage.render({
        canvasContext: certificateCanvas.getContext('2d', { alpha: false }),
        viewport,
        transform: devicePixelRatio === 1 ? null : [devicePixelRatio, 0, 0, devicePixelRatio, 0, 0]
    }).promise;
    certificateCanvas.classList.add('is-ready');
    certificateStatus.hidden = true;
};

const updateCertificateZoom = async (direction) => {
    zoomIndex = Math.max(0, Math.min(zoomLevels.length - 1, zoomIndex + direction));
    const zoom = zoomLevels[zoomIndex];
    zoomValue.textContent = zoom.label;
    await renderCertificate();
};

content.querySelector('[data-certificate-zoom-out]').addEventListener('click', () => { void updateCertificateZoom(-1); });
content.querySelector('[data-certificate-zoom-in]').addEventListener('click', () => { void updateCertificateZoom(1); });

const loadCertificate = async () => {
    try {
        let pdfjs = null;
        let workerUrl = '';
        for (const source of pdfjsSources) {
            try {
                pdfjs = await import(source.module);
                workerUrl = source.worker;
                break;
            } catch {
                // Try the second CDN before showing the browser fallback state.
            }
        }
        if (!pdfjs) {
            throw new Error('PDF renderer could not be loaded');
        }
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        pdfDocument = await pdfjs.getDocument(certificateUrl).promise;
        certificatePage = await pdfDocument.getPage(1);
        await renderCertificate();
    } catch (error) {
        certificateStatus.hidden = false;
        certificateStatus.textContent = 'Certificate preview unavailable in this browser.';
    }
};

void loadCertificate();
window.addEventListener('resize', () => { void renderCertificate(); }, { passive: true });

document.addEventListener('contextmenu', (event) => {
    if (event.target.closest('.certificate-frame')) event.preventDefault();
});
