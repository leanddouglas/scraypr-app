const API_BASE = '/api';

async function fetchJSON(url, opts = {}) {
  const res = await fetch(API_BASE + url, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
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

  // Stats
  getStats: () => fetchJSON('/stats'),
};
