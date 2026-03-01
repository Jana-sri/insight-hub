import React from 'react';
import { LayoutDashboard, GitCompare, Upload, Settings, Moon, Sun, Clock, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
  { icon: GitCompare,      label: 'Compare',   id: 'compare'   },
  { icon: Upload,          label: 'Dataset',   id: 'dataset'   },
  { icon: Clock,           label: 'History',   id: 'history'   },
  { icon: Settings,        label: 'Settings',  id: 'settings'  },
];

export default function Sidebar({ activeTab, setActiveTab, darkMode, setDarkMode }) {
  const dk = darkMode;
  const bg   = dk ? 'bg-[#0d1425] border-slate-800/80' : 'bg-white border-slate-200';
  const txt  = dk ? 'text-slate-100' : 'text-slate-800';
  const mute = dk ? 'text-slate-500' : 'text-slate-400';

  return (
    <aside className={`relative flex flex-col w-[210px] shrink-0 border-r ${bg} z-20`}>
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] gradient-bg opacity-80" />

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 pt-7 pb-6">
        <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
          <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <div className={`font-black text-[16px] leading-none tracking-tight`}
               style={{ fontFamily: 'Syne,sans-serif' }}>
            <span className="gradient-text">Insight</span>
            <span className={txt}>Hub</span>
          </div>
          <div className={`text-[9px] tracking-[0.14em] uppercase font-semibold mt-0.5 ${mute}`}>Intelligence</div>
        </div>
      </div>

      {/* Nav label */}
      <div className={`px-5 mb-1.5 text-[10px] font-semibold tracking-[0.1em] uppercase ${mute}`}>Menu</div>

      {/* Nav items */}
      <nav className="flex-1 px-2.5 space-y-0.5">
        {NAV.map(({ icon: Icon, label, id }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-150 ${
                active
                  ? dk
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-600/30'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : `${mute} border border-transparent ${dk ? 'hover:bg-slate-800/70 hover:text-slate-300' : 'hover:bg-slate-100 hover:text-slate-700'}`
              }`}
            >
              {/* Active left bar */}
              {active && (
                <motion.div
                  layoutId="activeBar"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-indigo-500"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon style={{ width: 16, height: 16 }} className={active ? (dk ? 'text-indigo-400' : 'text-indigo-600') : ''} />
              <span>{label}</span>
              {active && (
                <span className={`ml-auto w-1.5 h-1.5 rounded-full ${dk ? 'bg-indigo-400' : 'bg-indigo-500'}`} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Dark mode toggle — bottom */}
      <div className={`p-3 border-t ${dk ? 'border-slate-800' : 'border-slate-100'}`}>
        <button
          onClick={() => setDarkMode(!dk)}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
            dk ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {dk
            ? <Sun className="w-4 h-4 text-amber-400" />
            : <Moon className="w-4 h-4 text-indigo-500" />
          }
          {dk ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>
    </aside>
  );
}