const API_BASE = '/api';

async function fetchJSON(url, opts = {}) {
  const res = await fetch(API_BASE + url, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  if (!res.ok) {
    let errMsg = res.statusText || 'Request failed';
    try {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const err = await res.json();
        errMsg = err.error || errMsg;
      }
    } catch {}
    throw new Error(errMsg);
  }
  return res.json();
}

export const api = {
  // Search
  search: (query, marketplaces, location) =>
    fetchJSON('/search', { method: 'POST', body: JSON.stringify({ query, marketplaces, location }) }),
  getSearchResults: (id) => fetchJSON(`/search/${id}`),

  // Saved searches
  getSavedSearches: () => fetchJSON('/saved-searches'),
  createSavedSearch: (data) => fetchJSON('/saved-searches', { method: 'POST', body: JSON.stringify(data) }),
  deleteSavedSearch: (id) => fetchJSON(`/saved-searches?id=${id}`, { method: 'DELETE' }),

  // Marketplaces
  getMarketplaces: () => fetchJSON('/marketplaces'),
};
