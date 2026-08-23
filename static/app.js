/**
 * Ultra-Modern Manga Reader Engine (GitHub Pages Compatible)
 * Powered by MangaDex REST API
 */

const API_BASE = 'https://api.mangadex.org';
const COVER_BASE = 'https://uploads.mangadex.org/covers';

// Application State
const state = {
    currentView: 'home',
    currentManga: null,
    currentChapterList: [],
    currentChapterIndex: -1,
    chapterSortAsc: true,
    readerMode: 'vertical', // 'vertical' or 'single'
    readerTheme: 'dark', // 'dark', 'black', 'sepia'
    zoomLevel: 100,
    singlePageIndex: 0,
    readerPages: [],
    useDataSaver: false,
    activeGenre: 'all'
};

// DOM Elements
const elements = {
    searchForm: document.getElementById('search-form'),
    searchInput: document.getElementById('search-input'),
    searchClear: document.getElementById('search-clear'),
    
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
    
    // Details View Elements
    detailCover: document.getElementById('detail-cover'),
    detailTitle: document.getElementById('detail-title'),
    detailStatus: document.getElementById('detail-status'),
    detailDescription: document.getElementById('detail-description'),
    detailTags: document.getElementById('detail-tags'),
    chapterList: document.getElementById('chapter-list'),
    chapterSearch: document.getElementById('chapter-search'),
    sortChaptersBtn: document.getElementById('sort-chapters-btn'),

    // Reader View Elements
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
    readerFloatingNav: document.getElementById('reader-floating-nav')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupGenrePills();
    loadPopularManga();
    setupKeyboardNavigation();
});

// Event Listeners
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
            performSearch(query);
        }
    });

    elements.searchInput.addEventListener('input', (e) => {
        elements.searchClear.style.display = e.target.value ? 'block' : 'none';
    });

    elements.searchClear.addEventListener('click', () => {
        elements.searchInput.value = '';
        elements.searchClear.style.display = 'none';
        elements.searchSection.style.display = 'none';
        showView('home');
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
        elements.chapterSearch.addEventListener('input', (e) => {
            filterChapterList(e.target.value.toLowerCase());
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
            if (state.currentChapterIndex !== -1) {
                loadChapter(state.currentChapterIndex);
            }
        });
    }

    // Window Scroll Progress for Reader Mode
    window.addEventListener('scroll', () => {
        if (state.currentView === 'reader' && elements.progressBar) {
            const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            elements.progressBar.style.width = scrolled + '%';
        }
    });
}

function setupGenrePills() {
    const genres = [
        { id: 'all', name: '🔥 All Trending' },
        { id: '391b0423-d83d-4565-ab8f-4d95f0e00a0c', name: 'Action' },
        { id: '87cc8708-7277-4270-806c-a07e1e684777', name: 'Adventure' },
        { id: '4d32cc96-86b5-4192-b26a-5000923e985f', name: 'Comedy' },
        { id: 'cbd23a0f-9c6e-482b-9c72-557374828117', name: 'Fantasy' },
        { id: '423e2008-8e65-430b-a19f-d31e50529ef8', name: 'Romance' },
        { id: '25608892-80f0-4b69-a912-4d370f80879e', name: 'Sci-Fi' },
        { id: 'e5309489-0f48-4f1a-b31a-6cb059e74d75', name: 'Slice of Life' }
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
        }
    });
}

// Router & View Switcher
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

