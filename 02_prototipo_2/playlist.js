let apiData;
let playlistProjects = [];
let currentTag = "moon"; 

const IMG_BASES = [
    'https://ixd-supsi.github.io/n70api/immagini/',
    'https://raw.githubusercontent.com/ixd-supsi/n70api/main/immagini/',
    'https://ixd-supsi.github.io/n70api/imgs/',
    'https://ixd-supsi.github.io/n70api/images/'
];

function preload() {
    apiData = loadJSON('https://ixd-supsi.github.io/n70api/data.json');
}

function setup() {
    noCanvas();

    let params = getURLParams();
    if (params.type) {
        currentTag = params.type.toLowerCase();
    }

    updateTitles();

    let baseProjects = Array.isArray(apiData) ? apiData : Object.values(apiData);
    let filtered = [];

    // Gestione speciale per la playlist dei telescopi (tag: space)
    if (currentTag === "space") {
        filtered = baseProjects.filter(p => {
            let t = String(p.titolo || p.title || "").toLowerCase();
            // Prende solo se il titolo contiene "hubble" o "nebula vision"
            return t.includes("hubble") || t.includes("nebula vision");
        });
    } else {
        // Filtro standard per "moon" ed "earth" basato sui tag
        filtered = baseProjects.filter(p => {
            if (!p.tags) return false;
            return p.tags.some(t => String(t).toLowerCase().includes(currentTag));
        });
    }

    // Moltiplica ciclicamente fino a 9 per tutte e tre le playlist (moon, earth, space)
    if (filtered.length > 0) {
        playlistProjects = [];
        let i = 0;
        while (playlistProjects.length < 9) {
            playlistProjects.push({ ...filtered[i % filtered.length] });
            i++;
        }
    } else {
        playlistProjects = [];
    }

    renderPlaylistGrid();
}

function updateTitles() {
    let titleEl = document.getElementById('playlist-title');
    if (!titleEl) return;

    if (currentTag === "moon") {
        titleEl.textContent = "Moon Playlist";
    } else if (currentTag === "earth") {
        titleEl.textContent = "Earth Playlist";
    } else if (currentTag === "space") {
        titleEl.textContent = "Space Telescopes Playlist";
    } else {
        titleEl.textContent = `${currentTag.toUpperCase()} Playlist`;
    }
}

function renderPlaylistGrid() {
    let container = select('#playlist-grid');
    if (!container) return;
    container.html('');

    if (playlistProjects.length === 0) {
        container.html('<p style="font-size:24px; padding-left:67px; color:var(--text);">No projects found for this playlist.</p>');
        return;
    }

    playlistProjects.forEach(p => {
        let titolo      = p.titolo      || p.title       || "Untitled Project";
        let autore      = p.autore      || p.nome        || p.studente || p.author || "Unknown Author";
        let descrizione = p.descrizione || p.description || "";
        let dataStr     = getDataLabel(p);
        let projectUrl  = p.url  || p.link || null;

        let imgSource = p.immagine || [];
        let imgRaw = "";

        if (Array.isArray(imgSource)) {
            imgRaw = imgSource[1] || imgSource[0] || "";
        } else if (typeof imgSource === 'string') {
            imgRaw = imgSource;
        }

        let imgFile = "";
        if (imgRaw) {
            let cleaned = String(imgRaw).trim().toLowerCase().replace(/\s+/g, '');
            cleaned = cleaned.replace(/\.(jpg|jpeg|png|gif|webp|svg)$/i, '');
            if (!cleaned.endsWith('_2')) {
                cleaned += '_2';
            }
            imgFile = cleaned + '.jpg';
        }

        let btnHtml = projectUrl
            ? `<a class="btn-view-site" href="${projectUrl}" target="_blank" rel="noopener">View web site</a>`
            : '<div></div>';

        let imgHtml = imgFile
            ? `<img class="row-image"
                    src="${IMG_BASES[0]}${imgFile}"
                    data-img-file="${imgFile}"
                    data-img-base-index="0"
                    alt="${titolo}"
                    loading="lazy"
                    onerror="tryNextImgBase(this)">`
            : `<div class="row-image"></div>`;

        let rowWrapper = document.createElement('div');
        rowWrapper.className = 'table-row-wrapper';
        rowWrapper.innerHTML = `
            ${imgHtml}
            <div class="row-content-overlay">
                <div class="row-title">${titolo}</div>
                
                <div class="description-hover-container">
                    <div class="row-description">${descrizione}</div>
                </div>

                <div class="overlay-bottom">
                    <div class="row-meta">
                        <div class="row-meta-author">${autore}</div>
                        <div class="row-meta-date">${dataStr}</div>
                    </div>
                    ${btnHtml}
                </div>
            </div>
        `;

        container.elt.appendChild(rowWrapper);
    });
}

function getDataLabel(p) {
    let d = p.data || p.date;
    if (d && typeof d === 'object') {
        let g = d.giorno || d.day   || "";
        let m = d.mese   || d.month || "";
        let a = d.anno   || d.year  || "";
        return [g, m, a].filter(v => v !== "").join(".");
    }
    return String(d || p.anno || p.year || "----");
}

window.tryNextImgBase = function(imgEl) {
    let idx = parseInt(imgEl.getAttribute('data-img-base-index') || '0');
    let file = imgEl.getAttribute('data-img-file') || '';
    
    idx += 1;

    if (idx < IMG_BASES.length) {
        imgEl.setAttribute('data-img-base-index', idx);
        imgEl.src = IMG_BASES[idx] + file;
    } else {
        imgEl.onerror = null;
        imgEl.style.background = '#eee';
        imgEl.removeAttribute('src');
    }
}