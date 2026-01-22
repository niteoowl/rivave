// UI Controller - Apple Music Clone
const UI = {
    currentView: 'home',
    views: ['home', 'browse', 'radio', 'library', 'search'],

    // Element references
    elements: {},

    init() {
        this.cacheElements();
        this.setupEventListeners();
    },

    cacheElements() {
        this.elements = {
            mainContent: document.getElementById('mainContent'),
            tabBar: document.getElementById('tabBar'),
            miniPlayer: document.getElementById('miniPlayer'),
            nowPlaying: document.getElementById('nowPlaying'),
            bottomSheet: document.getElementById('bottomSheet'),
            bottomSheetOverlay: document.getElementById('bottomSheetOverlay'),
            bottomSheetContent: document.getElementById('bottomSheetContent'),
            toast: document.getElementById('toast'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            lyricsOverlay: document.getElementById('lyricsOverlay'),
            lyricsContent: document.getElementById('lyricsContent'),
            queueOverlay: document.getElementById('queueOverlay'),
            searchInput: document.getElementById('searchInput'),
            searchClear: document.getElementById('searchClear'),
            searchCategories: document.getElementById('searchCategories'),
            searchResults: document.getElementById('searchResults')
        };
    },

    setupEventListeners() {
        // Tab bar navigation
        document.querySelectorAll('.tab-item').forEach(tab => {
            tab.addEventListener('click', () => {
                const view = tab.dataset.view;
                this.switchView(view);
            });
        });

        // Mini player tap
        this.elements.miniPlayer?.addEventListener('click', (e) => {
            if (!e.target.closest('.mini-btn')) {
                this.showNowPlaying();
            }
        });

        // Mini player controls
        document.getElementById('miniPlayBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            Player.togglePlay();
        });

        document.getElementById('miniNextBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            Player.next();
        });

        // Now playing controls
        document.getElementById('collapsePlayer')?.addEventListener('click', () => this.hideNowPlaying());
        document.getElementById('playPauseBtn')?.addEventListener('click', () => Player.togglePlay());
        document.getElementById('prevBtn')?.addEventListener('click', () => Player.previous());
        document.getElementById('nextBtn')?.addEventListener('click', () => Player.next());
        document.getElementById('shuffleBtn')?.addEventListener('click', () => Player.toggleShuffle());
        document.getElementById('repeatBtn')?.addEventListener('click', () => Player.toggleRepeat());

        // Like button
        document.getElementById('likeBtn')?.addEventListener('click', () => {
            if (Player.currentTrack) {
                const isLiked = Library.toggleLike(Player.currentTrack);
                this.updateLikeButton(isLiked);
                this.showToast(isLiked ? '보관함에 추가됨' : '보관함에서 제거됨');
            }
        });

        // Progress slider
        const progressSlider = document.getElementById('progressSlider');
        progressSlider?.addEventListener('input', (e) => {
            Player.seekPercent(parseFloat(e.target.value));
        });

        // Lyrics button
        document.getElementById('lyricsBtn')?.addEventListener('click', () => this.showLyrics());
        document.getElementById('closeLyrics')?.addEventListener('click', () => this.hideLyrics());

        // Queue button
        document.getElementById('queueBtn')?.addEventListener('click', () => this.showQueue());
        document.getElementById('closeQueue')?.addEventListener('click', () => this.hideQueue());

        // Bottom sheet
        this.elements.bottomSheetOverlay?.addEventListener('click', () => this.hideBottomSheet());

        // Back buttons
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const backTo = btn.dataset.back || 'home';
                this.switchView(backTo);
            });
        });

        // Create playlist buttons
        document.getElementById('addPlaylistBtn')?.addEventListener('click', () => this.showCreatePlaylistSheet());
        document.getElementById('createFirstPlaylist')?.addEventListener('click', () => this.showCreatePlaylistSheet());
    },

    switchView(viewName) {
        if (!this.views.includes(viewName) && !['playlistDetail', 'albumDetail', 'artistDetail'].includes(viewName)) {
            return;
        }

        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        const targetView = document.getElementById(viewName + 'View');
        if (targetView) {
            targetView.classList.add('active');
        }

        document.querySelectorAll('.tab-item').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.view === viewName);
        });

        // Update header title
        const titles = {
            home: '지금 듣기',
            browse: '둘러보기',
            radio: '라디오',
            library: '보관함',
            search: '검색'
        };

        const header = document.querySelector('.header-title');
        if (header && titles[viewName]) {
            header.textContent = titles[viewName];
        }

        this.currentView = viewName;

        // Focus search input on search view
        if (viewName === 'search') {
            setTimeout(() => this.elements.searchInput?.focus(), 100);
        }
    },

    showMiniPlayer() {
        this.elements.miniPlayer?.classList.remove('hidden');
        document.querySelector('.main-content')?.style.setProperty('--mini-player-offset', 'var(--mini-player-height)');
    },

    hideMiniPlayer() {
        this.elements.miniPlayer?.classList.add('hidden');
    },

    showNowPlaying() {
        this.elements.nowPlaying?.classList.remove('hidden');
        this.elements.nowPlaying?.classList.add('show');
        document.body.style.overflow = 'hidden';
    },

    hideNowPlaying() {
        this.elements.nowPlaying?.classList.remove('show');
        setTimeout(() => {
            this.elements.nowPlaying?.classList.add('hidden');
        }, 350);
        document.body.style.overflow = '';
    },

    showBottomSheet(content) {
        this.elements.bottomSheetContent.innerHTML = content;
        this.elements.bottomSheet?.classList.remove('hidden');
        this.elements.bottomSheetOverlay?.classList.remove('hidden');
        setTimeout(() => {
            this.elements.bottomSheet?.classList.add('show');
            this.elements.bottomSheetOverlay?.classList.add('show');
        }, 10);
    },

    hideBottomSheet() {
        this.elements.bottomSheet?.classList.remove('show');
        this.elements.bottomSheetOverlay?.classList.remove('show');
        setTimeout(() => {
            this.elements.bottomSheet?.classList.add('hidden');
            this.elements.bottomSheetOverlay?.classList.add('hidden');
        }, 300);
    },

    showCreatePlaylistSheet() {
        const content = `
            <div class="bottom-sheet-header">
                <button class="bottom-sheet-close" onclick="UI.hideBottomSheet()">취소</button>
                <h3 class="bottom-sheet-title">새로운 플레이리스트</h3>
                <button class="bottom-sheet-close" onclick="UI.createPlaylist()" style="color: var(--apple-red)">생성</button>
            </div>
            <div class="create-playlist-form">
                <div class="playlist-cover-picker">
                    <svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                    <span>커버 사진 선택</span>
                </div>
                <div class="form-group">
                    <label>플레이리스트 이름</label>
                    <input type="text" class="form-input" id="playlistNameInput" placeholder="나만의 플레이리스트">
                </div>
                <div class="form-group">
                    <label>설명 (선택)</label>
                    <textarea class="form-textarea" id="playlistDescInput" placeholder="플레이리스트에 대한 설명"></textarea>
                </div>
            </div>
        `;
        this.showBottomSheet(content);
        setTimeout(() => document.getElementById('playlistNameInput')?.focus(), 300);
    },

    createPlaylist() {
        const name = document.getElementById('playlistNameInput')?.value.trim() || '나만의 플레이리스트';
        const desc = document.getElementById('playlistDescInput')?.value.trim() || '';

        Library.createPlaylist(name, desc);
        this.hideBottomSheet();
        this.showToast('플레이리스트가 생성되었습니다');
        this.renderPlaylistsGrid();
    },

    showAddToPlaylistSheet(track) {
        const playlists = Library.getPlaylists();
        const playlistItems = playlists.map(p => `
            <button class="add-playlist-item" onclick="UI.addTrackToPlaylist('${p.id}')">
                <div class="add-playlist-artwork">
                    <img src="${p.artwork || CONFIG.DEFAULT_ARTWORK}" alt="">
                </div>
                <div class="add-playlist-info">
                    <p class="add-playlist-name">${p.name}</p>
                    <p class="add-playlist-count">${p.tracks.length}곡</p>
                </div>
            </button>
        `).join('');

        const content = `
            <div class="bottom-sheet-header">
                <button class="bottom-sheet-close" onclick="UI.hideBottomSheet()">취소</button>
                <h3 class="bottom-sheet-title">플레이리스트에 추가</h3>
            </div>
            <div class="add-to-playlist-list">
                <button class="new-playlist-item" onclick="UI.showCreatePlaylistSheet()">
                    <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                    <span>새 플레이리스트</span>
                </button>
                ${playlistItems}
            </div>
        `;

        this.pendingTrack = track;
        this.showBottomSheet(content);
    },

    addTrackToPlaylist(playlistId) {
        if (this.pendingTrack) {
            const success = Library.addToPlaylist(playlistId, this.pendingTrack);
            this.showToast(success ? '플레이리스트에 추가됨' : '이미 존재하는 곡입니다');
            this.pendingTrack = null;
        }
        this.hideBottomSheet();
    },

    showLyrics() {
        this.elements.lyricsOverlay?.classList.remove('hidden');
        setTimeout(() => this.elements.lyricsOverlay?.classList.add('show'), 10);
    },

    hideLyrics() {
        this.elements.lyricsOverlay?.classList.remove('show');
        setTimeout(() => this.elements.lyricsOverlay?.classList.add('hidden'), 350);
    },

    showQueue() {
        this.elements.queueOverlay?.classList.remove('hidden');
        setTimeout(() => this.elements.queueOverlay?.classList.add('show'), 10);
    },

    hideQueue() {
        this.elements.queueOverlay?.classList.remove('show');
        setTimeout(() => this.elements.queueOverlay?.classList.add('hidden'), 350);
    },

    showToast(message, duration = 2000) {
        const toast = this.elements.toast;
        if (!toast) return;

        document.getElementById('toastMessage').textContent = message;
        toast.classList.remove('hidden');
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.classList.add('hidden'), 300);
        }, duration);
    },

    showLoading() {
        this.elements.loadingOverlay?.classList.remove('hidden');
    },

    hideLoading() {
        this.elements.loadingOverlay?.classList.add('hidden');
    },

    updateProgress(current, duration, percent) {
        document.getElementById('miniProgressBar')?.style.setProperty('width', `${percent}%`);
        document.getElementById('progressSlider')?.setAttribute('value', percent);
        document.getElementById('currentTime').textContent = formatTime(current);
    },

    updateDuration(duration) {
        document.getElementById('totalTime').textContent = formatTime(duration);
    },

    updateLikeButton(isLiked) {
        const btn = document.getElementById('likeBtn');
        if (btn) {
            btn.classList.toggle('active', isLiked);
        }
    },

    updatePlayerUI(track, isPlaying, isShuffle, repeatMode) {
        if (!track) return;

        // Mini player
        document.getElementById('miniTitle').textContent = track.title;
        document.getElementById('miniArtist').textContent = track.artist;
        const miniArtwork = document.getElementById('miniArtwork');
        miniArtwork.innerHTML = `<img src="${track.artwork || CONFIG.DEFAULT_ARTWORK}" alt="">`;

        // Now playing
        document.getElementById('nowPlayingTitle').textContent = track.title;
        document.getElementById('nowPlayingArtist').textContent = track.artist;
        const npArtwork = document.getElementById('nowPlayingArtwork');
        npArtwork.innerHTML = `<img src="${track.artworkLarge || track.artwork || CONFIG.DEFAULT_ARTWORK}" alt="">`;

        // Play buttons
        const updatePlayBtn = (btn) => {
            if (!btn) return;
            btn.querySelector('.play-icon')?.classList.toggle('hidden', isPlaying);
            btn.querySelector('.pause-icon')?.classList.toggle('hidden', !isPlaying);
        };
        updatePlayBtn(document.getElementById('miniPlayBtn'));
        updatePlayBtn(document.getElementById('playPauseBtn'));

        // Now playing state
        this.elements.nowPlaying?.classList.toggle('playing', isPlaying);

        // Shuffle
        document.getElementById('shuffleBtn')?.classList.toggle('active', isShuffle);

        // Repeat
        const repeatBtn = document.getElementById('repeatBtn');
        if (repeatBtn) {
            repeatBtn.classList.toggle('active', repeatMode !== 'none');
            if (repeatMode === 'one') {
                repeatBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/></svg>';
            } else {
                repeatBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>';
            }
        }

        // Like button
        this.updateLikeButton(Library.isLiked(track.id));
    },

    updateQueueUI(queue, currentIndex) {
        const nowPlayingEl = document.getElementById('queueNowPlaying');
        const listEl = document.getElementById('queueList');

        if (currentIndex >= 0 && queue[currentIndex]) {
            const current = queue[currentIndex];
            nowPlayingEl.innerHTML = this.renderTrackItem(current, true);
        }

        const upNext = queue.slice(currentIndex + 1);
        listEl.innerHTML = upNext.length > 0
            ? upNext.map(t => this.renderTrackItem(t)).join('')
            : '<p style="color: var(--text-secondary); text-align: center; padding: var(--space-xl);">대기열이 비어있습니다</p>';
    },

    updateLyricsDisplay(lyricsData) {
        if (!lyricsData) {
            this.elements.lyricsContent.innerHTML = '<p class="lyrics-placeholder">가사를 찾을 수 없습니다</p>';
            return;
        }

        const lines = lyricsData.lines.map((line, i) =>
            `<p class="lyrics-line" data-index="${i}">${line.text}</p>`
        ).join('');

        this.elements.lyricsContent.innerHTML = lines;
    },

    highlightLyricLine(index) {
        document.querySelectorAll('.lyrics-line').forEach((el, i) => {
            el.classList.remove('active', 'past');
            if (i === index) {
                el.classList.add('active');
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (i < index) {
                el.classList.add('past');
            }
        });
    },

    renderTrackItem(track, playing = false) {
        return `
            <div class="track-item ${playing ? 'playing' : ''}" data-id="${track.id}" onclick="App.playTrack(${JSON.stringify(track).replace(/"/g, '&quot;')})">
                <div class="track-artwork">
                    <img src="${track.artwork || CONFIG.DEFAULT_ARTWORK}" alt="">
                </div>
                <div class="track-info">
                    <p class="track-title">${track.title}</p>
                    <p class="track-artist">${track.artist}</p>
                </div>
                ${track.duration ? `<span class="track-duration">${formatTime(track.duration)}</span>` : ''}
                <button class="track-more" onclick="event.stopPropagation(); UI.showTrackMenu(${JSON.stringify(track).replace(/"/g, '&quot;')})">
                    <svg viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                </button>
            </div>
        `;
    },

    renderMusicCard(item, onclick = '') {
        return `
            <div class="music-card" ${onclick}>
                <div class="card-artwork">
                    <img src="${item.artwork || item.picture || CONFIG.DEFAULT_ARTWORK}" alt="">
                    <div class="play-overlay">
                        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                </div>
                <div class="card-info">
                    <p class="card-title">${item.title || item.name}</p>
                    <p class="card-subtitle">${item.artist || item.subtitle || ''}</p>
                </div>
            </div>
        `;
    },

    showTrackMenu(track) {
        const content = `
            <div class="context-menu-header">
                <div class="artwork"><img src="${track.artwork || CONFIG.DEFAULT_ARTWORK}" alt=""></div>
                <div class="info">
                    <p class="title">${track.title}</p>
                    <p class="subtitle">${track.artist}</p>
                </div>
            </div>
            <div class="context-menu-options">
                <button class="context-option" onclick="Player.playNext(${JSON.stringify(track).replace(/"/g, '&quot;')}); UI.hideBottomSheet()">
                    <svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                    <span>다음에 재생</span>
                </button>
                <button class="context-option" onclick="Player.addToQueue(${JSON.stringify(track).replace(/"/g, '&quot;')}); UI.hideBottomSheet()">
                    <svg viewBox="0 0 24 24"><path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/></svg>
                    <span>대기열에 추가</span>
                </button>
                <button class="context-option" onclick="UI.showAddToPlaylistSheet(${JSON.stringify(track).replace(/"/g, '&quot;')})">
                    <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                    <span>플레이리스트에 추가</span>
                </button>
                <button class="context-option" onclick="Library.toggleLike(${JSON.stringify(track).replace(/"/g, '&quot;')}); UI.hideBottomSheet(); UI.showToast('보관함에 추가됨')">
                    <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    <span>좋아요</span>
                </button>
            </div>
        `;
        this.showBottomSheet(content);
    },

    renderPlaylistsGrid() {
        const container = document.getElementById('userPlaylists');
        const playlists = Library.getPlaylists();

        if (playlists.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>아직 플레이리스트가 없습니다</p>
                    <button class="btn-primary" onclick="UI.showCreatePlaylistSheet()">플레이리스트 만들기</button>
                </div>
            `;
            return;
        }

        container.innerHTML = playlists.map(p => `
            <div class="playlist-card" onclick="App.openPlaylist('${p.id}')">
                <div class="playlist-cover">
                    <img src="${p.artwork || CONFIG.DEFAULT_ARTWORK}" alt="">
                </div>
                <div class="card-info">
                    <p class="card-title">${p.name}</p>
                    <p class="card-subtitle">${p.tracks.length}곡</p>
                </div>
            </div>
        `).join('');
    }
};
