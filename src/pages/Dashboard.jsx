import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [scrapers, setScrapers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncDialog, setSyncDialog] = useState(null);
  const [runningScrapers, setRunningScrapers] = useState(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [scrapersData, statsData] = await Promise.all([
        api.getScrapers(),
        api.getStats(),
      ]);
      setScrapers(scrapersData);
      setStats(statsData);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunScrape = async (scraperId, scraperName) => {
    try {
      setRunningScrapers((prev) => new Set([...prev, scraperId]));
      const result = await api.runScrape(scraperId);

      // Use real record count from API response
      setSyncDialog({
        scraperName,
        recordCount: result.recordCount || 0,
        duration: result.duration || 0,
      });
      setRunningScrapers((prev) => {
        const next = new Set(prev);
        next.delete(scraperId);
        return next;
      });
      fetchData();
    } catch (err) {
      console.error('Failed to run scrape:', err);
      setRunningScrapers((prev) => {
        const next = new Set(prev);
        next.delete(scraperId);
        return next;
      });
      setError(`Scrape failed: ${err.message}`);
    }
  };

  const formatNumber = (num) => {
    if (!num || num === 0) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 py-10 sm:py-16 md:py-24">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-headline font-bold mb-3 sm:mb-4 tracking-tight">
            Quantum{' '}
            <span className="bg-gradient-to-r from-primary to-primary text-transparent bg-clip-text">
              Extraction
            </span>
          </h1>
          <p className="text-on-surface-variant font-body text-base sm:text-lg md:text-xl mb-6 sm:mb-8 max-w-2xl">
            Monitor and manage your web scraping pipelines in real-time with intelligent data extraction
          </p>
          <button
            onClick={() => navigate('/create')}
            className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-primary to-primary-container rounded-full font-label font-semibold text-surface transition-all duration-300 hover:shadow-lg hover:shadow-primary/50 shadow-lg shadow-primary/30 text-sm sm:text-base"
          >
            Create New Scraper
          </button>
        </div>
      </section>

      {/* Error State */}
      {error && (
        <div className="max-w-7xl mx-auto px-6 mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-4 text-red-300 hover:text-red-200">✕</button>
        </div>
      )}

      {/* Stats Bento Grid */}
      {stats && (
        <section className="px-4 sm:px-6 py-8 sm:py-12 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Total Records */}
            <div className="md:col-span-2 glass-card border border-outline-variant/10 rounded-2xl p-6">
              <div className="flex flex-col h-full">
                <h3 className="font-label text-on-surface-variant text-sm mb-4">Total Records Extracted</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl md:text-5xl font-headline font-bold text-primary">
                    {formatNumber(stats.totalRecords)}
                  </span>
                  <span className="font-label text-on-surface-variant">records</span>
                </div>
                <div className="mt-4 flex items-center gap-4 text-sm text-on-surface-variant">
                  <span>{stats.totalRuns || 0} total runs</span>
                  <span>•</span>
                  <span>{stats.totalScrapers || 0} scrapers</span>
                </div>
              </div>
            </div>

            {/* Success Rate */}
            <div className="glass-card border border-outline-variant/10 rounded-2xl p-6">
              <h3 className="font-label text-on-surface-variant text-sm mb-4">Success Rate</h3>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-headline font-bold text-primary">
                  {stats.totalScrapers > 0 ? stats.avgSuccessRate : '--'}%
                </span>
              </div>
              <p className="font-label text-on-surface-variant text-sm mt-2">
                Across {stats.totalScrapers || 0} scrapers
              </p>
            </div>

            {/* Active Scrapers */}
            <div className="glass-card border border-outline-variant/10 rounded-2xl p-6">
              <h3 className="font-label text-on-surface-variant text-sm mb-4">Active Scrapers</h3>
              <div className="flex items-center gap-2 mb-4">
                {stats.activeScrapers > 0 && (
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                )}
                <span className="font-label font-semibold">
                  {stats.activeScrapers || 0} running
                </span>
              </div>
              <p className="font-label text-on-surface-variant text-sm">
                {stats.totalScrapers || 0} total configured
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Active Scrapers Section */}
      <section className="px-4 sm:px-6 py-8 sm:py-12 max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-headline font-bold mb-4">Your Scrapers</h2>
          <div className="h-1 w-32 bg-gradient-to-r from-primary to-transparent rounded-full" />
        </div>

        {loading ? (
          <div className="text-center py-12 text-on-surface-variant">
            Loading scrapers...
          </div>
        ) : scrapers.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-primary text-4xl">travel_explore</span>
            </div>
            <h3 className="font-headline font-bold text-xl mb-2 text-on-surface">No scrapers yet</h3>
            <p className="mb-6">Create your first scraper to start extracting real data from the web.</p>
            <button
              onClick={() => navigate('/create')}
              className="px-6 py-3 bg-gradient-to-r from-primary to-primary-container rounded-full font-label font-semibold text-surface shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all"
            >
              Create Your First Scraper
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {scrapers.map((scraper) => {
              const isRunning = runningScrapers.has(scraper.id);
              const status = isRunning ? 'Running' : (scraper.status || 'idle').charAt(0).toUpperCase() + (scraper.status || 'idle').slice(1);

              return (
                <div
                  key={scraper.id}
                  className="glass-card border border-outline-variant/10 rounded-2xl p-6 hover:border-outline-variant/20 transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                          <span className="text-primary font-headline font-bold">
                            {scraper.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-headline font-bold text-lg">{scraper.name}</h3>
                          <p className="text-xs text-on-surface-variant truncate max-w-[200px]">{scraper.url}</p>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div
                      className={`px-3 py-1 rounded-full font-label text-xs font-semibold flex items-center gap-2 ${
                        isRunning
                          ? 'bg-blue-500/20 text-blue-300'
                          : scraper.status === 'error'
                            ? 'bg-red-500/20 text-red-300'
                            : scraper.status === 'idle'
                              ? 'bg-gray-500/20 text-gray-300'
                              : 'bg-green-500/20 text-green-300'
                      }`}
                    >
                      {isRunning && (
                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                      )}
                      {status}
                    </div>
                  </div>

                  {/* Stats — from real scraper.stats object */}
                  <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-outline-variant/10">
                    <div>
                      <p className="font-label text-on-surface-variant text-xs mb-1">Records</p>
                      <p className="font-headline font-bold text-lg">
                        {formatNumber(scraper.stats?.totalRecords || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="font-label text-on-surface-variant text-xs mb-1">Runs</p>
                      <p className="font-headline font-bold text-lg">{scraper.stats?.runsCount || 0}</p>
                    </div>
                    <div>
                      <p className="font-label text-on-surface-variant text-xs mb-1">Last Run</p>
                      <p className="font-label text-xs text-on-surface-variant">
                        {scraper.stats?.lastRun
                          ? new Date(scraper.stats.lastRun).toLocaleString()
                          : 'Never'}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    <button
                      onClick={() => handleRunScrape(scraper.id, scraper.name)}
                      disabled={isRunning}
                      className="flex-1 min-w-[5rem] px-3 sm:px-4 py-2 bg-primary/20 hover:bg-primary/30 disabled:opacity-50 disabled:cursor-not-allowed border border-primary/30 rounded-lg font-label text-xs sm:text-sm font-semibold text-primary transition-all duration-200"
                    >
                      {isRunning ? 'Running...' : 'Run Now'}
                    </button>
                    <button
                      onClick={() => navigate(`/settings/${scraper.id}`)}
                      className="flex-1 min-w-[5rem] px-3 sm:px-4 py-2 bg-on-surface/5 hover:bg-on-surface/10 border border-outline-variant/20 rounded-lg font-label text-xs sm:text-sm font-semibold text-on-surface transition-all duration-200"
                    >
                      Settings
                    </button>
                    <button
                      onClick={() => navigate(`/data/${scraper.id}`)}
                      className="flex-1 min-w-[5rem] px-3 sm:px-4 py-2 bg-on-surface/5 hover:bg-on-surface/10 border border-outline-variant/20 rounded-lg font-label text-xs sm:text-sm font-semibold text-on-surface transition-all duration-200"
                    >
                      View Data
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Sync Complete Dialog — uses REAL data from API */}
      {syncDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card border border-outline-variant/10 rounded-2xl p-8 max-w-sm w-full">
            {/* Checkmark */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>

            <h2 className="text-2xl font-headline font-bold text-center mb-2">Scrape Complete</h2>

            <div className="bg-on-surface/5 rounded-lg p-4 mb-6 text-center">
              <p className="font-headline font-bold text-xl text-primary mb-1">
                {formatNumber(syncDialog.recordCount)}
              </p>
              <p className="font-label text-on-surface-variant text-sm">
                records extracted from {syncDialog.scraperName}
              </p>
              {syncDialog.duration > 0 && (
                <p className="font-label text-on-surface-variant text-xs mt-1">
                  in {(syncDialog.duration / 1000).toFixed(1)}s
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSyncDialog(null);
                  navigate('/data');
                }}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-primary to-primary-container rounded-lg font-label font-semibold text-surface transition-all duration-200 hover:shadow-lg hover:shadow-primary/30"
              >
                View Results
              </button>
              <button
                onClick={() => setSyncDialog(null)}
                className="flex-1 px-4 py-3 bg-on-surface/5 hover:bg-on-surface/10 border border-outline-variant/20 rounded-lg font-label font-semibold text-on-surface transition-all duration-200"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
