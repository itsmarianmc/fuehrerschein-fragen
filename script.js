const SITEMAP = "sitemap.xml";
const checkIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 63 52" width="45"><rect x="1" y="4" fill="#00AF9D" width="47" height="47" rx="4"/><polygon fill="#FFFFFF"points="12.721,28.393 18.331,22.315 27.447,30.731 54.51,1.413 61.587,7.947 28.915,43.343"/></svg>`;
let allItems = [];

function normalizeText(text) {
	return text
		.toLowerCase()
		.replace(/ä/g, 'ae')
		.replace(/ö/g, 'oe')
		.replace(/ü/g, 'ue')
		.replace(/ß/g, 'ss')
		.trim();
}

function formatTitleForDisplay(title) {
	if (!title) return 'Ohne Titel';

	let formatted = title
		.replace(/ue/gi, 'ü')
		.replace(/oe/gi, 'ö')
		.replace(/ae/gi, 'ä')
		.replace(/km h/gi, 'km/h');

	return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

fetch(SITEMAP)
	.then(r => r.text())
	.then(xmlText => {
		const xml = new DOMParser().parseFromString(xmlText, "text/xml");
		const urls = [...xml.querySelectorAll("url loc")];
		allItems = urls.map(loc => {
			const fullUrl = loc.textContent.trim();
			const slug = fullUrl.split("/").pop();
			const numberUrl = slug.match(/\d-\d-\d\d-\d\d\d/)?.[0] || "";
			const numberReal = numberUrl ?
				numberUrl.replace(/-(\d\d\d)$/, "-$1").replace(/-/g, ".").replace(/\.(\d\d\d)$/, "-$1") :
				"";
			const title = slug
				.replace(numberUrl, "")
				.replace(/-$/, "")
				.replace(/-/g, " ")
				.trim();
			const titleNormalized = normalizeText(title);
			const numberNormalized = normalizeText(numberReal);
			return {
				fullUrl,
				title,
				numberUrl,
				numberReal,
				titleNormalized,
				numberNormalized
			};
		});
		render(allItems);
	})
	.catch(err => {
		document.getElementById("list").innerHTML = `<div class="no-results"><div class="no-results-icon">⚠️</div><div>Fehler beim Laden der Daten</div></div>`;
	});

function render(list) {
	const listEl = document.getElementById("list");
	const countEl = document.getElementById("count");

	if (list.length === 0) {
		listEl.innerHTML = `<div class="no-results"><div class="no-results-icon">🔍</div><div>Keine Ergebnisse gefunden</div><div><small>Diese Frage scheint es nicht zu geben! Versuche einen anderen Teil der Frage zu beschreiben oder überprüfe deine Eingabe!</small></div></div>`;
		countEl.textContent = `${list.length} Fragen gefunden!`;
		return;
	}

	countEl.textContent = `${list.length} ${list.length === 1 ? 'Frage' : 'Fragen'} gefunden`;
	listEl.innerHTML = "";

	list.forEach(i => {
		const a = document.createElement("a");
		a.href = i.fullUrl;
		a.target = "_blank";
		a.className = "item";
		a.innerHTML = `<div class="icon">${checkIcon}</div><div class="text"><small>Nr. ${i.numberReal || i.numberUrl}</small><strong>${formatTitleForDisplay(i.title)}</strong><small>${i.fullUrl}</small></div>`;
		listEl.appendChild(a);
	});
}

document.getElementById("search").addEventListener("input", e => {
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
});