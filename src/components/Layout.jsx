import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';

const navItems = [
  { path: '/', icon: 'grid_view', filledIcon: 'grid_view', label: 'Dash', desktopLabel: 'Dashboard', desktopIcon: 'dashboard' },
  { path: '/create', icon: 'add_circle', filledIcon: 'add_circle', label: 'Create', desktopLabel: 'Scrapers', desktopIcon: 'travel_explore' },
  { path: '/data', icon: 'database', filledIcon: 'database', label: 'Data', desktopLabel: 'Results', desktopIcon: 'database' },
  { path: '/guide', icon: 'bolt', filledIcon: 'bolt', label: 'Tools', desktopLabel: 'Guide', desktopIcon: 'menu_book' },
];

const desktopExtraNav = [
  { path: '#', icon: 'router', label: 'Proxies' },
  { path: '#', icon: 'calendar_today', label: 'Schedules' },
  { path: '#', icon: 'vpn_key', label: 'API Keys' },
  { path: '#', icon: 'terminal', label: 'Logs' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* ===== DESKTOP SIDEBAR (lg+) ===== */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full flex-col p-4 z-40 bg-slate-950/80 backdrop-blur-2xl w-64 border-r border-slate-800/50 shadow-2xl shadow-black/50">
        <div className="flex items-center gap-3 mb-10 px-2 pt-4">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-xl material-filled">hub</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-sky-400 font-headline">SCRAYPR</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Enterprise Scraper</p>
          </div>
        </div>

        <nav className="space-y-2 py-6 flex-grow font-headline text-sm font-semibold">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-sky-500/10 text-sky-400 shadow-[inset_0_0_10px_rgba(56,189,248,0.1)]'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5 hover:translate-x-1'
                }`
              }
            >
              <span className="material-symbols-outlined">{item.desktopIcon}</span>
              <span>{item.desktopLabel}</span>
            </NavLink>
          ))}
          {desktopExtraNav.map(item => (
            <a
              key={item.label}
              href={item.path}
              className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-xl hover:translate-x-1 transition-all duration-200"
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="mt-auto space-y-2 border-t border-slate-800/50 pt-6">
          <button
            onClick={() => navigate('/create')}
            className="w-full flex items-center justify-center gap-2 py-3 mb-4 rounded-xl gradient-button text-on-primary font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            <span>New Scraper</span>
          </button>
          <a href="#" className="flex items-center gap-3 px-4 py-2 text-slate-500 hover:text-slate-300 transition-all text-sm">
            <span className="material-symbols-outlined text-lg">description</span>
            <span>Documentation</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-2 text-slate-500 hover:text-slate-300 transition-all text-sm">
            <span className="material-symbols-outlined text-lg">contact_support</span>
            <span>Support</span>
          </a>
        </div>
      </aside>

      {/* ===== MOBILE TOP BAR ===== */}
      <header className="lg:hidden fixed top-0 w-full flex justify-between items-center px-4 sm:px-6 h-16 bg-slate-950/70 backdrop-blur-2xl z-50 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-white hover:text-blue-300 transition-colors active:scale-95 duration-200"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h1 className="font-headline font-black tracking-tighter text-blue-400 text-lg sm:text-xl">SCRAYPR</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden md:flex items-center gap-6 font-label text-sm font-bold tracking-widest uppercase">
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `transition-colors ${isActive ? 'text-blue-400' : 'text-slate-400 hover:text-blue-300'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="w-9 h-9 rounded-full bg-surface-container-highest border border-outline-variant/20 overflow-hidden shadow-lg cursor-pointer flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-sm">person</span>
          </div>
        </div>
      </header>

      {/* ===== DESKTOP TOP BAR ===== */}
      <header className="hidden lg:flex sticky top-0 w-full items-center justify-between px-8 py-3 bg-slate-900/70 backdrop-blur-xl z-30 shadow-[0_4px_30px_rgba(0,0,0,0.1)] ml-64">
        <div className="flex items-center gap-8">
          <nav className="flex items-center gap-6 font-headline text-sm font-medium tracking-tight">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                isActive ? 'text-sky-400 font-bold border-b-2 border-sky-400 pb-1' : 'text-slate-400 hover:text-slate-200 transition-all'
              }
            >
              Overview
            </NavLink>
            <NavLink
              to="/data"
              className={({ isActive }) =>
                isActive ? 'text-sky-400 font-bold border-b-2 border-sky-400 pb-1' : 'text-slate-400 hover:text-slate-200 transition-all'
              }
            >
              Insights
            </NavLink>
            <a href="#" className="text-slate-400 hover:text-slate-200 transition-all">Billing</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative group">
            <input
              className="bg-surface-container-lowest text-on-surface border-none rounded-full py-1.5 pl-10 pr-4 text-sm w-64 focus:ring-2 focus:ring-primary transition-all outline-none"
              placeholder="Search clusters..."
              type="text"
            />
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-400 hover:bg-white/5 rounded-full transition-all">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="p-2 text-slate-400 hover:bg-white/5 rounded-full transition-all">
              <span className="material-symbols-outlined">help</span>
            </button>
            <button className="p-2 text-slate-400 hover:bg-white/5 rounded-full transition-all">
              <span className="material-symbols-outlined">settings</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-surface-container-highest overflow-hidden ml-2 border border-outline-variant/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-sm">person</span>
            </div>
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="pt-16 lg:pt-0 pb-24 lg:pb-8 lg:ml-64">
        <Outlet />
      </main>

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 bg-slate-900/80 backdrop-blur-2xl rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-slate-800/30">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center transition-all active:scale-90 duration-300 ease-out min-w-[3.5rem] ${
                isActive
                  ? 'bg-blue-500/20 text-blue-400 rounded-2xl px-4 py-2 shadow-[0_0_15px_rgba(33,150,243,0.3)]'
                  : 'text-slate-500 opacity-60 hover:opacity-100 px-2 py-2'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`material-symbols-outlined text-[22px] ${isActive ? 'material-filled' : ''}`}>{item.icon}</span>
                <span className="font-label text-[10px] font-medium uppercase tracking-widest mt-1">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ===== MOBILE SIDEBAR OVERLAY ===== */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <aside
            className="absolute left-0 top-0 h-full w-72 bg-slate-950/95 backdrop-blur-2xl p-6 shadow-2xl animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-headline font-black text-blue-400 text-xl">SCRAYPR</h2>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-400 p-1">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <nav className="space-y-2">
              {navItems.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive ? 'bg-sky-500/10 text-sky-400' : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <span className="material-symbols-outlined">{item.desktopIcon}</span>
                  <span className="font-headline font-semibold">{item.desktopLabel}</span>
                </NavLink>
              ))}
            </nav>
            <div className="mt-8 pt-6 border-t border-slate-800/50">
              <button
                onClick={() => { setSidebarOpen(false); navigate('/create'); }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl gradient-button text-on-primary font-bold shadow-lg shadow-primary/20"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                <span>New Scraper</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
