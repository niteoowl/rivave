// Search Module - Apple Music Clone
const Search = {
    lastQuery: '',
    debounceTimer: null,

    init() {
        this.setupEventListeners();
    },

    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        const searchClear = document.getElementById('searchClear');

        searchInput?.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            searchClear?.classList.toggle('hidden', query.length === 0);
            this.debounceSearch(query);
        });

        searchClear?.addEventListener('click', () => {
            searchInput.value = '';
            searchClear.classList.add('hidden');
            this.showCategories();
        });

        // Category buttons
        document.querySelectorAll('.category-card').forEach(btn => {
            btn.addEventListener('click', () => {
                const genre = btn.dataset.genre;
                if (genre) this.searchByGenre(genre);
            });
        });
    },

    debounceSearch(query) {
        clearTimeout(this.debounceTimer);

        if (query.length === 0) {
            this.showCategories();
            return;
        }

        this.debounceTimer = setTimeout(() => {
            this.performSearch(query);
        }, CONFIG.SEARCH_DEBOUNCE);
    },

    async performSearch(query) {
        if (query === this.lastQuery) return;
        this.lastQuery = query;

        this.showResults();
        UI.showLoading();

        try {
            const [tracks, artists, albums] = await Promise.all([
                DeezerAPI.searchTracks(query, 10),
                DeezerAPI.searchArtists(query, 5),
                DeezerAPI.searchAlbums(query, 5)
            ]);

            this.renderResults(tracks, artists, albums);
        } catch (error) {
            console.error('Search error:', error);
            UI.showToast('검색 중 오류가 발생했습니다');
        }

        UI.hideLoading();
    },

    async searchByGenre(genre) {
        const genreData = CONFIG.GENRES.find(g => g.id === genre);
        if (!genreData) return;

        document.getElementById('searchInput').value = genreData.name;
        await this.performSearch(genreData.name);
    },

    showCategories() {
        document.getElementById('searchCategories')?.classList.remove('hidden');
        document.getElementById('searchResults')?.classList.add('hidden');
    },

    showResults() {
        document.getElementById('searchCategories')?.classList.add('hidden');
        document.getElementById('searchResults')?.classList.remove('hidden');
    },

    renderResults(tracks, artists, albums) {
        const topResultsEl = document.getElementById('topResults');
        const songsEl = document.getElementById('songsResults');
        const artistsEl = document.getElementById('artistsResults');
        const albumsEl = document.getElementById('albumsResults');

        // Top Result
        if (tracks.length > 0) {
            const top = tracks[0];
            topResultsEl.innerHTML = `
                <h3>인기 결과</h3>
                <div class="top-result-card" onclick="App.playTrack(${JSON.stringify(top).replace(/"/g, '&quot;')})">
                    <div class="top-result-artwork">
                        <img src="${top.artwork || CONFIG.DEFAULT_ARTWORK}" alt="">
                    </div>
                    <div class="top-result-info">
                        <p class="top-result-title">${top.title}</p>
                        <p class="top-result-subtitle">노래 • ${top.artist}</p>
                    </div>
                    <button class="top-result-play">
                        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </button>
                </div>
            `;
        } else {
            topResultsEl.innerHTML = '';
        }

        // Songs
        if (tracks.length > 0) {
            songsEl.innerHTML = `
                <h3>노래</h3>
                <div class="track-list">
                    ${tracks.map(t => UI.renderTrackItem(t)).join('')}
                </div>
            `;
        } else {
            songsEl.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:var(--space-xl);">검색 결과가 없습니다</p>';
        }

        // Artists
        if (artists.length > 0) {
            artistsEl.innerHTML = `
                <h3>아티스트</h3>
                <div class="horizontal-scroll">
                    ${artists.map(a => `
                        <div class="artist-card" onclick="App.openArtist(${a.id})">
                            <div class="artist-image">
                                <img src="${a.picture || CONFIG.DEFAULT_ARTWORK}" alt="">
                            </div>
                            <p class="artist-name">${a.name}</p>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            artistsEl.innerHTML = '';
        }

        // Albums
        if (albums.length > 0) {
            albumsEl.innerHTML = `
                <h3>앨범</h3>
                <div class="horizontal-scroll">
                    ${albums.map(a => `
                        <div class="music-card" onclick="App.openAlbum(${a.id})">
                            <div class="card-artwork">
                                <img src="${a.artwork || CONFIG.DEFAULT_ARTWORK}" alt="">
                            </div>
                            <div class="card-info">
                                <p class="card-title">${a.title}</p>
                                <p class="card-subtitle">${a.artist}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            albumsEl.innerHTML = '';
        }
    }
};
