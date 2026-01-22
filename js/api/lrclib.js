// LRCLIB API - Synchronized Lyrics
const LrcLibAPI = {
    // Search for lyrics
    async search(query) {
        try {
            const response = await fetch(
                `${CONFIG.LRCLIB_API}/api/search?q=${encodeURIComponent(query)}`,
                { signal: AbortSignal.timeout(10000) }
            );

            if (!response.ok) throw new Error('Lyrics search failed');

            const data = await response.json();
            return data || [];
        } catch (error) {
            console.error('LRCLIB search error:', error);
            return [];
        }
    },

    // Get lyrics by track signature
    async get(trackName, artistName, albumName = '', duration = 0) {
        try {
            let url = `${CONFIG.LRCLIB_API}/api/get?track_name=${encodeURIComponent(trackName)}&artist_name=${encodeURIComponent(artistName)}`;

            if (albumName) {
                url += `&album_name=${encodeURIComponent(albumName)}`;
            }

            if (duration > 0) {
                url += `&duration=${Math.round(duration)}`;
            }

            const response = await fetch(url, {
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                if (response.status === 404) return null;
                throw new Error('Lyrics fetch failed');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('LRCLIB get error:', error);
            return null;
        }
    },

    // Get synced lyrics as array of {time, text} objects
    async getSyncedLyrics(trackName, artistName, albumName = '', duration = 0) {
        try {
            // First try exact match
            let data = await this.get(trackName, artistName, albumName, duration);

            // If no result, try search
            if (!data && trackName && artistName) {
                const searchResults = await this.search(`${trackName} ${artistName}`);
                if (searchResults.length > 0) {
                    // Find best match
                    const match = searchResults.find(r =>
                        r.trackName?.toLowerCase().includes(trackName.toLowerCase()) ||
                        r.artistName?.toLowerCase().includes(artistName.toLowerCase())
                    ) || searchResults[0];

                    data = match;
                }
            }

            if (!data) return null;

            // Parse synced lyrics if available
            if (data.syncedLyrics) {
                return this.parseLRC(data.syncedLyrics);
            }

            // Return plain lyrics if no synced version
            if (data.plainLyrics) {
                return {
                    synced: false,
                    lines: data.plainLyrics.split('\n').map(text => ({
                        time: 0,
                        text: text.trim()
                    })).filter(line => line.text)
                };
            }

            return null;
        } catch (error) {
            console.error('Get synced lyrics error:', error);
            return null;
        }
    },

    // Parse LRC format to array
    parseLRC(lrcString) {
        const lines = [];
        const regex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/g;

        let match;
        while ((match = regex.exec(lrcString)) !== null) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
            const text = match[4].trim();

            const time = minutes * 60 + seconds + milliseconds / 1000;

            if (text) {
                lines.push({ time, text });
            }
        }

        // Sort by time
        lines.sort((a, b) => a.time - b.time);

        return {
            synced: true,
            lines
        };
    },

    // Format time to LRC format
    formatLRCTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }
};
