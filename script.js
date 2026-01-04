const SITEMAP = "sitemap.xml";
const CAPS_FILE = "caps.json";
const checkIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 63 52" width="45"><rect x="1" y="4" fill="#00AF9D" width="47" height="47" rx="4"/><polygon fill="#FFFFFF"points="12.721,28.393 18.331,22.315 27.447,30.731 54.51,1.413 61.587,7.947 28.915,43.343"/></svg>`;
let allItems = [];
let capitalizeWords = [];
let normalizedCapitalizeWords = [];
let searchTimeout;

function normalizeText(text) {
    return text
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .replace(/km\/h/g, 'kmh')
        .replace(/km h/g, 'kmh')
        .replace(/\//g, '')
        .trim();
}

function formatTitleForDisplay(title) {
    if (!title || title.length === 0) return 'Ohne Titel';
    
    let formatted = title;
    
    if (capitalizeWords.length > 0) {
        capitalizeWords.forEach((word, index) => {
            const normalizedWord = normalizedCapitalizeWords[index];
            if (normalizedWord && formatted.toLowerCase().includes(normalizedWord)) {
                const regex = new RegExp(`\\b${normalizedWord}\\b`, 'gi');
                formatted = formatted.replace(regex, word);
            }
        });
    }
    
    if (formatted.includes('ue') || formatted.includes('oe') || formatted.includes('ae')) {
        formatted = formatted
            .replace(/([bcdfghjklmnpqrstvwxyz])ue([bcdfghjklmnpqrstvwxyz])/gi, '$1ü$2')
            .replace(/([bcdfghjklmnpqrstvwxyz])oe([bcdfghjklmnpqrstvwxyz])/gi, '$1ö$2')
            .replace(/([bcdfghjklmnpqrstvwxyz])ae([bcdfghjklmnpqrstvwxyz])/gi, '$1ä$2')
            .replace(/([bcdfghjklmnpqrstvwxyz])ue\b/gi, '$1ü')
            .replace(/([bcdfghjklmnpqrstvwxyz])oe\b/gi, '$1ö')
            .replace(/([bcdfghjklmnpqrstvwxyz])ae\b/gi, '$1ä')
            .replace(/\bue([bcdfghjklmnpqrstvwxyz])/gi, 'ü$1')
            .replace(/\boe([bcdfghjklmnpqrstvwxyz])/gi, 'ö$1')
            .replace(/\bae([bcdfghjklmnpqrstvwxyz])/gi, 'ä$1')
            .replace(/km h/gi, 'km/h');
    }

    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

fetch(CAPS_FILE)
    .then(r => r.json())
    .then(caps => {
        capitalizeWords = caps;
        normalizedCapitalizeWords = caps.map(word => normalizeText(word));
        return fetch(SITEMAP);
    })
    .then(r => r.text())
    .then(xmlText => {
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, "text/xml");
        const urls = Array.from(xml.querySelectorAll("url loc"));
        
        allItems = urls.map(loc => {
            const fullUrl = loc.textContent.trim();
            const slug = fullUrl.split("/").pop();
            const numberUrl = slug.match(/\d-\d-\d\d-\d\d\d(-[a-z])?/)?.[0] || "";
            const numberReal = numberUrl ?
                numberUrl
                    .replace(/-(\d\d\d)/, "-$1")
                    .replace(/-/g, ".")
                    .replace(/\.(\d\d\d)/, "-$1") 
                    .replace(/\.([a-z])$/, "-$1")
                : "";
            const title = slug
                .replace(numberUrl, "")
                .replace(/-$/, "")
                .replace(/-/g, " ")
                .trim();
            
            return {
                fullUrl,
                title,
                numberUrl,
                numberReal,
                titleNormalized: normalizeText(title),
                numberNormalized: normalizeText(numberReal)
            };
        });
        
        render(allItems);
    })
    .catch(err => {
        console.error("Fehler beim Laden:", err);
        document.getElementById("list").innerHTML = `<div class="no-results"><div class="no-results-icon">⚠️</div><div>Fehler beim Laden der Daten</div></div>`;
    });

function render(list) {
    const listEl = document.getElementById("list");
    const countEl = document.getElementById("count");

    if (list.length === 0) {
        listEl.innerHTML = `<div class="no-results"><div class="no-results-icon">🔍</div><div>Keine Ergebnisse gefunden</div><div><small>Diese Frage scheint es nicht zu geben! Versuche einen anderen Teil der Frage zu beschreiben oder überprüfe deine Eingabe!</small></div></div>`;
        countEl.textContent = `Keine Fragen gefunden`;
        return;
    }

    countEl.textContent = `${list.length} ${list.length === 1 ? 'Frage' : 'Fragen'} gefunden`;
    
    const fragment = document.createDocumentFragment();
    
    const itemsToRender = list.slice(0, 500);
    
    itemsToRender.forEach(item => {
        const a = document.createElement("a");
        a.href = item.fullUrl;
        a.target = "_blank";
        a.className = "item";
        a.innerHTML = `<div class="icon">${checkIcon}</div><div class="text"><small>Nr. ${item.numberReal || item.numberUrl}</small><strong>${formatTitleForDisplay(item.title)}</strong><small>${item.fullUrl}</small></div>`;
        fragment.appendChild(a);
    });
    
    listEl.innerHTML = "";
    listEl.appendChild(fragment);
}

document.getElementById("search").addEventListener("input", e => {
    clearTimeout(searchTimeout);
    
    searchTimeout = setTimeout(() => {
        const q = normalizeText(e.target.value);
        
        if (q === "") {
            render(allItems);
            return;
        }
        
        const filtered = allItems.filter(i =>
            i.titleNormalized.includes(q) ||
            i.numberNormalized.includes(q) ||
            i.numberUrl.includes(q)
        );
        
        render(filtered);
    }, 150);
});

document.getElementById('reset').addEventListener('click', function() {
    clearTimeout(searchTimeout);
    
    const searchInput = document.getElementById('search');
    searchInput.value = '';
    render(allItems);
});