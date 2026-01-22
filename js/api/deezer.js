// Deezer API - Music Metadata (Using Local Proxy)
const DeezerAPI = {
    // Helper to fetch via local proxy
    async fetch(endpoint) {
        const targetUrl = CONFIG.DEEZER_API + endpoint;
        const proxyUrl = `/proxy?url=${encodeURIComponent(targetUrl)}`;

        // Cache Key
        const cacheKey = `deezer:${endpoint}`;

        // Metadata Cache: 24 hours
        const cached = Storage.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < 1000 * 60 * 60 * 24)) {
            return cached.data;
        }

        try {
            const response = await fetch(proxyUrl);
            if (!response.ok) return null;

            // Check if we received HTML (likely SPA fallback 'index.html' -> Proxy not running)
            const contentType = response.headers.get('content-type');
            const text = await response.text();

            if (text.trim().startsWith('<')) {
                console.error('API Error: Received HTML instead of JSON. Serverless Function (/proxy) is likely not running. If you are testing locally, use "wrangler pages dev".');
                return null;
            }

            const data = JSON.parse(text);

            // Save to Cache
            Storage.set(cacheKey, {
                timestamp: Date.now(),
                data: data
            });

            return data;
        } catch (e) {
            console.error('Deezer API Error:', e);
            return null;
        }
    },

    // Search tracks
    async searchTracks(query, limit = 20) {
        try {
            const data = await this.fetch(`/search/track?q=${encodeURIComponent(query)}&limit=${limit}`);
            if (!data || !data.data) return [];

            return data.data.map(track => ({
                id: track.id,
                title: track.title,
                artist: track.artist?.name || 'Unknown Artist',
                artistId: track.artist?.id,
                album: track.album?.title || 'Unknown Album',
                albumId: track.album?.id,
                duration: track.duration,
                artwork: track.album?.cover_medium || track.album?.cover || CONFIG.DEFAULT_ARTWORK,
                artworkLarge: track.album?.cover_xl || track.album?.cover_big || track.album?.cover_medium,
                preview: track.preview,
                explicit: track.explicit_lyrics,
                type: 'track'
            }));
        } catch (error) {
            console.error('Search tracks error:', error);
            return [];
        }
    },

    // Search artists
    async searchArtists(query, limit = 10) {
        try {
            const data = await this.fetch(`/search/artist?q=${encodeURIComponent(query)}&limit=${limit}`);
            if (!data || !data.data) return [];

            return data.data.map(artist => ({
                id: artist.id,
                name: artist.name,
                picture: artist.picture_medium || artist.picture,
                pictureLarge: artist.picture_xl || artist.picture_big,
                fans: artist.nb_fan,
                type: 'artist'
            }));
        } catch (error) {
            console.error('Search artists error:', error);
            return [];
        }
    },

    // Search albums
    async searchAlbums(query, limit = 10) {
        try {
            const data = await this.fetch(`/search/album?q=${encodeURIComponent(query)}&limit=${limit}`);
            if (!data || !data.data) return [];

            return data.data.map(album => ({
                id: album.id,
                title: album.title,
                artist: album.artist?.name || 'Unknown Artist',
                artistId: album.artist?.id,
                artwork: album.cover_medium || album.cover,
                artworkLarge: album.cover_xl || album.cover_big,
                trackCount: album.nb_tracks,
                type: 'album'
            }));
        } catch (error) {
            console.error('Search albums error:', error);
            return [];
        }
    },

    // Get Top Charts
    async getChart(limit = 20) {
        try {
            const data = await this.fetch(`/chart/0/tracks?limit=${limit}`);
            if (!data || !data.data) return [];

            return data.data.map((track, index) => ({
                id: track.id,
                title: track.title,
                artist: track.artist?.name || 'Unknown Artist',
                artistId: track.artist?.id,
                album: track.album?.title || 'Unknown Album',
                albumId: track.album?.id,
                duration: track.duration,
                artwork: track.album?.cover_medium || CONFIG.DEFAULT_ARTWORK,
                artworkLarge: track.album?.cover_xl || track.album?.cover_big,
                position: track.position || (index + 1),
                explicit: track.explicit_lyrics,
                type: 'track'
            }));
        } catch (error) {
            console.error('Get chart error:', error);
            return [];
        }
    },

    // Get Artist
    async getArtist(artistId) {
        try {
            const data = await this.fetch(`/artist/${artistId}`);
            if (!data) return null;

            return {
                id: data.id,
                name: data.name,
                picture: data.picture_medium || data.picture,
                pictureLarge: data.picture_xl || data.picture_big,
                fans: data.nb_fan,
                albumCount: data.nb_album
            };
        } catch (error) {
            console.error('Get artist error:', error);
            return null;
        }
    },

    // Get Artist Top Tracks
    async getArtistTracks(artistId, limit = 10) {
        try {
            const data = await this.fetch(`/artist/${artistId}/top?limit=${limit}`);
            if (!data || !data.data) return [];

            return data.data.map(track => ({
                id: track.id,
                title: track.title,
                artist: track.artist?.name || 'Unknown Artist',
                artistId: track.artist?.id,
                album: track.album?.title || 'Unknown Album',
                albumId: track.album?.id,
                duration: track.duration,
                artwork: track.album?.cover_medium || CONFIG.DEFAULT_ARTWORK,
                artworkLarge: track.album?.cover_xl || track.album?.cover_big,
                explicit: track.explicit_lyrics,
                type: 'track'
            }));
        } catch (error) {
            console.error('Get artist tracks error:', error);
            return [];
        }
    },

    // Get Artist Albums
    async getArtistAlbums(artistId, limit = 20) {
        try {
            const data = await this.fetch(`/artist/${artistId}/albums?limit=${limit}`);
            if (!data || !data.data) return [];

            return data.data.map(album => ({
                id: album.id,
                title: album.title,
                artwork: album.cover_medium || album.cover,
                artworkLarge: album.cover_xl || album.cover_big,
                releaseDate: album.release_date,
                type: 'album'
            }));
        } catch (error) {
            console.error('Get artist albums error:', error);
            return [];
        }
    },

    // Get Album
    async getAlbum(albumId) {
        try {
            const data = await this.fetch(`/album/${albumId}`);
            if (!data) return null;

            return {
                id: data.id,
                title: data.title,
                artist: data.artist?.name || 'Unknown Artist',
                artistId: data.artist?.id,
                artwork: data.cover_medium || data.cover,
                artworkLarge: data.cover_xl || data.cover_big,
                releaseDate: data.release_date,
                trackCount: data.nb_tracks,
                duration: data.duration,
                tracks: (data.tracks?.data || []).map(track => ({
                    id: track.id,
                    title: track.title,
                    artist: data.artist?.name || 'Unknown Artist',
                    artistId: data.artist?.id,
                    album: data.title,
                    albumId: data.id,
                    duration: track.duration,
                    artwork: data.cover_medium,
                    artworkLarge: data.cover_xl || data.cover_big,
                    trackNumber: track.track_position,
                    discNumber: track.disk_number,
                    explicit: track.explicit_lyrics,
                    type: 'track'
                }))
            };
        } catch (error) {
            console.error('Get album error:', error);
            return null;
        }
    },

    // Get genre
    async getGenre(genreId) {
        try {
            const data = await this.fetch(`/genre/${genreId}/artists`);
            if (!data || !data.data) return [];

            return data.data.map(artist => ({
                id: artist.id,
                name: artist.name,
                picture: artist.picture_medium || artist.picture,
                type: 'artist'
            }));
        } catch (error) {
            console.error('Get genre error:', error);
            return [];
        }
    },

    // Search for a song (combined search for Piped matching)
    async findTrack(title, artist) {
        try {
            const query = `${title} ${artist}`.trim();
            const tracks = await this.searchTracks(query, 5);

            if (tracks.length === 0) return null;

            const lowerTitle = title.toLowerCase();
            const lowerArtist = artist.toLowerCase();

            const match = tracks.find(t =>
                t.title.toLowerCase().includes(lowerTitle) &&
                t.artist.toLowerCase().includes(lowerArtist)
            );

            return match || tracks[0];
        } catch (error) {
            console.error('Find track error:', error);
            return null;
        }
    }
};
