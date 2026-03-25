import React, { useState, useEffect } from 'react';
import { api } from '../api.js';

export default function AddFieldModal({ isOpen, onClose, onAdd, scraperUrl }) {
  const [fieldName, setFieldName] = useState('');
  const [cssSelector, setCssSelector] = useState('');
  const [regex, setRegex] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [attributeFilter, setAttributeFilter] = useState('');
  const [nthChild, setNthChild] = useState('');
  const [preview, setPreview] = useState({
    rawValue: '',
    formattedValue: '',
    matchCount: 0,
  });
  const [loading, setLoading] = useState(false);

  // Debounced preview fetch
  useEffect(() => {
    if (!scraperUrl || !cssSelector) {
      setPreview({ rawValue: '', formattedValue: '', matchCount: 0 });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await api.previewSelector(scraperUrl, cssSelector);
        // API returns { matchCount, preview: [{ index, text, html }] }
        const firstMatch = result?.preview?.[0];
        setPreview({
          rawValue: firstMatch?.html || '',
          formattedValue: firstMatch?.text || '',
          matchCount: result?.matchCount || 0,
        });
      } catch (error) {
        console.error('Preview fetch error:', error);
        setPreview({ rawValue: '', formattedValue: '', matchCount: 0 });
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [scraperUrl, cssSelector]);

  const handleSave = () => {
    if (!fieldName.trim() || !cssSelector.trim()) {
      alert('Please fill in Field Name and CSS Selector');
      return;
    }

    onAdd({
      name: fieldName,
      selector: cssSelector,
      regex,
      type: 'text',
      icon: 'code',
      attributeFilter: attributeFilter || undefined,
      nthChild: nthChild || undefined,
    });

    // Reset form
    setFieldName('');
    setCssSelector('');
    setRegex('');
    setAttributeFilter('');
    setNthChild('');
    setAdvancedOpen(false);
  };

  const handleSelectFromPage = () => {
    // This would typically open a page picker or trigger element selection mode
    alert('Element picker not yet implemented. Please enter a CSS selector manually.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center">
      <div className="glass-panel max-w-2xl w-full mx-4 neo-shadow rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="border-b border-outline-variant/20 p-8 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-headline font-extrabold text-3xl text-on-surface mb-2">
                Add Custom Field
              </h2>
              <p className="text-on-surface-variant text-base">
                Define a new extraction target using CSS selectors.
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 rounded-full bg-surface-container-high hover:bg-surface-container-highest transition-colors text-on-surface"
              aria-label="Close modal"
            >
              <span className="text-xl">✕</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-8">
          {/* Field Name & CSS Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-on-surface">
                Field Name
              </label>
              <input
                type="text"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder="e.g., Product Price"
                className="w-full px-6 py-3 rounded-full bg-surface-container-lowest text-on-surface placeholder-on-surface-variant/60 ring-1 ring-outline-variant/30 focus:outline-none focus:ring-primary transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-on-surface">
                CSS Selector
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cssSelector}
                  onChange={(e) => setCssSelector(e.target.value)}
                  placeholder="e.g., .price-tag"
                  className="flex-1 px-6 py-3 rounded-full bg-surface-container-lowest text-on-surface placeholder-on-surface-variant/60 ring-1 ring-outline-variant/30 focus:outline-none focus:ring-primary transition-colors"
                />
                <button
                  onClick={handleSelectFromPage}
                  className="flex-shrink-0 p-3 rounded-full bg-surface-container-lowest text-on-surface hover:bg-surface-container-high transition-colors ring-1 ring-outline-variant/30"
                  title="Select element from page"
                >
                  <span className="text-lg">🖱️</span>
                </button>
              </div>
            </div>
          </div>

          {/* Select from Page Button */}
          <button
            onClick={handleSelectFromPage}
            className="w-full gradient-button rounded-full py-4 font-medium text-on-primary hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="text-xl hover:rotate-12 transition-transform">📍</span>
            Select target from active page
          </button>

          {/* Advanced Selectors Accordion */}
          <div className="border border-outline-variant/20 rounded-2xl overflow-hidden">
            <button
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="w-full px-6 py-4 flex items-center justify-between bg-surface-container-lowest hover:bg-surface-container-low transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">⚙️</span>
                <span className="font-medium text-on-surface">Advanced Selectors</span>
              </div>
              <span
                className={`text-xl transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
              >
                ▼
              </span>
            </button>
            {advancedOpen && (
              <div className="border-t border-outline-variant/20 p-6 space-y-4 bg-surface-container-lowest/50">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-on-surface">
                    Attribute Filter
                  </label>
                  <input
                    type="text"
                    value={attributeFilter}
                    onChange={(e) => setAttributeFilter(e.target.value)}
                    placeholder="e.g., [data-currency='USD']"
                    className="w-full px-6 py-3 rounded-full bg-surface-container-lowest text-on-surface placeholder-on-surface-variant/60 ring-1 ring-outline-variant/30 focus:outline-none focus:ring-primary transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-on-surface">
                    Nth-child Selector
                  </label>
                  <input
                    type="text"
                    value={nthChild}
                    onChange={(e) => setNthChild(e.target.value)}
                    placeholder="e.g., :nth-child(2)"
                    className="w-full px-6 py-3 rounded-full bg-surface-container-lowest text-on-surface placeholder-on-surface-variant/60 ring-1 ring-outline-variant/30 focus:outline-none focus:ring-primary transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-on-surface">
                    Regex Pattern
                  </label>
                  <input
                    type="text"
                    value={regex}
                    onChange={(e) => setRegex(e.target.value)}
                    placeholder="e.g., \\d+\\.\\d{2}"
                    className="w-full px-6 py-3 rounded-full bg-surface-container-lowest text-on-surface placeholder-on-surface-variant/60 ring-1 ring-outline-variant/30 focus:outline-none focus:ring-primary transition-colors"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Live Data Preview */}
          <div>
            <h3 className="text-sm font-medium text-on-surface mb-4">Live Data Preview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-black/20 p-6 ring-1 ring-outline-variant/20">
                <p className="text-xs font-medium text-on-surface-variant mb-3">Raw Value</p>
                <p className="font-mono text-sm text-on-surface break-words">
                  {loading ? (
                    <span className="text-on-surface-variant animate-pulse">Loading...</span>
                  ) : preview.rawValue ? (
                    preview.rawValue.substring(0, 200)
                  ) : (
                    <span className="text-on-surface-variant">No data available</span>
                  )}
                </p>
                {preview.matchCount > 0 && (
                  <p className="text-xs text-primary mt-3">
                    Found {preview.matchCount} match{preview.matchCount !== 1 ? 'es' : ''}
                  </p>
                )}
              </div>
              <div className="rounded-2xl bg-primary/5 p-6 ring-1 ring-primary/20">
                <p className="text-xs font-medium text-on-surface-variant mb-3">Formatted Result</p>
                <p className="text-lg font-semibold text-on-surface">
                  {loading ? (
                    <span className="text-on-surface-variant animate-pulse">Loading...</span>
                  ) : preview.formattedValue ? (
                    preview.formattedValue
                  ) : (
                    <span className="text-on-surface-variant">No result</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-outline-variant/20 p-8 flex gap-4 justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 rounded-full text-on-surface hover:bg-surface-container-highest transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-8 py-3 rounded-full bg-surface-container-highest text-primary ring-1 ring-primary/20 hover:bg-surface-container-highest hover:ring-primary/40 transition-all font-medium active:scale-95"
          >
            Save Field
          </button>
        </div>
      </div>
    </div>
  );
}
