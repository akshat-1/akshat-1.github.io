/**
 * Production Manga Reader Engine v15.0
 * Real Multi-Page Chapter Filter & Proportional PDF Downloader
 */

const API_BASE = 'https://api.mangadex.org';
const COVER_BASE = 'https://uploads.mangadex.org/covers';
const UPLOADS_BASE = 'https://uploads.mangadex.org/data';
const UPLOADS_SAVER_BASE = 'https://uploads.mangadex.org/data-saver';

// Accurate MangaDex Tag UUIDs
const GENRE_TAGS = {
    action: '391b0423-d847-456f-aff0-8b0cfc03066b',
    adventure: '87cc87cd-a395-47af-b27a-93258283bbc6',
    fantasy: 'cdc58593-87dd-415e-bbc0-2ec27bf404cc',
    comedy: '4d32cc48-9f00-4cca-9b5a-a839f0764984',
    romance: '423e2eae-a7a2-4a8b-ac03-a8351462d71d',
    scifi: '256c8bd9-4904-4360-bf4f-508a76d67183'
};

// Application State
const state = {
    currentView: 'home',
    heroManga: null,
    currentManga: null,
    currentChapterList: [],
    currentChapterIndex: -1,
    chapterSortAsc: true,
    readerMode: 'vertical',
    readerTheme: 'dark',
    zoomLevel: 100,
    readerPages: [],
    useDataSaver: false,
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
    actionGrid: document.getElementById('action-grid'),
    adventureGrid: document.getElementById('adventure-grid'),
    fantasyGrid: document.getElementById('fantasy-grid'),
    romanceGrid: document.getElementById('romance-grid'),
    
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

    // Navigation & History
    historyGrid: document.getElementById('history-grid'),
    navHome: document.getElementById('nav-home'),
    navHistory: document.getElementById('nav-history'),
    navBrand: document.getElementById('nav-brand'),
    readerFloatingNav: document.getElementById('reader-floating-nav'),
    toastContainer: document.getElementById('toast-container')
};

// Safe Helpers
function getMangaDescription(attr) {
    if (!attr || !attr.description) return 'No description available for this title.';
    if (typeof attr.description === 'string') return attr.description;
    if (attr.description.en) return attr.description.en;
    const values = Object.values(attr.description);
    if (values.length > 0 && values[0]) return values[0];
    return 'No description available for this title.';
}

function getCoverUrl(manga, size = '256') {
    if (!manga) return 'https://via.placeholder.com/200x300?text=No+Cover';
    const mId = manga.id;
    let coverFile = '';
    if (manga.relationships) {
        const rel = manga.relationships.find(r => r.type === 'cover_art');
        if (rel && rel.attributes) coverFile = rel.attributes.fileName;
    }
    if (!coverFile) return 'https://via.placeholder.com/200x300?text=No+Cover';
    if (size === 'original') return `${COVER_BASE}/${mId}/${coverFile}`;
    return `${COVER_BASE}/${mId}/${coverFile}.${size}.jpg`;
}

function handleCoverFailover(img, mId, coverFile) {
    if (img.getAttribute('data-failed-cover')) {
        img.onerror = null;
        img.src = 'https://via.placeholder.com/200x300?text=Cover+Unavailable';
    } else {
        img.setAttribute('data-failed-cover', 'true');
        img.src = `${COVER_BASE}/${mId}/${coverFile}`;
    }
}

// Convert Image URL to Base64 Data URL (Fixes Canvas Taint DOMException)
async function imageUrlToBase64(url) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        return null;
    }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupGenrePills();
    loadAllHomeGrids();
    setupKeyboardNavigation();
    checkURLParams();
});

function checkURLParams() {
    const params = new URLSearchParams(window.location.search);
    const mangaId = params.get('manga');
    if (mangaId) {
        loadMangaDetailsById(mangaId);
    }
}

