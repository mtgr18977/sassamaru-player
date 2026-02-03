// Lista de Podcasts com persistência
const DEFAULT_FEEDS = [
    { name: "NerdCast", url: "https://jovemnerd.com.br/feed-nerdcast/" },
    { name: "Hipsters Ponto Tech", url: "https://hipsters.tech/feed/podcast/" },
    { name: "RapaduraCast", url: "https://cinemacomrapadura.com.br/rapaduracast.xml" },
    { name: "Xadrez Verbal", url: "https://xadrezverbal.com/feed/" },
    { name: "Reloading", url: "https://reloading.com.br/feed/podcast/" }
];

let PODCAST_FEEDS = JSON.parse(localStorage.getItem('sassamaru_podcasts')) || DEFAULT_FEEDS;

function savePodcasts() {
    localStorage.setItem('sassamaru_podcasts', JSON.stringify(PODCAST_FEEDS));
}

function renderPodcasts(container) {
    container.innerHTML = `
        <div class="card-column">
            <h3>🎙️ CANAIS</h3>
            <div class="search-box">
                <input type="text" id="rss-input" placeholder="Cole link RSS ou busque nome...">
            </div>
            <div style="display:flex; gap:10px; margin-bottom:20px;">
                <button id="btn-add-rss" onclick="loadCustomRSS()" style="flex:1; padding:12px; background:var(--accent); color:white; border:none; border-radius:15px; cursor:pointer; font-weight:bold;">+ RSS</button>
                <button id="btn-search-podcast" onclick="searchPodcasts()" style="flex:1; padding:12px; background:var(--accent-green); color:white; border:none; border-radius:15px; cursor:pointer; font-weight:bold;">🔍 BUSCAR</button>
            </div>
            <div id="podcast-list" class="track-list-area"></div>
        </div>

        <div class="card-column">
            <h3>🎧 EPISÓDIOS</h3>
            <div id="episode-list" class="track-list-area">
                <div style="text-align:center; color:#888; margin-top:50px;">
                    <p style="font-size:2rem;">👈</p>
                    <p>Selecione um canal.</p>
                </div>
            </div>
        </div>
    `;

    renderPodcastList();
}

function renderPodcastList() {
    const list = document.getElementById('podcast-list');
    if (!list) return;

    let html = "";
    PODCAST_FEEDS.forEach((feed, index) => {
        html += `
            <div class="track-item" style="cursor:pointer;" onclick="fetchRSS('${feed.url}')">
                <div style="flex:1; display:flex; align-items:center; gap:10px; overflow:hidden;">
                    <span style="font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${feed.name}</span>
                    <span>📡</span>
                </div>
                <button class="btn-delete" onclick="deletePodcast(${index}); event.stopPropagation();" title="Excluir">🗑️</button>
            </div>`;
    });
    list.innerHTML = html;
}

