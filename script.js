// As chaves API agora são gerenciadas via Netlify Functions para maior segurança.

let currentAudio = new Audio();
let ytPlayer = null;
let isYtReady = false;
let pendingVideoId = null;
let allLoadedTracks = [];
let playQueue = [];
let currentQueueIndex = 0;
let isYouTubeMode = false;
let isDragging = false;
const storageKeys = {
    jamendo: 'jamendoClientId',
    youtube: 'youtubeApiKey'
};

const escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]
));

function getStoredValue(key) {
    return localStorage.getItem(key) || '';
}

// 1. YouTube Setup
function onYouTubeIframeAPIReady() {
    ytPlayer = new YT.Player('yt-player-container', {
        height: '200', width: '200',
        playerVars: { 'autoplay': 0, 'controls': 0, 'origin': window.location.origin },
        events: {
            'onReady': (e) => {
                isYtReady = true;
                console.log("🐶 Sassamaru YT Pronto!");
                if (pendingVideoId) {
                    playTrack(pendingVideoId.id, pendingVideoId.title, true);
                    pendingVideoId = null;
                }
            },
            'onStateChange': (e) => { if(e.data === YT.PlayerState.ENDED) nextTrack(); }
        }
    });
}

window.onload = () => showSection('home');

function showSection(section) {
    const main = document.getElementById('main-content');
    if (!main) return;
    main.innerHTML = "";

    if (section === 'home') renderHome(main);
    else if (section === 'listas') renderPlaylistSection(main);
    else if (section === 'aleatorio') createRandomMix(main);
    else if (section === 'podcasts' && typeof renderPodcasts === 'function') renderPodcasts(main);
    else if (section === 'config') renderSettings(main);
}

function renderSettings(container) {
    const jamValue = escapeHtml(getStoredValue(storageKeys.jamendo));
    const ytValue = escapeHtml(getStoredValue(storageKeys.youtube));

    container.innerHTML = `
        <div class="card-column" style="flex:1">
            <h3>⚙️ CONFIGURAÇÕES</h3>
            <p class="settings-hint">Use estas chaves locais quando estiver rodando o app sem as funções do Netlify (ex.: APK ou ambiente offline).</p>
            <div class="settings-form">
                <label for="jamendo-client-id">Jamendo Client ID</label>
                <input id="jamendo-client-id" type="text" placeholder="Cole sua Client ID do Jamendo" value="${jamValue}">
                <label for="youtube-api-key">YouTube API Key</label>
                <input id="youtube-api-key" type="text" placeholder="Cole sua chave da YouTube Data API v3" value="${ytValue}">
                <div class="settings-actions">
                    <button class="btn-primary" type="button" onclick="saveApiSettings()">Salvar chaves</button>
                    <button class="btn-secondary" type="button" onclick="clearApiSettings()">Limpar chaves</button>
                </div>
                <div class="settings-message" id="settings-message"></div>
            </div>
        </div>`;
}

function saveApiSettings() {
    const jamValue = document.getElementById('jamendo-client-id').value.trim();
    const ytValue = document.getElementById('youtube-api-key').value.trim();
    localStorage.setItem(storageKeys.jamendo, jamValue);
    localStorage.setItem(storageKeys.youtube, ytValue);
    showSettingsMessage('✅ Chaves salvas localmente. Você já pode usar as buscas.');
}

function clearApiSettings() {
    localStorage.removeItem(storageKeys.jamendo);
    localStorage.removeItem(storageKeys.youtube);
    document.getElementById('jamendo-client-id').value = '';
    document.getElementById('youtube-api-key').value = '';
    showSettingsMessage('🧹 Chaves removidas do dispositivo.');
}

function showSettingsMessage(message) {
    const messageBox = document.getElementById('settings-message');
    if (messageBox) messageBox.textContent = message;
}

// 2. Play (Blindado)
function playTrack(source, title, isYT) {
    isYouTubeMode = isYT;

    // Reseta Player de Áudio
    currentAudio.pause();

    if (isYouTubeMode) {
        if (isYtReady && ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
            ytPlayer.loadVideoById(source);
            ytPlayer.playVideo();
        } else {
            console.warn("Aguardando YouTube...");
            pendingVideoId = { id: source, title: title };
            document.getElementById('current-track-title').innerText = "Carregando...";
            return;
        }
    } else {
        // Pausa YouTube se estiver tocando
        if (isYtReady && ytPlayer && typeof ytPlayer.stopVideo === 'function') ytPlayer.stopVideo();

        currentAudio.src = source;
        currentAudio.play().catch(e => console.error("Erro MP3:", e));
    }

    document.getElementById('current-track-title').innerText = title;
    document.getElementById('master-play').innerText = "⏸";
}

