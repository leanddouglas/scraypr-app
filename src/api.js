import { searchMarketplaces, getSavedSearches, saveSavedSearch, deleteSavedSearch } from './scraper';

export const api = {
  search: (query, marketplaces, location) => searchMarketplaces(query, marketplaces, location),
  getSavedSearches: () => Promise.resolve(getSavedSearches()),
  createSavedSearch: (data) => Promise.resolve(saveSavedSearch(data)),
  deleteSavedSearch: (id) => { deleteSavedSearch(id); return Promise.resolve({ success: true }); },
  getMarketplaces: () =>
    Promise.resolve([
      { id: "craigslist", name: "Craigslist", icon: "🏷️", status: "active" },
      { id: "ebay", name: "eBay", icon: "🛒", status: "active" },
      { id: "autotrader", name: "AutoTrader", icon: "🚗", status: "active" },
      { id: "facebook", name: "FB Marketplace", icon: "📘", status: "active" },
      { id: "kijiji", name: "Kijiji", icon: "🟢", status: "active" },
      { id: "reverb", name: "Reverb", icon: "🎸", status: "active" },
    ]),
};