// API Requests with Smart Ranking
async function loadPopularManga() {
    renderSkeletons(elements.trendingGrid, 12);
    try {
        const url = `${API_BASE}/manga?limit=18&includes[]=cover_art&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            // Render Hero Banner with Top #1 Manga
            renderHeroBanner(data.data[0]);
            renderMangaCards(elements.trendingGrid, data.data);
        }
    } catch (err) {
        console.error('Failed to fetch popular manga:', err);
        elements.trendingGrid.innerHTML = `<div class="col-12 text-center text-muted py-5">Unable to load manga catalog. Please check your network connection.</div>`;
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
    renderSkeletons(elements.searchResultsGrid, 12);
    showView('home');

    try {
        const url = `${API_BASE}/manga?title=${encodeURIComponent(query)}&limit=24&includes[]=cover_art&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.data && data.data.length > 0) {
            renderMangaCards(elements.searchResultsGrid, data.data);
        } else {
            // Try broader search fallback
            const altUrl = `${API_BASE}/manga?title=${encodeURIComponent(query)}&limit=24&includes[]=cover_art&contentRating[]=safe&contentRating[]=suggestive`;
            const altRes = await fetch(altUrl);
            const altData = await altRes.json();
            if (altData.data && altData.data.length > 0) {
                renderMangaCards(elements.searchResultsGrid, altData.data);
            } else {
                elements.searchResultsGrid.innerHTML = `<div class="col-12 text-center text-muted py-5">No manga found matching "${escapeHtml(query)}". Try another search term!</div>`;
            }
        }
    } catch (err) {
        console.error('Search failed:', err);
        elements.searchResultsGrid.innerHTML = `<div class="col-12 text-center text-danger py-4">Search failed. Please try again.</div>`;
    }
}

async function filterByGenre(genreId, btnElement) {
    const buttons = document.querySelectorAll('.genre-pill');
    buttons.forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    renderSkeletons(elements.trendingGrid, 12);
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
        console.error('Failed genre filter:', e);
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
                    <span><i class="fa-regular fa-star text-warning me-1"></i> ${attr.year || 'N/A'}</span>
                    <span class="badge bg-secondary text-uppercase">${attr.originalLanguage || 'Manga'}</span>
                </div>
            </div>
        `;

        card.addEventListener('click', () => loadMangaDetails(manga));
        container.appendChild(card);
    });
}

// Load Details & Chapters with Alternate Edition Fallback Resolver
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

    try {
        // Step 1: Fetch feed with limit=500
        let feedUrl = `${API_BASE}/manga/${mId}/feed?translatedLanguage[]=en&limit=500&order[chapter]=asc`;
        let res = await fetch(feedUrl);
        let data = await res.json();

        let readable = (data.data || []).filter(c => (c.attributes.pages || 0) > 0);

        // Step 2: Fallback to all languages if EN direct pages are 0
        if (readable.length === 0) {
            feedUrl = `${API_BASE}/manga/${mId}/feed?limit=500&order[chapter]=asc`;
            res = await fetch(feedUrl);
            data = await res.json();
            readable = (data.data || []).filter(c => (c.attributes.pages || 0) > 0);
            if (readable.length === 0) readable = data.data || [];
        }

        // Step 3: If still 0 readable chapters, search for Colored/Digital/Fan edition of the same title
        if (readable.length === 0) {
            const altRes = await fetch(`${API_BASE}/manga?title=${encodeURIComponent(title + ' colored')}&limit=3&includes[]=cover_art`);
            const altData = await altRes.json();
            if (altData.data && altData.data.length > 0) {
                const altId = altData.data[0].id;
                const altFeedRes = await fetch(`${API_BASE}/manga/${altId}/feed?limit=500&order[chapter]=asc`);
                const altFeedData = await altFeedRes.json();
                readable = (altFeedData.data || []).filter(c => (c.attributes.pages || 0) > 0);
            }
        }

        if (readable.length > 0) {
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
                    <p class="text-muted mb-3">No direct readable image chapters found for this specific record.</p>
                    <button class="btn btn-outline-danger btn-sm" onclick="performSearch('${escapeHtml(title)}')">
                        <i class="fa-solid fa-magnifying-glass me-1"></i> Search Alternate Editions
                    </button>
                </div>
            `;
        }
    } catch (err) {
        console.error('Failed to load chapters:', err);
        elements.chapterList.innerHTML = `<div class="text-center text-danger py-4">Failed to resolve chapters. Please check your internet connection.</div>`;
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

    elements.chapterList.innerHTML = list.map((ch, idx) => {
        const origIndex = state.currentChapterList.findIndex(c => c.id === ch.id);
        const num = ch.attributes.chapter || 'Extra';
        const title = ch.attributes.title ? `: ${ch.attributes.title}` : '';
        const lang = (ch.attributes.translatedLanguage || 'EN').toUpperCase();
        const pagesCount = ch.attributes.pages ? ` (${ch.attributes.pages} pgs)` : '';
        const isRead = currentMangaHistory.readChapters && currentMangaHistory.readChapters.includes(ch.id);

        return `
            <a href="#" class="chapter-item ${isRead ? 'read' : ''}" onclick="event.preventDefault(); loadChapter(${origIndex});">
                <div>
                    <i class="fa-regular fa-file-lines me-2 text-danger"></i>
                    <strong>Chapter ${num}</strong>${escapeHtml(title)} <span class="badge bg-dark ms-1">${lang}</span>${pagesCount}
                </div>
                ${isRead ? '<span class="badge bg-success"><i class="fa-solid fa-check me-1"></i>Read</span>' : '<i class="fa-solid fa-chevron-right text-muted"></i>'}
            </a>
        `;
    }).join('');
}

