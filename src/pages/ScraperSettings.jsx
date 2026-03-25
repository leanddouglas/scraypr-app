import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
// Using Material Symbols Outlined (loaded via Google Fonts in index.html)

export default function ScraperSettings() {
  const { scraperId } = useParams();
  const navigate = useNavigate();

  const [scraper, setScraper] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    autoScrapingEnabled: false,
    frequency: 'hourly',
  });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadScraperData();
  }, [scraperId]);

  const loadScraperData = async () => {
    try {
      setLoading(true);
      const scraperData = await api.getScraper(scraperId);
      setScraper(scraperData);
      setFormData({
        name: scraperData.name || '',
        url: scraperData.url || '',
        autoScrapingEnabled: scraperData.schedule?.enabled || false,
        frequency: scraperData.schedule?.frequency || 'hourly',
      });

      // Load logs separately so a failure doesn't block the whole page
      try {
        const logsData = await api.getLogs(scraperId);
        setLogs(logsData || []);
      } catch (logErr) {
        console.error('Failed to load logs:', logErr);
        setLogs([]);
      }
    } catch (error) {
      console.error('Failed to load scraper data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleToggleAutoScraping = () => {
    setFormData((prev) => ({
      ...prev,
      autoScrapingEnabled: !prev.autoScrapingEnabled,
    }));
  };

  const handleFrequencyChange = (frequency) => {
    setFormData((prev) => ({
      ...prev,
      frequency,
    }));
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      await api.updateScraper(scraperId, {
        name: formData.name,
        url: formData.url,
        schedule: {
          enabled: formData.autoScrapingEnabled,
          frequency: formData.frequency,
        },
      });
      alert('Scraper settings saved successfully!');
    } catch (error) {
      console.error('Failed to save scraper settings:', error);
      alert('Failed to save scraper settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestRun = async () => {
    try {
      await api.runScrape(scraperId);
      alert('Scrape test run started!');
      setTimeout(loadScraperData, 2000);
    } catch (error) {
      console.error('Failed to run scrape:', error);
      alert('Failed to start scrape test run. Please try again.');
    }
  };

  const handleDeleteScraper = async () => {
    try {
      await api.deleteScraper(scraperId);
      navigate('/');
    } catch (error) {
      console.error('Failed to delete scraper:', error);
      alert('Failed to delete scraper. Please try again.');
    }
  };

  if (loading && !scraper) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-on-surface">Loading scraper settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface p-4 sm:p-6 lg:p-8">
      {/* Breadcrumb */}
      <div className="mb-8 text-xs uppercase tracking-widest text-on-surface-variant">
        <span>Scrapers</span>
        <span className="mx-2">{'>'}</span>
        <span>{formData.name || 'Loading...'}</span>
      </div>

      {/* Page Title */}
      <h1 className="font-headline text-2xl sm:text-3xl font-extrabold mb-6 sm:mb-8">Scraper Settings & Logs</h1>

      {/* Action Buttons Row */}
      <div className="flex flex-wrap gap-3 sm:gap-4 mb-6 sm:mb-8">
        <button
          onClick={handleTestRun}
          className="px-6 py-3 border border-outline-variant/30 rounded-full hover:bg-surface-container-high transition-colors text-on-surface"
        >
          Test Run
        </button>
        <button
          onClick={handleSaveChanges}
          className="px-6 py-3 bg-gradient-to-r from-primary to-blue-400 text-on-primary rounded-full hover:shadow-lg hover:shadow-primary/50 transition-all font-medium"
        >
          Save Changes
        </button>
      </div>

      {/* General Configuration Section */}
      <div className="glass-card border border-outline-variant/10 rounded-2xl p-6 mb-8 backdrop-blur-md bg-surface-container-high/40">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-primary">settings</span>
          <h2 className="text-xl font-semibold">General Configuration</h2>
        </div>

        <div className="space-y-6">
          {/* Scraper Name Input */}
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-2">
              Scraper Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-surface-container border border-outline-variant/20 rounded-lg text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
              placeholder="Enter scraper name"
            />
          </div>

          {/* Target Domain/URL Input */}
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-2">
              Target Domain / URL
            </label>
            <input
              type="text"
              name="url"
              value={formData.url}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-surface-container border border-outline-variant/20 rounded-lg text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
              placeholder="https://example.com"
            />
          </div>

          {/* Auto-Scraping Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-on-surface-variant">
              Enable Auto-Scraping
            </label>
            <button
              onClick={handleToggleAutoScraping}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                formData.autoScrapingEnabled
                  ? 'bg-primary'
                  : 'bg-surface-container border border-outline-variant/20'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  formData.autoScrapingEnabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Scheduling Section - Show only when auto-scraping is enabled */}
      {formData.autoScrapingEnabled && (
        <div className="glass-card border border-outline-variant/10 rounded-2xl p-6 mb-8 backdrop-blur-md bg-surface-container-high/40">
          <h2 className="text-xl font-semibold mb-6">Scheduling</h2>

          <div className="flex gap-4">
            <button
              onClick={() => handleFrequencyChange('hourly')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                formData.frequency === 'hourly'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-high text-on-surface hover:bg-surface-container-high/80'
              }`}
            >
              Hourly
            </button>
            <button
              onClick={() => handleFrequencyChange('daily')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                formData.frequency === 'daily'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-high text-on-surface hover:bg-surface-container-high/80'
              }`}
            >
              Daily
            </button>
          </div>
        </div>
      )}

      {/* Logs Section */}
      <div className="glass-card border border-outline-variant/10 rounded-2xl p-6 mb-8 backdrop-blur-md bg-surface-container-high/40">
        <h2 className="text-xl font-semibold mb-6">Activity Logs</h2>

        <div className="max-h-96 overflow-y-auto space-y-3">
          {logs.length > 0 ? (
            logs.map((log, idx) => (
              <div
                key={idx}
                className="flex items-start gap-4 p-3 bg-surface-container rounded-lg border border-outline-variant/10"
              >
                <div className="flex-shrink-0 pt-1">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                      log.level === 'info'
                        ? 'bg-blue-500/20 text-blue-300'
                        : log.level === 'success'
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-red-500/20 text-red-300'
                    }`}
                  >
                    {log.level.toUpperCase()}
                  </span>
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-sm text-on-surface-variant">
                    {new Date(log.timestamp).toLocaleString()}
                  </p>
                  <p className="text-on-surface">{log.message}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-on-surface-variant py-8">No logs available yet</p>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass-card border border-error/20 rounded-2xl p-6 backdrop-blur-md bg-error/5">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-error flex-shrink-0 mt-1">warning</span>
          <div className="flex-grow">
            <h2 className="text-xl font-semibold text-error mb-3">Danger Zone</h2>
            <p className="text-on-surface-variant mb-4 text-sm">
              Deleting this scraper is permanent and cannot be undone.
            </p>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-error/20 text-error rounded-lg hover:bg-error/30 transition-colors font-medium text-sm"
              >
                <span className="material-symbols-outlined text-sm inline mr-1">delete</span>
                Delete Scraper
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-on-surface text-sm font-medium">
                  Are you sure? This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteScraper}
                    className="px-4 py-2 bg-error text-on-error rounded-lg hover:bg-error/90 transition-colors font-medium text-sm"
                  >
                    Yes, Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 bg-surface-container text-on-surface rounded-lg hover:bg-surface-container-high transition-colors font-medium text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
