let allProjects = [];
let filteredProjects = [];
let activeTags = new Set();
let activeSort = null;
let currentTagQuery = ""; 
let apiData;

// Variabili per la gestione della paginazione
let currentPage = 1;
const itemsPerPage = 30;
const targetTotalItems = 114; 

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
    
    // Controlla se siamo sulla Home page
    let isHome = window.location.pathname.includes('home.html') || window.location.pathname.endsWith('/');
    
    if (isHome) {
        // Nasconde i contenitori dell'archivio globale
        let grid = select('#archive-grid');
        if (grid) grid.style('display', 'none');
        let pagination = select('#pagination-controls');
        if (pagination) pagination.style('display', 'none');
        
        // Genera la mini-griglia da 3 progetti per la Home
        renderHomePlaylists();
        return; 
    }
    
    // Ottieni l'array base dall'API (Eseguito solo se NON siamo in Home)
    let baseProjects = Array.isArray(apiData) ? apiData : Object.values(apiData);
    
    // Moltiplica i progetti fino a raggiungere esattamente 114 elementi differenti
    allProjects = [];
    if (baseProjects.length > 0) {
        for (let i = 0; i < targetTotalItems; i++) {
            let originalItem = baseProjects[i % baseProjects.length];
            let clonedItem = JSON.parse(JSON.stringify(originalItem));
            clonedItem.titolo = clonedItem.titolo || clonedItem.title || "Project";
            allProjects.push(clonedItem);
        }
    }
    
    filteredProjects = [...allProjects];
    setupUI();
    renderArchive();
}

// Funzione dedicata per generare solo 3 progetti nella griglia della Home con modifiche custom, immagini corrette e metadati vuoti (senza logo, autore o data)
function renderHomePlaylists() {
    let homeGrid = select('#home-playlists-grid');
    if (!homeGrid) return;
    homeGrid.html('');

    let baseProjects = Array.isArray(apiData) ? apiData : Object.values(apiData);
    let homeProjects = baseProjects.slice(0, 3);

    // Configurazione con i nomi delle immagini e i tag reali da filtrare
    const homeConfig = [
        { titolo: "Moon Playlist", imgFile: "lunararchive_2.jpg", tag: "moon" },
        { titolo: "Earth Playlist", imgFile: "eyesonearth_2.jpg", tag: "earth" },
        { titolo: "Space Telescopes Playlist", imgFile: "hubble_2.jpg", tag: "space" }
    ];

    homeProjects.forEach((p, index) => {
        let titolo = homeConfig[index].titolo;
        let imgFile = homeConfig[index].imgFile;
        let targetTag = homeConfig[index].tag;

        // MODIFICA QUI: Forza il link verso playlist.html invece del sito esterno di un progetto
        let projectUrl = `playlist.html?type=${targetTag}`;

        // Testo del bottone modificato in "View Playlist"
        let btnHtml = `<a class="btn-view-site" href="${projectUrl}" style="font-family: 'Helvetica', 'Arial', sans-serif;">View Playlist</a>`;

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
        rowWrapper.className = 'table-row-wrapper home-static-card'; 
        rowWrapper.innerHTML = `
            ${imgHtml}
            <div class="row-content-overlay">
                <div class="row-title">${titolo}</div>
                <div class="overlay-bottom">
                    <div class="row-meta"></div>
                    ${btnHtml}
                </div>
            </div>
        `;

        homeGrid.elt.appendChild(rowWrapper);
    });
}

