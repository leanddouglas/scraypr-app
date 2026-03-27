import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const POPULAR_SEARCHES = [
    'iPhone 15', 'MacBook Pro', 'PS5', 'Nintendo Switch',
    'Ford F-150', 'Honda Civic', 'Toyota Camry', 'Gaming PC',
    'Mountain Bike', 'Couch', 'TV 65 inch', 'AirPods Pro',
  ];

const SUGGESTED_LOCATIONS = [
    'Vancouver', 'Toronto', 'Montreal', 'Calgary', 'Edmonton', 'Ottawa',
    'Los Angeles', 'New York', 'San Francisco', 'Seattle', 'Portland', 'Chicago',
    'London', 'Paris', 'Berlin', 'Tokyo', 'Sydney', 'Melbourne',
    'São Paulo', 'Mexico City', 'Dubai', 'Mumbai', 'Singapore', 'Hong Kong',
  ];

const MARKETPLACES = [
  { id: 'craigslist', name: 'Craigslist', icon: '🏷️', active: true },
  { id: 'ebay', name: 'eBay', icon: '🛒', active: true },
  { id: 'autotrader', name: 'AutoTrader', icon: '🚗', active: true },
  { id: 'facebook', name: 'FB Marketplace', icon: '📘', active: true },
  { id: 'kijiji', name: 'Kijiji', icon: '🟢', active: true },    { id: 'reverb', name: 'Reverb', icon: '🎸', active: true },
  ];

export default function Home() {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [location, setLocation] = useState('Vancouver');
    const [selectedMarketplaces, setSelectedMarketplaces] = useState(['craigslist', 'ebay']);
    const [showLocations, setShowLocations] = useState(false);
    const [locationInput, setLocationInput] = useState('');
    const [filteredSuggestions, setFilteredSuggestions] = useState([]);
    const locationRef = useRef(null);

  // Filter suggestions as user types
  useEffect(() => {
        if (locationInput.trim()) {
                const filtered = SUGGESTED_LOCATIONS.filter(loc =>
                          loc.toLowerCase().includes(locationInput.toLowerCase())
                                                                  );
                setFilteredSuggestions(filtered);
        } else {
                setFilteredSuggestions(SUGGESTED_LOCATIONS);
        }
  }, [locationInput]);

  // Close dropdown when clicking outside
  useEffect(() => {
        const handleClickOutside = (e) => {
                if (locationRef.current && !locationRef.current.contains(e.target)) {
                          setShowLocations(false);
                }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const selectLocation = (loc) => {
        setLocation(loc);
        setLocationInput('');
        setShowLocations(false);
  };

  const handleLocationInputKeyDown = (e) => {
        if (e.key === 'Enter') {
                e.preventDefault();
                if (locationInput.trim()) {
                          setLocation(locationInput.trim());
                          setLocationInput('');
                          setShowLocations(false);
                }
        }
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
              
                {/* Location Selector - Free text with suggestions */}
                      <div className="relative mb-6" ref={locationRef}>
                                <button
                                              onClick={() => setShowLocations(!showLocations)}
                                              className="flex items-center gap-2 px-4 py-2 glass-card border border-outline-variant/10 rounded-xl hover:border-primary/30 transition-all"
                                            >
                                            <span className="material-symbols-outlined text-primary text-sm">location_on</span>
                                            <span className="font-label text-sm text-on-surface">{location}</span>
                                            <span className="material-symbols-outlined text-on-surface-variant text-sm">expand_more</span>
                                </button>
                      
                        {showLocations && (
                      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 glass-panel border border-outline-variant/20 rounded-xl p-3 w-80 sm:w-96">
                        {/* Search input for location */}
                                    <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-on-surface/5 rounded-lg">
                                                    <span className="material-symbols-outlined text-on-surface-variant text-sm">search</span>
                                                    <input
                                                                        type="text"
                                                                        value={locationInput}
                                                                        onChange={(e) => setLocationInput(e.target.value)}
                                                                        onKeyDown={handleLocationInputKeyDown}
                                                                        placeholder="Type any city worldwide..."
                                                                        className="flex-1 bg-transparent outline-none font-label text-xs text-on-surface placeholder-on-surface-variant/50"
                                                                        autoFocus
                                                                      />
                                    </div>
                        {/* Custom location hint */}
                        {locationInput.trim() && !filteredSuggestions.some(s => s.toLowerCase() === locationInput.toLowerCase()) && (
                                        <button
                                                            onClick={() => selectLocation(locationInput.trim())}
                                                            className="w-full px-3 py-2 rounded-lg text-left font-label text-xs transition-all hover:bg-primary/10 text-primary flex items-center gap-2 mb-1"
                                                          >
                                                          <span className="material-symbols-outlined text-xs">add_location</span>
                                            {`Use "${locationInput.trim()}"`}
                                        </button>
                                    )}
                        {/* Suggestions list */}
                                    <div className="max-h-48 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-1">
                                      {filteredSuggestions.map(loc => (
                                          <button
                                                                key={loc}
                                                                onClick={() => selectLocation(loc)}
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
                        {filteredSuggestions.length === 0 && locationInput.trim() && (
                                        <p className="text-on-surface-variant/50 text-xs text-center py-2 font-label">
                                                          No suggestions — press Enter or click above to use your custom location
                                        </p>
                                    )}
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
                                            <div className="font-headline font-bold text-primary text-lg">6</div>
                                            <div className="font-label text-xs text-on-surface-variant">Marketplaces</div>
                                </div>
                                <div>
                                            <div className="font-headline font-bold text-primary text-lg">Worldwide</div>
                                            <div className="font-label text-xs text-on-surface-variant">Any City</div>
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