async function loadCustomRSS() {
    const url = document.getElementById('rss-input').value.trim();
    if(!url) return;

    const btn = document.getElementById('btn-add-rss');
    const originalText = btn.innerText;
    btn.innerText = "⏳ BUSCANDO...";
    btn.disabled = true;

    try {
        const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;
        const res = await fetch(apiUrl);
        const data = await res.json();

        if (data.status !== 'ok') {
            throw new Error("Não foi possível validar este feed.");
        }

        const name = data.feed.title || "Podcast Sem Nome";

        // Evita duplicatas
        if (!PODCAST_FEEDS.some(f => f.url === url)) {
            PODCAST_FEEDS.push({ name, url });
            savePodcasts();
            renderPodcastList();
        }

        fetchRSS(url); // Carrega os episódios
        document.getElementById('rss-input').value = "";

    } catch (e) {
        alert(e.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

function deletePodcast(index) {
    if (confirm(`Deseja remover "${PODCAST_FEEDS[index].name}" da sua lista?`)) {
        PODCAST_FEEDS.splice(index, 1);
        savePodcasts();
        renderPodcastList();
    }
}

async function searchPodcasts() {
    const term = document.getElementById('rss-input').value.trim();
    if (!term) return;

    const listArea = document.getElementById('podcast-list');
    const btn = document.getElementById('btn-search-podcast');
    const originalText = btn.innerText;

    btn.innerText = "⏳...";
    btn.disabled = true;
    listArea.innerHTML = `<p style="text-align:center; padding:20px;">🔍 Buscando no Apple Podcasts...</p>`;

    try {
        const res = await fetch(`/.netlify/functions/itunes?term=${encodeURIComponent(term)}`);
        const data = await res.json();

        if (!data.results || data.results.length === 0) {
            listArea.innerHTML = `
                <p style="text-align:center; padding:20px;">Nenhum podcast encontrado.</p>
                <button onclick="renderPodcastList()" style="width:100%; padding:10px; border:none; background:#eee; border-radius:10px; cursor:pointer;">Voltar</button>
            `;
            return;
        }

        renderSearchResults(data.results);

    } catch (e) {
        console.error(e);
        listArea.innerHTML = `<p style="text-align:center; color:red;">Erro na busca.</p>`;
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

function renderSearchResults(results) {
    const listArea = document.getElementById('podcast-list');
    let html = `<div style="margin-bottom:15px;"><button onclick="renderPodcastList()" style="width:100%; padding:10px; border:none; background:#eee; border-radius:10px; cursor:pointer; font-weight:bold;">⬅ VOLTAR À LISTA</button></div>`;

    results.forEach(pod => {
        const name = pod.collectionName;
        const url = pod.feedUrl;
        const artwork = pod.artworkUrl60;

        if (!url) return;

        const sName = escapeStr(name);
        const sUrl = escapeStr(url);

        html += `
            <div class="track-item">
                <div style="flex:1; display:flex; align-items:center; gap:10px; overflow:hidden;">
                    <img src="${escapeStr(artwork)}" style="width:30px; height:30px; border-radius:5px;">
                    <span style="font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${sName}">${sName}</span>
                </div>
                <button class="btn-circle btn-add" onclick="addPodcastFromSearch('${sName}', '${sUrl}')">+</button>
            </div>`;
    });

    listArea.innerHTML = html;
}

function addPodcastFromSearch(name, url) {
    if (!PODCAST_FEEDS.some(f => f.url === url)) {
        PODCAST_FEEDS.push({ name, url });
        savePodcasts();
        alert(`"${name}" adicionado aos seus canais!`);
    } else {
        alert("Este canal já está na sua lista.");
    }
    renderPodcastList();
    document.getElementById('rss-input').value = "";
}

// Limpeza de Strings para não quebrar o HTML e prevenir XSS
function escapeStr(str) {
    if (!str) return "";
    return str
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .trim();
}

async function fetchRSS(url) {
    const episodeList = document.getElementById('episode-list');
    if (!episodeList) return;

    episodeList.innerHTML = `<p style="text-align:center; padding:20px;">🔄 Carregando episódios...</p>`;

    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;

    try {
        const res = await fetch(apiUrl);
        const data = await res.json();

        if (data.status !== 'ok') {
            throw new Error("Erro na conversão do feed.");
        }

        let rowsHTML = "";

        data.items.forEach((item) => {
            const audioUrl = item.enclosure ? item.enclosure.link : null;
            const title = item.title;

            if (audioUrl) {
                const safeTitle = escapeStr(title);
                const safeUrl = escapeStr(audioUrl);

                rowsHTML += `
                    <div class="track-item">
                        <div style="flex:1; padding-right:10px; overflow:hidden;">
                            <div style="font-weight:600; font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${safeTitle}">
                                ${safeTitle}
                            </div>
                            <div style="font-size:0.7rem; color:#888;">${item.pubDate ? item.pubDate.split(' ')[0] : ''}</div>
                        </div>
                        <div style="display:flex;">
                            <button class="btn-circle btn-play" onclick="playManual('${safeUrl}', '${safeTitle}', false)">▶</button>
                            <button class="btn-circle btn-add" onclick="addToPlaylist('${safeUrl}', '${safeTitle}', false)">+</button>
                        </div>
                    </div>`;
            }
        });

        if (rowsHTML === "") {
            episodeList.innerHTML = `<p style="text-align:center;">Nenhum áudio encontrado.</p>`;
        } else {
            episodeList.innerHTML = rowsHTML;
        }

    } catch (e) {
        console.error(e);
        episodeList.innerHTML = `
            <div style="text-align:center; color:#e74c3c; padding:20px;">
                <p>❌ Falha ao carregar</p>
                <p style="font-size:0.8rem; color:#666;">Tente outro feed ou verifique a conexão.</p>
            </div>`;
    }
}