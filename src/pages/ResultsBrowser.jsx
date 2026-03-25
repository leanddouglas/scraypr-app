import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function ResultsBrowser() {
  const { scraperId } = useParams();
  const navigate = useNavigate();
  const [scrapers, setScrapers] = useState([]);
  const [selectedScraperId, setSelectedScraperId] = useState(scraperId || null);
  const [runs, setRuns] = useState([]); // Array of run objects: { id, timestamp, recordCount, duration, data: [...] }
  const [selectedRunIndex, setSelectedRunIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchScrapers();
  }, []);

  useEffect(() => {
    if (selectedScraperId) {
      fetchResults(selectedScraperId);
    }
  }, [selectedScraperId]);

  const fetchScrapers = async () => {
    try {
      const data = await api.getScrapers();
      setScrapers(data);
      if (!selectedScraperId && data.length > 0) {
        setSelectedScraperId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load scrapers:', err);
      setError('Failed to load scrapers');
    }
  };

  const fetchResults = async (id) => {
    try {
      setLoading(true);
      const data = await api.getResults(id);
      // API returns an array of run objects, each with a .data array of records
      setRuns(Array.isArray(data) ? data : []);
      setSelectedRunIndex(0);
      setError(null);
    } catch (err) {
      console.error('Failed to load results:', err);
      setError('Failed to load results');
      setRuns([]);
    } finally {
      setLoading(false);
    }
  };

  // Get the actual data records from the selected run
  const currentRun = runs[selectedRunIndex] || null;
  const records = currentRun?.data || [];

  // Determine column headers from the first record (excluding _index and _type)
  const columnKeys = records.length > 0
    ? Object.keys(records[0]).filter(k => !k.startsWith('_'))
    : [];

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* Header Section */}
      <section className="px-4 sm:px-6 py-8 sm:py-12 border-b border-outline-variant/10">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-headline text-2xl sm:text-3xl font-extrabold mb-2">
            Scraped Results
          </h1>
          <p className="text-on-surface-variant font-body text-sm mb-6">
            {runs.length} run{runs.length !== 1 ? 's' : ''} found
            {currentRun && ` — viewing ${records.length} record${records.length !== 1 ? 's' : ''} from latest run`}
          </p>
        </div>
      </section>

      {/* Scraper Selector */}
      {!scraperId && scrapers.length > 0 && (
        <section className="px-6 py-6 border-b border-outline-variant/10">
          <div className="max-w-7xl mx-auto">
            <p className="font-label text-sm text-on-surface-variant mb-3">
              Select Scraper
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {scrapers.map((scraper) => (
                <button
                  key={scraper.id}
                  onClick={() => setSelectedScraperId(scraper.id)}
                  className={`px-4 py-2 rounded-lg font-label font-semibold whitespace-nowrap transition-all ${
                    selectedScraperId === scraper.id
                      ? 'bg-primary text-surface'
                      : 'bg-on-surface/5 text-on-surface-variant hover:bg-on-surface/10'
                  }`}
                >
                  {scraper.name}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Run Selector — if multiple runs exist */}
      {runs.length > 1 && (
        <section className="px-6 py-4 border-b border-outline-variant/10">
          <div className="max-w-7xl mx-auto">
            <p className="font-label text-sm text-on-surface-variant mb-2">
              Select Run
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {runs.map((run, idx) => (
                <button
                  key={run.id}
                  onClick={() => setSelectedRunIndex(idx)}
                  className={`px-3 py-1.5 rounded-lg font-label text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedRunIndex === idx
                      ? 'bg-primary text-surface'
                      : 'bg-on-surface/5 text-on-surface-variant hover:bg-on-surface/10'
                  }`}
                >
                  {new Date(run.timestamp).toLocaleString()} — {run.recordCount} records ({run.duration}ms)
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <section className="px-4 sm:px-6 py-8 sm:py-12 max-w-7xl mx-auto">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          // Loading State: Skeleton
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="glass-card rounded-xl border border-outline-variant/10 p-4 flex gap-4"
              >
                <div className="h-4 bg-on-surface/5 rounded flex-1 animate-pulse" />
                <div className="h-4 bg-on-surface/5 rounded w-32 animate-pulse" />
                <div className="h-4 bg-on-surface/5 rounded w-24 animate-pulse" />
              </div>
            ))}
          </div>
        ) : records.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-primary text-4xl">search</span>
            </div>
            <h3 className="font-headline font-bold text-xl mb-2">No Results Yet</h3>
            <p className="text-on-surface-variant text-center max-w-sm mb-6">
              Run a scrape to extract real data from your configured URLs. Results will appear here in a table.
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-gradient-to-r from-primary to-primary-container rounded-full font-label font-semibold text-surface shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          // Data Table — real extracted data
          <div>
            {/* Run metadata */}
            {currentRun && (
              <div className="mb-4 flex items-center gap-4 text-sm text-on-surface-variant">
                <span>Run at: {new Date(currentRun.timestamp).toLocaleString()}</span>
                <span>•</span>
                <span>{currentRun.recordCount} records</span>
                <span>•</span>
                <span>{currentRun.duration}ms</span>
              </div>
            )}

            <div className="glass-card rounded-xl border border-outline-variant/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-on-surface/5 border-b border-outline-variant/10">
                    <tr>
                      <th className="px-4 py-3 text-left font-label font-semibold text-on-surface-variant text-sm w-12">
                        #
                      </th>
                      {columnKeys.map((key) => (
                        <th
                          key={key}
                          className="px-4 py-3 text-left font-label font-semibold text-on-surface-variant text-sm"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-outline-variant/10 hover:bg-on-surface/5 transition-colors"
                      >
                        <td className="px-4 py-3 font-body text-xs text-on-surface-variant">
                          {idx + 1}
                        </td>
                        {columnKeys.map((key) => (
                          <td
                            key={key}
                            className="px-4 py-3 font-body text-sm text-on-surface max-w-xs truncate"
                          >
                            {typeof record[key] === 'object'
                              ? JSON.stringify(record[key])
                              : String(record[key] || '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Record count footer */}
            <div className="mt-4 text-sm text-on-surface-variant text-center">
              Showing {records.length} record{records.length !== 1 ? 's' : ''} from real scrape data
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
