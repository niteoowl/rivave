// Library - Playlists & Saved Music
const Library = {
    playlists: [],
    likedSongs: [],
    savedAlbums: [],
    savedArtists: [],

    init() {
        this.loadData();
    },

    loadData() {
        this.playlists = Storage.get('library_playlists') || [];
        this.likedSongs = Storage.get('library_liked') || [];
        this.savedAlbums = Storage.get('library_albums') || [];
        this.savedArtists = Storage.get('library_artists') || [];
    },

    saveData() {
        Storage.set('library_playlists', this.playlists);
        Storage.set('library_liked', this.likedSongs);
        Storage.set('library_albums', this.savedAlbums);
        Storage.set('library_artists', this.savedArtists);
    },

    createPlaylist(name, description = '') {
        const playlist = {
            id: generateId(),
            name,
            description,
            tracks: [],
            artwork: null,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        this.playlists.unshift(playlist);
        this.saveData();
        return playlist;
    },

    getPlaylist(id) {
        return this.playlists.find(p => p.id === id);
    },

    updatePlaylist(id, updates) {
        const playlist = this.getPlaylist(id);
        if (!playlist) return null;
        Object.assign(playlist, updates, { updatedAt: Date.now() });
        if (!playlist.artwork && playlist.tracks.length > 0) {
            playlist.artwork = playlist.tracks[0].artwork;
        }
        this.saveData();
        return playlist;
    },

    deletePlaylist(id) {
        const index = this.playlists.findIndex(p => p.id === id);
        if (index >= 0) {
            this.playlists.splice(index, 1);
            this.saveData();
            return true;
        }
        return false;
    },

    addToPlaylist(playlistId, track) {
        const playlist = this.getPlaylist(playlistId);
        if (!playlist) return false;
        if (playlist.tracks.some(t => t.id === track.id)) return false;
        playlist.tracks.push({ ...track, addedAt: Date.now() });
        if (!playlist.artwork) playlist.artwork = track.artwork;
        playlist.updatedAt = Date.now();
        this.saveData();
        return true;
    },

    removeFromPlaylist(playlistId, trackId) {
        const playlist = this.getPlaylist(playlistId);
        if (!playlist) return false;
        const index = playlist.tracks.findIndex(t => t.id === trackId);
        if (index >= 0) {
            playlist.tracks.splice(index, 1);
            playlist.updatedAt = Date.now();
            this.saveData();
            return true;
        }
        return false;
    },

    getPlaylists() {
        return this.playlists;
    },

    toggleLike(track) {
        const index = this.likedSongs.findIndex(t => t.id === track.id);
        if (index >= 0) {
            this.likedSongs.splice(index, 1);
            this.saveData();
            return false;
        } else {
            this.likedSongs.unshift({ ...track, likedAt: Date.now() });
            this.saveData();
            return true;
        }
    },

    isLiked(trackId) {
        return this.likedSongs.some(t => t.id === trackId);
    },

    getLikedSongs() {
        return this.likedSongs;
    },

    saveAlbum(album) {
        if (this.savedAlbums.some(a => a.id === album.id)) return false;
        this.savedAlbums.unshift({ ...album, savedAt: Date.now() });
        this.saveData();
        return true;
    },

    getSavedAlbums() {
        return this.savedAlbums;
    },

    followArtist(artist) {
        if (this.savedArtists.some(a => a.id === artist.id)) return false;
        this.savedArtists.unshift({ ...artist, followedAt: Date.now() });
        this.saveData();
        return true;
    },

    getSavedArtists() {
        return this.savedArtists;
    }
};