function setupUI() {
    select('#search-input').input((e) => {
        let q = e.target.value.toLowerCase();
        filteredProjects = allProjects.filter(p => {
            let t = (p.titolo || p.title || "").toLowerCase();
            let n = (p.nome || p.studente || p.author || p.autore || "").toLowerCase();
            let hasTag = p.tags && p.tags.some(tag => String(tag).toLowerCase().includes(q));
            return t.includes(q) || n.includes(q) || hasTag;
        });
        currentPage = 1; 
        if (activeSort) sortProjects(activeSort);
        else renderArchive();
    });

    select('#btn-tags').mousePressed(() => {
        select('#sort-menu').removeClass('show'); 
        select('#btn-sort').removeClass('menu-open');
        let menu = select('#tags-menu');
        menu.toggleClass('show');
        select('#btn-tags').toggleClass('menu-open');
        currentTagQuery = "";
        renderDropdownTags();
    });

    select('#btn-sort').mousePressed(() => {
        select('#tags-menu').removeClass('show'); 
        select('#btn-tags').removeClass('menu-open');
        let menu = select('#sort-menu');
        menu.toggleClass('show');
        select('#btn-sort').toggleClass('menu-open');
    });

    selectAll('.sort-option').forEach(el => {
        el.elt.addEventListener('click', () => {
            let criteria = el.attribute('data-sort');
            if (activeSort === criteria) {
                clearSort();
            } else {
                activeSort = criteria;
                sortProjects(criteria);
                updateSortUI();
            }
            select('#sort-menu').removeClass('show');
            select('#btn-sort').removeClass('menu-open');
        });
    });

    document.addEventListener('click', (e) => {
        let controlsBar = document.querySelector('.controls-bar');
        if (controlsBar && !controlsBar.contains(e.target)) {
            select('#sort-menu').removeClass('show');
            select('#tags-menu').removeClass('show');
            select('#btn-tags').removeClass('menu-open');
            select('#btn-sort').removeClass('menu-open');
        }
    });

    renderDropdownTags();
}

function updateSortUI() {
    selectAll('.sort-option').forEach(el => {
        let criteria = el.attribute('data-sort');
        if (criteria === activeSort) {
            el.addClass('active');
            if (!el.elt.querySelector('.option-x')) {
                let x = document.createElement('span');
                x.className = 'option-x';
                x.textContent = '✕';
                el.elt.appendChild(x);
            }
        } else {
            el.removeClass('active');
            let x = el.elt.querySelector('.option-x');
            if (x) x.remove();
        }
    });
}

function clearSort() {
    activeSort = null;
    applyFilters();
    updateSortUI();
}

