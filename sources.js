// sources.js

const sources = {
  'novgo.net': {
    name: 'Novel Site 1',
    selectors: {
      chapterList: '.list-chapter li a',
      nextPage: '.pagination li.next a',
      title: '.desc h3.title',
      cover: '.book img',
      author: '.info h3:contains("Author:") + a',
      genre: '.info h3:contains("Genre:") + a',
      status: '.info h3:contains("Status:") + a',
      description: '.desc-text',
      chapterContent: '#chapter-content'
    },
    getChaptersFromPage(doc, baseUrl) {
      return [...doc.querySelectorAll(this.selectors.chapterList)].map(a => ({
        title: a.getAttribute('title') || a.textContent.trim(),
        url: new URL(a.getAttribute('href'), baseUrl).href
      }));
    },
    getNextPage(doc, baseUrl) {
      const next = doc.querySelector(this.selectors.nextPage)?.getAttribute('href');
      return next ? new URL(next, baseUrl).href : null;
    }
  },

  'other-source.com': {
    name: 'Other Source',
    selectors: {
      chapterList: '.chapters a',
      nextPage: '.next-button',
      title: 'h1.book-title',
      cover: '.cover-container img',
      author: '.meta .author',
      genre: '.meta .genres a',
      status: '.meta .status',
      description: '.book-description',
      chapterContent: '.reader-content'
    },
    getChaptersFromPage(doc, baseUrl) {
      return [...doc.querySelectorAll(this.selectors.chapterList)].map(a => ({
        title: a.textContent.trim(),
        url: new URL(a.getAttribute('href'), baseUrl).href
      }));
    },
    getNextPage(doc, baseUrl) {
      const next = doc.querySelector(this.selectors.nextPage)?.getAttribute('href');
      return next ? new URL(next, baseUrl).href : null;
    }
  }
};
