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
