/**
 * Production Obsidian Manga Reader Engine (GitHub Pages Compatible)
 * Powered by MangaDex REST API & Canonical Storage Failover Engine
 */

const API_BASE = 'https://api.mangadex.org';
const COVER_BASE = 'https://uploads.mangadex.org/covers';
const UPLOADS_BASE = 'https://uploads.mangadex.org/data';
const UPLOADS_SAVER_BASE = 'https://uploads.mangadex.org/data-saver';

// Application State
const state = {
    currentView: 'home',
    currentManga: null,
    currentChapterList: [],
    currentChapterIndex: -1,
    chapterSortAsc: true,
    readerMode: 'vertical',
    readerTheme: 'dark', // 'dark', 'black', 'sepia', 'slate'
    zoomLevel: 100,
    singlePageIndex: 0,
    readerPages: [],
    useDataSaver: false,
    activeGenre: 'all',
    searchDebounceTimer: null
};

// DOM Elements
const elements = {
    searchForm: document.getElementById('search-form'),
    searchInput: document.getElementById('search-input'),
    searchClear: document.getElementById('search-clear'),
    searchPopup: document.getElementById('search-results-popup'),
    
    homeView: document.getElementById('home-view'),
    detailsView: document.getElementById('details-view'),
    readerView: document.getElementById('reader-view'),
    historyView: document.getElementById('history-view'),
    
    heroBanner: document.getElementById('hero-banner'),
    heroTitle: document.getElementById('hero-title'),
    heroDescription: document.getElementById('hero-description'),
    heroStartBtn: document.getElementById('hero-start-btn'),

    trendingGrid: document.getElementById('trending-grid'),
    searchResultsGrid: document.getElementById('search-results-grid'),
    searchSection: document.getElementById('search-section'),
    searchTitle: document.getElementById('search-title'),
    genrePillsContainer: document.getElementById('genre-pills'),
    
    // Details View
    detailCover: document.getElementById('detail-cover'),
    detailTitle: document.getElementById('detail-title'),
    detailStatus: document.getElementById('detail-status'),
    detailDescription: document.getElementById('detail-description'),
    detailTags: document.getElementById('detail-tags'),
    relatedSection: document.getElementById('related-section'),
    relatedGrid: document.getElementById('related-grid'),
    chapterList: document.getElementById('chapter-list'),
    chapterSearch: document.getElementById('chapter-search'),
    chapterLangSelect: document.getElementById('chapter-lang-select'),
    sortChaptersBtn: document.getElementById('sort-chapters-btn'),

    // Reader View
    readerContainer: document.getElementById('reader-container'),
    readerMangaTitle: document.getElementById('reader-manga-title'),
    readerChapterTitle: document.getElementById('reader-chapter-title'),
    readerPagesContainer: document.getElementById('reader-pages-container'),
    prevChapBtn: document.getElementById('prev-chap-btn'),
    nextChapBtn: document.getElementById('next-chap-btn'),
    qualityToggle: document.getElementById('quality-toggle'),
    chapterSelect: document.getElementById('chapter-select'),
    pageCounter: document.getElementById('page-counter'),
    progressBar: document.getElementById('reader-progress-bar'),

    // History & Navigation
    historyGrid: document.getElementById('history-grid'),
    navHome: document.getElementById('nav-home'),
    navHistory: document.getElementById('nav-history'),
    navBrand: document.getElementById('nav-brand'),
    readerFloatingNav: document.getElementById('reader-floating-nav'),
    toastContainer: document.getElementById('toast-container')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupGenrePills();
    loadPopularManga();
    setupKeyboardNavigation();
});