function setupEventListeners() {
    if (elements.navBrand) {
        elements.navBrand.addEventListener('click', (e) => {
            e.preventDefault();
            showView('home');
        });
    }

    if (elements.heroStartBtn) {
        elements.heroStartBtn.addEventListener('click', () => {
            if (state.heroManga) {
                loadMangaDetails(state.heroManga);
            } else {
                const trendingSec = document.getElementById('trending-section');
                if (trendingSec) trendingSec.scrollIntoView({ behavior: 'smooth' });
            }
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
        elements.chapterSearch.addEventListener('input', () => filterChapterList());
    }

    if (elements.chapterLangSelect) {
        elements.chapterLangSelect.addEventListener('change', () => filterChapterList());
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
        { id: 'all', name: '🔥 All Trending' },
        { id: 'dragonball', name: '🐲 Dragon Ball Universe' },
        { id: 'action', name: '⚔️ Action' },
        { id: 'adventure', name: '🗺️ Adventure' },
        { id: 'fantasy', name: '🔮 Fantasy' },
        { id: 'romance', name: '💖 Romance' },
        { id: 'scifi', name: '🚀 Sci-Fi' }
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
        if (e.key === 'ArrowLeft') navigateChapter(-1);
        else if (e.key === 'ArrowRight') navigateChapter(1);
        else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
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

// Share Manga Link
function shareMangaLink() {
    if (!state.currentManga) return;
    const attr = state.currentManga.attributes || {};
    const title = (attr.title && (attr.title.en || Object.values(attr.title)[0])) || 'Manga';
    const url = window.location.origin + window.location.pathname + `?manga=${state.currentManga.id}`;

    if (navigator.share) {
        navigator.share({ title: title, text: `Read ${title} on MangaReader!`, url: url }).catch(() => {});
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
            showToast('Share link copied to clipboard!');
        }).catch(() => {
            showToast('Share URL: ' + url);
        });
    } else {
        showToast('Share URL: ' + url);
    }
}

// Proportional PDF Chapter Downloader (jsPDF Base64 + Aspect Ratio Scaling)
async function downloadChapterPDF() {
    if (!state.readerPages || state.readerPages.length === 0) {
        showToast('No pages available to download.');
        return;
    }

    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
        showToast('PDF engine initializing... Please try again in a moment.');
        return;
    }

    showToast('Generating PDF for chapter... Please wait...');

    const mangaTitle = state.currentManga ? ((state.currentManga.attributes.title && (state.currentManga.attributes.title.en || Object.values(state.currentManga.attributes.title)[0])) || 'Manga') : 'Manga';
    const chapNum = (state.currentChapterList[state.currentChapterIndex] && state.currentChapterList[state.currentChapterIndex].attributes.chapter) || '1';

    try {
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        let addedPages = 0;
        for (let i = 0; i < state.readerPages.length; i++) {
            const pageObj = state.readerPages[i];
            const imgUrl = typeof pageObj === 'string' ? pageObj : (pageObj.primary || pageObj.secondary || pageObj.backup);
            
            const base64Data = await imageUrlToBase64(imgUrl);
            if (base64Data) {
                if (addedPages > 0) pdf.addPage();

                // Calculate Proportional Aspect Ratio Scaling
                const tempImg = new Image();
                tempImg.src = base64Data;
                await tempImg.decode().catch(() => {});

                const imgW = tempImg.naturalWidth || 600;
                const imgH = tempImg.naturalHeight || 800;
                const imgRatio = imgW / imgH;
                const pdfRatio = pdfWidth / pdfHeight;

                let renderW, renderH;
                if (imgRatio > pdfRatio) {
                    renderW = pdfWidth;
                    renderH = pdfWidth / imgRatio;
                } else {
                    renderH = pdfHeight;
                    renderW = pdfHeight * imgRatio;
                }

                const xOffset = (pdfWidth - renderW) / 2;
                const yOffset = (pdfHeight - renderH) / 2;

                pdf.addImage(base64Data, 'JPEG', xOffset, yOffset, renderW, renderH);
                addedPages++;
            }
        }

        if (addedPages > 0) {
            const cleanName = mangaTitle.replace(/[^\w\s-]/gi, '').trim();
            const filename = `${cleanName}_Chapter_${chapNum}.pdf`;
            pdf.save(filename);
            showToast(`PDF Downloaded: ${filename}`);
        } else {
            showToast('Failed to fetch image pages for PDF.');
        }
    } catch (err) {
        console.error('PDF Generation Error:', err);
        showToast('Failed to generate PDF. Please try again.');
    }
}

// Load Home Grids
async function loadAllHomeGrids() {
    renderSkeletons(elements.trendingGrid, 12);
    renderSkeletons(elements.actionGrid, 6);
    renderSkeletons(elements.adventureGrid, 6);
    renderSkeletons(elements.fantasyGrid, 6);
    renderSkeletons(elements.romanceGrid, 6);

    try {
        const url = `${API_BASE}/manga?limit=18&includes%5B%5D=cover_art&contentRating%5B%5D=safe&contentRating%5B%5D=suggestive`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.data && data.data.length > 0) {
            state.heroManga = data.data[0];
            renderHeroBanner(data.data[0]);
            renderMangaCards(elements.trendingGrid, data.data);
        } else {
            loadTrendingFallback();
        }
    } catch (e) {
        loadTrendingFallback();
    }

    loadCategoryGrid('action', elements.actionGrid);
    loadCategoryGrid('adventure', elements.adventureGrid);
    loadCategoryGrid('fantasy', elements.fantasyGrid);
    loadCategoryGrid('romance', elements.romanceGrid);
}

