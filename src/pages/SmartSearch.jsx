import { useState, useRef } from 'react';
import { api } from '../api';

const EXAMPLE_QUERIES = [
  '2012 Mazda under $5000 in Vancouver',
  'iPhone 15 under $800',
  'couch near Calgary under $300',
  'MacBook Pro under $1200 in Toronto',
  'Toyota Corolla under $10000 in Edmonton',
  'gaming chair under $200',
];

const CATEGORIES = [
  { value: 'auto', label: 'Auto-detect', icon: 'auto_awesome' },
  { value: 'cars', label: 'Cars & Trucks', icon: 'directions_car' },
  { value: 'electronics', label: 'Electronics', icon: 'devices' },
  { value: 'furniture', label: 'Furniture', icon: 'chair' },
  { value: 'general', label: 'General', icon: 'storefront' },
];

const LOCATIONS = [
  'vancouver', 'toronto', 'calgary', 'edmonton', 'montreal',
  'ottawa', 'winnipeg', 'victoria', 'kelowna', 'hamilton', 'london',
];

const AVAILABLE_SITES = [
  { id: 'craigslist', name: 'Craigslist', color: '#7c3aed' },
  { id: 'ebay',       name: 'eBay',       color: '#e53e3e' },
  { id: 'kijiji',     name: 'Kijiji',     color: '#38a169' },
  { id: 'autotrader', name: 'AutoTrader', color: '#dd6b20' },
];

function SkeletonCard() {
  return (
    <div className="glass-card border border-outline-variant/10 rounded-2xl overflow-hidden animate-pulse">
      <div className="h-40 bg-surface-container-high" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-surface-container-high rounded w-3/4" />
        <div className="h-3 bg-surface-container-high rounded w-1/2" />
        <div className="h-6 bg-surface-container-high rounded w-1/4" />
      </div>
    </div>
  );
}

