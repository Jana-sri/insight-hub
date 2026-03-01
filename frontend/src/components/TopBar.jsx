import React, { useState } from 'react';
import { Search, Bell, Loader2 } from 'lucide-react';

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  compare:   'Topic Comparison',
  dataset:   'Dataset Analysis',
  history:   'History & Watchlist',
  settings:  'Settings',
};

export default function TopBar({ activeTab, darkMode, onSearch, isSearching }) {
  const [searchQuery, setSearchQuery] = useState('');
  const dk   = darkMode;
  const bg   = dk ? 'bg-[#0d1425] border-slate-800/80' : 'bg-white border-slate-200';
  const txt  = dk ? 'text-slate-100' : 'text-slate-800';
  const mute = dk ? 'text-slate-500' : 'text-slate-400';
  const inpt = dk
    ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20'
    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:ring-indigo-400/15';

  const handleSearch = () => {
    if (onSearch && searchQuery.trim()) onSearch(searchQuery.trim());
  };

  return (
    <header className={`flex items-center justify-between px-7 py-3 border-b shrink-0 ${bg}`}>
      {/* Left: Page title */}
      <div>
        <h1 className={`text-[17px] font-bold ${txt} tracking-tight`} style={{ fontFamily: 'Syne,sans-serif' }}>
          {PAGE_TITLES[activeTab] || activeTab}
        </h1>
        <p className={`text-[11px] ${mute}`}>InsightHub · AI Analysis Platform</p>
      </div>

      {/* Right: Search (dashboard only) + bell */}
      <div className="flex items-center gap-2.5">
        {activeTab === 'dashboard' && (
          <>
            <div className="relative">
              {isSearching
                ? <Loader2 className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${mute} animate-spin`} />
                : <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${mute}`} />
              }
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Quick search…"
                className={`pl-9 pr-4 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 w-56 transition-all ${inpt}`}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="px-4 py-2 text-[13px] font-semibold gradient-bg text-white rounded-xl transition-opacity disabled:opacity-40 shadow-sm hover:opacity-90"
            >
              Search
            </button>
          </>
        )}

        {/* Bell */}
        <button className={`relative p-2 rounded-xl transition-colors ${dk ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
          <Bell className={`w-4 h-4 ${mute}`} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}