function playManual(s, t, y) { playQueue = []; playTrack(s, t, y); }

function togglePlay() {
    if (isYouTubeMode && isYtReady) {
        const state = ytPlayer.getPlayerState();
        state === 1 ? ytPlayer.pauseVideo() : ytPlayer.playVideo();
        document.getElementById('master-play').innerText = (state === 1 ? "▶" : "⏸");
    } else {
        if (!currentAudio.src) return;
        currentAudio.paused ? currentAudio.play() : currentAudio.pause();
        document.getElementById('master-play').innerText = (currentAudio.paused ? "▶" : "⏸");
    }
}

async function fetchJsonWithError(url) {
    const response = await fetch(url);
    let data = null;

    try {
        data = await response.json();
    } catch (error) {
        data = null;
    }

    if (!response.ok) {
        const message = data && data.error ? data.error : `Erro HTTP ${response.status}`;
        throw new Error(message);
    }

    if (data && data.error) {
        throw new Error(data.error);
    }

    return data;
}

async function fetchJamendoTracks({ search, limit }) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (limit) params.set('limit', limit);
    const query = params.toString();
    const netlifyUrl = query ? `/.netlify/functions/jamendo?${query}` : '/.netlify/functions/jamendo';

    try {
        return await fetchJsonWithError(netlifyUrl);
    } catch (error) {
        const clientId = getStoredValue(storageKeys.jamendo);
        if (!clientId) {
            throw new Error('Configure sua Jamendo Client ID em Configurações.');
        }
        const directParams = new URLSearchParams({ client_id: clientId, format: 'json' });
        if (search) directParams.set('search', search);
        if (limit) directParams.set('limit', limit);
        return await fetchJsonWithError(`https://api.jamendo.com/v3.0/tracks/?${directParams.toString()}`);
    }
}

