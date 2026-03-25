import React from 'react';
import { NavLink } from 'react-router-dom';

const guides = [
  {
    num: 1,
    icon: 'rocket_launch',
    title: 'Deploy Your Cluster',
    desc: 'Set up your first scraper in minutes. Define your target URL, choose a scraping mode, and let SCRAYPR\'s intelligent engine handle the rest. Our system auto-detects page structures and adapts protocols on the fly.',
    steps: [
      'Enter a target URL and name your scraper',
      'Select Fast-Sync or Stealth mode',
      'Click Initialize Scraper to begin extraction',
    ],
  },
  {
    num: 2,
    icon: 'schema',
    title: 'Map the Schema',
    desc: 'Use CSS selectors to pinpoint exactly what data you need. SCRAYPR provides a visual selector tool and live preview so you can see extracted data in real-time before running a full scrape.',
    code: '.product-card .price { /* matches all price elements */ }\n[data-testid="title"] { /* attribute selectors */ }\n.listing:nth-child(n+2) { /* skip header row */ }',
  },
  {
    num: 3,
    icon: 'settings_input_component',
    title: 'Advanced Selectors',
    desc: 'Go beyond basic CSS with regex patterns, nth-child filters, and attribute matching. Clean and transform data as it\'s extracted using built-in formatting rules.',
    tips: [
      'Use regex to extract numbers from text: \\d+\\.?\\d*',
      'Chain selectors with > for direct children only',
      'Use :not() to exclude unwanted elements',
      'Combine with attribute selectors for precision',
    ],
  },
  {
    num: 4,
    icon: 'database',
    title: 'Browse Real-Time Data',
    desc: 'View your extracted data in a beautiful marketplace-style browser. Filter, search, and export results instantly. Set up auto-scraping schedules to keep your data fresh.',
    features: [
      { icon: 'visibility', label: 'Live Preview', desc: 'See data as it\'s being extracted' },
      { icon: 'download', label: 'Export CSV', desc: 'Download results in multiple formats' },
      { icon: 'autorenew', label: 'Auto-Refresh', desc: 'Schedule hourly or daily scrapes' },
    ],
  },
];

export default function UserGuide() {
  return (
    <div className="px-6 py-12 max-w-4xl mx-auto">
      {/* Hero */}
      <section className="mb-16">
        <span className="text-primary font-bold tracking-[0.2em] uppercase text-xs">SCRAYPR Academy</span>
        <h1 className="text-5xl md:text-6xl font-headline font-extrabold tracking-tight mt-3 mb-6 bg-gradient-to-r from-white to-on-surface-variant bg-clip-text text-transparent">
          Master the<br />Extraction
        </h1>
        <p className="text-on-surface-variant text-lg max-w-xl leading-relaxed">
          Everything you need to deploy, configure, and scale your web scraping operations. From first scrape to enterprise-grade data pipelines.
        </p>
      </section>

      {/* Guide Cards */}
      <div className="space-y-8 mb-16">
        {guides.map((g) => (
          <div key={g.num} className="glass-card rounded-xl p-8 border border-outline-variant/10 relative overflow-hidden group hover:border-primary/20 transition-colors">
            {/* Decorative glow */}
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all" />

            <div className="flex items-start gap-6 relative z-10">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-headline font-bold text-lg">
                  {g.num}
                </div>
              </div>

              <div className="flex-grow">
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-primary text-2xl">{g.icon}</span>
                  <h3 className="font-headline font-bold text-2xl">{g.title}</h3>
                </div>

                <p className="text-on-surface-variant leading-relaxed mb-6">{g.desc}</p>

                {/* Steps */}
                {g.steps && (
                  <div className="space-y-3">
                    {g.steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-surface-container-highest flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <span className="text-on-surface text-sm">{step}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Code Example */}
                {g.code && (
                  <div className="bg-black/30 rounded-lg p-4 font-mono text-sm text-primary/80 whitespace-pre-wrap border border-outline-variant/10">
                    {g.code}
                  </div>
                )}

                {/* Tips */}
                {g.tips && (
                  <div className="space-y-2">
                    {g.tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-primary text-sm mt-0.5">tips_and_updates</span>
                        <span className="text-sm text-on-surface-variant font-mono">{tip}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Features */}
                {g.features && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {g.features.map((f, i) => (
                      <div key={i} className="bg-surface-container-low/50 rounded-lg p-4 border border-outline-variant/5">
                        <span className="material-symbols-outlined text-primary mb-2 block">{f.icon}</span>
                        <h4 className="font-bold text-sm mb-1">{f.label}</h4>
                        <p className="text-xs text-on-surface-variant">{f.desc}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="text-center py-12">
        <h3 className="font-headline font-bold text-2xl mb-4">Ready to start extracting?</h3>
        <p className="text-on-surface-variant mb-8">Create your first scraper and see results in minutes.</p>
        <NavLink
          to="/create"
          className="inline-flex items-center gap-3 gradient-button text-on-primary px-10 py-4 rounded-full font-headline font-bold shadow-[0_0_30px_rgba(97,205,255,0.3)] hover:shadow-[0_0_45px_rgba(97,205,255,0.5)] transition-all active:scale-95"
        >
          <span className="material-symbols-outlined">add</span>
          Create Your First Scraper
        </NavLink>
      </div>
    </div>
  );
}
