// Audio Player - Apple Music Clone
const Player = {
    audio: null,
    queue: [],
    history: [],
    currentIndex: -1,
    currentTrack: null,
    isPlaying: false,
    isShuffle: false,
    repeatMode: 'none', // none, all, one
    volume: CONFIG.DEFAULT_VOLUME,
    lyrics: null,
    currentLyricIndex: -1,

    // Initialize player
    init() {
        this.audio = document.getElementById('audioPlayer');
        if (!this.audio) {
            this.audio = document.createElement('audio');
            this.audio.id = 'audioPlayer';
            this.audio.preload = 'auto';
            document.body.appendChild(this.audio);
        }

        this.audio.volume = this.volume;
        this.setupEventListeners();
        this.loadState();

        // Enable background playback
        this.setupMediaSession();
    },

    // Setup event listeners
    setupEventListeners() {
        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            this.updateUI();
            UI.showMiniPlayer();
        });

        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            this.updateUI();
        });

        this.audio.addEventListener('ended', () => {
            this.handleTrackEnd();
        });

        this.audio.addEventListener('timeupdate', () => {
            this.updateProgress();
            this.updateLyrics();
        });

        this.audio.addEventListener('loadedmetadata', () => {
            this.updateDuration();
        });

        this.audio.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            UI.showToast('재생 오류가 발생했습니다');
            this.next();
        });

        this.audio.addEventListener('waiting', () => {
            UI.showLoading();
        });

        this.audio.addEventListener('canplay', () => {
            UI.hideLoading();
        });
    },

    // Setup Media Session API for background playback
    setupMediaSession() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => this.play());
            navigator.mediaSession.setActionHandler('pause', () => this.pause());
            navigator.mediaSession.setActionHandler('previoustrack', () => this.previous());
            navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
            navigator.mediaSession.setActionHandler('seekto', (details) => {
                if (details.seekTime) {
                    this.seek(details.seekTime);
                }
            });
        }
    },

    // Update Media Session metadata
    updateMediaSession() {
        if ('mediaSession' in navigator && this.currentTrack) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: this.currentTrack.title,
                artist: this.currentTrack.artist,
                album: this.currentTrack.album || '',
                artwork: [
                    { src: this.currentTrack.artworkLarge || this.currentTrack.artwork, sizes: '512x512', type: 'image/jpeg' }
                ]
            });
        }
    },

    // Play track
    async playTrack(track, addToQueue = false) {
        try {
            UI.showLoading();

            // Search for the track on Piped (YouTube)
            const searchQuery = `${track.title} ${track.artist}`;
            const results = await PipedAPI.search(searchQuery);

            if (results.length === 0) {
                UI.showToast('음악을 찾을 수 없습니다');
                UI.hideLoading();
                return false;
            }

            // Find best match
            const lowerTitle = track.title.toLowerCase();
            const lowerArtist = track.artist.toLowerCase();

            let videoResult = results.find(r =>
                (r.title?.toLowerCase().includes(lowerTitle) ||
                    r.title?.toLowerCase().includes(lowerArtist)) &&
                r.type === 'stream'
            ) || results[0];

            // Get video ID
            const videoId = videoResult.url?.split('?v=')[1] || videoResult.url?.replace('/watch?v=', '');
            if (!videoId) {
                UI.showToast('스트림을 가져올 수 없습니다');
                UI.hideLoading();
                return false;
            }

            // Get audio URL
            const audioData = await PipedAPI.getAudioUrl(videoId);
            if (!audioData || !audioData.url) {
                UI.showToast('오디오 URL을 가져올 수 없습니다');
                UI.hideLoading();
                return false;
            }

            // Prepare track data
            this.currentTrack = {
                ...track,
                videoId,
                streamUrl: audioData.url,
                duration: audioData.duration || track.duration
            };

            // Add to history
            this.addToHistory(this.currentTrack);

            // Update queue
            if (!addToQueue) {
                const queueIndex = this.queue.findIndex(t => t.id === track.id);
                if (queueIndex >= 0) {
                    this.currentIndex = queueIndex;
                } else {
                    this.queue = [this.currentTrack];
                    this.currentIndex = 0;
                }
            }

            // Set source and play
            this.audio.src = audioData.url;
            await this.audio.play();

            // Update UI
            this.updateUI();
            this.updateMediaSession();
            UI.hideLoading();

            // Load lyrics
            this.loadLyrics();

            return true;
        } catch (error) {
            console.error('Play track error:', error);
            UI.showToast('재생 중 오류가 발생했습니다');
            UI.hideLoading();
            return false;
        }
    },

    // Play a queue of tracks
    async playQueue(tracks, startIndex = 0) {
        if (tracks.length === 0) return;

        this.queue = [...tracks];
        this.currentIndex = startIndex;

        if (this.isShuffle) {
            // Shuffle but keep start track at beginning
            const startTrack = this.queue[startIndex];
            const otherTracks = this.queue.filter((_, i) => i !== startIndex);
            this.queue = [startTrack, ...shuffleArray(otherTracks)];
            this.currentIndex = 0;
        }

        await this.playTrack(this.queue[this.currentIndex]);
    },

    // Play
    play() {
        if (this.currentTrack) {
            this.audio.play();
        }
    },

    // Pause
    pause() {
        this.audio.pause();
    },

    // Toggle play/pause
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    },

    // Next track
    async next() {
        if (this.queue.length === 0) return;

        if (this.repeatMode === 'one') {
            this.audio.currentTime = 0;
            this.audio.play();
            return;
        }

        this.currentIndex++;

        if (this.currentIndex >= this.queue.length) {
            if (this.repeatMode === 'all') {
                this.currentIndex = 0;
            } else {
                this.currentIndex = this.queue.length - 1;
                this.pause();
                return;
            }
        }

        await this.playTrack(this.queue[this.currentIndex]);
    },

    // Previous track
    async previous() {
        // If more than 3 seconds in, restart current track
        if (this.audio.currentTime > 3) {
            this.audio.currentTime = 0;
            return;
        }

        if (this.queue.length === 0) return;

        this.currentIndex--;

        if (this.currentIndex < 0) {
            if (this.repeatMode === 'all') {
                this.currentIndex = this.queue.length - 1;
            } else {
                this.currentIndex = 0;
                this.audio.currentTime = 0;
                return;
            }
        }

        await this.playTrack(this.queue[this.currentIndex]);
    },

    // Seek to time
    seek(time) {
        if (!isNaN(time) && this.audio.duration) {
            this.audio.currentTime = Math.max(0, Math.min(time, this.audio.duration));
        }
    },

    // Seek to percentage
    seekPercent(percent) {
        if (this.audio.duration) {
            this.seek(this.audio.duration * (percent / 100));
        }
    },

    // Toggle shuffle
    toggleShuffle() {
        this.isShuffle = !this.isShuffle;
        this.updateUI();
        UI.showToast(this.isShuffle ? '셔플 켜짐' : '셔플 꺼짐');
    },

    // Toggle repeat mode
    toggleRepeat() {
        const modes = ['none', 'all', 'one'];
        const currentIndex = modes.indexOf(this.repeatMode);
        this.repeatMode = modes[(currentIndex + 1) % modes.length];

        this.updateUI();

        const messages = {
            'none': '반복 꺼짐',
            'all': '전체 반복',
            'one': '한 곡 반복'
        };
        UI.showToast(messages[this.repeatMode]);
    },

    // Set volume
    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
        this.audio.volume = this.volume;
    },

    // Handle track end
    handleTrackEnd() {
        this.next();
    },

    // Add track to queue
    addToQueue(track) {
        this.queue.push(track);
        UI.showToast('대기열에 추가됨');
    },

    // Play next
    playNext(track) {
        if (this.currentIndex >= 0) {
            this.queue.splice(this.currentIndex + 1, 0, track);
        } else {
            this.queue.push(track);
        }
        UI.showToast('다음에 재생');
    },

    // Clear queue
    clearQueue() {
        this.queue = [];
        this.currentIndex = -1;
    },

    // Add to history
    addToHistory(track) {
        // Remove if already exists
        const existingIndex = this.history.findIndex(t => t.id === track.id);
        if (existingIndex >= 0) {
            this.history.splice(existingIndex, 1);
        }

        // Add to beginning
        this.history.unshift({
            ...track,
            playedAt: Date.now()
        });

        // Keep only last 50
        this.history = this.history.slice(0, 50);

        // Save
        this.saveState();
    },

    // Load lyrics
    async loadLyrics() {
        if (!this.currentTrack) return;

        this.lyrics = null;
        this.currentLyricIndex = -1;

        const lyricsData = await LrcLibAPI.getSyncedLyrics(
            this.currentTrack.title,
            this.currentTrack.artist,
            this.currentTrack.album || '',
            this.currentTrack.duration || 0
        );

        if (lyricsData) {
            this.lyrics = lyricsData;
            UI.updateLyricsDisplay(this.lyrics);
        } else {
            UI.updateLyricsDisplay(null);
        }
    },

    // Update lyrics position
    updateLyrics() {
        if (!this.lyrics || !this.lyrics.synced) return;

        const currentTime = this.audio.currentTime;
        const lines = this.lyrics.lines;

        let newIndex = -1;
        for (let i = lines.length - 1; i >= 0; i--) {
            if (currentTime >= lines[i].time) {
                newIndex = i;
                break;
            }
        }

        if (newIndex !== this.currentLyricIndex) {
            this.currentLyricIndex = newIndex;
            UI.highlightLyricLine(newIndex);
        }
    },

    // Update progress UI
    updateProgress() {
        const current = this.audio.currentTime;
        const duration = this.audio.duration || 0;
        const percent = duration ? (current / duration) * 100 : 0;

        UI.updateProgress(current, duration, percent);
    },

    // Update duration UI
    updateDuration() {
        UI.updateDuration(this.audio.duration || 0);
    },

    // Update all UI elements
    updateUI() {
        UI.updatePlayerUI(this.currentTrack, this.isPlaying, this.isShuffle, this.repeatMode);
        UI.updateQueueUI(this.queue, this.currentIndex);
    },

    // Save state
    saveState() {
        Storage.set('player_history', this.history);
        Storage.set('player_volume', this.volume);
        Storage.set('player_shuffle', this.isShuffle);
        Storage.set('player_repeat', this.repeatMode);
    },

    // Load state
    loadState() {
        this.history = Storage.get('player_history') || [];
        this.volume = Storage.get('player_volume') ?? CONFIG.DEFAULT_VOLUME;
        this.isShuffle = Storage.get('player_shuffle') || false;
        this.repeatMode = Storage.get('player_repeat') || 'none';

        this.audio.volume = this.volume;
    },

    // Get recently played
    getRecentlyPlayed() {
        return this.history.slice(0, 20);
    }
};
