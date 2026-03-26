/**
 * API layer — uses client-side scraping (no backend needed).
 * All scraping happens in the browser via CORS proxy + DOMParser.
 * Saved searches persist in localStorage.
 */
import { searchMarketplaces, getSavedSearches, saveSavedSearch, deleteSavedSearch } from './scraper';

export const api = {
  // Search — runs client-side scraping
  search: (query, marketplaces, location) => searchMarketplaces(query, marketplaces, location),

  // Saved searches — uses localStorage
  getSavedSearches: () => Promise.resolve(getSavedSearches()),
  createSavedSearch: (data) => Promise.resolve(saveSavedSearch(data)),
  deleteSavedSearch: (id) => { deleteSavedSearch(id); return Promise.resolve({ success: true }); },

  // Marketplaces — static data
  getMarketplaces: () =>
    Promise.resolve([
      { id: "craigslist", name: "Craigslist", icon: "🏷️", status: "active" },
      { id: "autotrader", name: "AutoTrader", icon: "🚗", status: "active" },
      { id: "ebay", name: "eBay", icon: "🛒", status: "active" },
      { id: "facebook", name: "FB Marketplace", icon: "📘", status: "active" },
      { id: "kijiji", name: "Kijiji", icon: "🟢", status: "active" },
    ]),
};
