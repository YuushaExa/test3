function escapeXML(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHTMLContent(str) {
  return String(str || '')
    .replace(/&(?![a-z0-9#]+;)/gi, '&amp;'); // escape bad ampersands only
}

class EpubGenerator {
  constructor(novelData) {
    this.novelData = novelData;
  }

  generate() {
    // Cover page
    const coverPage = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeXML(this.novelData.metadata.title)} - Cover</title>
</head>
<body>
  <div style="text-align:center;">
    <img src="cover.jpg" alt="Cover" style="max-width:100%;"/>
  </div>
</body>
</html>`;

    // Metadata page
    const metadataPage = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>About This Book</title>
</head>
<body>
  <h1>${escapeXML(this.novelData.metadata.title)}</h1>
  <p><strong>Author:</strong> ${this.novelData.metadata.author.map(escapeXML).join(', ')}</p>
  ${this.novelData.metadata.status ? `<p><strong>Status:</strong> ${escapeXML(this.novelData.metadata.status)}</p>` : ''}
  ${this.novelData.metadata.altitile ? `<p><strong>Alternative Title:</strong> ${
    Array.isArray(this.novelData.metadata.altitile)
      ? this.novelData.metadata.altitile.map(escapeXML).join(', ')
      : escapeXML(this.novelData.metadata.altitile)
  }</p>` : ''}
  ${this.novelData.metadata.date ? `<p><strong>Year:</strong> ${escapeXML(this.novelData.metadata.date)}</p>` : ''}
  ${this.novelData.metadata.language ? `<p><strong>Original Language:</strong> ${escapeXML(this.novelData.metadata.language)}</p>` : ''}
  ${this.novelData.metadata.originalPublisher ? `<p><strong>Original Publisher:</strong> ${escapeXML(this.novelData.metadata.originalPublisher)}</p>` : ''}
  ${this.novelData.metadata.statuscoo ? `<p><strong>Original Status:</strong> ${escapeXML(this.novelData.metadata.statuscoo)}</p>` : ''}
  ${this.novelData.metadata.genres?.length ? `<p><strong>Genres:</strong> ${this.novelData.metadata.genres.map(escapeXML).join(', ')}</p>` : ''}
  ${this.novelData.metadata.description ? `<div>${escapeHTMLContent(this.novelData.metadata.description)}</div>` : ''}
</body>
</html>`;

    // Other works page
    const otherWorksPage = this.novelData.otherWorks?.length
      ? `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Other Works</title>
</head>
<body>
  <h1>Other Works</h1>
  ${this.novelData.otherWorks.map(work => `
    <div style="margin-bottom:20px;display:flex;align-items:flex-start;">
      ${work.cover
        ? `<img src="${escapeXML(work.cover)}" alt="${escapeXML(work.title)}" style="margin-right:15px;max-height:150px;"/>`
        : `<div style="margin-right:15px;width:100px;height:150px;background:#ccc;"></div>`}
      <div>
        <strong><a href="${escapeXML(work.url)}">${escapeXML(work.title)}</a></strong><br>
        ${work.genres?.length ? `<em>${work.genres.map(escapeXML).join(', ')}</em>` : ''}
        ${work.description ? `<div style="margin-top:10px;">${escapeHTMLContent(work.description)}</div>` : ''}
      </div>
    </div>`).join('\n')}
</body>
</html>`
      : null;

    // Chapters
    const chapters = this.novelData.chapters.map((ch, idx) => {
      const content = escapeHTMLContent(ch.content || 'Content not found.');
      return {
        filename: `chap${idx + 1}.html`,
        content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeXML(ch.title)}</title>
</head>
<body>
  <h1>${escapeXML(ch.title)}</h1>
  ${content}
</body>
</html>`
      };
    });

    // TOC
    const toc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Table of Contents</title>
</head>
<body>
  <h1>Table of Contents</h1>
  <ol>
    <li><a href="cover.html">Cover</a></li>
    <li><a href="metadata.html">About This Book</a></li>
    ${otherWorksPage ? `<li><a href="otherworks.html">Other Works</a></li>` : ''}
    ${chapters.map((ch, idx) =>
      `<li><a href="chap${idx + 1}.html">${escapeXML(this.novelData.chapters[idx].title)}</a></li>`).join('\n')}
  </ol>
</body>
</html>`;

    // OPF (HTML media type)
    const manifestItems = [
      `<item id="cover" href="cover.html" media-type="text/html"/>`,
      `<item id="metadata" href="metadata.html" media-type="text/html"/>`,
      otherWorksPage ? `<item id="otherworks" href="otherworks.html" media-type="text/html"/>` : '',
      `<item id="toc" href="toc.html" media-type="text/html"/>`,
      ...chapters.map((_, idx) =>
        `<item id="chap${idx + 1}" href="chap${idx + 1}.html" media-type="text/html"/>`)
    ].filter(Boolean).join('\n    ');

    const spineItems = [
      `<itemref idref="cover"/>`,
      `<itemref idref="metadata"/>`,
      otherWorksPage ? `<itemref idref="otherworks"/>` : '',
      `<itemref idref="toc"/>`,
      ...chapters.map((_, idx) => `<itemref idref="chap${idx + 1}"/>`)
    ].filter(Boolean).join('\n    ');

    const opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeXML(this.novelData.metadata.title)}</dc:title>
    <dc:creator>${this.novelData.metadata.author.map(escapeXML).join(', ')}</dc:creator>
  </metadata>
  <manifest>
    ${manifestItems}
  </manifest>
  <spine>
    ${spineItems}
  </spine>
</package>`;

    // Return files
    const files = [
      { filename: 'cover.html', content: coverPage },
      { filename: 'metadata.html', content: metadataPage },
      ...(otherWorksPage ? [{ filename: 'otherworks.html', content: otherWorksPage }] : []),
      { filename: 'toc.html', content: toc },
      ...chapters,
      { filename: 'book.opf', content: opf }
    ];

    return files;
  }
}