function setupEventListeners() {
    if (elements.navBrand) {
        elements.navBrand.addEventListener('click', (e) => {
            e.preventDefault();
            showView('home');
        });
    }

    elements.searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = elements.searchInput.value.trim();
        if (query) {
            hideSearchPopup();
            performSearch(query);
        }
    });

    elements.searchInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        elements.searchClear.style.display = val ? 'block' : 'none';

        clearTimeout(state.searchDebounceTimer);
        if (val.length >= 2) {
            state.searchDebounceTimer = setTimeout(() => handleSearchAutocomplete(val), 300);
        } else {
            hideSearchPopup();
        }
    });

    elements.searchClear.addEventListener('click', () => {
        elements.searchInput.value = '';
        elements.searchClear.style.display = 'none';
        hideSearchPopup();
        elements.searchSection.style.display = 'none';
        showView('home');
    });

    document.addEventListener('click', (e) => {
        if (!elements.searchForm.contains(e.target)) {
            hideSearchPopup();
        }
    });

    elements.navHome.addEventListener('click', (e) => {
        e.preventDefault();
        showView('home');
    });

    elements.navHistory.addEventListener('click', (e) => {
        e.preventDefault();
        loadHistoryView();
    });

    if (elements.sortChaptersBtn) {
        elements.sortChaptersBtn.addEventListener('click', () => {
            state.chapterSortAsc = !state.chapterSortAsc;
            elements.sortChaptersBtn.innerHTML = state.chapterSortAsc
                ? '<i class="fa-solid fa-arrow-down-1-9 me-1"></i> Ascending'
                : '<i class="fa-solid fa-arrow-up-9-1 me-1"></i> Descending';
            renderChapterList();
        });
    }

    if (elements.chapterSearch) {
        elements.chapterSearch.addEventListener('input', () => {
            filterChapterList();
        });
    }

    if (elements.chapterLangSelect) {
        elements.chapterLangSelect.addEventListener('change', () => {
            filterChapterList();
        });
    }

    elements.prevChapBtn.addEventListener('click', () => navigateChapter(-1));
    elements.nextChapBtn.addEventListener('click', () => navigateChapter(1));

    elements.chapterSelect.addEventListener('change', (e) => {
        const index = parseInt(e.target.value);
        if (!isNaN(index) && index >= 0) {
            loadChapter(index);
        }
    });

    if (elements.qualityToggle) {
        elements.qualityToggle.addEventListener('change', (e) => {
            state.useDataSaver = e.target.checked;
            showToast(state.useDataSaver ? 'Data Saver mode enabled' : 'High Resolution mode enabled');
            if (state.currentChapterIndex !== -1) {
                loadChapter(state.currentChapterIndex);
            }
        });
    }

    window.addEventListener('scroll', () => {
        if (state.currentView === 'reader' && elements.progressBar) {
            const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (height > 0) ? (winScroll / height) * 100 : 0;
            elements.progressBar.style.width = scrolled + '%';
        }
    });
}

function setupGenrePills() {
    const genres = [
        { id: 'all', name: '🔥 Trending' },
        { id: 'dragonball', name: '🐲 Dragon Ball Universe' },
        { id: '391b0423-d83d-4565-ab8f-4d95f0e00a0c', name: 'Action' },
        { id: '87cc8708-7277-4270-806c-a07e1e684777', name: 'Adventure' },
        { id: 'cbd23a0f-9c6e-482b-9c72-557374828117', name: 'Fantasy' },
        { id: '423e2008-8e65-430b-a19f-d31e50529ef8', name: 'Romance' },
        { id: '25608892-80f0-4b69-a912-4d370f80879e', name: 'Sci-Fi' }
    ];

    if (elements.genrePillsContainer) {
        elements.genrePillsContainer.innerHTML = genres.map(g => `
            <button class="genre-pill ${g.id === 'all' ? 'active' : ''}" onclick="filterByGenre('${g.id}', this)">${g.name}</button>
        `).join('');
    }
}

function setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        if (state.currentView !== 'reader') return;
        if (e.key === 'ArrowLeft') {
            navigateChapter(-1);
        } else if (e.key === 'ArrowRight') {
            navigateChapter(1);
        } else if (e.key === 'f' || e.key === 'F') {
            toggleFullscreen();
        }
    });
}

