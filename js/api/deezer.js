// Deezer API - Music Metadata (Using Local Proxy)
const DeezerAPI = {
    // Helper to fetch via local proxy with fallback
    async fetch(endpoint) {
        const targetUrl = CONFIG.DEEZER_API + endpoint;
        const localProxyUrl = `/proxy?url=${encodeURIComponent(targetUrl)}`;
        const cacheKey = `deezer:${endpoint}`;

        // Check Cache (Metadata Cache: 24 hours)
        const cached = Storage.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < 1000 * 60 * 60 * 24)) {
            return cached.data;
        }

        const tryFetch = async (fetchUrl) => {
            const response = await fetch(fetchUrl);
            if (!response.ok) throw new Error('Network response was not ok');

            const text = await response.text();
            if (text.trim().startsWith('<')) throw new Error('Received HTML');

            return JSON.parse(text);
        };

        try {
            // 1. Try Local Proxy
            const data = await tryFetch(localProxyUrl);
            Storage.set(cacheKey, { timestamp: Date.now(), data });
            return data;
        } catch (e) {
            console.warn(`Local proxy failed for Deezer, trying fallback...`, e);

            try {
                // 2. Fallback: Public Proxy
                const fallbackUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
                const data = await tryFetch(fallbackUrl);
                Storage.set(cacheKey, { timestamp: Date.now(), data });
                return data;
            } catch (fallbackErr) {
                console.error('Deezer API Fallback Error:', fallbackErr);
                return null;
            }
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
