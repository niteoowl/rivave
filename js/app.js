// Main App - Apple Music Clone
const App = {
    isLoading: false,

    async init() {
        console.log('🎵 Initializing Apple Music Clone...');

        // Initialize modules
        Library.init();
        Player.init();
        UI.init();
        Search.init();

        // Load initial data
        await this.loadHomeData();
        await this.loadBrowseData();
        this.loadRadioData();

        // Render library
        UI.renderPlaylistsGrid();

        // Load recently played
        this.renderRecentlyPlayed();

        console.log('✅ App initialized');
    },

    async loadHomeData() {
        try {
            // Load chart
            const chart = await DeezerAPI.getChart(20);
            this.renderHorizontalSection('topCharts', chart);

            // For you (using chart for now)
            const forYou = await DeezerAPI.searchTracks('인기', 10);
            this.renderHorizontalSection('forYou', forYou);

            // New releases
            const newReleases = await DeezerAPI.searchTracks('2024', 10);
            this.renderHorizontalSection('newReleases', newReleases);
        } catch (error) {
            console.error('Load home data error:', error);
        }
    },

    async loadBrowseData() {
        try {
            const browseGrid = document.getElementById('browseGrid');
            if (!browseGrid) return;

            browseGrid.innerHTML = CONFIG.GENRES.map(genre => `
                <div class="browse-card" style="background: ${genre.color}" onclick="Search.searchByGenre('${genre.id}'); UI.switchView('search')">
                    <span class="browse-card-title">${genre.name}</span>
                </div>
            `).join('');
        } catch (error) {
            console.error('Load browse data error:', error);
        }
    },

    loadRadioData() {
        const radioStations = document.getElementById('radioStations');
        if (!radioStations) return;

        const stations = [
            { name: 'K-Pop Hits', color: 'linear-gradient(135deg, #FF2D55, #FF6482)' },
            { name: 'Pop Mix', color: 'linear-gradient(135deg, #FA233B, #FB5C74)' },
            { name: 'Hip-Hop Central', color: 'linear-gradient(135deg, #5856D6, #AF52DE)' },
            { name: 'Chill Vibes', color: 'linear-gradient(135deg, #64D2FF, #00C7BE)' },
            { name: 'Rock Classics', color: 'linear-gradient(135deg, #FF9500, #FFCC00)' },
            { name: 'Electronic Beats', color: 'linear-gradient(135deg, #34C759, #30D158)' }
        ];

        radioStations.innerHTML = stations.map(station => `
            <div class="radio-card" onclick="App.playRadioStation('${station.name}')">
                <div class="radio-artwork" style="background: ${station.color}">
                    <span class="radio-live-badge">LIVE</span>
                </div>
                <div class="radio-info">
                    <p class="radio-title">${station.name}</p>
                    <p class="radio-subtitle">Apple Music</p>
                </div>
            </div>
        `).join('');
    },

    renderRecentlyPlayed() {
        const container = document.getElementById('recentlyPlayed');
        const recent = Player.getRecentlyPlayed();

        if (recent.length === 0) {
            container.innerHTML = '<div class="empty-state small"><p>최근 재생한 음악이 없습니다</p></div>';
            return;
        }

        container.innerHTML = recent.slice(0, 10).map(track =>
            UI.renderMusicCard(track, `onclick="App.playTrack(${JSON.stringify(track).replace(/"/g, '&quot;')})"`)
        ).join('');
    },

    renderHorizontalSection(containerId, items) {
        const container = document.getElementById(containerId);
        if (!container || items.length === 0) return;

        container.innerHTML = items.map(item =>
            UI.renderMusicCard(item, `onclick="App.playTrack(${JSON.stringify(item).replace(/"/g, '&quot;')})"`)
        ).join('');
    },

    async playTrack(track) {
        await Player.playTrack(track);
        this.renderRecentlyPlayed();
    },

    async playRadioStation(name) {
        UI.showLoading();
        const tracks = await DeezerAPI.searchTracks(name, 50);
        if (tracks.length > 0) {
            await Player.playQueue(shuffleArray(tracks));
        } else {
            UI.showToast('라디오 스테이션을 불러올 수 없습니다');
        }
        UI.hideLoading();
    },

    async openPlaylist(playlistId) {
        const playlist = Library.getPlaylist(playlistId);
        if (!playlist) return;

        const hero = document.getElementById('playlistHero');
        hero.querySelector('.playlist-cover').innerHTML = `<img src="${playlist.artwork || CONFIG.DEFAULT_ARTWORK}" alt="">`;
        hero.querySelector('.playlist-title').textContent = playlist.name;
        hero.querySelector('.playlist-meta').textContent = `${playlist.tracks.length}곡`;

        const trackList = document.getElementById('playlistTracks');
        trackList.innerHTML = playlist.tracks.map(t => UI.renderTrackItem(t)).join('');

        // Play button
        document.getElementById('playPlaylistBtn').onclick = () => {
            if (playlist.tracks.length > 0) {
                Player.playQueue(playlist.tracks);
            }
        };

        document.getElementById('shufflePlaylistBtn').onclick = () => {
            if (playlist.tracks.length > 0) {
                Player.playQueue(shuffleArray([...playlist.tracks]));
            }
        };

        UI.switchView('playlistDetail');
    },

    async openAlbum(albumId) {
        UI.showLoading();

        try {
            const album = await DeezerAPI.getAlbum(albumId);
            if (!album) {
                UI.showToast('앨범을 불러올 수 없습니다');
                UI.hideLoading();
                return;
            }

            const hero = document.getElementById('albumHero');
            hero.querySelector('.album-cover').innerHTML = `<img src="${album.artworkLarge || album.artwork || CONFIG.DEFAULT_ARTWORK}" alt="">`;
            hero.querySelector('.album-title').textContent = album.title;
            hero.querySelector('.album-artist').textContent = album.artist;
            hero.querySelector('.album-meta').textContent = `${album.releaseDate?.split('-')[0] || ''} • ${album.trackCount}곡`;

            const trackList = document.getElementById('albumTracks');
            trackList.innerHTML = album.tracks.map((t, i) => `
                <div class="track-item" onclick="App.playAlbumTrack(${albumId}, ${i})">
                    <span class="track-number">${t.trackNumber || i + 1}</span>
                    <div class="track-info">
                        <p class="track-title">${t.title}</p>
                    </div>
                    <span class="track-duration">${formatTime(t.duration)}</span>
                </div>
            `).join('');

            // Store album for playback
            this.currentAlbum = album;

            document.getElementById('playAlbumBtn').onclick = () => {
                Player.playQueue(album.tracks);
            };

            document.getElementById('shuffleAlbumBtn').onclick = () => {
                Player.playQueue(shuffleArray([...album.tracks]));
            };

            UI.switchView('albumDetail');
        } catch (error) {
            console.error('Open album error:', error);
            UI.showToast('앨범을 불러올 수 없습니다');
        }

        UI.hideLoading();
    },

    async playAlbumTrack(albumId, trackIndex) {
        if (this.currentAlbum && this.currentAlbum.id === albumId) {
            await Player.playQueue(this.currentAlbum.tracks, trackIndex);
        }
    },

    async openArtist(artistId) {
        UI.showLoading();

        try {
            const [artist, topTracks, albums] = await Promise.all([
                DeezerAPI.getArtist(artistId),
                DeezerAPI.getArtistTracks(artistId, 10),
                DeezerAPI.getArtistAlbums(artistId, 10)
            ]);

            if (!artist) {
                UI.showToast('아티스트를 불러올 수 없습니다');
                UI.hideLoading();
                return;
            }

            const hero = document.getElementById('artistHero');
            hero.querySelector('.artist-image').innerHTML = `<img src="${artist.pictureLarge || artist.picture || CONFIG.DEFAULT_ARTWORK}" alt="">`;
            hero.querySelector('.artist-name').textContent = artist.name;

            const trackList = document.getElementById('artistTopTracks');
            trackList.innerHTML = topTracks.map(t => UI.renderTrackItem(t)).join('');

            const albumsContainer = document.getElementById('artistAlbums');
            albumsContainer.innerHTML = albums.map(a => `
                <div class="music-card" onclick="App.openAlbum(${a.id})">
                    <div class="card-artwork">
                        <img src="${a.artwork || CONFIG.DEFAULT_ARTWORK}" alt="">
                    </div>
                    <div class="card-info">
                        <p class="card-title">${a.title}</p>
                        <p class="card-subtitle">${a.releaseDate?.split('-')[0] || ''}</p>
                    </div>
                </div>
            `).join('');

            UI.switchView('artistDetail');
        } catch (error) {
            console.error('Open artist error:', error);
            UI.showToast('아티스트를 불러올 수 없습니다');
        }

        UI.hideLoading();
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
