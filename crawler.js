// crawler.js

let novelData = { metadata: {}, chapters: [] };
const novelUrlInput = document.getElementById('novelUrl');

function detectSource(url) {
  const hostname = new URL(url).hostname.replace('www.', '');
  return sources[hostname] || null;
}

async function fetchRawHTML(url) {
  const res = await fetch(`/api/raw?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error(`Failed to fetch HTML: ${res.status}`);
  return await res.text();
}

function log(msg) {
  const logBox = document.getElementById('logBox');
  logBox.value += msg + '\n';
  logBox.scrollTop = logBox.scrollHeight;
}

async function fetchMetadata() {
  const url = novelUrlInput.value.trim();
  if (!url) return alert('Please enter a novel URL');

  const source = detectSource(url);
  if (!source) return alert('Source not supported yet.');

  log(`Using source config: ${source.name}`);

  let chapters = [];
  let nextPage = url;
  let doc;

  while (nextPage) {
    log(`Scraping: ${nextPage}`);
    const html = await fetchRawHTML(nextPage);
    doc = new DOMParser().parseFromString(html, 'text/html');

    chapters.push(...source.getChaptersFromPage(doc, url));
    nextPage = source.getNextPage(doc, url);
  }

  const sel = source.selectors;
  novelData.metadata = {
    title: doc.querySelector(sel.title)?.textContent.trim() || '',
    cover: doc.querySelector(sel.cover)
      ? new URL(doc.querySelector(sel.cover).getAttribute('src'), url).href
      : '',
    author: doc.querySelector(sel.author)?.textContent.trim() || '',
    genre: [...doc.querySelectorAll(sel.genre)].map(el => el.textContent.trim()),
    status: doc.querySelector(sel.status)?.textContent.trim() || '',
    description: doc.querySelector(sel.description)?.textContent.trim() || '',
    source: source.name
  };

  novelData.chapters = chapters;
  log(`Found ${chapters.length} chapters`);
}

async function fetchChapterContent(chapterUrl) {
  const source = detectSource(chapterUrl);
  if (!source) throw new Error('Source not supported');

  const html = await fetchRawHTML(chapterUrl);
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const content = doc.querySelector(source.selectors.chapterContent);
  return content ? content.innerHTML.trim() : '';
}

async function saveMetadata() {
  await fetch('/api/saveMetadata', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(novelData.metadata)
  });
  log('Metadata saved');
}

async function saveToGoogleDrive() {
  await fetch('/api/saveToGoogleDrive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(novelData)
  });
  log('Novel JSON saved to Google Drive');
}

async function saveEpub() {
  const epubBlob = await buildEpub(novelData); // assumes you have this function
  const formData = new FormData();
  formData.append('file', epubBlob, `${novelData.metadata.title}.epub`);

  await fetch('/api/saveEpubToGoogleDrive', { method: 'POST', body: formData });
  log('EPUB saved to Google Drive');
}