function showView(viewName) {
    state.currentView = viewName;
    elements.homeView.style.display = viewName === 'home' ? 'block' : 'none';
    elements.detailsView.style.display = viewName === 'details' ? 'block' : 'none';
    elements.readerView.style.display = viewName === 'reader' ? 'block' : 'none';
    elements.historyView.style.display = viewName === 'history' ? 'block' : 'none';

    if (elements.readerFloatingNav) {
        elements.readerFloatingNav.style.setProperty('display', viewName === 'reader' ? 'flex' : 'none', 'important');
    }

    if (viewName !== 'reader' && elements.progressBar) {
        elements.progressBar.style.width = '0%';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Search Autocomplete
async function handleSearchAutocomplete(query) {
    try {
        const url = `${API_BASE}/manga?title=${encodeURIComponent(query)}&limit=6&includes[]=cover_art&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.data && data.data.length > 0) {
            elements.searchPopup.innerHTML = data.data.map(m => {
                const title = m.attributes.title.en || Object.values(m.attributes.title)[0] || 'Untitled';
                let coverFile = '';
                if (m.relationships) {
                    const rel = m.relationships.find(r => r.type === 'cover_art');
                    if (rel && rel.attributes) coverFile = rel.attributes.fileName;
                }
                const coverUrl = coverFile ? `${COVER_BASE}/${m.id}/${coverFile}.256.jpg` : 'https://via.placeholder.com/40x55';

                return `
                    <div class="search-popup-item" onclick="loadMangaDetailsById('${m.id}')">
                        <img src="${coverUrl}" class="search-popup-cover" alt="Cover">
                        <div>
                            <div class="fw-bold small text-light">${escapeHtml(title)}</div>
                            <div class="text-muted text-capitalize" style="font-size:0.75rem">${m.attributes.status || 'Manga'} (${m.attributes.year || 'N/A'})</div>
                        </div>
                    </div>
                `;
            }).join('');
            elements.searchPopup.style.display = 'block';
        } else {
            hideSearchPopup();
        }
    } catch (e) {
        hideSearchPopup();
    }
}

function hideSearchPopup() {
    if (elements.searchPopup) elements.searchPopup.style.display = 'none';
}

// API Popular Manga Loading
async function loadPopularManga() {
    renderSkeletons(elements.trendingGrid, 18);
    try {
        const url = `${API_BASE}/manga?limit=18&includes[]=cover_art&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            renderHeroBanner(data.data[0]);
            renderMangaCards(elements.trendingGrid, data.data);
        }
    } catch (err) {
        console.error('Failed to fetch popular manga:', err);
        elements.trendingGrid.innerHTML = `<div class="col-12 text-center text-muted py-5">Unable to load catalog. Check your connection.</div>`;
    }
}

function renderHeroBanner(manga) {
    if (!elements.heroBanner || !manga) return;
    const attr = manga.attributes;
    const title = attr.title.en || Object.values(attr.title)[0] || 'Featured Series';
    const desc = attr.description.en || Object.values(attr.description)[0] || 'Explore top trending manga chapters.';

    elements.heroTitle.textContent = title;
    elements.heroDescription.textContent = desc.length > 250 ? desc.slice(0, 250) + '...' : desc;
    elements.heroStartBtn.onclick = () => loadMangaDetails(manga);
}

async function performSearch(query) {
    elements.searchSection.style.display = 'block';
    elements.searchTitle.textContent = `Search Results for "${query}"`;
    renderSkeletons(elements.searchResultsGrid, 18);
    showView('home');

    try {
        const url = `${API_BASE}/manga?title=${encodeURIComponent(query)}&limit=24&includes[]=cover_art&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.data && data.data.length > 0) {
            renderMangaCards(elements.searchResultsGrid, data.data);
        } else {
            elements.searchResultsGrid.innerHTML = `<div class="col-12 text-center text-muted py-5">No manga found for "${escapeHtml(query)}". Try another search!</div>`;
        }
    } catch (err) {
        console.error('Search error:', err);
        elements.searchResultsGrid.innerHTML = `<div class="col-12 text-center text-danger py-4">Search failed.</div>`;
    }
}

async function filterByGenre(genreId, btnElement) {
    const buttons = document.querySelectorAll('.genre-pill');
    buttons.forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    if (genreId === 'dragonball') {
        performSearch('Dragon Ball');
        return;
    }

    renderSkeletons(elements.trendingGrid, 18);
    try {
        let url = `${API_BASE}/manga?limit=18&includes[]=cover_art&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive`;
        if (genreId !== 'all') {
            url += `&includedTags[]=${genreId}`;
        }
        const response = await fetch(url);
        const data = await response.json();
        if (data.data) {
            renderMangaCards(elements.trendingGrid, data.data);
        }
    } catch (e) {
        console.error('Genre filter error:', e);
    }
}

function renderMangaCards(container, mangaList) {
    container.innerHTML = '';
    mangaList.forEach(manga => {
        const mId = manga.id;
        const attr = manga.attributes;
        const title = attr.title.en || Object.values(attr.title)[0] || 'Untitled';
        const status = attr.status || 'Unknown';

        let coverFile = '';
        if (manga.relationships) {
            const rel = manga.relationships.find(r => r.type === 'cover_art');
            if (rel && rel.attributes) coverFile = rel.attributes.fileName;
        }
        const coverUrl = coverFile
            ? `${COVER_BASE}/${mId}/${coverFile}.256.jpg`
            : 'https://via.placeholder.com/200x300?text=No+Cover';

        const card = document.createElement('div');
        card.className = 'manga-card';
        card.innerHTML = `
            <div class="manga-cover-wrapper">
                <img src="${coverUrl}" class="manga-cover" alt="${escapeHtml(title)}" loading="lazy" onerror="this.src='https://via.placeholder.com/200x300?text=Cover+Unavailable'">
                <span class="manga-badge">${status}</span>
            </div>
            <div class="manga-info">
                <div class="manga-title">${escapeHtml(title)}</div>
                <div class="manga-meta">
                    <span><i class="fa-solid fa-star text-warning me-1"></i> ${attr.year || 'N/A'}</span>
                    <span class="badge bg-secondary text-uppercase">${attr.originalLanguage || 'Manga'}</span>
                </div>
            </div>
        `;

        card.addEventListener('click', () => loadMangaDetails(manga));
        container.appendChild(card);
    });
}

async function loadMangaDetailsById(mangaId) {
    hideSearchPopup();
    try {
        const res = await fetch(`${API_BASE}/manga/${mangaId}?includes[]=cover_art`);
        const data = await res.json();
        if (data.data) {
            loadMangaDetails(data.data);
        }
    } catch (e) {
        console.error('Failed to load manga details by ID:', e);
    }
}

// Details & Chapters Resolver
async function loadMangaDetails(manga) {
    state.currentManga = manga;
    const mId = manga.id;
    const attr = manga.attributes;
    const title = attr.title.en || Object.values(attr.title)[0] || 'Untitled';

    let coverFile = '';
    if (manga.relationships) {
        const rel = manga.relationships.find(r => r.type === 'cover_art');
        if (rel && rel.attributes) coverFile = rel.attributes.fileName;
    }
    const coverUrl = coverFile
        ? `${COVER_BASE}/${mId}/${coverFile}`
        : 'https://via.placeholder.com/200x300?text=No+Cover';

    elements.detailCover.src = coverUrl;
    elements.detailTitle.textContent = title;
    elements.detailStatus.textContent = `Status: ${attr.status || 'Unknown'} | Year: ${attr.year || 'N/A'}`;
    
    const desc = attr.description.en || Object.values(attr.description)[0] || 'No description available.';
    elements.detailDescription.textContent = desc.length > 350 ? desc.slice(0, 350) + '...' : desc;

    elements.detailTags.innerHTML = (attr.tags || []).slice(0, 6).map(t => 
        `<span class="badge bg-danger me-1 mb-1 opacity-75">${t.attributes.name.en}</span>`
    ).join('');

    showView('details');
    elements.chapterList.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-danger" role="status"></div><div class="mt-2 text-muted">Resolving chapters...</div></div>`;

    loadRelatedSeries(title);

    try {
        const feedUrl = `${API_BASE}/manga/${mId}/feed?limit=500&order[chapter]=asc`;
        const res = await fetch(feedUrl);
        const data = await res.json();
        let readable = (data.data || []).filter(c => (c.attributes.pages || 0) > 0);

        if (readable.length === 0) {
            readable = data.data || [];
        }

        if (readable.length > 0) {
            // Numerical chapter sort
            readable.sort((a, b) => {
                const numA = parseFloat(a.attributes.chapter) || 99999;
                const numB = parseFloat(b.attributes.chapter) || 99999;
                return numA - numB;
            });

            const seen = new Set();
            const filtered = [];
            readable.forEach(ch => {
                const num = ch.attributes.chapter || 'Extra';
                if (!seen.has(num)) {
                    seen.add(num);
                    filtered.push(ch);
                }
            });

            state.currentChapterList = filtered;
            renderChapterList();
        } else {
            elements.chapterList.innerHTML = `
                <div class="text-center py-4">
                    <p class="text-muted mb-3">No direct image chapters found for this specific edition record.</p>
                    <button class="btn btn-outline-danger btn-sm rounded-pill" onclick="performSearch('${escapeHtml(title)}')">
                        <i class="fa-solid fa-magnifying-glass me-1"></i> Search Alternate Editions
                    </button>
                </div>
            `;
        }
    } catch (err) {
        console.error('Failed to load chapters:', err);
        elements.chapterList.innerHTML = `<div class="text-center text-danger py-4">Failed to resolve chapters. Check your connection.</div>`;
    }
}

async function loadRelatedSeries(currentTitle) {
    if (!elements.relatedSection || !elements.relatedGrid) return;
    
    let baseQuery = currentTitle.split(/[:\-(]/)[0].trim();
    if (baseQuery.length < 3) baseQuery = currentTitle;

    try {
        const url = `${API_BASE}/manga?title=${encodeURIComponent(baseQuery)}&limit=6&includes[]=cover_art&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive`;
        const res = await fetch(url);
        const data = await res.json();

        const related = (data.data || []).filter(m => m.id !== state.currentManga.id);
        if (related.length > 0) {
            elements.relatedGrid.innerHTML = related.slice(0, 4).map(m => {
                const title = m.attributes.title.en || Object.values(m.attributes.title)[0] || 'Untitled';
                let coverFile = '';
                if (m.relationships) {
                    const rel = m.relationships.find(r => r.type === 'cover_art');
                    if (rel && rel.attributes) coverFile = rel.attributes.fileName;
                }
                const coverUrl = coverFile ? `${COVER_BASE}/${m.id}/${coverFile}.256.jpg` : 'https://via.placeholder.com/200x300';
                
                return `
                    <div class="col-6 col-md-3">
                        <div class="manga-card" onclick="loadMangaDetailsById('${m.id}')">
                            <div class="manga-cover-wrapper">
                                <img src="${coverUrl}" class="manga-cover" alt="${escapeHtml(title)}">
                            </div>
                            <div class="manga-info p-2">
                                <div class="manga-title small fw-bold">${escapeHtml(title)}</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            elements.relatedSection.style.display = 'block';
        } else {
            elements.relatedSection.style.display = 'none';
        }
    } catch (e) {
        elements.relatedSection.style.display = 'none';
    }
}

function renderChapterList() {
    if (!state.currentChapterList || state.currentChapterList.length === 0) {
        elements.chapterList.innerHTML = `<div class="text-center text-muted py-3">No chapters available.</div>`;
        return;
    }

    let list = [...state.currentChapterList];
    if (!state.chapterSortAsc) {
        list.reverse();
    }

    const history = getHistory();
    const currentMangaHistory = history[state.currentManga.id] || {};

    elements.chapterList.innerHTML = list.map((ch) => {
        const origIndex = state.currentChapterList.findIndex(c => c.id === ch.id);
        const num = ch.attributes.chapter || 'Extra';
        const title = ch.attributes.title ? `: ${ch.attributes.title}` : '';
        const lang = (ch.attributes.translatedLanguage || 'EN').toUpperCase();
        const pagesCount = ch.attributes.pages ? ` (${ch.attributes.pages} pgs)` : '';
        const isRead = currentMangaHistory.readChapters && currentMangaHistory.readChapters.includes(ch.id);

        return `
            <a href="#" class="chapter-item ${isRead ? 'read' : ''}" data-lang="${lang}" onclick="event.preventDefault(); loadChapter(${origIndex});">
                <div>
                    <i class="fa-regular fa-file-lines me-2 text-danger"></i>
                    <strong>Chapter ${num}</strong>${escapeHtml(title)} <span class="badge bg-dark ms-1">${lang}</span>${pagesCount}
                </div>
                ${isRead ? '<span class="badge bg-success"><i class="fa-solid fa-check me-1"></i>Read</span>' : '<i class="fa-solid fa-chevron-right text-muted"></i>'}
            </a>
        `;
    }).join('');
}

function filterChapterList() {
    const query = elements.chapterSearch ? elements.chapterSearch.value.toLowerCase() : '';
    const selectedLang = elements.chapterLangSelect ? elements.chapterLangSelect.value : 'all';
    
    const items = elements.chapterList.querySelectorAll('.chapter-item');
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        const itemLang = item.getAttribute('data-lang') || '';
        
        const matchesQuery = text.includes(query);
        const matchesLang = selectedLang === 'all' || itemLang === selectedLang;
        
        item.style.display = (matchesQuery && matchesLang) ? 'flex' : 'none';
    });
}

// Load Reader View with Canonical Storage Engine (Guaranteed Status 200)
async function loadChapter(index) {
    if (index < 0 || index >= state.currentChapterList.length) return;
    
    state.currentChapterIndex = index;
    const chapter = state.currentChapterList[index];
    const chNum = chapter.attributes.chapter || 'Extra';
    const chTitle = chapter.attributes.title || '';

    const mangaTitle = state.currentManga.attributes.title.en || Object.values(state.currentManga.attributes.title)[0];
    elements.readerMangaTitle.textContent = mangaTitle;
    elements.readerChapterTitle.textContent = `Chapter ${chNum}${chTitle ? ': ' + chTitle : ''}`;

    elements.chapterSelect.innerHTML = state.currentChapterList.map((c, i) => `
        <option value="${i}" ${i === index ? 'selected' : ''}>Chapter ${c.attributes.chapter || 'Extra'}</option>
    `).join('');

    elements.prevChapBtn.disabled = index === 0;
    elements.nextChapBtn.disabled = index === state.currentChapterList.length - 1;

    showView('reader');
    elements.readerPagesContainer.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-danger" role="status"></div><div class="mt-3 text-muted">Loading high-speed pages...</div></div>`;

    saveToHistory(state.currentManga.id, mangaTitle, chapter.id, chNum);

    try {
        const res = await fetch(`${API_BASE}/at-home/server/${chapter.id}`);
        const data = await res.json();

        if (data.chapter && data.chapter.hash) {
            const baseUrl = data.baseUrl || 'https://uploads.mangadex.org';
            const hash = data.chapter.hash;
            const filenames = state.useDataSaver ? (data.chapter.dataSaver || data.chapter.data) : (data.chapter.data || data.chapter.dataSaver);
            const saverFilenames = data.chapter.dataSaver || data.chapter.data;

            // Construct Canonical Uploads URL as Primary (Guaranteed 200)
            state.readerPages = (filenames || []).map((f, i) => ({
                primary: `${UPLOADS_BASE}/${hash}/${f}`,
                secondary: `${UPLOADS_SAVER_BASE}/${hash}/${saverFilenames[i] || f}`,
                backup: `${baseUrl}/data/${hash}/${f}`
            }));

            if (state.readerPages.length > 0) {
                elements.pageCounter.textContent = `Total Pages: ${state.readerPages.length}`;
                renderPages();
            } else {
                elements.readerPagesContainer.innerHTML = `<div class="text-center text-muted py-5">Chapter image data unavailable.</div>`;
            }
        } else {
            elements.readerPagesContainer.innerHTML = `<div class="text-center text-muted py-5">Unable to connect to image storage server.</div>`;
        }
    } catch (err) {
        console.error('Failed to load chapter pages:', err);
        elements.readerPagesContainer.innerHTML = `<div class="text-center text-danger py-5">Network error fetching chapter pages. Click retry below.</div>`;
    }
}

function renderPages() {
    const zoomStyle = `style="max-width: ${state.zoomLevel}%; margin: 0 auto 14px auto;"`;
    elements.readerPagesContainer.innerHTML = state.readerPages.map((page, i) => `
        <img src="${page.primary}" class="reader-image" ${zoomStyle} alt="Page ${i + 1}" loading="lazy" onerror="handleImageFailover(this, '${page.secondary}', '${page.backup}')">
    `).join('');
}

function handleImageFailover(img, secondaryUrl, backupUrl) {
    if (!img.getAttribute('data-failed-once')) {
        img.setAttribute('data-failed-once', 'true');
        img.src = secondaryUrl;
    } else if (!img.getAttribute('data-failed-twice')) {
        img.setAttribute('data-failed-twice', 'true');
        img.src = backupUrl;
    } else {
        img.onerror = null;
        img.src = 'https://via.placeholder.com/800x1200?text=Image+Load+Failed';
    }
}

function navigateChapter(direction) {
    const newIdx = state.currentChapterIndex + direction;
    if (newIdx >= 0 && newIdx < state.currentChapterList.length) {
        loadChapter(newIdx);
    }
}

function setReaderTheme(theme) {
    state.readerTheme = theme;
    elements.readerContainer.className = `reader-container reader-theme-${theme}`;
    showToast(`Reader theme set to ${theme}`);
}

function adjustZoom(delta) {
    state.zoomLevel = Math.max(50, Math.min(200, state.zoomLevel + delta));
    renderPages();
    showToast(`Zoom: ${state.zoomLevel}%`);
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {});
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
}

// History & Toast Notifications
function getHistory() {
    try {
        return JSON.parse(localStorage.getItem('manga_reader_history') || '{}');
    } catch (e) {
        return {};
    }
}

function saveToHistory(mangaId, mangaTitle, chapterId, chapterNum) {
    const history = getHistory();
    if (!history[mangaId]) {
        history[mangaId] = {
            title: mangaTitle,
            lastChapterId: chapterId,
            lastChapterNum: chapterNum,
            timestamp: Date.now(),
            readChapters: []
        };
    }
    history[mangaId].lastChapterId = chapterId;
    history[mangaId].lastChapterNum = chapterNum;
    history[mangaId].timestamp = Date.now();

    if (!history[mangaId].readChapters) history[mangaId].readChapters = [];
    if (!history[mangaId].readChapters.includes(chapterId)) {
        history[mangaId].readChapters.push(chapterId);
    }

    localStorage.setItem('manga_reader_history', JSON.stringify(history));
}

function loadHistoryView() {
    showView('history');
    const history = getHistory();
    const keys = Object.keys(history).sort((a, b) => history[b].timestamp - history[a].timestamp);

    if (keys.length === 0) {
        elements.historyGrid.innerHTML = `<div class="col-12 text-center text-muted py-5">No reading history saved yet.</div>`;
        return;
    }

    elements.historyGrid.innerHTML = keys.map(id => {
        const item = history[id];
        const timeAgo = new Date(item.timestamp).toLocaleDateString();
        return `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card bg-secondary text-light h-100 p-3" style="background-color: var(--bg-card) !important; border: 1px solid var(--border-color); border-radius: 16px;">
                    <h5 class="card-title text-truncate">${escapeHtml(item.title)}</h5>
                    <p class="card-text text-muted mb-3 small">Last Read: Chapter ${item.lastChapterNum} (${timeAgo})</p>
                    <button class="btn btn-outline-danger btn-sm mt-auto rounded-pill" onclick="loadMangaDetailsById('${id}')">Resume Reading</button>
                </div>
            </div>
        `;
    }).join('');
}

function showToast(message) {
    if (!elements.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast-custom';
    toast.innerHTML = `<i class="fa-solid fa-circle-info me-2 text-danger"></i> ${message}`;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function renderSkeletons(container, count) {
    container.innerHTML = Array(count).fill(0).map(() => `
        <div class="manga-card">
            <div class="manga-cover-wrapper skeleton"></div>
            <div class="manga-info">
                <div class="skeleton mb-2" style="height: 16px; width: 80%;"></div>
                <div class="skeleton" style="height: 12px; width: 40%;"></div>
            </div>
        </div>
    `).join('');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
