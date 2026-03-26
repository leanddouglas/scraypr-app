import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';

const navItems = [
  { path: '/', icon: 'search', label: 'Search' },
  { path: '/search', icon: 'local_offer', label: 'Deals' },
  { path: '/saved', icon: 'bookmark', label: 'Saved Searches' },
];

const marketplaces = [
  { name: 'Craigslist', color: 'text-purple-400' },
  { name: 'eBay', color: 'text-yellow-400' },
  { name: 'AutoTrader', color: 'text-green-400' },
  { name: 'FB Marketplace', color: 'text-blue-400' },
  { name: 'Kijiji', color: 'text-emerald-400' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full flex-col p-6 z-40 glass-panel backdrop-blur-2xl w-60 border-r border-outline-variant/10">
        <div className="flex items-center gap-3 mb-8">
          <span className="material-symbols-outlined text-primary text-2xl">bolt</span>
          <div>
            <h1 className="text-xl font-bold text-primary font-headline">SCRAYPR</h1>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Deal Finder</p>
          </div>
        </div>

        <nav className="space-y-1 flex-grow">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl font-label text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5'
                }`
              }
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto pt-4 border-t border-outline-variant/10">
          <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold mb-3">Marketplaces</p>
          {marketplaces.map(mp => (
            <div key={mp.name} className={`text-xs font-label py-1 ${mp.color}`}>{mp.name}</div>
          ))}
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 glass-panel backdrop-blur-xl border-b border-outline-variant/10 px-4 py-3 flex items-center justify-between">
        <button onClick={() => setSidebarOpen(!sidebarOpen)}>
          <span className="material-symbols-outlined text-on-surface">menu</span>
        </button>
        <h1 className="font-headline font-bold text-primary">SCRAYPR</h1>
        <div className="flex gap-2">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `text-xs font-label font-semibold px-2 py-1 rounded-lg transition-all ${
                  isActive ? 'text-primary bg-primary/10' : 'text-on-surface-variant'
                }`
              }
            >
              {item.label.split(' ')[0]}
            </NavLink>
          ))}
        </div>
        <span className="material-symbols-outlined text-on-surface-variant">person</span>
      </header>

      {/* Main Content */}
      <main className="lg:ml-60 pt-14 lg:pt-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-panel backdrop-blur-xl border-t border-outline-variant/10 px-2 py-2 flex justify-around">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all ${
                isActive ? 'text-primary' : 'text-on-surface-variant'
              }`
            }
          >
            <span className="material-symbols-outlined text-xl">{item.icon}</span>
            <span className="text-[10px] font-label font-semibold">{item.label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