async function loadTrendingFallback() {
    try {
        const pyRes = await fetch('/api/search?q=popular');
        const pyData = await pyRes.json();
        if (pyData.titles && pyData.titles.length > 0) {
            renderFallbackSearchCards(elements.trendingGrid, pyData);
        }
    } catch (e) {}
}

async function loadCategoryGrid(genreKey, container) {
    if (!container) return;
    const tagId = GENRE_TAGS[genreKey];
    if (!tagId) return;

    try {
        const url = `${API_BASE}/manga?limit=6&includedTags%5B%5D=${tagId}&includes%5B%5D=cover_art&contentRating%5B%5D=safe&contentRating%5B%5D=suggestive`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.data && data.data.length > 0) {
            renderMangaCards(container, data.data);
            return;
        }
    } catch (e) {}

    try {
        const pyRes = await fetch(`/api/category/${genreKey}`);
        const pyData = await pyRes.json();
        if (pyData.titles && pyData.titles.length > 0) {
            renderFallbackSearchCards(container, pyData);
            return;
        }
    } catch (e) {}

    container.innerHTML = `<div class="col-12 text-muted small py-3">Category items updating...</div>`;
}

function renderHeroBanner(manga) {
    if (!elements.heroBanner || !manga) return;
    state.heroManga = manga;
    const attr = manga.attributes;
    const title = attr.title.en || Object.values(attr.title)[0] || 'Featured Series';
    const desc = getMangaDescription(attr);

    elements.heroTitle.textContent = title;
    elements.heroDescription.textContent = desc.length > 250 ? desc.slice(0, 250) + '...' : desc;
}

// Search Engine
async function performSearch(query) {
    elements.searchSection.style.display = 'block';
    elements.searchTitle.textContent = `Search Results for "${query}"`;
    renderSkeletons(elements.searchResultsGrid, 18);
    showView('home');

    try {
        const cleanQuery = query.replace(/[^\w\s-]/gi, '').trim();
        const url = `${API_BASE}/manga?title=${encodeURIComponent(cleanQuery || query)}&limit=24&includes%5B%5D=cover_art&contentRating%5B%5D=safe&contentRating%5B%5D=suggestive`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.data && data.data.length > 0) {
            renderMangaCards(elements.searchResultsGrid, data.data);
        } else {
            try {
                const pyRes = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                const pyData = await pyRes.json();
                if (pyData.titles && pyData.titles.length > 0) {
                    renderFallbackSearchCards(elements.searchResultsGrid, pyData);
                    return;
                }
            } catch (e) {}

            elements.searchResultsGrid.innerHTML = `<div class="col-12 text-center text-muted py-5">No manga found for "${escapeHtml(query)}". Try another search term!</div>`;
        }
    } catch (err) {
        console.error('Search error:', err);
        try {
            const pyRes = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const pyData = await pyRes.json();
            if (pyData.titles && pyData.titles.length > 0) {
                renderFallbackSearchCards(elements.searchResultsGrid, pyData);
                return;
            }
        } catch (e) {}

        elements.searchResultsGrid.innerHTML = `<div class="col-12 text-center text-muted py-4">Search returned no items. Please refine your search term.</div>`;
    }
}

