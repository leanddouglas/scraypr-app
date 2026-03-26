const API_BASE = '/api';

async function fetchJSON(url, opts = {}) {
  const res = await fetch(API_BASE + url, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  if (!res.ok) {
    // Safely handle non-JSON error responses (e.g., HTML error pages)
    let errMsg = res.statusText || 'Request failed';
    try {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const err = await res.json();
        errMsg = err.error || errMsg;
      }
    } catch {
      // Ignore JSON parse errors
    }
    throw new Error(errMsg);
  }
  return res.json();
}

export const api = {
  // Scrapers
  getScrapers: () => fetchJSON('/scrapers'),
  getScraper: (id) => fetchJSON(`/scrapers/${id}`),
  createScraper: (data) => fetchJSON('/scrapers', { method: 'POST', body: JSON.stringify(data) }),
  updateScraper: (id, data) => fetchJSON(`/scrapers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteScraper: (id) => fetchJSON(`/scrapers/${id}`, { method: 'DELETE' }),

  // Scraping
  runScrape: (id) => fetchJSON(`/scrapers/${id}/run`, { method: 'POST' }),
  getResults: (id) => fetchJSON(`/scrapers/${id}/results`),
  getLogs: (id) => fetchJSON(`/scrapers/${id}/logs`),

  // Preview
  previewSelector: (url, selector) =>
    fetchJSON('/preview-selector', { method: 'POST', body: JSON.stringify({ url, selector }) }),

  // Smart Search
  smartSearch: (query, opts = {}) =>
    fetchJSON('/search', { method: 'POST', body: JSON.stringify({ query, ...opts }) }),

  // Stats
  getStats: () => fetchJSON('/stats'),
};
