/**
 * Manga Reader Client-side Engine (GitHub Pages Compatible)
 * Powered by MangaDex Open API
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
    singlePageIndex: 0,
    readerPages: [],
    useDataSaver: false
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
    
    trendingGrid: document.getElementById('trending-grid'),
    searchResultsGrid: document.getElementById('search-results-grid'),
    searchSection: document.getElementById('search-section'),
    searchTitle: document.getElementById('search-title'),
    
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
    readerMangaTitle: document.getElementById('reader-manga-title'),
    readerChapterTitle: document.getElementById('reader-chapter-title'),
    readerPagesContainer: document.getElementById('reader-pages-container'),
    prevChapBtn: document.getElementById('prev-chap-btn'),
    nextChapBtn: document.getElementById('next-chap-btn'),
    qualityToggle: document.getElementById('quality-toggle'),
    chapterSelect: document.getElementById('chapter-select'),
    pageCounter: document.getElementById('page-counter'),

    // History View
    historyGrid: document.getElementById('history-grid'),
    
    // Navigation
    navHome: document.getElementById('nav-home'),
    navHistory: document.getElementById('nav-history'),
    navBrand: document.getElementById('nav-brand'),
    readerFloatingNav: document.getElementById('reader-floating-nav')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadPopularManga();
});

// Event Listeners Setup
function setupEventListeners() {
    if (elements.navBrand) {
        elements.navBrand.addEventListener('click', (e) => {
            e.preventDefault();
            showView('home');
        });
    }
    // Search Form Submit
    elements.searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = elements.searchInput.value.trim();
        if (query) {
            performSearch(query);
        }
    });

    // Search Input Clear
    elements.searchInput.addEventListener('input', (e) => {
        elements.searchClear.style.display = e.target.value ? 'block' : 'none';
    });

    elements.searchClear.addEventListener('click', () => {
        elements.searchInput.value = '';
        elements.searchClear.style.display = 'none';
        elements.searchSection.style.display = 'none';
        showView('home');
    });

    // Navigation Links
    elements.navHome.addEventListener('click', (e) => {
        e.preventDefault();
        showView('home');
    });

    elements.navHistory.addEventListener('click', (e) => {
        e.preventDefault();
        loadHistoryView();
    });

    // Chapter Sort Toggle
    if (elements.sortChaptersBtn) {
        elements.sortChaptersBtn.addEventListener('click', () => {
            state.chapterSortAsc = !state.chapterSortAsc;
            elements.sortChaptersBtn.innerHTML = state.chapterSortAsc
                ? '<i class="fa-solid fa-arrow-down-1-9 me-1"></i> Ascending'
                : '<i class="fa-solid fa-arrow-up-9-1 me-1"></i> Descending';
            renderChapterList();
        });
    }

    // Chapter Search Filter
    if (elements.chapterSearch) {
        elements.chapterSearch.addEventListener('input', (e) => {
            filterChapterList(e.target.value.toLowerCase());
        });
    }

    // Reader Navigation
    elements.prevChapBtn.addEventListener('click', () => navigateChapter(-1));
    elements.nextChapBtn.addEventListener('click', () => navigateChapter(1));

    // Chapter Select Change
    elements.chapterSelect.addEventListener('change', (e) => {
        const index = parseInt(e.target.value);
        if (!isNaN(index) && index >= 0) {
            loadChapter(index);
        }
    });

    // Quality Toggle
    if (elements.qualityToggle) {
        elements.qualityToggle.addEventListener('change', (e) => {
            state.useDataSaver = e.target.checked;
            if (state.currentChapterIndex !== -1) {
                loadChapter(state.currentChapterIndex);
            }
        });
    }
}

// Router / View Switcher
function showView(viewName) {
    state.currentView = viewName;
    elements.homeView.style.display = viewName === 'home' ? 'block' : 'none';
    elements.detailsView.style.display = viewName === 'details' ? 'block' : 'none';
    elements.readerView.style.display = viewName === 'reader' ? 'block' : 'none';
    elements.historyView.style.display = viewName === 'history' ? 'block' : 'none';
    if (elements.readerFloatingNav) {
        elements.readerFloatingNav.style.setProperty('display', viewName === 'reader' ? 'flex' : 'none', 'important');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// API Requests
async function loadPopularManga() {
    renderSkeletons(elements.trendingGrid, 12);
    try {
        const url = `${API_BASE}/manga?limit=12&includes[]=cover_art&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.data) {
            renderMangaCards(elements.trendingGrid, data.data);
        }
    } catch (err) {
        console.error('Failed to fetch trending manga:', err);
        elements.trendingGrid.innerHTML = `<div class="col-12 text-center text-muted py-4">Unable to load trending manga. Please check your internet connection.</div>`;
    }
}

async function performSearch(query) {
    elements.searchSection.style.display = 'block';
    elements.searchTitle.textContent = `Search Results for "${query}"`;
    renderSkeletons(elements.searchResultsGrid, 12);
    showView('home');

    try {
        const url = `${API_BASE}/manga?title=${encodeURIComponent(query)}&limit=24&includes[]=cover_art&order[relevance]=desc&contentRating[]=safe&contentRating[]=suggestive`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.data && data.data.length > 0) {
            renderMangaCards(elements.searchResultsGrid, data.data);
        } else {
            elements.searchResultsGrid.innerHTML = `<div class="col-12 text-center text-muted py-5">No manga found for "${query}". Try searching another title!</div>`;
        }
    } catch (err) {
        console.error('Search failed:', err);
        elements.searchResultsGrid.innerHTML = `<div class="col-12 text-center text-danger py-4">Error searching manga. Please try again.</div>`;
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
                <img src="${coverUrl}" class="manga-cover" alt="${title}" loading="lazy" onerror="this.src='https://via.placeholder.com/200x300?text=Cover+Unavailable'">
                <span class="manga-badge">${status}</span>
            </div>
            <div class="manga-info">
                <div class="manga-title">${escapeHtml(title)}</div>
                <div class="manga-meta"><i class="fa-regular fa-star text-warning me-1"></i> ${attr.year || 'N/A'}</div>
            </div>
        `;

        card.addEventListener('click', () => loadMangaDetails(manga));
        container.appendChild(card);
    });
}

// Load Manga Details & Chapters
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
    elements.detailDescription.textContent = desc.length > 300 ? desc.slice(0, 300) + '...' : desc;

    // Render tags
    elements.detailTags.innerHTML = (attr.tags || []).slice(0, 5).map(t => 
        `<span class="badge bg-secondary me-1 mb-1">${t.attributes.name.en}</span>`
    ).join('');

    showView('details');
    elements.chapterList.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-danger" role="status"></div><div class="mt-2 text-muted">Loading chapters...</div></div>`;

    // Fetch chapters feed
    try {
        const url = `${API_BASE}/manga/${mId}/feed?translatedLanguage[]=en&limit=500&order[chapter]=asc`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.data) {
            // Deduplicate and filter readable chapters
            const seen = new Set();
            const filtered = [];
            data.data.forEach(ch => {
                const num = ch.attributes.chapter || 'Extra';
                if (!seen.has(num)) {
                    seen.add(num);
                    filtered.push(ch);
                }
            });

            state.currentChapterList = filtered;
            renderChapterList();
        } else {
            elements.chapterList.innerHTML = `<div class="text-center text-muted py-3">No chapters found in English.</div>`;
        }
    } catch (err) {
        console.error('Failed to load chapters:', err);
        elements.chapterList.innerHTML = `<div class="text-center text-danger py-3">Failed to load chapter list.</div>`;
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
        const isRead = currentMangaHistory.readChapters && currentMangaHistory.readChapters.includes(ch.id);

        return `
            <a href="#" class="chapter-item ${isRead ? 'read' : ''}" onclick="event.preventDefault(); loadChapter(${origIndex});">
                <div>
                    <i class="fa-regular fa-file-lines me-2 text-danger"></i>
                    <strong>Chapter ${num}</strong>${escapeHtml(title)}
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

// Load Reader View for Chapter
async function loadChapter(index) {
    if (index < 0 || index >= state.currentChapterList.length) return;
    
    state.currentChapterIndex = index;
    const chapter = state.currentChapterList[index];
    const chNum = chapter.attributes.chapter || 'Extra';
    const chTitle = chapter.attributes.title || '';

    const mangaTitle = state.currentManga.attributes.title.en || Object.values(state.currentManga.attributes.title)[0];
    elements.readerMangaTitle.textContent = mangaTitle;
    elements.readerChapterTitle.textContent = `Chapter ${chNum}${chTitle ? ': ' + chTitle : ''}`;

    // Update Dropdown Select
    elements.chapterSelect.innerHTML = state.currentChapterList.map((c, i) => `
        <option value="${i}" ${i === index ? 'selected' : ''}>Chapter ${c.attributes.chapter || 'Extra'}</option>
    `).join('');

    elements.prevChapBtn.disabled = index === 0;
    elements.nextChapBtn.disabled = index === state.currentChapterList.length - 1;

    showView('reader');
    elements.readerPagesContainer.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-danger" role="status"></div><div class="mt-3 text-muted">Fetching pages...</div></div>`;

    saveToHistory(state.currentManga.id, mangaTitle, chapter.id, chNum);

    try {
        const res = await fetch(`${API_BASE}/at-home/server/${chapter.id}`);
        const data = await res.json();

        if (data.baseUrl && data.chapter) {
            const baseUrl = data.baseUrl;
            const hash = data.chapter.hash;
            const filenames = state.useDataSaver ? data.chapter.dataSaver : data.chapter.data;
            const subfolder = state.useDataSaver ? 'data-saver' : 'data';

            state.readerPages = filenames.map(f => `${baseUrl}/${subfolder}/${hash}/${f}`);
            
            elements.pageCounter.textContent = `Total Pages: ${state.readerPages.length}`;
            renderPages();
        } else {
            elements.readerPagesContainer.innerHTML = `<div class="text-center text-muted py-5">Unable to retrieve chapter images.</div>`;
        }
    } catch (err) {
        console.error('Failed to load chapter pages:', err);
        elements.readerPagesContainer.innerHTML = `<div class="text-center text-danger py-5">Failed to fetch chapter images.</div>`;
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
    }, 1500);
}

function navigateChapter(direction) {
    const newIdx = state.currentChapterIndex + direction;
    if (newIdx >= 0 && newIdx < state.currentChapterList.length) {
        loadChapter(newIdx);
    }
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
        elements.historyGrid.innerHTML = `<div class="col-12 text-center text-muted py-5">No reading history yet. Start reading your favorite manga!</div>`;
        return;
    }

    elements.historyGrid.innerHTML = keys.map(id => {
        const item = history[id];
        const timeAgo = new Date(item.timestamp).toLocaleDateString();
        return `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card bg-secondary text-light h-100 p-3" style="background-color: var(--bg-card) !important; border: 1px solid var(--border-color);">
                    <h5 class="card-title text-truncate">${escapeHtml(item.title)}</h5>
                    <p class="card-text text-muted mb-2">Last Read: Chapter ${item.lastChapterNum} (${timeAgo})</p>
                    <button class="btn btn-outline-danger btn-sm mt-auto" onclick="resumeManga('${id}')">Continue Reading</button>
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

// Helpers
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
