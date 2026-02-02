// Lista de Podcasts
const PODCAST_FEEDS = [
    { name: "Jovem Nerd", url: "https://jovemnerd.com.br/feed-nerdcast/" },
    { name: "Flow", url: "https://flowpodcast.com.br/feed/rss" },
    { name: "G1 - O Assunto", url: "https://g1.globo.com/podcast/o-assunto/feed.xml" },
    { name: "CBN", url: "https://cbn.globoradio.globo.com/rss/cbn.xml" },
    { name: "Café Brasil", url: "https://feed.portalcafebrasil.com.br/tools/podcast.xml" }
];

function renderPodcasts(container) {
    container.innerHTML = `
        <div class="card-column">
            <h3>🎙️ CANAIS</h3>
            <div class="search-box" style="margin-bottom:15px;">
                <input type="text" id="rss-input" placeholder="Cole link RSS..." style="width:100%; padding:12px; border-radius:15px; border:1px solid #ddd;">
            </div>
            <button onclick="loadCustomRSS()" style="width:100%; padding:12px; background:var(--accent); color:white; border:none; border-radius:15px; cursor:pointer; margin-bottom:20px; font-weight:bold;">CARREGAR FEED</button>
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

    const list = document.getElementById('podcast-list');
    let html = "";
    PODCAST_FEEDS.forEach(feed => {
        html += `<div class="track-item" style="cursor:pointer;" onclick="fetchRSS('${feed.url}')">
                    <span style="font-weight:700;">${feed.name}</span><span>📡</span>
                 </div>`;
    });
    list.innerHTML = html;
}

function loadCustomRSS() {
    const url = document.getElementById('rss-input').value;
    if(url) fetchRSS(url);
}

// Limpeza de Strings para não quebrar o HTML
function escapeStr(str) {
    if (!str) return "";
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;').trim();
}

async function fetchRSS(url) {
    const episodeList = document.getElementById('episode-list');
    episodeList.innerHTML = `<p style="text-align:center; padding:20px;">🔄 Convertendo Feed...</p>`;

    // USAMOS A API RSS2JSON (Muito mais estável que proxies brutos)
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;

    try {
        const res = await fetch(apiUrl);
        const data = await res.json();

        if (data.status !== 'ok') {
            throw new Error("Erro na conversão do feed.");
        }

        let rowsHTML = "";
        
        // A API já entrega tudo organizado em 'items'
        data.items.forEach((item, index) => {
            // Pega o áudio do enclosure (padrão)
            const audioUrl = item.enclosure ? item.enclosure.link : null;
            const title = item.title;

            if (audioUrl) {
                const safeTitle = escapeStr(title);
                const safeUrl = escapeStr(audioUrl);
                
                rowsHTML += `
                    <div class="track-item">
                        <div style="flex:1; padding-right:10px; overflow:hidden;">
                            <div style="font-weight:600; font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                ${title}
                            </div>
                            <div style="font-size:0.7rem; color:#888;">${item.pubDate.split(' ')[0]}</div>
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