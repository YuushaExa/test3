/* ---------- helpers ---------- */
const nuBtn = document.getElementById('nuInfoBtn');
const autoFillBtn = document.getElementById('autoFillBtn');
const nuInfo = document.getElementById('nuInfo');
const nuInfoResults = document.getElementById('nuInfoResults');

function closeNuInfo() {
  nuInfo.style.display = 'none';
  nuInfoResults.innerHTML = '';
}

/* ---------- fetch search page and display results ---------- */
async function openNuSearch() {
  const query = novelData.metadata?.title?.trim()
             || prompt('Enter novel title for NovelUpdates search:')?.trim();
  if (!query) return;

  const searchUrl = `https://www.novelupdates.com/series-finder/?sf=1&sh=${encodeURIComponent(query)}&sort=sdate&order=desc`;

  try {
    nuBtn.disabled = true;
    log(`Fetching NU search for "${query}" …`);
    const html = await fetchRawHTML(searchUrl);

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const series = doc.querySelectorAll('.search_main_box_nu');
    if (!series.length) {
      log('No results found on NovelUpdates.');
      return;
    }

    let resultsHtml = '';
    series.forEach(box => {
      const titleLink = box.querySelector('.search_title a');
      const infoButton = `<button class="info-btn" data-url="${titleLink.href}">Info</button>`;
      resultsHtml += box.outerHTML + infoButton + '<hr>';
    });

    nuInfoResults.innerHTML = resultsHtml;
    nuInfo.style.display = 'block';

    // Add click event to each Info button
/* ---------- Fetch & display every work by every author ---------- */
async function loadAuthorWorks() {
  const authorLinks = nuInfoResults.querySelectorAll('#showauthors a.genre');
  if (!authorLinks.length) return;

  // container for author works
  let authorWorksDiv = document.getElementById('AuthorWorks');
  if (!authorWorksDiv) {
    authorWorksDiv = document.createElement('div');
    authorWorksDiv.id = 'AuthorWorks';
    authorWorksDiv.style.marginTop = '20px';
    nuInfoResults.appendChild(authorWorksDiv);
  }
  authorWorksDiv.innerHTML = '<h4 style="margin-bottom:8px;">Author Works</h4>';

  for (const link of authorLinks) {
    const authorUrl = link.href;
    try {
      const html = await fetchRawHTML(authorUrl);
      const dom = new DOMParser().parseFromString(html, 'text/html');
      const boxes = dom.querySelectorAll('.search_main_box_nu');

      boxes.forEach(box => {
        // clone so we keep original styling
        const clone = box.cloneNode(true);
        authorWorksDiv.appendChild(clone);
      });
    } catch (e) {
      console.error(`Failed to fetch author page ${authorUrl}`, e);
    }
  }
}

/* ---------- Hook it into the existing Info click ---------- */
/* We replace the single info-btn handler with a tiny wrapper */
document.addEventListener('click', async e => {
  if (!e.target.classList.contains('info-btn')) return;

  // first run the original logic
  const url = e.target.getAttribute('data-url');
  try {
    const detailedHtml = await fetchRawHTML(url);
    const detailedDoc = new DOMParser().parseFromString(detailedHtml, 'text/html');

    /* ========== ORIGINAL EXTRACTION ========== */
    const title = detailedDoc.querySelector('.seriestitlenu')?.textContent || 'Title not found';
    const imageUrl = detailedDoc.querySelector('.seriesimg img')?.src || 'Image not found';
    const type = detailedDoc.querySelector('#showtype a')?.textContent || 'Type not found';
    const genres = Array.from(detailedDoc.querySelectorAll('#seriesgenre a')).map(a => a.textContent).join(', ') || 'Genres not found';
    const authors = Array.from(detailedDoc.querySelectorAll('#showauthors a')).map(a => a.textContent).join(', ') || 'Authors not found';
    const authorUrls = Array.from(detailedDoc.querySelectorAll('#showauthors a')).map(a => a.href).join(', ') || 'Authors URL not found';
    const year = detailedDoc.querySelector('#edityear')?.textContent || 'Year not found';
    const statuscoo = detailedDoc.querySelector('#editstatus')?.textContent || 'Status not found';
    const originalPublisher = detailedDoc.querySelector('#showopublisher a')?.textContent || 'Original Publisher not found';
    const englishPublisher = detailedDoc.querySelector('#showepublisher span')?.textContent || 'English Publisher not found';
    const description = detailedDoc.querySelector('#editdescription p')?.textContent || 'Description not found';
    const associatedNames = detailedDoc.querySelector('#editassociated')?.innerHTML || 'Associated Names not found';
    const formattedAssociatedNames = associatedNames.split(/<br\s*\/?>/gi).join(', ');
    const language = detailedDoc.querySelector('#showlang a')?.textContent || 'Language not found';

    /* ========== INJECT INTO nuInfoResults ========== */
    nuInfoResults.innerHTML = `
      <div class="seriestitlenu" style="font-size:18px; margin-top: 10px; color: #292e33;">${title}</div>
      <div class="seriesimg"><img src="${imageUrl}"></div>
      <h5 class="seriesother">Type</h5>
      <div id="showtype"><a class="genre type" href="#">${type}</a> <span style="color:#8D8D8D;">(${language})</span></div>
      <h5 class="seriesother">Genre</h5>
      <div id="seriesgenre">
        ${genres.split(', ').map(g => `<a class="genre" href="#">${g}</a>`).join(', ')}
      </div>
      <h5 class="seriesother">Author(s)</h5>
      <div id="showauthors">
        ${authors.split(', ').map((a, i) => `<a class="genre" href="${authorUrls.split(', ')[i]}">${a}</a>`).join(', ')}
      </div>
      <h5 class="seriesother">Year</h5><div id="edityear">${year}</div>
      <h5 class="seriesother">Status in COO</h5><div id="editstatus">${statuscoo}</div>
      <h5 class="seriesother">Original Publisher</h5>
      <div id="showopublisher"><a class="genre" href="#">${originalPublisher}</a></div>
      <h5 class="seriesother">English Publisher</h5>
      <div id="showepublisher">${englishPublisher}</div>
      <h5 class="seriesother">Associated Names</h5>
      <div id="editassociated">${formattedAssociatedNames}</div>
      <h5 class="descripti">Description</h5>
      <div id="editdescription">${description}</div>
    `;

    /* ========== NEW: load all works by every author ========== */
    await loadAuthorWorks();

    /* ========== auto-fill the metadata form ========== */
    autoFillBtn.disabled = false;
    showEditMetadataForm();
    autoFillBtn.click();
    const submitButton = document.querySelector('#metadataForm button[type="submit"]');
    if (submitButton) submitButton.click();

  } catch (e) {
    log(`Error fetching detailed info: ${e.message}`);
  }
});
    });
  } catch (e) {
    log(`NU search error: ${e.message}`);
  } finally {
    nuBtn.disabled = false;
  }
}