function filterChapterList(query) {
    const items = elements.chapterList.querySelectorAll('.chapter-item');
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? 'flex' : 'none';
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
    elements.readerPagesContainer.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-danger" role="status"></div><div class="mt-3 text-muted">Loading high-res pages...</div></div>`;

    saveToHistory(state.currentManga.id, mangaTitle, chapter.id, chNum);

    try {
        const res = await fetch(`${API_BASE}/at-home/server/${chapter.id}`);
        const data = await res.json();

        if (data.baseUrl && data.chapter) {
            const baseUrl = data.baseUrl;
            const hash = data.chapter.hash;
            const filenames = state.useDataSaver ? data.chapter.dataSaver : data.chapter.data;
            const subfolder = state.useDataSaver ? 'data-saver' : 'data';

            state.readerPages = (filenames || []).map(f => `${baseUrl}/${subfolder}/${hash}/${f}`);
            
            if (state.readerPages.length > 0) {
                elements.pageCounter.textContent = `Total Pages: ${state.readerPages.length}`;
                renderPages();
            } else {
                elements.readerPagesContainer.innerHTML = `<div class="text-center text-muted py-5">This chapter has no direct image data on CDN.</div>`;
            }
        } else {
            elements.readerPagesContainer.innerHTML = `<div class="text-center text-muted py-5">Unable to connect to CDN server node for chapter.</div>`;
        }
    } catch (err) {
        console.error('Failed to load chapter pages:', err);
        elements.readerPagesContainer.innerHTML = `<div class="text-center text-danger py-5">Network error fetching pages. Please click retry.</div>`;
    }
}

function renderPages() {
    elements.readerPagesContainer.innerHTML = state.readerPages.map((url, i) => `
        <img src="${url}" class="reader-image" alt="Page ${i + 1}" loading="lazy" onerror="retryImage(this, '${url}')">
    `).join('');
}

function retryImage(img, url) {
    img.onerror = null;
    setTimeout(() => {
        img.src = url + '?retry=' + Date.now();
    }, 1200);
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
}

// Local Storage History Management
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
                <div class="card bg-secondary text-light h-100 p-3" style="background-color: var(--bg-card) !important; border: 1px solid var(--border-color); border-radius: 14px;">
                    <h5 class="card-title text-truncate">${escapeHtml(item.title)}</h5>
                    <p class="card-text text-muted mb-3 small">Last Read: Chapter ${item.lastChapterNum} (${timeAgo})</p>
                    <button class="btn btn-outline-danger btn-sm mt-auto" onclick="resumeManga('${id}')">Resume Reading</button>
                </div>
            </div>
        `;
    }).join('');
}

async function resumeManga(mangaId) {
    try {
        const res = await fetch(`${API_BASE}/manga/${mangaId}?includes[]=cover_art`);
        const data = await res.json();
        if (data.data) {
            loadMangaDetails(data.data);
        }
    } catch (e) {
        console.error('Failed to resume manga:', e);
    }
}

// Skeleton Helpers
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
