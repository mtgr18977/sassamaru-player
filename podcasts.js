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
                <input type="text" id="rss-input" placeholder="Cole link RSS...">
            </div>
            <button id="btn-add-rss" onclick="loadCustomRSS()" style="width:100%; padding:12px; background:var(--accent); color:white; border:none; border-radius:15px; cursor:pointer; margin-bottom:20px; font-weight:bold;">ADICIONAR CANAL</button>
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

// Limpeza de Strings para não quebrar o HTML
function escapeStr(str) {
    if (!str) return "";
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;').trim();
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
                            <div style="font-weight:600; font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${title}">
                                ${title}
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