async function fetchYouTubeVideos(query) {
    const netlifyUrl = `/.netlify/functions/youtube?q=${encodeURIComponent(query)}`;

    try {
        return await fetchJsonWithError(netlifyUrl);
    } catch (error) {
        const apiKey = getStoredValue(storageKeys.youtube);
        if (!apiKey) {
            throw new Error('Configure sua YouTube API Key em Configurações.');
        }
        const directUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=${apiKey}&maxResults=12`;
        return await fetchJsonWithError(directUrl);
    }
}

// 3. Search
async function handleSearch(e) {
    if (e.key === "Enter") {
        const query = e.target.value;
        const main = document.getElementById('main-content');

        main.innerHTML = `
            <div class="card-column"><h3>🎵 JAMENDO</h3><div id="j-res" class="track-list-area"></div></div>
            <div class="card-column"><h3>📺 YOUTUBE</h3><div id="y-res" class="track-list-area"></div></div>`;

        try {
            const data = await fetchJamendoTracks({ search: query, limit: 12 });
            if (data.results) data.results.forEach(t => {
                document.getElementById('j-res').innerHTML += createRow(t.name, t.audio, false);
                addToLoadedTracks({name: t.name, source: t.audio, isYT: false});
            });
        } catch (err) {
            console.error("Jamendo Proxy Error:", err);
            document.getElementById('j-res').innerHTML = `<p style='color:#e74c3c; padding:10px;'>Jamendo: ${err.message}</p>`;
        }

        try {
            const data = await fetchYouTubeVideos(query);
            if (data.items) data.items.forEach(item => {
                const vidId = item.id.videoId;
                if(vidId) {
                    document.getElementById('y-res').innerHTML += createRow(item.snippet.title, vidId, true);
                    addToLoadedTracks({name: item.snippet.title, source: vidId, isYT: true});
                }
            });
        } catch (err) {
            console.error("YouTube Proxy Error:", err);
            document.getElementById('y-res').innerHTML = `<p style='color:#e74c3c; padding:10px;'>YouTube: ${err.message}</p>`;
        }
    }
}

function createRow(title, source, isYT) {
    const sTitle = typeof escapeStr === 'function' ? escapeStr(title) : title.replace(/'/g, "");
    const sSource = typeof escapeStr === 'function' ? escapeStr(source) : source;
    const icon = isYT ? '📺' : '▶';

    return `
        <div class="track-item">
            <span style="font-weight:600; font-size:0.9rem; color:#333;">${title.substring(0,35)}</span>
            <div style="display:flex;">
                <button class="btn-circle btn-play" onclick="playManual('${sSource}', '${sTitle}', ${isYT})">${icon}</button>
                <button class="btn-circle btn-add" onclick="addToPlaylist('${sSource}', '${sTitle}', ${isYT})">+</button>
            </div>
        </div>`;
}

// 4. Mix
function createRandomMix(container) {
    if (allLoadedTracks.length < 3) return alert("Use a busca primeiro!");
    playQueue = [...allLoadedTracks].sort(() => 0.5 - Math.random()).slice(0, 20);
    currentQueueIndex = 0;
    container.innerHTML = `<div class="card-column" style="flex:1"><h3>🎲 MIX ALEATÓRIO</h3><div id="mix-box" class="track-list-area"></div></div>`;
    playQueue.forEach((t, i) => {
        document.getElementById('mix-box').innerHTML += `
            <div class="track-item">
                <span>${i+1}. ${t.name}</span>
                <button class="btn-circle btn-play" onclick="playFromQueue(${i})">▶</button>
            </div>`;
    });
    playFromQueue(0);
}

function playFromQueue(idx) {
    currentQueueIndex = idx;
    const t = playQueue[idx];
    playTrack(t.source, t.name, t.isYT);
}

function nextTrack() { if(currentQueueIndex < playQueue.length - 1) playFromQueue(currentQueueIndex + 1); }
function prevTrack() { if(currentQueueIndex > 0) playFromQueue(currentQueueIndex - 1); }

// 5. Home e Playlists
async function renderHome(c) {
    c.innerHTML = `<div class="card-column"><h3>POPULARES</h3><div id="h1" class="track-list-area"></div></div><div class="card-column"><h3>DESCOBRIR</h3><div id="h2" class="track-list-area"></div></div>`;

    try {
        const data = await fetchJamendoTracks({ limit: 20 });
        if (data.results) data.results.forEach((t, i) => {
            const target = i < 10 ? 'h1' : 'h2';
            document.getElementById(target).innerHTML += createRow(t.name, t.audio, false);
            addToLoadedTracks({name: t.name, source: t.audio, isYT: false});
        });
    } catch (err) {
        console.error("Jamendo Home Proxy Error:", err);
        document.getElementById('h1').innerHTML = `<p style='color:#e74c3c; padding:10px;'>Erro: ${err.message}</p>`;
    }
}

function addToLoadedTracks(track) {
    if (!allLoadedTracks.some(t => t.source === track.source)) {
        allLoadedTracks.push(track);
    }
}

function addToPlaylist(src, title, isYT) {
    let p = JSON.parse(localStorage.getItem('myPlaylist') || '[]');
    p.push({source: src, title: title, isYT: isYT});
    localStorage.setItem('myPlaylist', JSON.stringify(p));
}

function renderPlaylistSection(c) {
    const p = JSON.parse(localStorage.getItem('myPlaylist') || '[]');
    c.innerHTML = `<div class="card-column" style="width:100%"><h3>MINHAS LISTAS</h3><div id="p-box" class="track-list-area"></div></div>`;
    p.forEach(t => document.getElementById('p-box').innerHTML += createRow(t.title, t.source, t.isYT));
}

// 6. Volume e Progresso
currentAudio.ontimeupdate = () => {
    if (currentAudio.duration) updateProgress(currentAudio.currentTime, currentAudio.duration);
};

currentAudio.onended = () => nextTrack();

setInterval(() => {
    if(isYouTubeMode && isYtReady && ytPlayer && ytPlayer.getCurrentTime) {
        updateProgress(ytPlayer.getCurrentTime(), ytPlayer.getDuration());
    }
}, 1000);

function updateProgress(cur, dur) {
    if(dur > 0) {
        if (!isDragging) {
            document.getElementById('progress-bar').value = (cur / dur) * 100;
        }
        document.getElementById('current-time').innerText = formatTime(cur);
        document.getElementById('total-time').innerText = formatTime(dur);
    }
}

const progressBar = document.getElementById('progress-bar');
progressBar.onmousedown = () => isDragging = true;
progressBar.onmouseup = () => isDragging = false;
progressBar.ontouchstart = () => isDragging = true;
progressBar.ontouchend = () => isDragging = false;

progressBar.onchange = (e) => {
    const dur = isYouTubeMode ? (ytPlayer ? ytPlayer.getDuration() : 0) : currentAudio.duration;
    if (dur) {
        const seekTime = (e.target.value / 100) * dur;
        if (isYouTubeMode && isYtReady && ytPlayer && ytPlayer.seekTo) {
            ytPlayer.seekTo(seekTime, true);
        } else if (!isYouTubeMode) {
            currentAudio.currentTime = seekTime;
        }
    }
    isDragging = false;
};

document.getElementById('volume-control').oninput = (e) => {
    currentAudio.volume = e.target.value;
    if(isYtReady && ytPlayer) ytPlayer.setVolume(e.target.value * 100);
};


const formatTime = (t) => `${Math.floor(t/60)}:${Math.floor(t%60).toString().padStart(2,'0')}`;
