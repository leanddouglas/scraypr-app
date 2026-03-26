import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const POPULAR_SEARCHES = [
  'iPhone 15', 'MacBook Pro', 'PS5', 'Nintendo Switch',
  'Ford F-150', 'Honda Civic', 'Toyota Camry', 'Gaming PC',
  'Mountain Bike', 'Couch', 'TV 65 inch', 'AirPods Pro',
];

const LOCATIONS = [
  'Vancouver', 'Toronto', 'Montreal', 'Calgary', 'Edmonton', 'Ottawa',
  'Los Angeles', 'New York', 'San Francisco', 'Seattle', 'Portland',
  'Chicago', 'Houston', 'Phoenix', 'Denver', 'Miami', 'Atlanta',
  'Boston', 'Dallas', 'Austin', 'San Diego', 'Las Vegas',
];

const MARKETPLACES = [
  { id: 'craigslist', name: 'Craigslist', icon: '🏷️', active: true },
  { id: 'ebay', name: 'eBay', icon: '🛒', active: true },
  { id: 'autotrader', name: 'AutoTrader', icon: '🚗', active: true },
  { id: 'facebook', name: 'FB Marketplace', icon: '📘', active: false },
  { id: 'kijiji', name: 'Kijiji', icon: '🟢', active: false },
];

export default function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('Vancouver');
  const [selectedMarketplaces, setSelectedMarketplaces] = useState(['craigslist', 'ebay']);
  const [showLocations, setShowLocations] = useState(false);

  const toggleMarketplace = (id) => {
    if (!MARKETPLACES.find(m => m.id === id)?.active) return;
    setSelectedMarketplaces(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleSearch = (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    const params = new URLSearchParams({
      q: query.trim(),
      loc: location,
      m: selectedMarketplaces.join(','),
    });
    navigate(`/search?${params.toString()}`);
  };

  const quickSearch = (term) => {
    setQuery(term);
    const params = new URLSearchParams({
      q: term,
      loc: location,
      m: selectedMarketplaces.join(','),
    });
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:py-20">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="font-headline text-4xl sm:text-6xl font-black mb-3 bg-gradient-to-r from-primary via-cyan-400 to-primary-container bg-clip-text text-transparent">
            SCRAYPR
          </h1>
          <p className="text-on-surface-variant font-body text-lg sm:text-xl max-w-xl mx-auto">
            Find the best deals across every marketplace. Search once, see everything.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="w-full max-w-2xl mb-6">
          <div className="glass-card border border-outline-variant/20 rounded-2xl p-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl ml-3">search</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What are you looking for? e.g. iPhone 15, Ford F-150..."
              className="flex-1 bg-transparent outline-none font-body text-on-surface placeholder-on-surface-variant/50 text-base sm:text-lg py-3"
              autoFocus
            />
            <button
              type="submit"
              disabled={!query.trim()}
              className="px-5 sm:px-8 py-3 bg-gradient-to-r from-primary to-cyan-500 rounded-xl font-label font-bold text-surface text-sm sm:text-base shadow-lg shadow-primary/30 hover:shadow-primary/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Find Deals
            </button>
          </div>
        </form>

        {/* Location Selector */}
        <div className="relative mb-6">
          <button
            onClick={() => setShowLocations(!showLocations)}
            className="flex items-center gap-2 px-4 py-2 glass-card border border-outline-variant/10 rounded-xl hover:border-primary/30 transition-all"
          >
            <span className="material-symbols-outlined text-primary text-sm">location_on</span>
            <span className="font-label text-sm text-on-surface">{location}</span>
            <span className="material-symbols-outlined text-on-surface-variant text-sm">expand_more</span>
          </button>
          {showLocations && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 glass-panel border border-outline-variant/20 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-3 gap-1 w-80 sm:w-96 max-h-64 overflow-y-auto">
              {LOCATIONS.map(loc => (
                <button
                  key={loc}
                  onClick={() => { setLocation(loc); setShowLocations(false); }}
                  className={`px-3 py-2 rounded-lg text-left font-label text-xs transition-all ${
                    location === loc
                      ? 'bg-primary text-surface font-bold'
                      : 'hover:bg-on-surface/5 text-on-surface-variant'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Marketplace Toggles */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-10">
          {MARKETPLACES.map(mp => (
            <button
              key={mp.id}
              onClick={() => toggleMarketplace(mp.id)}
              disabled={!mp.active}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-label text-sm font-semibold transition-all border ${
                !mp.active
                  ? 'opacity-30 cursor-not-allowed border-outline-variant/10 text-on-surface-variant'
                  : selectedMarketplaces.includes(mp.id)
                    ? 'bg-primary/20 border-primary/40 text-primary shadow-md shadow-primary/10'
                    : 'border-outline-variant/10 text-on-surface-variant hover:border-primary/20 hover:bg-on-surface/5'
              }`}
            >
              <span className="text-base">{mp.icon}</span>
              {mp.name}
              {!mp.active && <span className="text-[10px] opacity-60">Soon</span>}
            </button>
          ))}
        </div>

        {/* Popular Searches */}
        <div className="text-center max-w-2xl">
          <p className="font-label text-xs text-on-surface-variant/60 uppercase tracking-wider mb-3">Popular searches</p>
          <div className="flex flex-wrap justify-center gap-2">
            {POPULAR_SEARCHES.map(term => (
              <button
                key={term}
                onClick={() => quickSearch(term)}
                className="px-3 py-1.5 rounded-lg bg-on-surface/5 hover:bg-primary/10 hover:text-primary text-on-surface-variant font-label text-xs transition-all"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <footer className="border-t border-outline-variant/10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-center gap-8 sm:gap-16 text-center">
          <div>
            <div className="font-headline font-bold text-primary text-lg">3</div>
            <div className="font-label text-xs text-on-surface-variant">Marketplaces</div>
          </div>
          <div>
            <div className="font-headline font-bold text-primary text-lg">22+</div>
            <div className="font-label text-xs text-on-surface-variant">Cities</div>
          </div>
          <div>
            <div className="font-headline font-bold text-primary text-lg">Real-time</div>
            <div className="font-label text-xs text-on-surface-variant">Live Results</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
