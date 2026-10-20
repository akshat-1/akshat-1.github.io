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
const certificateUrl = `${detail.certificate}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&commenting=0&annotation=0&view=FitH`;

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
            ${detail.context.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
            <div class="detail-workstreams"><p class="micro-label">Workstreams</p><div class="tag-row">${detail.workstreams.map((stream) => `<span>${escapeHtml(stream)}</span>`).join('')}</div></div>
        </article>
        <aside class="certificate-column">
            <div class="certificate-header"><div><p class="micro-label">Document vault</p><h2>${escapeHtml(detail.certificateLabel)}</h2></div><span class="view-only-badge">VIEW ONLY</span></div>
            <div class="certificate-frame" oncontextmenu="return false">
                <iframe src="${escapeHtml(certificateUrl)}" title="${escapeHtml(detail.certificateLabel)}" loading="lazy" sandbox="allow-same-origin" tabindex="-1" aria-readonly="true"></iframe>
                <div class="certificate-shield" aria-hidden="true"></div>
            </div>
            <p class="certificate-note">This certificate is displayed in a locked, view-only frame. Comment, draw, download, print, and other editing actions are disabled.</p>
        </aside>
    </div>
`;

document.addEventListener('contextmenu', (event) => {
    if (event.target.closest('.certificate-frame')) event.preventDefault();
});