function renderDropdownTags() {
    let tagsMenu = document.getElementById('tags-menu');
    if (!tagsMenu) return;
    
    tagsMenu.innerHTML = '';
    
    let searchRow = document.createElement('div');
    searchRow.className = 'dropdown-search-row';
    searchRow.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="6.5" cy="6.5" r="5.5" stroke="#aaa" stroke-width="1.5"/>
          <line x1="10.5" y1="10.5" x2="15" y2="15" stroke="#aaa" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <input type="text" class="dropdown-search-input" placeholder="Search tags..." value="${currentTagQuery}">
    `;
    
    let inputEl = searchRow.querySelector('.dropdown-search-input');
    inputEl.addEventListener('input', (e) => {
        currentTagQuery = e.target.value.toLowerCase();
        updateFilteredTagsOnly(); 
    });
    
    inputEl.addEventListener('click', (e) => e.stopPropagation());
    tagsMenu.appendChild(searchRow);

    let uniqueTags = [...new Set(allProjects.flatMap(p => p.tags || []))].sort();
    let listContainer = document.createElement('div');
    listContainer.className = 'dropdown-tags-list';
    
    function updateFilteredTagsOnly() {
        listContainer.innerHTML = '';
        let filtered = uniqueTags.filter(t => t.toLowerCase().includes(currentTagQuery));
        
        filtered.forEach(tag => {
            let option = document.createElement('div');
            option.className = 'tag-option' + (activeTags.has(tag) ? ' active' : '');
            option.innerHTML = `<span>${tag}</span>`;
            
            if (activeTags.has(tag)) {
                let x = document.createElement('span');
                x.className = 'option-x';
                x.textContent = '✕';
                option.appendChild(x);
            }
            
            option.addEventListener('click', (e) => {
                e.stopPropagation(); 
                if (activeTags.has(tag)) {
                    activeTags.delete(tag);
                } else {
                    activeTags.add(tag);
                }
                applyFilters();
                renderDropdownTags(); 
                document.querySelector('.dropdown-search-input').focus(); 
            });
            
            listContainer.appendChild(option);
        });
    }
    
    tagsMenu.appendChild(listContainer);
    updateFilteredTagsOnly();
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

function renderArchive() {
    let container = select('#archive-grid');
    if (!container) return;
    container.html('');

    let startIndex = (currentPage - 1) * itemsPerPage;
    let endIndex = startIndex + itemsPerPage;
    let projectsToDisplay = filteredProjects.slice(startIndex, endIndex);

    projectsToDisplay.forEach(p => {
        let titolo      = p.titolo      || p.title       || "Progetto senza titolo";
        let autore      = p.autore      || p.nome        || p.studente || p.author || "Autore n.d.";
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

    renderPaginationControls();
}

function renderPaginationControls() {
    let paginationContainer = document.getElementById('pagination-controls');
    if (!paginationContainer) return;

    paginationContainer.innerHTML = '';

    let totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
    if (totalPages <= 1) return;

    if (currentPage > 1) {
        let prevBtn = document.createElement('button');
        prevBtn.className = 'page-arrow-btn';
        prevBtn.textContent = '<';
        prevBtn.addEventListener('click', () => {
            currentPage--;
            renderArchive();
            document.querySelector('.controls-bar').scrollIntoView({ behavior: 'smooth' });
        });
        paginationContainer.appendChild(prevBtn);
    }

    let currentDisplay = document.createElement('span');
    currentDisplay.className = 'page-current-display';
    currentDisplay.textContent = currentPage;
    paginationContainer.appendChild(currentDisplay);

    if (currentPage < totalPages) {
        let nextBtn = document.createElement('button');
        nextBtn.className = 'page-arrow-btn';
        nextBtn.textContent = '>';
        nextBtn.addEventListener('click', () => {
            currentPage++;
            renderArchive();
            document.querySelector('.controls-bar').scrollIntoView({ behavior: 'smooth' });
        });
        paginationContainer.appendChild(nextBtn);
    }
}

function applyFilters() {
    if (activeTags.size === 0) {
        filteredProjects = [...allProjects];
    } else {
        let tagsArray = [...activeTags];
        filteredProjects = allProjects.filter(p => p.tags && tagsArray.some(t => p.tags.includes(t)));
    }
    currentPage = 1; 
    if (activeSort) sortProjects(activeSort);
    else renderArchive();
    updateActiveTagsUI();
}

function updateActiveTagsUI() {
    let container = document.getElementById('active-tags');
    if (!container) return;
    container.innerHTML = '';
    activeTags.forEach(tag => {
        let chip = document.createElement('div');
        chip.className = 'archive-chip';
        chip.innerHTML = `<span class="tag-label">${tag}</span><span class="chip-x">✕</span>`;
        chip.addEventListener('click', () => {
            activeTags.delete(tag);
            applyFilters();
            renderDropdownTags();
        });
        container.appendChild(chip);
    });
}

function getSortValue(p, criteria) {
    let val = "";
    if (criteria === 'author') {
        val = p.autore || p.nome || p.studente || p.author || p.name || "";
    } else if (criteria === 'title') {
        val = p.titolo || p.title || "";
    } else if (criteria === 'date') {
        let d = p.data || p.date;
        if (d && typeof d === 'object') {
            let a = String(d.anno  || d.year  || "0000").padStart(4, '0');
            let m = String(d.mese  || d.month || "00").padStart(2, '0');
            let g = String(d.giorno|| d.day   || "00").padStart(2, '0');
            val = a + m + g;
        } else {
            val = String(d || p.anno || p.year || "");
        }
    }
    return String(val).trim().toLowerCase();
}

function sortProjects(criteria) {
    filteredProjects.sort((a, b) => {
        let valA = getSortValue(a, criteria);
        let valB = getSortValue(b, criteria);
        return valA.localeCompare(valB, 'it', { sensitivity: 'base' });
    });
    currentPage = 1; 
    renderArchive();
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