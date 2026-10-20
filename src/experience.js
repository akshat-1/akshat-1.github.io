import { portfolio } from './data/portfolio.js';

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
const zoomLevels = [
    { label: '80%', scale: 0.8 },
    { label: '100%', scale: 1 },
    { label: '125%', scale: 1.25 },
    { label: '150%', scale: 1.5 },
    { label: '175%', scale: 1.75 },
    { label: '200%', scale: 2 }
];
let zoomIndex = 1;
const certificateUrl = `${detail.certificate}#toolbar=0&navpanes=0&statusbar=0&messages=0&commenting=0&annotation=0&view=FitH`;
const renderContext = detail.context.map((entry) => {
    if (typeof entry === 'string') {
        return `<p>${escapeHtml(entry)}</p>`;
    }
    return `<div class="detail-week"><p class="detail-week-label">${escapeHtml(entry.period)}</p><p>${escapeHtml(entry.text)}</p></div>`;
}).join('');

document.title = `${item.company} — ${item.role} — Akshat Porwal`;

content.innerHTML = `
    <header class="detail-hero">
        <div class="detail-hero-copy">
            <p class="eyebrow">${escapeHtml(detail.eyebrow)}</p>
            <h1>${escapeHtml(detail.title)}</h1>
            <p class="detail-intro">${escapeHtml(detail.intro)}</p>
            <div class="detail-meta"><span>${escapeHtml(item.company)}</span><span>${escapeHtml(item.period)}</span><span>${escapeHtml(item.role)}</span></div>
        </div>
        <img class="detail-institute-logo" src="./assets/iitm-logo.png" alt="Indian Institute of Technology Madras logo">
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
                <iframe src="${escapeHtml(certificateUrl)}" title="${escapeHtml(detail.certificateLabel)}" loading="eager" tabindex="-1" aria-readonly="true" data-certificate-frame></iframe>
            </div>
            <div class="certificate-controls" aria-label="Certificate zoom controls">
                <button type="button" data-certificate-zoom-out aria-label="Zoom certificate out">−</button>
                <output data-certificate-zoom-value>${zoomLevels[zoomIndex].label}</output>
                <button type="button" data-certificate-zoom-in aria-label="Zoom certificate in">+</button>
            </div>
            <p class="certificate-note">This certificate is displayed in a locked, view-only frame. Comment, draw, download, print, and other editing actions are disabled.</p>
        </aside>
    </div>
`;

const certificateFrame = content.querySelector('[data-certificate-frame]');
const zoomValue = content.querySelector('[data-certificate-zoom-value]');
const updateCertificateZoom = (direction) => {
    zoomIndex = Math.max(0, Math.min(zoomLevels.length - 1, zoomIndex + direction));
    const zoom = zoomLevels[zoomIndex];
    certificateFrame.style.width = `${zoom.scale * 100}%`;
    certificateFrame.style.height = `${zoom.scale * 100}%`;
    certificateFrame.src = certificateUrl;
    zoomValue.textContent = zoom.label;
};

content.querySelector('[data-certificate-zoom-out]').addEventListener('click', () => updateCertificateZoom(-1));
content.querySelector('[data-certificate-zoom-in]').addEventListener('click', () => updateCertificateZoom(1));

document.addEventListener('contextmenu', (event) => {
    if (event.target.closest('.certificate-frame')) event.preventDefault();
});
