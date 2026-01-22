// Invidious API - YouTube Music Streaming (Replacement for Piped)
const InvidiousAPI = {
    currentInstance: 0,

    // Hybrid Fetch: Local Proxy -> Public Proxy Fallback
    async fetch(url, options = {}) {
        const targetUrl = url;
        const localProxyUrl = `/proxy?url=${encodeURIComponent(targetUrl)}`;

        // Cache Check (GET only)
        if (!options.method || options.method === 'GET') {
            const cached = Storage.get(localProxyUrl);
            if (cached && (Date.now() - cached.timestamp < CONFIG.CACHE_DURATION)) {
                return cached.data;
            }
        }

        const tryFetch = async (fetchUrl) => {
            const response = await fetch(fetchUrl, {
                ...options,
                headers: { 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error(`Status ${response.status}`);
            const text = await response.text();
            if (text.trim().startsWith('<')) throw new Error('HTML response');
            return JSON.parse(text);
        };

        try {
            // 1. Try Local Proxy (Cloudflare)
            const data = await tryFetch(localProxyUrl);

            // Save Cache
            if (!options.method || options.method === 'GET') {
                Storage.set(localProxyUrl, { timestamp: Date.now(), data });
            }
            return data;
        } catch (e) {
            console.warn(`Local proxy failed for ${url}, trying fallback...`, e);

            try {
                // 2. Fallback: Public Proxy (Client-side)
                const fallbackUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
                const data = await tryFetch(fallbackUrl);

                // Save Cache (Fallback data is also valid)
                if (!options.method || options.method === 'GET') {
                    Storage.set(localProxyUrl, { timestamp: Date.now(), data });
                }
                return data;
            } catch (avgErr) {
                console.error(`All fallbacks failed for ${url}:`, avgErr);
                throw avgErr;
            }
        }
    },

    // Get working API instance
    async getWorkingInstance() {
        for (let i = 0; i < CONFIG.INVIDIOUS_INSTANCES.length; i++) {
            const instance = CONFIG.INVIDIOUS_INSTANCES[(this.currentInstance + i) % CONFIG.INVIDIOUS_INSTANCES.length];
            // Simple string check to avoid dead instances without network call if possible, 
            // but for now we basically trust the list or let the fetch fail.
            // We return the instance base URL calling function will append path.
            // To verify, we could try a light call, but let's do optimistic return for speed.
            return instance;
        }
        return CONFIG.INVIDIOUS_INSTANCES[0];
    },

    // Try multiple instances if one fails
    async requestWithRotation(path) {
        for (let i = 0; i < CONFIG.INVIDIOUS_INSTANCES.length; i++) {
            const instanceIdx = (this.currentInstance + i) % CONFIG.INVIDIOUS_INSTANCES.length;
            const instance = CONFIG.INVIDIOUS_INSTANCES[instanceIdx];

            try {
                return await this.fetch(`${instance}${path}`);
            } catch (e) {
                console.warn(`Instance ${instance} failed, rotating...`);
            }
        }
        throw new Error('All Invidious instances failed');
    },

    // Search for music
    async search(query, type = 'video') {
        try {
            const data = await this.requestWithRotation(`/api/v1/search?q=${encodeURIComponent(query)}&type=${type}`);
            return data || [];
        } catch (error) {
            console.error('Invidious search error:', error);
            return [];
        }
    },

    // Get audio stream URL
    async getAudioUrl(videoId) {
        try {
            const data = await this.requestWithRotation(`/api/v1/videos/${videoId}`);

            if (!data) return null;

            const adaptiveFormats = data.adaptiveFormats || [];

            // Find best audio (Opus preferred)
            const audioStreams = adaptiveFormats.filter(f => f.type && f.type.startsWith('audio'));

            if (audioStreams.length === 0) return null;

            // Sort by bitrate (highest first)
            audioStreams.sort((a, b) => parseInt(b.bitrate || 0) - parseInt(a.bitrate || 0));

            // Prefer opus/webm over m4a
            const opusStream = audioStreams.find(s => s.type.includes('opus') || s.type.includes('webm'));
            const selectedStream = opusStream || audioStreams[0];

            return {
                url: selectedStream.url,
                mimeType: selectedStream.type,
                bitrate: selectedStream.bitrate,
                title: data.title,
                artist: data.author,
                thumbnail: data.videoThumbnails ? data.videoThumbnails[0].url : (data.thumbnails ? data.thumbnails[0].url : ''),
                duration: data.lengthSeconds
            };
        } catch (error) {
            console.error('Get audio URL error:', error);
            return null;
        }
    },

    // Get trending music
    async getTrending(region = 'KR') {
        try {
            // Invidious /trending endpoint
            const data = await this.requestWithRotation(`/api/v1/trending?region=${region}`);

            return (data || []).map(item => ({
                ...item,
                uploaderName: item.author, // Map author to uploaderName for compatibility
                thumbnailUrl: item.videoThumbnails ? item.videoThumbnails[0].url : (item.thumbnails ? item.thumbnails[0].url : '')
            })).slice(0, 20);
        } catch (error) {
            console.error('Invidious trending error:', error);
            return [];
        }
    },

    extractVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /^([a-zA-Z0-9_-]{11})$/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }

        return null;
    }
};
