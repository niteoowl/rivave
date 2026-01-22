// Piped API - YouTube Music Streaming (Using Local Proxy)
const PipedAPI = {
    currentInstance: 0,

    // Helper to fetch via local proxy
    async fetch(url, options = {}) {
        // Always use our local proxy
        const proxyUrl = `/proxy?url=${encodeURIComponent(url)}`;

        // Check Client Cache for GET requests
        if (!options.method || options.method === 'GET') {
            const cached = Storage.get(proxyUrl);
            if (cached && (Date.now() - cached.timestamp < CONFIG.CACHE_DURATION)) {
                return cached.data;
            }
        }

        try {
            const response = await fetch(proxyUrl, {
                ...options,
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) throw new Error(`Status ${response.status}`);

            // Check for HTML response (SPA Fallback -> Proxy not running)
            const text = await response.text();
            if (text.trim().startsWith('<')) {
                console.error('API Error: Received HTML instead of JSON. Serverless Function (/proxy) is likely not running. If you are testing locally, use "wrangler pages dev".');
                throw new Error('Proxy not active');
            }

            const data = JSON.parse(text);

            // Save to Cache
            if (!options.method || options.method === 'GET') {
                Storage.set(proxyUrl, {
                    timestamp: Date.now(),
                    data: data
                });
            }

            return data;
        } catch (e) {
            console.warn(`Fetch failed for ${url}:`, e);
            throw e;
        }
    },

    // Get working API instance
    async getWorkingInstance() {
        // Just return the first one, let the proxy handle connection. 
        // Or simple rotation if one fails.
        for (let i = 0; i < CONFIG.PIPED_INSTANCES.length; i++) {
            const instance = CONFIG.PIPED_INSTANCES[(this.currentInstance + i) % CONFIG.PIPED_INSTANCES.length];
            try {
                // Test connection
                await this.fetch(`${instance}/trending?region=KR`);
                this.currentInstance = (this.currentInstance + i) % CONFIG.PIPED_INSTANCES.length;
                return instance;
            } catch (e) {
                // console.warn(`Instance ${instance} failed`);
            }
        }
        return CONFIG.PIPED_INSTANCES[0];
    },

    // Search for music
    async search(query, filter = 'music_songs') {
        try {
            const instance = await this.getWorkingInstance();
            const url = `${instance}/search?q=${encodeURIComponent(query)}&filter=${filter}`;
            const data = await this.fetch(url);
            return data.items || [];
        } catch (error) {
            console.error('Piped search error:', error);
            return [];
        }
    },

    // Get stream info
    async getStream(videoId) {
        try {
            const instance = await this.getWorkingInstance();
            const url = `${instance}/streams/${videoId}`;
            return await this.fetch(url);
        } catch (error) {
            console.error('Piped stream error:', error);
            return null;
        }
    },

    // Get audio stream URL
    async getAudioUrl(videoId) {
        try {
            const streamData = await this.getStream(videoId);
            if (!streamData) return null;

            const audioStreams = streamData.audioStreams || [];
            if (audioStreams.length === 0) return null;

            audioStreams.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

            const opusStream = audioStreams.find(s =>
                s.mimeType?.includes('opus') || s.mimeType?.includes('webm')
            );

            const selectedStream = opusStream || audioStreams[0];

            return {
                url: selectedStream.url,
                mimeType: selectedStream.mimeType,
                bitrate: selectedStream.bitrate,
                title: streamData.title,
                artist: streamData.uploader,
                thumbnail: streamData.thumbnailUrl,
                duration: streamData.duration
            };
        } catch (error) {
            console.error('Get audio URL error:', error);
            return null;
        }
    },

    // Get trending music
    async getTrending(region = 'KR') {
        try {
            const instance = await this.getWorkingInstance();
            const url = `${instance}/trending?region=${region}`;
            const data = await this.fetch(url);

            return (data || []).filter(item =>
                item.type === 'stream' &&
                (item.uploaderName?.toLowerCase().includes('vevo') ||
                    item.uploaderName?.toLowerCase().includes('official') ||
                    item.uploaderName?.toLowerCase().includes('music'))
            ).slice(0, 20);
        } catch (error) {
            console.error('Piped trending error:', error);
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
