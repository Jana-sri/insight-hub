import React, { useState } from 'react';
import {
  Clock, Plus, X, TrendingUp, TrendingDown, Trash2, Eye,
  Download, Filter, RefreshCw, BarChart3, GitCompare,
  FileSpreadsheet, Search, AlertCircle, ThumbsUp, ThumbsDown,
  Calendar, ChevronRight, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const sentColor = s => s >= 65 ? '#10b981' : s >= 45 ? '#f59e0b' : '#f43f5e';
const sentLabel = s => s >= 65 ? 'Positive' : s >= 45 ? 'Neutral' : 'Negative';

function MiniSparkline({ value, dk }) {
  const data = Array.from({ length: 10 }, (_, i) => ({
    v: Math.max(5, Math.min(100, value + (Math.random() - 0.5) * 12 + Math.sin(i / 2) * 5))
  }));
  const c = sentColor(value);
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`sg-${value}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c} stopOpacity={0.3} />
            <stop offset="100%" stopColor={c} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={c} strokeWidth={1.5} fill={`url(#sg-${value})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function History({ darkMode, store, onLoadAnalysis, onReAnalyze, navigateTo }) {
  const dk = darkMode;
  const [tab,    setTab]    = useState('all');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null); // selected item for detail panel

  const card  = dk ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const txt   = dk ? 'text-slate-100' : 'text-slate-800';
  const mute  = dk ? 'text-slate-400' : 'text-slate-500';
  const hover = dk ? 'hover:bg-slate-800' : 'hover:bg-slate-50';

  // Combine all entries for "All" tab
  const allItems = [
    ...store.analyses.map(a => ({ ...a, _kind: 'analysis' })),
    ...store.comparisons.map(c => ({ ...c, _kind: 'comparison' })),
    ...store.datasets.map(d => ({ ...d, _kind: 'dataset' })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const filtered = (tab === 'all' ? allItems
    : tab === 'analyses' ? store.analyses.map(a => ({ ...a, _kind: 'analysis' }))
    : tab === 'comparisons' ? store.comparisons.map(c => ({ ...c, _kind: 'comparison' }))
    : tab === 'datasets' ? store.datasets.map(d => ({ ...d, _kind: 'dataset' }))
    : store.watchlist.map(w => ({ ...w, _kind: 'watchlist' }))
  ).filter(item => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const topic = item.topic || item.topic1 || item.filename || '';
    return topic.toLowerCase().includes(q) || (item.question || '').toLowerCase().includes(q);
  });

  const exportCSV = () => {
    const rows = ['Type,Topic/File,Question,Sentiment,Trend,Answer,Date'];
    store.analyses.forEach(a => rows.push(`analysis,"${a.topic}","${a.question}",${a.sentiment},${a.trend}%,${a.answer},${a.createdAt.split('T')[0]}`));
    store.comparisons.forEach(c => rows.push(`comparison,"${c.topic1} vs ${c.topic2}",,,,${c.createdAt.split('T')[0]}`));
    store.datasets.forEach(d => rows.push(`dataset,"${d.filename}","${d.purpose}",,,${d.createdAt.split('T')[0]}`));
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'insighthub_history.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const TABS = [
    { id: 'all',         label: 'All',         count: allItems.length,              icon: Clock },
    { id: 'analyses',    label: 'Analyses',    count: store.analyses.length,        icon: BarChart3 },
    { id: 'comparisons', label: 'Comparisons', count: store.comparisons.length,     icon: GitCompare },
    { id: 'datasets',    label: 'Datasets',    count: store.datasets.length,        icon: FileSpreadsheet },
    { id: 'watchlist',   label: 'Watchlist',   count: store.watchlist.length,       icon: Eye },
  ];

  /* ── Empty state ── */
  if (allItems.length === 0 && store.watchlist.length === 0) {
    return (
      <div className="min-h-[65vh] flex flex-col items-center justify-center text-center px-6">
        <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/30">
          <Clock className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-black mb-2 gradient-text" style={{ fontFamily: 'Syne,sans-serif' }}>No History Yet</h2>
        <p className={`text-sm mb-6 ${mute} max-w-xs`}>
          Every analysis, comparison, and dataset you run is automatically saved here.
        </p>
        <div className="grid grid-cols-3 gap-4 max-w-lg w-full">
          {[
            { icon: BarChart3,    label: 'Analyses',    desc: 'Saved from Dashboard', action: () => navigateTo('dashboard') },
            { icon: GitCompare,  label: 'Comparisons', desc: 'Saved from Compare',   action: () => navigateTo('compare') },
            { icon: FileSpreadsheet, label: 'Datasets', desc: 'Saved from Dataset',  action: () => navigateTo('dataset') },
          ].map(f => (
            <button key={f.label} onClick={f.action}
              className={`rounded-xl border p-4 text-center transition-all ${card} hover:border-indigo-500`}>
              <f.icon className="w-5 h-5 mx-auto mb-2 text-indigo-400" />
              <p className={`text-xs font-semibold ${txt}`}>{f.label}</p>
              <p className={`text-[11px] mt-0.5 ${mute}`}>{f.desc}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black gradient-text" style={{ fontFamily: 'Syne,sans-serif' }}>History & Storage</h2>
          <p className={`text-xs mt-0.5 ${mute}`}>{allItems.length} entries · everything auto-saved</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl border transition-colors ${card} ${mute} ${hover}`}>
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${mute}`} />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search analyses, topics, questions…"
          className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${dk ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-600' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'}`}
        />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === t.id ? 'gradient-bg text-white shadow' : `${card} ${mute} border hover:border-indigo-500`
            }`}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${tab === t.id ? 'bg-white/20 text-white' : dk ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center ${card}`}>
          <p className={`text-sm ${mute}`}>No {tab === 'all' ? 'entries' : tab} found{search ? ` for "${search}"` : ''}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((item, i) => (
            <HistoryCard
              key={item.id} item={item} idx={i} dk={dk} card={card} txt={txt} mute={mute}
              onLoad={onLoadAnalysis} onReAnalyze={onReAnalyze} navigateTo={navigateTo}
              onDelete={() => {
                if (item._kind === 'analysis') store.deleteAnalysis(item.id);
                else if (item._kind === 'comparison') store.deleteComparison(item.id);
                else if (item._kind === 'dataset') store.deleteDataset(item.id);
                else store.deleteWatchlistItem(item.id);
              }}
              onSelect={() => setDetail(detail?.id === item.id ? null : item)}
              selected={detail?.id === item.id}
            />
          ))}
        </div>
      )}

      {/* Detail panel */}
      <AnimatePresence>
        {detail && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className={`rounded-2xl border-2 border-indigo-600/40 p-6 ${dk ? 'bg-slate-900' : 'bg-white'}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className={`text-[10px] font-semibold uppercase tracking-wider text-indigo-400 mb-1`}>{detail._kind} detail</p>
                <h3 className={`text-lg font-black ${txt}`} style={{ fontFamily: 'Syne,sans-serif' }}>
                  {detail.topic || detail.topic1 || detail.filename}
                </h3>
                {detail.question && <p className={`text-sm ${mute} mt-0.5`}>"{detail.question}"</p>}
              </div>
              <button onClick={() => setDetail(null)} className={`p-2 rounded-xl ${hover}`}>
                <X className={`w-4 h-4 ${mute}`} />
              </button>
            </div>

            {detail._kind === 'analysis' && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Answer', value: detail.answer, color: detail.answer === 'YES' ? '#10b981' : '#f43f5e' },
                    { label: 'Sentiment', value: `${detail.sentiment}/100`, color: sentColor(detail.sentiment) },
                    { label: 'Trend', value: `${detail.trend >= 0 ? '+' : ''}${detail.trend}%`, color: detail.trend >= 0 ? '#10b981' : '#f43f5e' },
                    { label: 'Articles', value: detail.newsCount },
                  ].map(d => (
                    <div key={d.label} className={`p-3 rounded-xl ${dk ? 'bg-slate-800' : 'bg-slate-50'}`}>
                      <p className={`text-[10px] font-semibold uppercase tracking-wider ${mute} mb-0.5`}>{d.label}</p>
                      <p className="text-lg font-black" style={d.color ? { color: d.color } : {}}>{d.value}</p>
                    </div>
                  ))}
                </div>
                {detail.result?.answer?.reasoning && (
                  <p className={`text-sm leading-relaxed ${dk ? 'text-slate-300' : 'text-slate-600'} p-4 rounded-xl ${dk ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    {detail.result.answer.reasoning}
                  </p>
                )}
                <div className="flex gap-2">
                  <button onClick={() => { onLoadAnalysis(detail); setDetail(null); }}
                    className="flex-1 py-2.5 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">
                    View Analysis →
                  </button>
                  <button onClick={() => { onReAnalyze(detail.topic, detail.question); setDetail(null); }}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl border ${card} ${mute} hover:border-indigo-500 hover:text-indigo-400 transition-colors`}>
                    <RefreshCw className="w-3.5 h-3.5" /> Re-analyze
                  </button>
                </div>
              </div>
            )}

            {detail._kind === 'comparison' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[detail.data?.topic1, detail.data?.topic2].filter(Boolean).map((t, i) => (
                    <div key={i} className={`p-4 rounded-xl ${dk ? 'bg-slate-800' : 'bg-slate-50'}`}>
                      <p className={`text-[10px] font-semibold uppercase tracking-wider ${mute} mb-1`}>Option {i + 1}</p>
                      <p className={`text-base font-bold ${txt}`}>{t.name}</p>
                      <p className="text-sm mt-1" style={{ color: sentColor(t.sentiment) }}>{t.sentiment}/100 sentiment</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { navigateTo('compare'); setDetail(null); }}
                    className="flex-1 py-2.5 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90">
                    Go to Compare →
                  </button>
                  <button onClick={() => { onReAnalyze(detail.topic1, 'Should I choose this?'); setDetail(null); }}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl border ${card} ${mute} hover:border-indigo-500 hover:text-indigo-400`}>
                    <RefreshCw className="w-3.5 h-3.5" /> Analyze {detail.topic1}
                  </button>
                </div>
              </div>
            )}

            {detail._kind === 'dataset' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Rows', value: detail.rows },
                    { label: 'Columns', value: detail.columns },
                    { label: 'Quality', value: detail.result?.overview?.quality || '—' },
                  ].map(d => (
                    <div key={d.label} className={`p-3 rounded-xl ${dk ? 'bg-slate-800' : 'bg-slate-50'}`}>
                      <p className={`text-[10px] font-semibold uppercase tracking-wider ${mute} mb-0.5`}>{d.label}</p>
                      <p className={`text-lg font-black ${txt}`}>{d.value}</p>
                    </div>
                  ))}
                </div>
                <button onClick={() => { navigateTo('dataset'); setDetail(null); }}
                  className="w-full py-2.5 gradient-bg text-white text-sm font-semibold rounded-xl hover:opacity-90">
                  Go to Dataset →
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── History Card ── */
function HistoryCard({ item, idx, dk, card, txt, mute, onLoad, onReAnalyze, navigateTo, onDelete, onSelect, selected }) {
  const kindConfig = {
    analysis:   { icon: BarChart3,      color: 'text-indigo-400', grad: 'from-indigo-500 to-blue-500',   label: 'Analysis' },
    comparison: { icon: GitCompare,     color: 'text-violet-400', grad: 'from-violet-500 to-purple-600', label: 'Comparison' },
    dataset:    { icon: FileSpreadsheet, color: 'text-cyan-400',  grad: 'from-cyan-500 to-blue-600',     label: 'Dataset' },
    watchlist:  { icon: Eye,            color: 'text-amber-400',  grad: 'from-amber-500 to-orange-500',  label: 'Watchlist' },
  };
  const cfg = kindConfig[item._kind] || kindConfig.analysis;
  const Icon = cfg.icon;

  const title = item.topic || item.topic1 || item.filename || '—';
  const sub   = item._kind === 'analysis'   ? `"${item.question}"` :
                item._kind === 'comparison' ? `vs ${item.topic2}` :
                item._kind === 'dataset'    ? `${item.rows} rows · ${item.columns} cols` :
                `Sentiment: ${item.sentiment}/100`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
      onClick={onSelect}
      className={`rounded-2xl border overflow-hidden cursor-pointer transition-all group ${card} ${selected ? 'border-indigo-500 shadow-lg shadow-indigo-500/10' : 'hover:border-indigo-500/50'}`}
    >
      {/* Card header */}
      <div className={`px-4 py-3 flex items-center gap-3 border-b ${dk ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${cfg.grad} flex items-center justify-center shrink-0`}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold truncate ${txt}`}>{title}</p>
          <p className={`text-[10px] truncate ${mute}`}>{sub}</p>
        </div>
        <button onClick={e => { e.stopPropagation(); onDelete(); }}
          className={`p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${dk ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}>
          <Trash2 className="w-3 h-3 text-rose-400" />
        </button>
      </div>

      {/* Sparkline (analysis only) */}
      {item._kind === 'analysis' && (
        <div className="px-3 pt-2 pb-0">
          <MiniSparkline value={item.sentiment} dk={dk} />
        </div>
      )}

      {/* Stats */}
      <div className="px-4 py-3 space-y-1">
        {item._kind === 'analysis' && (
          <>
            <div className="flex items-center justify-between">
              <span className={`text-xs ${mute}`}>Sentiment</span>
              <span className="text-xs font-bold" style={{ color: sentColor(item.sentiment) }}>{item.sentiment}/100 · {sentLabel(item.sentiment)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-xs ${mute}`}>Answer</span>
              <span className={`text-xs font-bold flex items-center gap-1 ${item.answer === 'YES' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {item.answer === 'YES' ? <ThumbsUp className="w-3 h-3" /> : <ThumbsDown className="w-3 h-3" />}
                {item.answer}
              </span>
            </div>
          </>
        )}
        {item._kind === 'comparison' && (
          <div className="flex items-center justify-between">
            <span className={`text-xs ${mute}`}>Topics</span>
            <span className={`text-xs font-bold ${txt}`}>{item.topic1} vs {item.topic2}</span>
          </div>
        )}
        {item._kind === 'dataset' && (
          <div className="flex items-center justify-between">
            <span className={`text-xs ${mute}`}>Size</span>
            <span className={`text-xs font-bold ${txt}`}>{item.rows} rows · {item.columns} cols</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-1">
          <span className={`text-[10px] flex items-center gap-1 ${mute}`}>
            <Calendar className="w-3 h-3" />{timeAgo(item.createdAt)}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${cfg.color} ${dk ? 'border-slate-700' : 'border-slate-200'}`}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className={`px-3 pb-3 flex gap-1.5`}>
        {item._kind === 'analysis' && (
          <>
            <button onClick={e => { e.stopPropagation(); onLoad(item); }}
              className="flex-1 py-1.5 gradient-bg text-white text-[11px] font-semibold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-1">
              <Eye className="w-3 h-3" /> View
            </button>
            <button onClick={e => { e.stopPropagation(); onReAnalyze(item.topic, item.question); }}
              className={`flex-1 py-1.5 border text-[11px] font-medium rounded-lg transition-colors flex items-center justify-center gap-1 ${dk ? 'border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-indigo-400' : 'border-slate-200 text-slate-500 hover:border-indigo-400'}`}>
              <RefreshCw className="w-3 h-3" /> Re-analyze
            </button>
          </>
        )}
        {item._kind === 'comparison' && (
          <button onClick={e => { e.stopPropagation(); navigateTo('compare'); }}
            className="flex-1 py-1.5 gradient-bg text-white text-[11px] font-semibold rounded-lg hover:opacity-90 flex items-center justify-center gap-1">
            <GitCompare className="w-3 h-3" /> Compare Again
          </button>
        )}
        {item._kind === 'dataset' && (
          <button onClick={e => { e.stopPropagation(); navigateTo('dataset'); }}
            className="flex-1 py-1.5 gradient-bg text-white text-[11px] font-semibold rounded-lg hover:opacity-90 flex items-center justify-center gap-1">
            <FileSpreadsheet className="w-3 h-3" /> Open Dataset
          </button>
        )}
      </div>
    </motion.div>
  );
}