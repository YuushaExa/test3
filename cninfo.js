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
             || prompt('Enter novel title for Qidian search:')?.trim();
  if (!query) return;

  const searchUrl = `https://www.qidian.com/so/${encodeURIComponent(query)}.html`;

  try {
    nuBtn.disabled = true;
    log(`Fetching Qidian search for "${query}" …`);
      html = await fetchRawHTML(searchUrl, {
        headers: {
          'Referer': 'https://www.qidian.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const series = doc.querySelectorAll('.res-book-item');
    if (!series.length) {
      log('No results found on Qidian.');
      return;
    }

    let resultsHtml = '';
    series.forEach(box => {
      const titleLink = box.querySelector('.book-info-title a');
      const coverImg = box.querySelector('.book-img img')?.src || '';
      const author = box.querySelector('.book-info-author a')?.textContent || '';
      const infoButton = `<button class="info-btn" data-url="${titleLink.href}">Info</button>`;
      
      resultsHtml += `
        <div class="qidian-result">
          <img src="${coverImg}" style="max-width:80px; float:left; margin-right:10px;">
          <h3>${titleLink.textContent}</h3>
          <p>Author: ${author}</p>
          ${infoButton}
        </div>
        <hr>
      `;
    });

    nuInfoResults.innerHTML = resultsHtml;
    nuInfo.style.display = 'block';

    // Add click event to each Info button
    document.querySelectorAll('.info-btn').forEach(button => {
      button.addEventListener('click', async () => {
        const url = button.getAttribute('data-url');
        try {
          const detailedHtml = await fetchRawHTML(url);
          const detailedDoc = new DOMParser().parseFromString(detailedHtml, 'text/html');

          const title = detailedDoc.querySelector('.book-info h1 em')?.textContent || 'Title not found';
          const imageUrl = detailedDoc.querySelector('.book-img img')?.src || 'Image not found';
          const author = detailedDoc.querySelector('.book-info h1 a.writer')?.textContent || 'Author not found';
          const authorUrl = detailedDoc.querySelector('.book-info h1 a.writer')?.href || '';
          const status = detailedDoc.querySelector('.book-info .tag span.blue')?.textContent || 'Status not found';
          const category = detailedDoc.querySelector('.book-info .tag a.red')?.textContent || 'Category not found';
          const wordCount = detailedDoc.querySelector('.book-info .tag span.count')?.textContent || 'Word count not found';
          const description = detailedDoc.querySelector('.book-intro')?.textContent?.trim() || 'Description not found';
          const tags = Array.from(detailedDoc.querySelectorAll('.book-info .tag a:not(.red)')).map(a => a.textContent).join(', ') || 'Tags not found';

          const detailedContent = `
            <div class="qidian-detail">
              <img src="${imageUrl}" style="max-width:120px; float:left; margin-right:20px;">
              <h2>${title}</h2>
              <p><strong>Author:</strong> <a href="${authorUrl}" target="_blank">${author}</a></p>
              <p><strong>Status:</strong> ${status}</p>
              <p><strong>Category:</strong> ${category}</p>
              <p><strong>Word Count:</strong> ${wordCount}</p>
              <p><strong>Tags:</strong> ${tags}</p>
              <div style="clear:both;"></div>
              <h3>Description</h3>
              <div class="description">${description}</div>
            </div>
          `;

          nuInfoResults.innerHTML = detailedContent;
          autoFillBtn.disabled = false;

          // Try to auto-fill metadata if form is open
          if (document.getElementById('metadataForm')) {
            autoFillBtn.click();
            const submitButton = document.querySelector('#metadataForm button[type="submit"]');
            if (submitButton) {
              submitButton.click();
            }
          }
        } catch (e) {
          log(`Error fetching detailed info: ${e.message}`);
        }
      });
    });
  } catch (e) {
    log(`Qidian search error: ${e.message}`);
  } finally {
    nuBtn.disabled = false;
  }
}

/* ---------- AutoFill button click event ---------- */
autoFillBtn.addEventListener('click', () => {
  const qidianDetail = nuInfoResults.querySelector('.qidian-detail');
  if (!qidianDetail) return;

  const coverUrl = qidianDetail.querySelector('img')?.src || '';
  const title = qidianDetail.querySelector('h2')?.textContent || '';
  const author = qidianDetail.querySelector('p strong:contains("Author") + a')?.textContent || '';
  const status = qidianDetail.querySelector('p strong:contains("Status") + span')?.textContent || '';
  const genres = qidianDetail.querySelector('p strong:contains("Category") + span')?.textContent || '';
  const description = qidianDetail.querySelector('.description')?.textContent || '';

  // Update metadata form if open
  const editTitle = document.getElementById('editTitle');
  const editCover = document.getElementById('editCover');
  const editAuthors = document.getElementById('editAuthors');
  const editStatus = document.getElementById('editStatus');
  const editGenres = document.getElementById('editGenres');
  const editDescription = document.getElementById('editDescription');

  if (editTitle) editTitle.value = title;
  if (editCover) editCover.value = coverUrl;
  if (editAuthors) editAuthors.value = author;
  if (editStatus) editStatus.value = status;
  if (editGenres) editGenres.value = genres;
  if (editDescription) editDescription.value = description;
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