function renderFallbackSearchCards(container, data) {
    container.innerHTML = '';
    data.titles.forEach((title, idx) => {
        const link = data.links[idx];
        const img = data.imgs[idx];
        const card = document.createElement('div');
        card.className = 'manga-card';
        card.innerHTML = `
            <div class="manga-cover-wrapper">
                <img src="${img}" class="manga-cover" alt="${escapeHtml(title)}" loading="lazy" referrerpolicy="no-referrer">
            </div>
            <div class="manga-info">
                <div class="manga-title">${escapeHtml(title)}</div>
            </div>
        `;
        card.addEventListener('click', () => loadMangaDetailsById(link));
        container.appendChild(card);
    });
}

async function handleSearchAutocomplete(query) {
    try {
        const url = `${API_BASE}/manga?title=${encodeURIComponent(query)}&limit=6&includes%5B%5D=cover_art&contentRating%5B%5D=safe&contentRating%5B%5D=suggestive`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.data && data.data.length > 0) {
            elements.searchPopup.innerHTML = data.data.map(m => {
                const title = m.attributes.title.en || Object.values(m.attributes.title)[0] || 'Untitled';
                const coverUrl = getCoverUrl(m, '256');

                return `
                    <div class="search-popup-item" onclick="loadMangaDetailsById('${m.id}')">
                        <img src="${coverUrl}" class="search-popup-cover" alt="Cover" referrerpolicy="no-referrer">
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
    } catch (e) { hideSearchPopup(); }
}

function hideSearchPopup() {
    if (elements.searchPopup) elements.searchPopup.style.display = 'none';
}

async function filterByGenre(genreKey, btnElement) {
    const buttons = document.querySelectorAll('.genre-pill');
    buttons.forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    if (genreKey === 'dragonball') {
        performSearch('Dragon Ball');
        return;
    }
    if (genreKey === 'all') {
        elements.searchSection.style.display = 'none';
        showView('home');
        return;
    }

    const tagId = GENRE_TAGS[genreKey];
    if (tagId) {
        elements.searchSection.style.display = 'block';
        elements.searchTitle.textContent = `${genreKey.toUpperCase()} Manga Category`;
        renderSkeletons(elements.searchResultsGrid, 18);
        showView('home');
        loadCategoryGrid(genreKey, elements.searchResultsGrid);
    }
}

function renderMangaCards(container, mangaList) {
    container.innerHTML = '';
    mangaList.forEach(manga => {
        const mId = manga.id;
        const attr = manga.attributes || {};
        const title = (attr.title && (attr.title.en || Object.values(attr.title)[0])) || 'Untitled';
        const status = attr.status || 'Unknown';
        const coverUrl = getCoverUrl(manga, '512');

        let coverFile = '';
        if (manga.relationships) {
            const rel = manga.relationships.find(r => r.type === 'cover_art');
            if (rel && rel.attributes) coverFile = rel.attributes.fileName;
        }

        const card = document.createElement('div');
        card.className = 'manga-card';
        card.innerHTML = `
            <div class="manga-cover-wrapper">
                <img src="${coverUrl}" class="manga-cover" alt="${escapeHtml(title)}" loading="lazy" referrerpolicy="no-referrer" onerror="handleCoverFailover(this, '${mId}', '${coverFile}')">
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

        card.addEventListener('click', () => loadMangaDetailsById(mId));
        container.appendChild(card);
    });
}

// Multi-Source Manga Details Resolver
async function loadMangaDetailsById(mangaIdOrQuery) {
    hideSearchPopup();
    if (!mangaIdOrQuery) return;

    const trimmed = mangaIdOrQuery.trim();
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(trimmed);

    // 1. Try Direct UUID fetch
    if (isUuid) {
        try {
            const res = await fetch(`${API_BASE}/manga/${trimmed}?includes%5B%5D=cover_art`);
            const data = await res.json();
            if (data.data) {
                loadMangaDetails(data.data);
                return;
            }
        } catch (e) {}

        try {
            const pyRes = await fetch(`/api/manga/${trimmed}`);
            const pyData = await pyRes.json();
            if (pyData.data) {
                loadMangaDetails(pyData.data);
                return;
            }
        } catch (e) {}
    }

    // 2. Title Search resolution
    try {
        const searchRes = await fetch(`${API_BASE}/manga?title=${encodeURIComponent(trimmed)}&limit=5&includes%5B%5D=cover_art`);
        const searchData = await searchRes.json();
        if (searchData.data && searchData.data.length > 0) {
            loadMangaDetails(searchData.data[0]);
            return;
        }
    } catch (e) {}

    try {
        const pySearchRes = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        const pySearchData = await pySearchRes.json();
        if (pySearchData.links && pySearchData.links.length > 0) {
            const resolvedId = pySearchData.links[0];
            const detailRes = await fetch(`/api/manga/${resolvedId}`);
            const detailData = await detailRes.json();
            if (detailData.data) {
                loadMangaDetails(detailData.data);
                return;
            }
        }
    } catch (e) {}

    showToast('Unable to load details for selected title.');
}

async function loadMangaDetails(manga) {
    if (!manga) return;
    state.currentManga = manga;
    const mId = manga.id;
    const attr = manga.attributes || {};
    const title = (attr.title && (attr.title.en || Object.values(attr.title)[0])) || 'Untitled';
    const coverUrl = getCoverUrl(manga, 'original');

    elements.detailCover.src = coverUrl;
    elements.detailTitle.textContent = title;
    elements.detailStatus.textContent = `Status: ${attr.status || 'Unknown'} | Year: ${attr.year || 'N/A'}`;
    
    const desc = getMangaDescription(attr);
    elements.detailDescription.textContent = desc.length > 350 ? desc.slice(0, 350) + '...' : desc;

    elements.detailTags.innerHTML = (attr.tags || []).slice(0, 6).map(t => 
        `<span class="badge bg-danger me-1 mb-1 opacity-75">${t.attributes ? t.attributes.name.en : 'Tag'}</span>`
    ).join('');

    showView('details');
    elements.chapterList.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-danger" role="status"></div><div class="mt-2 text-muted">Resolving chapters...</div></div>`;

    loadRelatedSeries(title);

    try {
        const feedUrl = `${API_BASE}/manga/${mId}/feed?limit=500&order%5Bchapter%5D=asc`;
        const res = await fetch(feedUrl);
        const data = await res.json();
        
        // Filter chapters with pages > 2 (removes 1-page/2-page MangaDex notice entries)
        let readable = (data.data || []).filter(c => (c.attributes.pages || 0) > 2);
        if (readable.length === 0) readable = (data.data || []).filter(c => (c.attributes.pages || 0) > 0);
        if (readable.length === 0) readable = data.data || [];

        if (readable.length > 0) {
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
            await loadFallbackChapters(mId, title);
        }
    } catch (err) {
        console.error('Failed to load chapters:', err);
        await loadFallbackChapters(mId, title);
    }
}

async function loadFallbackChapters(mId, title) {
    try {
        const pyFeedRes = await fetch(`/api/chapters/${mId}`);
        const pyFeedData = await pyFeedRes.json();
        if (pyFeedData.links && pyFeedData.links.length > 0) {
            state.currentChapterList = pyFeedData.links.map((link, idx) => ({
                id: link,
                attributes: { chapter: `${idx + 1}`, title: pyFeedData.titles[idx], pages: 20 }
            }));
            renderChapterList();
            return;
        }
    } catch (e) {}

    elements.chapterList.innerHTML = `
        <div class="text-center py-4">
            <p class="text-muted mb-3">No direct image chapters found for this specific edition record.</p>
            <button class="btn btn-outline-danger btn-sm rounded-pill" onclick="performSearch('${escapeHtml(title)}')">
                <i class="fa-solid fa-magnifying-glass me-1"></i> Search Alternate Editions
            </button>
        </div>
    `;
}

async function loadRelatedSeries(currentTitle) {
    if (!elements.relatedSection || !elements.relatedGrid) return;
    let baseQuery = currentTitle.split(/[:\-(]/)[0].trim();
    if (baseQuery.length < 3) baseQuery = currentTitle;

    try {
        const url = `${API_BASE}/manga?title=${encodeURIComponent(baseQuery)}&limit=6&includes%5B%5D=cover_art&contentRating%5B%5D=safe&contentRating%5B%5D=suggestive`;
        const res = await fetch(url);
        const data = await res.json();

        const related = (data.data || []).filter(m => m.id !== state.currentManga.id);
        if (related.length > 0) {
            elements.relatedGrid.innerHTML = related.slice(0, 4).map(m => {
                const title = m.attributes.title.en || Object.values(m.attributes.title)[0] || 'Untitled';
                const coverUrl = getCoverUrl(m, '256');
                
                return `
                    <div class="col-6 col-md-3">
                        <div class="manga-card" onclick="loadMangaDetailsById('${m.id}')">
                            <div class="manga-cover-wrapper">
                                <img src="${coverUrl}" class="manga-cover" alt="${escapeHtml(title)}" referrerpolicy="no-referrer">
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
    } catch (e) { elements.relatedSection.style.display = 'none'; }
}

function renderChapterList() {
    if (!state.currentChapterList || state.currentChapterList.length === 0) {
        elements.chapterList.innerHTML = `<div class="text-center text-muted py-3">No chapters available.</div>`;
        return;
    }

    let list = [...state.currentChapterList];
    if (!state.chapterSortAsc) list.reverse();

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

// Load Reader View
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

    let resolvedPages = [];

    try {
        const res = await fetch(`${API_BASE}/at-home/server/${chapter.id}`);
        if (res.ok) {
            const data = await res.json();
            if (data.chapter && data.chapter.hash) {
                const baseUrl = data.baseUrl || 'https://uploads.mangadex.org';
                const hash = data.chapter.hash;
                const filenames = state.useDataSaver ? (data.chapter.dataSaver || data.chapter.data) : (data.chapter.data || data.chapter.dataSaver);
                const saverFilenames = data.chapter.dataSaver || data.chapter.data;

                resolvedPages = (filenames || []).map((f, i) => ({
                    primary: `${UPLOADS_BASE}/${hash}/${f}`,
                    secondary: `${UPLOADS_SAVER_BASE}/${hash}/${saverFilenames[i] || f}`,
                    backup: `${baseUrl}/data/${hash}/${f}`
                }));
            }
        }
    } catch (err) {
        console.error('Client @at-home fetch hiccup:', err);
    }

    if (resolvedPages.length === 0) {
        try {
            const pyImgRes = await fetch(`/api/images/${chapter.id}`);
            if (pyImgRes.ok) {
                const pyImgData = await pyImgRes.json();
                if (pyImgData.pages && pyImgData.pages.length > 0) {
                    resolvedPages = pyImgData.pages.map(url => ({
                        primary: url,
                        secondary: url.replace('/data/', '/data-saver/'),
                        backup: url
                    }));
                }
            }
        } catch (e) {}
    }

    if (resolvedPages.length > 0) {
        state.readerPages = resolvedPages;
        elements.pageCounter.textContent = `Total Pages: ${state.readerPages.length}`;
        renderPages();
    } else {
        elements.readerPagesContainer.innerHTML = `
            <div class="text-center text-muted py-5">
                <p class="mb-3">Unable to retrieve chapter pages from CDN.</p>
                <button class="btn btn-outline-danger btn-sm rounded-pill" onclick="loadChapter(${index})">
                    <i class="fa-solid fa-rotate-right me-1"></i> Retry Loading Chapter
                </button>
            </div>
        `;
    }
}

function renderPages() {
    const zoomStyle = `style="max-width: ${state.zoomLevel}%; margin: 0 auto 14px auto;"`;
    elements.readerPagesContainer.innerHTML = state.readerPages.map((page, i) => `
        <img src="${page.primary}" class="reader-image" ${zoomStyle} alt="Page ${i + 1}" loading="lazy" referrerpolicy="no-referrer" onerror="handleImageFailover(this, '${page.secondary}', '${page.backup}')">
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
    if (!document.documentElement.requestFullscreen) return;
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {});
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
}

function getHistory() {
    try {
        return JSON.parse(localStorage.getItem('manga_reader_history') || '{}');
    } catch (e) { return {}; }
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
    setTimeout(() => { toast.remove(); }, 3000);
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
