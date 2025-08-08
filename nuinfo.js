/* ---------- helpers ---------- */
const nuBtn      = document.getElementById('nuInfoBtn');
const autoFillBtn= document.getElementById('autoFillBtn');
const nuInfo     = document.getElementById('nuInfo');
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

    /* ==========   AUTHOR  “INFO”  DEEP-DIVE   ========== */
    nuInfoResults.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('.info-btn');
      if (!btn) return;
      const url = btn.dataset.url;
      if (!url.includes('/nauthor/')) return;   // only author pages

      ev.stopPropagation();
      try {
        nuBtn.disabled = true;
        log(`Fetching author works → ${url}`);
        const html = await fetchRawHTML(url);
        const doc   = new DOMParser().parseFromString(html, 'text/html');
        const works = [...doc.querySelectorAll('.search_main_box_nu')];

        if (!works.length) { log('No works found for this author'); return; }

        let out = '<div id="AuthorWorks" style="margin-top:10px;"><b>Other works by this author:</b><hr>';
        works.forEach(w => out += w.outerHTML + '<hr>');
        out += '</div>';
        nuInfoResults.insertAdjacentHTML('beforeend', out);
      } catch (e) {
        log(`Author-works fetch failed: ${e.message}`);
      } finally {
        nuBtn.disabled = false;
      }
    });
    /* =================================================== */

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