/* ---------- AutoFill button click event ---------- */
autoFillBtn.addEventListener('click', () => {
  const coverUrl = nuInfoResults.querySelector('.seriesimg img')?.src || '';
  const altTitle = nuInfoResults.querySelector('#editassociated')?.textContent || '';
  const date = nuInfoResults.querySelector('#edityear')?.textContent || '';
  const statuscoo = nuInfoResults.querySelector('#editstatus')?.textContent || '';
  const language = nuInfoResults.querySelector('#showlang a')?.textContent || '';
  const originalPublisher = nuInfoResults.querySelector('#showopublisher a')?.textContent || '';

  const editCover = document.getElementById('editCover');
  const editAltTitle = document.getElementById('editaltitile');
  const editDate = document.getElementById('editdate');
  const editstatuscoo = document.getElementById('editstatuscoo');
  const editlanguage = document.getElementById('editlanguage');
  const editoriginalPublisher = document.getElementById('editoriginalPublisher');

  if (editCover) editCover.value = coverUrl;
  if (editAltTitle) editAltTitle.value = altTitle;
  if (editDate) editDate.value = date;
  if (editstatuscoo) editstatuscoo.value = statuscoo;
  if (editlanguage) editlanguage.value = language;
  if (editoriginalPublisher) editoriginalPublisher.value = originalPublisher;
});
/* ---------- enable/disable button ---------- */
fetchMetadataBtn.addEventListener('click', () => {
  const chk = setInterval(() => {
    if (novelData.metadata?.title) {
      nuBtn.disabled = false;
      clearInterval(chk);
    }
  }, 500);
});
nuBtn.addEventListener('click', openNuSearch);
