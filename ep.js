
// ---- export EPUB ----
epubBtn.addEventListener('click', async () => {
  if (!novelData.metadata?.title || !novelData.chapters[0]?.content) {
    return alert('No chapter data available to create an EPUB.');
  }

  log('Starting EPUB generation...');
  const zip = new JSZip();
  const idGen = (() => { let n = 0; return () => `id-${++n}`; })();

  /* 1. mimetype (must be first & uncompressed) */
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  /* 2. META-INF & OEBPS folders */
  const meta = zip.folder('META-INF');
  meta.file('container.xml', `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  const oebps = zip.folder('OEBPS');

  /* 3. download cover */
/* 3. download cover (via worker) */
let coverFileName = '';
if (novelData.metadata.cover) {
  try {
    // ask the worker to proxy the image
    const res   = await fetch(`${WORKER_URL}/api/raw?url=${encodeURIComponent(novelData.metadata.cover)}`);
    if (!res.ok) throw new Error('cover fetch failed');
    const blob  = await res.blob();
    coverFileName = 'cover.jpg';
    oebps.file(coverFileName, blob, { compression: 'DEFLATE' });
  } catch (e) {
    log('Cover skipped: ' + e.message);
  }
}

  const toc = [];

  /* 3b. cover page XHTML (if cover exists) */
  if (coverFileName) {
    const coverPage = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${novelData.metadata.title}</title><meta charset="utf-8"/></head>
<body style="margin:0; text-align:center;">
  <img style="height:auto;width:100%;border-radius:5px;" src="${coverFileName}" alt="Cover"/>
    <h1>${novelData.metadata.title}</h1>
    <p><strong>Author:</strong> ${novelData.metadata.author.join(', ')}</p>
</body></html>`;
    oebps.file('cover.xhtml', coverPage);
    toc.push({ id: 'cover-page', href: 'cover.xhtml', title: 'Cover', isCover: true });
  }

  /* 4. Information page */
  const infoPage = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Information</title><meta charset="utf-8"/></head>
<body>
  <h1>${novelData.metadata.title}</h1>
  <p><strong>Author:</strong> ${novelData.metadata.author.join(', ')}</p>
  <p><strong>Status:</strong> ${novelData.metadata.status}</p>
  ${novelData.metadata.genres.length ? `<p><strong>Genres:</strong> ${novelData.metadata.genres.join(', ')}</p>` : ''}
  <h3>Description</h3>
  <p>${novelData.metadata.description}</p>
</body>
</html>`;
  oebps.file('info.xhtml', infoPage);
  toc.push({ id: 'info-page', href: 'info.xhtml', title: 'Information' });

  /* 5. chapters */
  log('Processing chapters for EPUB...');
  novelData.chapters.forEach((ch, idx) => {
    const file = `chap${idx + 1}.xhtml`;

    // Pre-process chapter content to be well-formed XHTML
    const processedContent = (ch.content || 'Content not found.')
      .replace(/&nbsp;/g, '&#160;')      // Use XHTML compliant non-breaking space
      .replace(/<br\s*>/gi, '<br />'); // Ensure <br> tags are self-closing

    const html = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${ch.title}</title>
  <meta charset="utf-8"/>
</head>
<body>
  <h1>${ch.title}</h1>
  ${processedContent}
</body>
</html>`;
    oebps.file(file, html);
    toc.push({ id: `ch-${idx + 1}`, href: file, title: ch.title });
  });

/* 5a. Create TOC page (XHTML) */
const tocPage = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Table of Contents</title>
  <meta charset="utf-8"/>
 <style type="text/css">
    body { font-family: sans-serif; line-height: 1.5; }
    h1 { text-align: center; }
    li { margin: 0.5em 0; }
  </style>
</head>
<body>
  <h1>Table of Contents</h1>
  <nav epub:type="toc" id="toc">
    <ol>
      <li><a href="cover.xhtml">Cover</a></li>
      <li><a href="info.xhtml">Information</a></li>
      <li><a href="toc.xhtml">Table of Contents</a></li>
      ${novelData.chapters.map((ch, idx) => 
        `<li><a href="chap${idx + 1}.xhtml">${ch.title}</a></li>`
      ).join('\n      ')}
    </ol>
  </nav>
</body>
</html>`;

oebps.file('toc.xhtml', tocPage);
toc.push({ id: 'toc-page', href: 'toc.xhtml', title: 'Table of Contents' });
  
/* 7. NCX (Table of Contents) */
const ncx = `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${'urn:uuid:' + Date.now()}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${novelData.metadata.title}</text></docTitle>
  <navMap>
    ${toc.map((t, i) => `<navPoint id="${t.id}" playOrder="${i + 1}">
      <navLabel><text>${t.title}</text></navLabel>
      <content src="${t.href}"/>
    </navPoint>`).join('\n  ')}
  </navMap>
</ncx>`;
oebps.file('toc.ncx', ncx);

/* 6. OPF (content.opf) */

const opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${novelData.metadata.title}</dc:title>
    <dc:creator>${novelData.metadata.author.join(', ')}</dc:creator>
    <dc:language>en</dc:language>
${novelData.metadata.genres.map(genre => `<dc:subject>${genre}</dc:subject>`).join('\n')}
<dc:identifier id="BookId">urn:uuid:${crypto.randomUUID()}</dc:identifier>
    <dc:description>${(novelData.metadata.description || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</dc:description>
      <meta property="dcterms:modified">${new Date().toISOString()}</meta>
    <meta property="nav">toc.xhtml</meta>
    ${coverFileName ? '<meta name="cover" content="cover-image"/>' : ''}
  </metadata>
  <manifest>
    <item id="nav" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
     <item id="nav" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>
  ${coverFileName ? `<item id="cover-image" href="${coverFileName}" media-type="image/jpg"/>` : ''}
  <item id="cover-page" href="cover.xhtml" media-type="application/xhtml+xml"/>
  ${toc.map(t => `<item id="${t.id}" href="${t.href}" media-type="application/xhtml+xml"/>`).join('\n    ')}
  </manifest>
  <spine toc="nav">
    <itemref idref="cover-page"/>
    <itemref idref="info-page"/>
    <itemref idref="toc-page"/>    
  ${toc.map(t => `<itemref idref="${t.id}"/>`).join('\n    ')}
  </spine>
</package>`;
oebps.file('content.opf', opf);

  /* 8. Generate EPUB file */
  log('Generating EPUB file, please wait...');
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  /* 9. Trigger download */
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${novelData.metadata.title.replace(/[^a-z0-9]/gi, '_')}.epub`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);

  log('EPUB download initiated!');
});


// enable EPUB button once chapters are loaded
fetchChaptersBtn.addEventListener('click', () => {
  const check = setInterval(() => {
    if (novelData.chapters.length && novelData.chapters[0]?.content) {
      epubBtn.disabled = false;
      clearInterval(check);
    }
  }, 500);
});
