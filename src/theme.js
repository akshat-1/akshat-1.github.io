const THEME_STORAGE_KEY = 'akshat-portfolio-theme';

function readTheme(windowRef) {
    try {
        const stored = windowRef.localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') {
            return stored;
        }
    } catch {
        // Private browsing can deny localStorage; fall back to the system preference.
    }
    return windowRef.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function setupThemeToggle(documentRef = document, windowRef = window) {
    const toggle = documentRef.querySelector('[data-theme-toggle]');
    const applyTheme = (theme) => {
        const isLight = theme === 'light';
        documentRef.documentElement.dataset.theme = theme;
        if (toggle) {
            toggle.textContent = isLight ? 'Dark mode' : 'Light mode';
            toggle.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
            toggle.setAttribute('aria-pressed', String(isLight));
        }
    };

    applyTheme(readTheme(windowRef));
    if (!toggle) {
        return;
    }

    toggle.addEventListener('click', () => {
        const nextTheme = documentRef.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
        applyTheme(nextTheme);
        try {
            windowRef.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        } catch {
            // The theme still applies for this page view when storage is unavailable.
        }
    });
}

export async function loadViewCount(documentRef = document, windowRef = window) {
    const countElement = documentRef.querySelector('[data-view-count]');
    if (!countElement) {
        return;
    }
    const paths = ['./public/view-count.json', './view-count.json'];
    try {
        for (const path of paths) {
            const response = await windowRef.fetch(`${path}?ts=${Date.now()}`, { cache: 'no-store' });
            if (!response.ok) {
                continue;
            }
            const payload = await response.json();
            const count = Number(payload.count);
            if (!Number.isFinite(count) || count < 0) {
                continue;
            }
            countElement.textContent = `Views / ${new Intl.NumberFormat().format(Math.floor(count))}`;
            return;
        }
        throw new Error('view-count.json was not found');
    } catch {
        countElement.textContent = 'Views / —';
    }
}