function ResultCard({ item }) {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="glass-card border border-outline-variant/10 rounded-2xl overflow-hidden flex flex-col hover:border-outline-variant/30 transition-all duration-200 group">
      {/* Image */}
      <div className="relative h-40 bg-surface-container overflow-hidden">
        {item.image && !imgError ? (
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant opacity-30">image</span>
          </div>
        )}
        {/* Source badge overlaid on image */}
        <div
          className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold text-white shadow-lg"
          style={{ backgroundColor: item.sourceColor + 'cc', backdropFilter: 'blur(8px)' }}
        >
          {item.sourceName}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="font-headline font-semibold text-sm text-on-surface line-clamp-2 mb-2 leading-snug">
          {item.title}
        </h3>

        {item.price && (
          <p className="font-headline font-bold text-lg text-primary price-glow mb-1">
            {item.price}
          </p>
        )}

        {item.location && (
          <p className="text-xs text-on-surface-variant flex items-center gap-1 mb-3">
            <span className="material-symbols-outlined text-sm">location_on</span>
            {item.location}
          </p>
        )}

        <div className="mt-auto">
          {item.link ? (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-xs font-semibold transition-all duration-200"
            >
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              View Listing
            </a>
          ) : (
            <div className="w-full py-2 px-3 rounded-lg bg-surface-container text-on-surface-variant text-xs text-center">
              No link available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SmartSearch() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [category, setCategory] = useState('auto');
  const [location, setLocation] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [selectedSites, setSelectedSites] = useState(new Set(AVAILABLE_SITES.map(s => s.id)));

  const inputRef = useRef(null);

  const toggleSite = (id) => {
    setSelectedSites(prev => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size > 1) next.delete(id); }
      else next.add(id);
      return next;
    });
  };

  const handleSearch = async (q = query) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    setLoading(true);
    setResults(null);
    setError(null);
    try {
      const opts = {
        sites: [...selectedSites],
        ...(category !== 'auto' && { category }),
        ...(location && { location }),
        ...(maxPrice && { maxPrice: Number(maxPrice) }),
        ...(minPrice && { minPrice: Number(minPrice) }),
      };
      const data = await api.smartSearch(trimmed, opts);
      setResults(data);
    } catch (err) {
      setError(err.message || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* Hero */}
      <section className="relative px-4 sm:px-6 pt-10 pb-6 hero-gradient">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-5">
            <span className="material-symbols-outlined text-sm material-filled">auto_awesome</span>
            Smart Multi-Site Search
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-headline font-bold mb-3 tracking-tight">
            Find anything,{' '}
            <span className="text-primary text-glow-primary">everywhere</span>
          </h1>
          <p className="text-on-surface-variant text-base sm:text-lg mb-8 max-w-xl mx-auto">
            One search across Craigslist, eBay, Kijiji, and AutoTrader — with smart filters built in.
          </p>

          {/* Search bar */}
          <div className="relative max-w-2xl mx-auto mb-4">
            <div className="flex items-center gap-3 bg-surface-container border border-primary/30 focus-within:border-primary/60 rounded-2xl px-4 py-3 transition-all duration-200 glow-blue focus-within:shadow-[0_0_30px_rgba(97,205,255,0.2)]">
              <span className="material-symbols-outlined text-primary text-xl flex-shrink-0">search</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='Try: "2012 Mazda under $5000 in Vancouver"'
                className="flex-1 bg-transparent text-on-surface placeholder:text-on-surface-variant text-sm sm:text-base outline-none"
                disabled={loading}
              />
              {query && !loading && (
                <button
                  onClick={() => { setQuery(''); setResults(null); inputRef.current?.focus(); }}
                  className="text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Action row */}
          <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
            <button
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              className="px-6 py-2.5 gradient-button text-on-primary font-bold rounded-full shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-primary/40 transition-all active:scale-95 text-sm"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-semibold transition-all ${showFilters ? 'bg-primary/10 border-primary/30 text-primary' : 'border-outline-variant/30 text-on-surface-variant hover:border-outline-variant/60 hover:text-on-surface'}`}
            >
              <span className="material-symbols-outlined text-sm">tune</span>
              Filters
            </button>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="glass-card border border-outline-variant/10 rounded-2xl p-5 max-w-2xl mx-auto mb-6 text-left animate-slide-up">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {/* Category */}
                <div>
                  <label className="block text-xs text-on-surface-variant font-semibold mb-1.5 uppercase tracking-wider">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-3 py-2 text-sm text-on-surface outline-none focus:border-primary/40"
                  >
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                {/* Location */}
                <div>
                  <label className="block text-xs text-on-surface-variant font-semibold mb-1.5 uppercase tracking-wider">Location</label>
                  <select
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-3 py-2 text-sm text-on-surface outline-none focus:border-primary/40"
                  >
                    <option value="">Auto-detect from query</option>
                    {LOCATIONS.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                  </select>
                </div>
                {/* Min Price */}
                <div>
                  <label className="block text-xs text-on-surface-variant font-semibold mb-1.5 uppercase tracking-wider">Min Price ($)</label>
                  <input
                    type="number"
                    value={minPrice}
                    onChange={e => setMinPrice(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-3 py-2 text-sm text-on-surface outline-none focus:border-primary/40 placeholder:text-on-surface-variant/50"
                  />
                </div>
                {/* Max Price */}
                <div>
                  <label className="block text-xs text-on-surface-variant font-semibold mb-1.5 uppercase tracking-wider">Max Price ($)</label>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={e => setMaxPrice(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-3 py-2 text-sm text-on-surface outline-none focus:border-primary/40 placeholder:text-on-surface-variant/50"
                  />
                </div>
              </div>
              {/* Site toggles */}
              <div>
                <label className="block text-xs text-on-surface-variant font-semibold mb-2 uppercase tracking-wider">Sites to Search</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_SITES.map(site => (
                    <button
                      key={site.id}
                      onClick={() => toggleSite(site.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${selectedSites.has(site.id) ? 'text-white border-transparent' : 'border-outline-variant/30 text-on-surface-variant bg-transparent'}`}
                      style={selectedSites.has(site.id) ? { backgroundColor: site.color } : {}}
                    >
                      {site.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Example queries */}
          {!results && !loading && (
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
              {EXAMPLE_QUERIES.map(ex => (
                <button
                  key={ex}
                  onClick={() => handleSearch(ex)}
                  className="px-3 py-1.5 rounded-full bg-surface-container border border-outline-variant/20 text-on-surface-variant hover:text-on-surface hover:border-outline-variant/40 text-xs transition-all"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-4">
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-3">
            <span className="material-symbols-outlined">error</span>
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-300 hover:text-red-200">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-on-surface-variant text-sm">Searching across multiple sites…</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          {/* Stats bar */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex items-center gap-2">
              <span className="font-headline font-bold text-lg text-on-surface">{results.totalResults}</span>
              <span className="text-on-surface-variant text-sm">results</span>
            </div>
            <span className="text-outline-variant">•</span>
            <div className="flex flex-wrap gap-2">
              {results.sites.map(s => (
                <div
                  key={s.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: s.color + (s.error ? '44' : 'cc') }}
                >
                  {s.error ? (
                    <span className="material-symbols-outlined text-xs">error</span>
                  ) : (
                    <span className="font-bold">{s.count}</span>
                  )}
                  <span>{s.name}</span>
                  {s.url && (
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100" onClick={e => e.stopPropagation()}>
                      <span className="material-symbols-outlined text-xs">open_in_new</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
            {results.parsed && (
              <div className="ml-auto flex flex-wrap gap-1.5">
                {results.parsed.category && (
                  <span className="px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant/20 text-on-surface-variant text-xs">
                    {results.parsed.category}
                  </span>
                )}
                {results.parsed.location && (
                  <span className="px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant/20 text-on-surface-variant text-xs capitalize">
                    {results.parsed.location}
                  </span>
                )}
                {results.parsed.maxPrice && (
                  <span className="px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant/20 text-on-surface-variant text-xs">
                    max ${results.parsed.maxPrice.toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>

          {results.totalResults === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant">search_off</span>
              </div>
              <h3 className="font-headline font-bold text-xl mb-2">No results found</h3>
              <p className="text-on-surface-variant text-sm mb-4 max-w-md mx-auto">
                The sites may have blocked the request, or nothing matched your query. Try different search terms, or check the source links above.
              </p>
              <button
                onClick={() => { setResults(null); inputRef.current?.focus(); }}
                className="px-5 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold hover:bg-primary/20 transition-all"
              >
                Try another search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {results.results.map((item, i) => (
                <ResultCard key={`${item.source}-${i}`} item={item} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
