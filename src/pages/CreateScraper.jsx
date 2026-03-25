import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import AddFieldModal from '../components/AddFieldModal';

// Default field presets with real CSS selectors for common extraction patterns
const DEFAULT_FIELDS = [
  {
    key: 'title',
    label: 'Product Title',
    selector: 'h1, h2, .product-title, .listing-title, [data-testid="title"]',
    type: 'text',
    icon: 'title',
  },
  {
    key: 'pricing',
    label: 'Pricing Data',
    selector: '.price, [data-price], .a-price .a-offscreen, .product-price',
    type: 'currency',
    icon: 'payments',
  },
  {
    key: 'ratings',
    label: 'Ratings',
    selector: '.rating, .a-icon-alt, [data-rating], .star-rating',
    type: 'text',
    icon: 'star',
  },
  {
    key: 'images',
    label: 'Image URLs',
    selector: 'img[src], .product-image img, .s-image',
    type: 'image',
    icon: 'image',
  },
];

export default function CreateScraper() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    mode: 'fast-sync',
    enabledFields: {
      title: true,
      pricing: true,
      ratings: false,
      images: false,
    },
    customFields: [],
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleModeChange = (mode) => {
    setFormData((prev) => ({ ...prev, mode }));
  };

  const handleFieldToggle = (field) => {
    setFormData((prev) => ({
      ...prev,
      enabledFields: {
        ...prev.enabledFields,
        [field]: !prev.enabledFields[field],
      },
    }));
  };

  const handleAddCustomField = (fieldData) => {
    setFormData((prev) => ({
      ...prev,
      customFields: [...prev.customFields, fieldData],
    }));
    setShowAddFieldModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.url) {
      alert('Please provide both a scraper name and target URL.');
      return;
    }
    setIsLoading(true);

    try {
      // Build the fields array with real CSS selectors
      const fields = [];

      // Add enabled default fields
      DEFAULT_FIELDS.forEach((df) => {
        if (formData.enabledFields[df.key]) {
          fields.push({
            name: df.label,
            selector: df.selector,
            type: df.type,
            icon: df.icon,
          });
        }
      });

      // Add custom fields
      formData.customFields.forEach((cf) => {
        fields.push({
          name: cf.name,
          selector: cf.selector,
          type: cf.type || 'text',
          icon: cf.icon || 'code',
          regex: cf.regex || undefined,
        });
      });

      const scraperData = {
        name: formData.name,
        url: formData.url,
        mode: formData.mode,
        fields,
      };

      await api.createScraper(scraperData);
      navigate('/');
    } catch (error) {
      console.error('Failed to create scraper:', error);
      alert('Error creating scraper: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-dim">
      {/* Header Section */}
      <div className="px-4 sm:px-6 py-8 sm:py-12">
        <p className="text-primary uppercase tracking-widest text-xs sm:text-sm font-label mb-2">
          Extraction Engine
        </p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-headline font-bold mb-3 sm:mb-4 bg-gradient-to-r from-white to-on-surface-variant bg-clip-text text-transparent">
          Configure New Scraper
        </h1>
        <p className="text-on-surface-variant text-base sm:text-lg">
          Set up a new web scraper with custom selectors and extraction rules
        </p>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 pb-12">
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Source & Protocol */}
            <div className="glass-panel p-8 rounded-2xl border border-outline-variant/20 backdrop-blur-xl">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center">
                  <span className="text-primary font-headline font-bold">1</span>
                </div>
                <div>
                  <h2 className="text-xl font-headline font-bold text-white">
                    Source & Protocol
                  </h2>
                  <p className="text-sm text-on-surface-variant">
                    Configure your target URL and scraping method
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Scraper Identifier Input */}
                <div>
                  <label className="block text-sm font-label text-on-surface-variant mb-2">
                    Scraper Identifier
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., E-commerce Product Crawler"
                    className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-3 text-white placeholder-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary glow-input transition-all"
                  />
                </div>

                {/* Target URL Input */}
                <div>
                  <label className="block text-sm font-label text-on-surface-variant mb-2">
                    Target URL
                  </label>
                  <div className="relative">
                    <svg
                      className="absolute left-3 top-3.5 w-5 h-5 text-on-surface-variant/50"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                      />
                    </svg>
                    <input
                      type="url"
                      name="url"
                      value={formData.url}
                      onChange={handleInputChange}
                      placeholder="https://example.com/products"
                      className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg pl-10 pr-4 py-3 text-white placeholder-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary glow-input transition-all"
                    />
                  </div>
                </div>

                {/* Mode Selection Cards */}
                <div className="grid grid-cols-2 gap-4 mt-6">
                  {/* Fast-Sync Card */}
                  <button
                    type="button"
                    onClick={() => handleModeChange('fast-sync')}
                    className={`relative p-4 rounded-xl border-2 transition-all ${
                      formData.mode === 'fast-sync'
                        ? 'border-primary bg-primary/10 shadow-lg shadow-primary/30'
                        : 'border-outline-variant/30 bg-surface-container-lowest/50 hover:border-outline-variant/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-headline font-bold text-white text-sm">
                          Fast-Sync
                        </h3>
                        <p className="text-xs text-on-surface-variant">
                          Direct HTTP fetch
                        </p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          formData.mode === 'fast-sync'
                            ? 'border-primary bg-primary'
                            : 'border-outline-variant/50'
                        }`}
                      >
                        {formData.mode === 'fast-sync' && (
                          <div className="w-2 h-2 bg-surface-dim rounded-full" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Stealth-Mode Card */}
                  <button
                    type="button"
                    onClick={() => handleModeChange('stealth-mode')}
                    className={`relative p-4 rounded-xl border-2 transition-all ${
                      formData.mode === 'stealth-mode'
                        ? 'border-primary bg-primary/10 shadow-lg shadow-primary/30'
                        : 'border-outline-variant/30 bg-surface-container-lowest/50 hover:border-outline-variant/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-headline font-bold text-white text-sm">
                          Stealth-Mode
                        </h3>
                        <p className="text-xs text-on-surface-variant">
                          With user-agent rotation
                        </p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          formData.mode === 'stealth-mode'
                            ? 'border-primary bg-primary'
                            : 'border-outline-variant/50'
                        }`}
                      >
                        {formData.mode === 'stealth-mode' && (
                          <div className="w-2 h-2 bg-surface-dim rounded-full" />
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Step 2: Field Selection */}
            <div className="glass-panel p-8 rounded-2xl border border-outline-variant/20 backdrop-blur-xl">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center">
                  <span className="text-primary font-headline font-bold">2</span>
                </div>
                <div>
                  <h2 className="text-xl font-headline font-bold text-white">
                    Field Selection
                  </h2>
                  <p className="text-sm text-on-surface-variant">
                    Choose which data fields to extract (uses CSS selectors)
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {DEFAULT_FIELDS.map((df) => (
                  <div
                    key={df.key}
                    className="flex items-center justify-between p-4 rounded-lg bg-surface-container-lowest/50 border border-outline-variant/20 hover:border-outline-variant/40 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-on-surface-variant">{df.icon}</span>
                      <div>
                        <span className="font-label text-white block">{df.label}</span>
                        <span className="font-label text-xs text-on-surface-variant/60 font-mono">{df.selector.substring(0, 50)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFieldToggle(df.key)}
                      className={`w-12 h-6 rounded-full transition-all ${
                        formData.enabledFields[df.key]
                          ? 'bg-primary shadow-lg shadow-primary/50'
                          : 'bg-outline-variant/30'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          formData.enabledFields[df.key] ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                ))}

                {/* Add Custom Selector Button */}
                <button
                  type="button"
                  onClick={() => setShowAddFieldModal(true)}
                  className="w-full mt-6 py-3 px-4 rounded-lg border-2 border-dashed border-primary/50 hover:border-primary hover:bg-primary/5 transition-all text-primary font-label flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add Custom Selector
                </button>

                {/* Custom Fields Display */}
                {formData.customFields.length > 0 && (
                  <div className="mt-4 space-y-2 pt-4 border-t border-outline-variant/20">
                    {formData.customFields.map((field, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-label text-white text-sm">{field.name}</p>
                          <p className="text-xs text-on-surface-variant font-mono">
                            {field.selector}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              customFields: prev.customFields.filter((_, i) => i !== idx),
                            }));
                          }}
                          className="text-on-surface-variant/50 hover:text-primary transition-colors"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Sticky */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 h-fit">
            {/* Live Preview Engine Panel */}
            <div className="relative glass-panel p-6 rounded-2xl border border-outline-variant/20 backdrop-blur-xl">
              {/* Browser Header */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-outline-variant/20">
                <div className="text-xs font-label text-on-surface-variant">
                  SCRAPER CONFIGURATION
                </div>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-3 mb-6 text-sm">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Name:</span>
                  <span className="text-on-surface font-medium">{formData.name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">URL:</span>
                  <span className="text-on-surface font-medium truncate max-w-[200px]">{formData.url || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Mode:</span>
                  <span className="text-on-surface font-medium">{formData.mode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Fields:</span>
                  <span className="text-on-surface font-medium">
                    {Object.values(formData.enabledFields).filter(Boolean).length + formData.customFields.length} selected
                  </span>
                </div>
              </div>

              {/* Initialize Scraper Button */}
              <button
                onClick={handleSubmit}
                disabled={isLoading || !formData.name || !formData.url}
                className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-primary/90 disabled:from-outline-variant/30 disabled:to-outline-variant/30 disabled:cursor-not-allowed text-white font-headline font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all gradient-button mb-3"
              >
                {isLoading ? 'Creating...' : 'Initialize Scraper'}
              </button>

              <p className="text-xs text-on-surface-variant text-center">
                After creating, use "Run Now" to start real scraping
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Field Modal */}
      {showAddFieldModal && (
        <AddFieldModal
          isOpen={true}
          onAdd={handleAddCustomField}
          onClose={() => setShowAddFieldModal(false)}
          scraperUrl={formData.url}
        />
      )}
    </div>
  );
}
