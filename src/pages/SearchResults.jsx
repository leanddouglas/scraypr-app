import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

function DealCard({ deal }) {
  const marketplaceColors = {
    craigslist: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    autotrader: 'bg-green-500/20 text-green-400 border-green-500/30',
    ebay: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  };
  const marketplaceIcons = { craigslist: '🏷️', autotrader: '🚗', ebay: '🛒' };

  return (
    <a
      href={deal.url}
      target="_blank"
      rel="noopener noreferrer"
      className="glass-card border border-outline-variant/10 rounded-xl p-4 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group block"
    >
      {/* Image placeholder or actual image */}
      {deal.image ? (
        <div className="w-full h-36 rounded-lg mb-3 overflow-hidden bg-on-surface/5">
          <img src={deal.image} alt={deal.title} className="w-full h-full object-cover" loading="lazy" />
        </div>
      ) : (
        <div className="w-full h-20 rounded-lg mb-3 bg-gradient-to-br from-primary/5 to-primary-container/5 flex items-center justify-center">
          <span className="text-3xl">{marketplaceIcons[deal.marketplace] || '📦'}</span>
        </div>
      )}

      {/* Marketplace badge */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${marketplaceColors[deal.marketplace] || 'bg-on-surface/10 text-on-surface-variant'}`}>
          {deal.marketplace}
        </span>
        {deal.location && (
          <span className="text-on-surface-variant/50 text-[10px] font-label flex items-center gap-0.5">
            <span className="material-symbols-outlined text-[10px]">location_on</span>
            {deal.location}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-label font-semibold text-sm text-on-surface mb-2 line-clamp-2 group-hover:text-primary transition-colors">
        {deal.title}
      </h3>

      {/* Price */}
      <div className="flex items-baseline justify-between">
        <span className={`font-headline font-black text-xl ${deal.price ? 'text-emerald-400' : 'text-on-surface-variant'}`}>
          {deal.priceText}
        </span>
        <span className="material-symbols-outlined text-on-surface-variant/30 text-sm group-hover:text-primary transition-colors">
          open_in_new
        </span>
      </div>
    </a>
  );
}

function PriceStats({ stats }) {
  if (!stats || stats.pricedDeals === 0) return null;
  return (
    <div className="flex flex-wrap gap-3 sm:gap-4">
      <div className="glass-card border border-outline-variant/10 rounded-xl px-4 py-3 flex-1 min-w-[120px]">
        <div className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Lowest</div>
        <div className="font-headline font-black text-lg text-emerald-400">${stats.lowestPrice.toLocaleString()}</div>
      </div>
      <div className="glass-card border border-outline-variant/10 rounded-xl px-4 py-3 flex-1 min-w-[120px]">
        <div className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Average</div>
        <div className="font-headline font-black text-lg text-primary">${stats.avgPrice.toLocaleString()}</div>
      </div>
      <div className="glass-card border border-outline-variant/10 rounded-xl px-4 py-3 flex-1 min-w-[120px]">
        <div className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Highest</div>
        <div className="font-headline font-black text-lg text-orange-400">${stats.highestPrice.toLocaleString()}</div>
      </div>
      <div className="glass-card border border-outline-variant/10 rounded-xl px-4 py-3 flex-1 min-w-[120px]">
        <div className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Total Deals</div>
        <div className="font-headline font-black text-lg text-on-surface">{stats.totalDeals}</div>
      </div>
    </div>
  );
}

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const location = searchParams.get('loc') || 'Vancouver';
  const marketplaces = (searchParams.get('m') || 'craigslist,ebay').split(',');

  const [deals, setDeals] = useState([]);
  const [stats, setStats] = useState(null);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('price_asc');
  const [filterMarketplace, setFilterMarketplace] = useState('all');
  const [searchInput, setSearchInput] = useState(query);

  useEffect(() => {
    if (query) runSearch();
  }, [query, location, searchParams.get('m')]);

  const runSearch = async () => {
    setLoading(true);
    setDeals([]);
    setStats(null);
    setErrors([]);
    try {
      const result = await api.search(query, marketplaces, location);
      setDeals(result.deals || []);
      setStats(result.stats || null);
      setErrors(result.errors || []);
    } catch (err) {
      setErrors([err.message]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewSearch = (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    const params = new URLSearchParams({ q: searchInput.trim(), loc: location, m: marketplaces.join(',') });
    navigate(`/search?${params.toString()}`);
  };

  // Filtering and sorting
  const filtered = deals.filter(d => filterMarketplace === 'all' || d.marketplace === filterMarketplace);
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'price_asc') {
      if (a.price === null) return 1;
      if (b.price === null) return -1;
      return a.price - b.price;
    }
    if (sortBy === 'price_desc') {
      if (a.price === null) return 1;
      if (b.price === null) return -1;
      return b.price - a.price;
    }
    return 0;
  });

  const marketplaceCounts = {};
  deals.forEach(d => { marketplaceCounts[d.marketplace] = (marketplaceCounts[d.marketplace] || 0) + 1; });

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* Search Header */}
      <section className="px-4 sm:px-6 py-6 border-b border-outline-variant/10">
        <div className="max-w-6xl mx-auto">
          <form onSubmit={handleNewSearch} className="flex gap-2">
            <div className="flex-1 glass-card border border-outline-variant/20 rounded-xl px-4 py-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">search</span>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1 bg-transparent outline-none font-body text-on-surface placeholder-on-surface-variant/50"
                placeholder="Search for deals..."
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-primary to-cyan-500 rounded-xl font-label font-bold text-surface text-sm shadow-lg shadow-primary/20"
            >
              Search
            </button>
          </form>
          <div className="flex items-center gap-3 mt-3 text-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-sm">location_on</span>
            <span>{location}</span>
            <span className="text-outline-variant">•</span>
            <span>{marketplaces.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(', ')}</span>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-6" />
            <h3 className="font-headline font-bold text-xl mb-2">Searching marketplaces...</h3>
            <p className="text-on-surface-variant text-sm">Scanning {marketplaces.length} marketplace{marketplaces.length > 1 ? 's' : ''} for &quot;{query}&quot;</p>
          </div>
        )}

        {/* Results */}
        {!loading && (
          <>
            {/* Stats */}
            {stats && <div className="mb-6"><PriceStats stats={stats} /></div>}

            {/* Errors */}
            {errors.length > 0 && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
                {errors.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <h2 className="font-headline font-bold text-lg">
                {sorted.length} deal{sorted.length !== 1 ? 's' : ''} found
                <span className="text-on-surface-variant font-normal text-sm ml-2">for &quot;{query}&quot;</span>
              </h2>
              <div className="flex gap-2">
                {/* Marketplace Filter */}
                <div className="flex gap-1">
                  <button
                    onClick={() => setFilterMarketplace('all')}
                    className={`px-3 py-1.5 rounded-lg font-label text-xs font-semibold transition-all ${
                      filterMarketplace === 'all' ? 'bg-primary text-surface' : 'bg-on-surface/5 text-on-surface-variant hover:bg-on-surface/10'
                    }`}
                  >
                    All ({deals.length})
                  </button>
                  {Object.entries(marketplaceCounts).map(([mp, count]) => (
                    <button
                      key={mp}
                      onClick={() => setFilterMarketplace(mp)}
                      className={`px-3 py-1.5 rounded-lg font-label text-xs font-semibold transition-all ${
                        filterMarketplace === mp ? 'bg-primary text-surface' : 'bg-on-surface/5 text-on-surface-variant hover:bg-on-surface/10'
                      }`}
                    >
                      {mp} ({count})
                    </button>
                  ))}
                </div>
                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-on-surface/5 border border-outline-variant/10 font-label text-xs text-on-surface-variant outline-none"
                >
                  <option value="price_asc">Price: Low → High</option>
                  <option value="price_desc">Price: High → Low</option>
                </select>
              </div>
            </div>

            {/* Deal Cards Grid */}
            {sorted.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sorted.map(deal => <DealCard key={deal.id} deal={deal} />)}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <span className="material-symbols-outlined text-primary text-5xl mb-4">search_off</span>
                <h3 className="font-headline font-bold text-xl mb-2">No deals found</h3>
                <p className="text-on-surface-variant text-sm mb-6">Try a different search term or expand your marketplaces</p>
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-3 bg-gradient-to-r from-primary to-cyan-500 rounded-xl font-label font-bold text-surface"
                >
                  Back to Search
                </button>
              </div>
            )}

            {/* Footer note */}
            {sorted.length > 0 && (
              <div className="mt-8 text-center text-on-surface-variant/40 text-xs font-label">
                Results are scraped live from real marketplace listings. Click any deal to view on the original site.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
