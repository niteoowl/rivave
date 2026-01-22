// Configuration - Apple Music Clone
const CONFIG = {
    // API Endpoints
    PIPED_API: 'https://pipedapi.kavin.rocks',
    PIPED_INSTANCES: [
        'https://pipedapi.kavin.rocks',
        'https://pipedapi.systemless.io',
        'https://api.piped.privacy.com.de',
        'https://pipedapi.smnz.de',
        'https://pipedapi.adminforge.de'
    ],
    DEEZER_API: 'https://api.deezer.com',
    DEEZER_PROXY: '/proxy?url=',
    LRCLIB_API: 'https://lrclib.net',

    // App Settings
    APP_NAME: 'Music',
    STORAGE_PREFIX: 'apple_music_clone_',

    // Player Settings
    DEFAULT_VOLUME: 0.8,
    CROSSFADE_DURATION: 2000, // ms

    // Search Settings
    SEARCH_DEBOUNCE: 300, // ms
    MAX_SEARCH_RESULTS: 20,

    // Cache Settings
    CACHE_DURATION: 1000 * 60 * 30, // 30 minutes

    // Artwork Fallback
    DEFAULT_ARTWORK: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzMzMyI+PHBhdGggZD0iTTEyIDN2MTAuNTVjLS41OS0uMzQtMS4yNy0uNTUtMi0uNTUtMi4yMSAwLTQgMS43OS00IDRzMS43OSA0IDQgNCA0LTEuNzkgNC00VjdoNFYzaC02eiIvPjwvc3ZnPg==',

    // Genres for Browse
    GENRES: [
        { id: 'pop', name: '팝', color: 'linear-gradient(135deg, #FA233B, #FB5C74)' },
        { id: 'hiphop', name: '힙합', color: 'linear-gradient(135deg, #5856D6, #AF52DE)' },
        { id: 'rock', name: '록', color: 'linear-gradient(135deg, #FF9500, #FFCC00)' },
        { id: 'electronic', name: '일렉트로닉', color: 'linear-gradient(135deg, #34C759, #30D158)' },
        { id: 'rnb', name: 'R&B/소울', color: 'linear-gradient(135deg, #007AFF, #5AC8FA)' },
        { id: 'kpop', name: 'K-Pop', color: 'linear-gradient(135deg, #FF2D55, #FF6482)' },
        { id: 'jpop', name: 'J-Pop', color: 'linear-gradient(135deg, #5856D6, #BF5AF2)' },
        { id: 'classical', name: '클래식', color: 'linear-gradient(135deg, #64D2FF, #00C7BE)' },
        { id: 'jazz', name: '재즈', color: 'linear-gradient(135deg, #8E8E93, #636366)' },
        { id: 'country', name: '컨트리', color: 'linear-gradient(135deg, #AC8E68, #8B7355)' }
    ]
};

// Storage Helper
const Storage = {
    get(key) {
        try {
            const item = localStorage.getItem(CONFIG.STORAGE_PREFIX + key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error('Storage get error:', e);
            return null;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(CONFIG.STORAGE_PREFIX + key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage set error:', e);
            return false;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(CONFIG.STORAGE_PREFIX + key);
            return true;
        } catch (e) {
            console.error('Storage remove error:', e);
            return false;
        }
    }
};

// Time Formatter
function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Debounce Helper
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle Helper
function throttle(func, limit) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Generate UUID
function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Shuffle Array
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
