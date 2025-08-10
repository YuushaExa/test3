class EpubGenerator {
  constructor(novelData, opts = {}) {
    this.novelData = novelData || {};
    this.workerUrl = opts.workerUrl || 'https://curly-pond-9050.yuush.workers.dev';
    // use a single UUID for OPF & NCX
    this.uuid = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `uuid-${Date.now()}`;
  }

  // Basic XML escaper (safe for NCX and OPF text nodes)
  static escapeXML(str = '') {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // Escape HTML-ish content for XHTML bodies: keep safe tags like <br /> and <p>, convert stray & to &amp;
  static escapeHTMLContent(str = '') {
    if (!str) return '';
    return String(str)
      // allow existing entity sequences (basic)
      .replace(/&(?![#a-z0-9]+;)/gi, '&amp;')
      // normalize br/hr to XHTML self-closing variants
      .replace(/<br\s*>/gi, '<br />')
      .replace(/<hr\s*>/gi, '<hr />');
  }

  // map extension to media-type
  static mediaTypeForFilename(name) {
    const ext = (name || '').toLowerCase().split('.').pop();
    switch (ext) {
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'png': return 'image/png';
      case 'gif': return 'image/gif';
      case 'webp': return 'image/webp';
      case 'svg': return 'image/svg+xml';
      default: return 'application/octet-stream';
    }
  }

  getImageExtension(url = '') {
    const m = url.match(/\.(jpg|jpeg|png|gif|webp|svg)(?:[?#].*)?$/i);
    return m ? `.${m[1].toLowerCase()}` : '.jpg';
  }

  // main generate method returns a Blob (epub)
  async generate(logCallback = console.log) {
    const log = msg => (logCallback || console.log)(msg);
    const zip = new JSZip();

    // 1 — fixed mimetype (must be first, stored)
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

    // 2 — META-INF/container.xml
    const meta = zip.folder('META-INF');
    meta.file('container.xml', `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

    // 3 — OEBPS folder
    const oebps = zip.folder('OEBPS');

    // We'll collect manifest items + spine entries from this single toc array (single source of truth)
    const toc = [];

    // helper to push items into manifest later
    const manifestItems = new Map();

    // Add cover image (if any) and other images
    let coverFileName = '';
    if (this.novelData.metadata && this.novelData.metadata.cover) {
      try {
        const url = `${this.workerUrl}/api/raw?url=${encodeURIComponent(this.novelData.metadata.cover)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`cover fetch failed (${res.status})`);
        const blob = await res.blob();
        coverFileName = `images/cover${this.getImageExtension(this.novelData.metadata.cover)}`;
        oebps.file(coverFileName, blob, { compression: 'DEFLATE' });
        manifestItems.set('cover-image', { href: coverFileName, 'media-type': EpubGenerator.mediaTypeForFilename(coverFileName) });
      } catch (e) {
        log(`Cover skipped: ${e.message}`);
        coverFileName = '';
      }
    }

    // otherworks images (store under images/)
    if (Array.isArray(this.novelData.metadata?.otherworks)) {
      for (let i = 0; i < this.novelData.metadata.otherworks.length; i++) {
        const work = this.novelData.metadata.otherworks[i] || {};
        if (work.cover) {
          try {
            const url = `${this.workerUrl}/api/raw?url=${encodeURIComponent(work.cover)}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`otherworks image fetch failed (${res.status})`);
            const blob = await res.blob();
            const filename = `images/otherwork_${i}${this.getImageExtension(work.cover)}`;
            oebps.file(filename, blob, { compression: 'DEFLATE' });
            manifestItems.set(`otherwork-${i}`, { href: filename, 'media-type': EpubGenerator.mediaTypeForFilename(filename) });
            // rewrite the cover path for local use in info.xhtml
            this.novelData.metadata.otherworks[i].cover = filename;
          } catch (e) {
            log(`Otherworks image skipped for index ${i}: ${e.message}`);
          }
        }
      }
    }

    // XHTML template helper (XHTML 1.1 DOCTYPE + xml declaration)
    const xhtmlHeader = (title) => `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN"
  "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
<head>
  <title>${EpubGenerator.escapeXML(title)}</title>
  <meta http-equiv="Content-Type" content="application/xhtml+xml; charset=utf-8" />
  <style type="text/css">body{font-family:serif;line-height:1.4;padding:1em}</style>
</head>
<body>`;

    const xhtmlFooter = `</body></html>`;

    // COVER page (XHTML body must contain block elements only)
    if (coverFileName) {
      const coverXhtml = `${xhtmlHeader(this.novelData.metadata.title || 'Cover')}
  <div style="text-align:center;">
    <p><img alt="Cover" src="${EpubGenerator.escapeXML(coverFileName)}" style="max-width:100%;height:auto;border-radius:5px;" /></p>
    <h1>${EpubGenerator.escapeXML(this.novelData.metadata.title || '')}</h1>
    <p><strong>Author:</strong> ${Array.isArray(this.novelData.metadata.author) ? this.novelData.metadata.author.map(EpubGenerator.escapeXML).join(', ') : EpubGenerator.escapeXML(this.novelData.metadata.author || '')}</p>
  </div>
${xhtmlFooter}`;

      oebps.file('cover.xhtml', coverXhtml);
      toc.push({ id: 'cover-page', href: 'cover.xhtml', title: 'Cover', isCover: true });
      // manifest item added later from toc array
    }

    // INFORMATION page
    const md = this.novelData.metadata || {};
    const authorList = Array.isArray(md.author) ? md.author.map(EpubGenerator.escapeXML).join(', ') : EpubGenerator.escapeXML(md.author || '');
    let infoBody = `${xhtmlHeader('Information')}
  <h1>${EpubGenerator.escapeXML(md.title || '')}</h1>
  <p><strong>Author:</strong> ${authorList}</p>
  <p><strong>Status:</strong> ${EpubGenerator.escapeXML(md.status || '')}</p>`;

    if (md.altitile) {
      if (Array.isArray(md.altitile)) {
        infoBody += `<p><strong>Alternative Title:</strong> ${md.altitile.map(EpubGenerator.escapeHTMLContent).join(', ')}</p>`;
      } else {
        infoBody += `<p><strong>Alternative Title:</strong> ${EpubGenerator.escapeHTMLContent(md.altitile)}</p>`;
      }
    }
    if (md.date) infoBody += `<p><strong>Year:</strong> ${EpubGenerator.escapeXML(md.date)}</p>`;
    if (md.language) infoBody += `<p><strong>Original Language:</strong> ${EpubGenerator.escapeXML(md.language)}</p>`;
    if (md.originalPublisher) infoBody += `<p><strong>Original Publisher:</strong> ${EpubGenerator.escapeXML(md.originalPublisher)}</p>`;
    if (md.statuscoo) infoBody += `<p><strong>Original Status:</strong> ${EpubGenerator.escapeXML(md.statuscoo)}</p>`;
    if (Array.isArray(md.genres) && md.genres.length) infoBody += `<p><strong>Genres:</strong> ${md.genres.map(EpubGenerator.escapeHTMLContent).join(', ')}</p>`;

    infoBody += `<h3>Description</h3>
  <div>${EpubGenerator.escapeHTMLContent(md.description || '')}</div>`;

    if (Array.isArray(md.otherworks) && md.otherworks.length) {
      infoBody += `<h3>Other Works</h3><ul style="padding-left:1em">`;
      md.otherworks.forEach(work => {
        infoBody += `<li>
          <div>
            ${work.cover ? `<p><img src="${EpubGenerator.escapeXML(work.cover)}" alt="${EpubGenerator.escapeXML(work.title || '')}" style="max-width:80px;display:block;margin-bottom:4px" /></p>` : ''}
            <p><strong><a href="${EpubGenerator.escapeXML(work.url || '#')}">${EpubGenerator.escapeXML(work.title || '')}</a></strong></p>
            ${work.genres && work.genres.length ? `<p><em>${work.genres.map(EpubGenerator.escapeHTMLContent).join(', ')}</em></p>` : ''}
            ${work.description ? `<div>${EpubGenerator.escapeHTMLContent(work.description)}</div>` : ''}
          </div>
        </li>`;
      });
      infoBody += `</ul>`;
    }

    infoBody += `${xhtmlFooter}`;
    oebps.file('info.xhtml', infoBody);
    toc.push({ id: 'info-page', href: 'info.xhtml', title: 'Information' });

    // CHAPTERS: create files and add to toc
    if (Array.isArray(this.novelData.chapters)) {
      this.novelData.chapters.forEach((ch, idx) => {
        const id = `ch-${idx + 1}`;
        const href = `chap${idx + 1}.xhtml`;
        const titleText = ch.title || `Chapter ${idx + 1}`;
        const safeContent = EpubGenerator.escapeHTMLContent(ch.content || '');
        const html = `${xhtmlHeader(titleText)}
  <h1>${EpubGenerator.escapeXML(titleText)}</h1>
  <div>${safeContent}</div>
${xhtmlFooter}`;
        oebps.file(href, html);
        toc.push({ id, href, title: titleText });
      });
    }

    // TOC page (XHTML) — no <nav> element (EPUB2 validator complained); simple <ol> with anchors
    const tocXhtml = `${xhtmlHeader('Table of Contents')}
  <h1>Table of Contents</h1>
  <ol>
    ${toc.map(t => `<li><a href="${EpubGenerator.escapeXML(t.href)}">${EpubGenerator.escapeXML(t.title)}</a></li>`).join('\n    ')}
  </ol>
${xhtmlFooter}`;
    oebps.file('toc.xhtml', tocXhtml);
    // Ensure toc page is in the toc list (if not already)
    if (!toc.some(t => t.id === 'toc-page')) {
      toc.splice( (coverFileName ? 1 : 0) + 1, 0, { id: 'toc-page', href: 'toc.xhtml', title: 'Table of Contents' });
    }

    // Build manifest items from toc (XHTML files)
    toc.forEach(t => {
      manifestItems.set(t.id, { href: t.href, 'media-type': 'application/xhtml+xml' });
    });

    // add manifest items for images we've stored (they are already in manifestItems map)
    // (we added cover-image and otherwork-N earlier when downloading images)

    // NCX (use same uuid as OPF)
    const ncx = `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${EpubGenerator.escapeXML(this.uuid)}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${EpubGenerator.escapeXML(md.title || '')}</text></docTitle>
  <navMap>
    ${toc.map((t, i) => `
    <navPoint id="${EpubGenerator.escapeXML(t.id)}" playOrder="${i + 1}">
      <navLabel><text>${EpubGenerator.escapeXML(t.title)}</text></navLabel>
      <content src="${EpubGenerator.escapeXML(t.href)}"/>
    </navPoint>`).join('')}
  </navMap>
</ncx>`;
    oebps.file('toc.ncx', ncx);
    // add ncx manifest entry
    manifestItems.set('ncx', { href: 'toc.ncx', 'media-type': 'application/x-dtbncx+xml' });

    // Build OPF (OPF 2.0 safe)
    // metadata: use dc:* tags and <meta name="dcterms:modified" content="..."/> style
    const metaLines = [];
    metaLines.push(`<dc:title>${EpubGenerator.escapeXML(md.title || '')}</dc:title>`);
    metaLines.push(`<dc:creator>${EpubGenerator.escapeXML(Array.isArray(md.author) ? md.author.join(', ') : (md.author || ''))}</dc:creator>`);
    metaLines.push(`<dc:language>${EpubGenerator.escapeXML(md.language || 'en')}</dc:language>`);
    // genres as subjects
    if (Array.isArray(md.genres)) {
      md.genres.forEach(g => metaLines.push(`<dc:subject>${EpubGenerator.escapeXML(g)}</dc:subject>`));
    }
    metaLines.push(`<dc:identifier id="BookId">urn:uuid:${EpubGenerator.escapeXML(this.uuid)}</dc:identifier>`);
    metaLines.push(`<dc:description>${EpubGenerator.escapeXML(md.description || '')}</dc:description>`);
    metaLines.push(`<meta name="dcterms:modified" content="${new Date().toISOString()}"/>`);
    if (coverFileName) {
      metaLines.push(`<meta name="cover" content="cover-image"/>`);
    }

    // manifest entries
    const manifestLines = [];
    for (const [id, info] of manifestItems) {
      manifestLines.push(`<item id="${EpubGenerator.escapeXML(id)}" href="${EpubGenerator.escapeXML(info.href)}" media-type="${EpubGenerator.escapeXML(info['media-type'])}"/>`);
    }

    // spine: use toc order (exclude manifest entries that are not XHTML)
    const spineLines = [];
    toc.forEach(t => {
      spineLines.push(`<itemref idref="${EpubGenerator.escapeXML(t.id)}"/>`);
    });

    const opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    ${metaLines.join('\n    ')}
  </metadata>
  <manifest>
    ${manifestLines.join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${spineLines.join('\n    ')}
  </spine>
</package>`;

    oebps.file('content.opf', opf);

    // add images to manifest (if not already present). (manifestItems already contains them)
    // done above by building manifestLines from manifestItems

    // Generate the EPUB blob
    log('Generating EPUB (this may take a moment)...');
    const blob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/epub+zip',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    });

    log('EPUB generation finished.');
    return blob;
  }

  // convenience download helper
  async download(logCallback = console.log) {
    const blob = await this.generate(logCallback);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const safeTitle = (this.novelData.metadata?.title || 'book').replace(/[^a-z0-9\-_.]/gi, '_');
    link.download = `${safeTitle}.epub`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    (logCallback || console.log)('EPUB download initiated.');
  }
  }
