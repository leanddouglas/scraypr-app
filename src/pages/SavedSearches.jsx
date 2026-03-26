import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function SavedSearches() {
  const navigate = useNavigate();
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadSaved(); }, []);

  const loadSaved = async () => {
    try {
      const data = await api.getSavedSearches();
      setSaved(data);
    } catch (err) {
      console.error('Failed to load saved searches:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteSavedSearch(id);
      setSaved(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const runSearch = (item) => {
    const params = new URLSearchParams({
      q: item.query,
      loc: item.location,
      m: item.marketplaces.join(','),
    });
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <section className="px-4 sm:px-6 py-8 sm:py-12 border-b border-outline-variant/10">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-headline text-2xl sm:text-3xl font-extrabold mb-2">Saved Searches</h1>
          <p className="text-on-surface-variant font-body text-sm">Your saved deal alerts. Click to re-run any search instantly.</p>
        </div>
      </section>

      <section className="px-4 sm:px-6 py-8 max-w-4xl mx-auto">
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-card rounded-xl border border-outline-variant/10 p-5 animate-pulse">
                <div className="h-5 bg-on-surface/5 rounded w-48 mb-3" />
                <div className="h-3 bg-on-surface/5 rounded w-32" />
              </div>
            ))}
          </div>
        ) : saved.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="material-symbols-outlined text-primary text-5xl mb-4">bookmark_border</span>
            <h3 className="font-headline font-bold text-xl mb-2">No saved searches yet</h3>
            <p className="text-on-surface-variant text-sm mb-6">Search for deals and save your searches to monitor them.</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-gradient-to-r from-primary to-cyan-500 rounded-xl font-label font-bold text-surface"
            >
              Start Searching
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {saved.map(item => (
              <div key={item.id} className="glass-card border border-outline-variant/10 rounded-xl p-5 flex items-center justify-between gap-4 hover:border-primary/20 transition-all">
                <div className="flex-1 cursor-pointer" onClick={() => runSearch(item)}>
                  <h3 className="font-label font-bold text-base text-on-surface mb-1">&quot;{item.query}&quot;</h3>
                  <div className="flex items-center gap-3 text-on-surface-variant text-xs">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">location_on</span>
                      {item.location}
                    </span>
                    <span>{item.marketplaces.join(', ')}</span>
                    {item.maxPrice && <span>Max: ${item.maxPrice}</span>}
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => runSearch(item)}
                    className="px-4 py-2 bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded-lg font-label text-xs font-bold text-primary transition-all"
                  >
                    Run
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 hover:bg-red-500/10 rounded-lg transition-all text-on-surface-variant hover:text-red-400"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
