import React, { useState, useMemo } from 'react';
import {
  Trophy, TrendingUp, Newspaper, RefreshCw, Sparkles,
  ArrowRight, ExternalLink, ShieldCheck, Tag, Target, Lightbulb,
  Activity, Zap, Star, Globe, CheckCircle2, XCircle,
  Flame, Crown, Scale, ChevronRight, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  CartesianGrid, AreaChart, Area
} from 'recharts';
import { fetchTopicData } from '../services/api';
import axios from 'axios';

// ── Helpers ──────────────────────────────────────────────────────────────────
const clamp   = (v, lo, hi) => Math.max(lo, Math.min(hi, isFinite(v) ? v : lo));
const safeNum = (v, fallback = 0) => (isFinite(Number(v)) ? Number(v) : fallback);
const sc      = s => s >= 65 ? '#10b981' : s >= 45 ? '#f59e0b' : '#f43f5e';
const sl      = s => s >= 65 ? 'Positive' : s >= 45 ? 'Neutral' : 'Negative';

const TABS = ['overview', 'battle', 'charts', 'news', 'details'];

const QUICK_PAIRS = [
  ['iPhone 17', 'Samsung Galaxy S25'],
  ['Tesla Model Y', 'BMW iX'],
  ['Bitcoin', 'Ethereum'],
  ['ChatGPT', 'Gemini'],
  ['Netflix', 'Disney+'],
];

// ── Circular Score Meter ─────────────────────────────────────────────────────
function ScoreMeter({ value, color, label, delay = 0 }) {
  const r = 24, circ = 2 * Math.PI * r;
  const safeVal = clamp(safeNum(value), 0, 100);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14">
        <svg width="56" height="56" className="-rotate-90" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r={r} fill="none" stroke="#1e293b" strokeWidth="5" />
          <motion.circle
            cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="5"
            strokeLinecap="round" strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ * (1 - safeVal / 100) }}
            transition={{ duration: 1.1, delay, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-black" style={{ color }}>{Math.round(safeVal)}</span>
        </div>
      </div>
      <span className="text-[10px] font-semibold text-slate-500 text-center leading-tight">{label}</span>
    </div>
  );
}

// ── Battle Bar Row ───────────────────────────────────────────────────────────
function BattleRow({ label, v1, v2, fmt1, fmt2, icon: Icon, delay = 0 }) {
  const sv1 = safeNum(v1);
  const sv2 = safeNum(v2);
  const max  = Math.max(Math.abs(sv1), Math.abs(sv2), 1);
  const w1   = clamp((Math.abs(sv1) / max) * 100, 5, 100);
  const w2   = clamp((Math.abs(sv2) / max) * 100, 5, 100);
  const winner = sv1 > sv2 ? 1 : sv2 > sv1 ? 2 : 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="grid grid-cols-[1fr,90px,1fr] items-center gap-3"
    >
      <div className="flex items-center gap-2 justify-end">
        <span className="text-xs font-bold tabular-nums" style={{ color: '#10b981', opacity: winner === 1 ? 1 : 0.45 }}>
          {fmt1 ? fmt1(sv1) : sv1}
        </span>
        <div className="w-full max-w-[120px] h-6 flex items-center justify-end overflow-hidden">
          <motion.div
            className="h-full rounded-l-md"
            style={{ background: winner === 1 ? '#10b981' : '#10b98155' }}
            initial={{ width: 0 }} animate={{ width: `${w1}%` }}
            transition={{ duration: 0.9, delay: delay + 0.1 }}
          />
        </div>
      </div>
      <div className="flex flex-col items-center gap-0.5">
        {Icon && <Icon className="w-3 h-3 text-slate-500" />}
        <span className="text-[10px] font-bold text-slate-500 text-center leading-tight">{label}</span>
        {winner !== 0 && <Crown className="w-3 h-3" style={{ color: winner === 1 ? '#10b981' : '#3b82f6' }} />}
      </div>
      <div className="flex items-center gap-2">
        <div className="w-full max-w-[120px] h-6 flex items-center overflow-hidden">
          <motion.div
            className="h-full rounded-r-md"
            style={{ background: winner === 2 ? '#3b82f6' : '#3b82f655' }}
            initial={{ width: 0 }} animate={{ width: `${w2}%` }}
            transition={{ duration: 0.9, delay: delay + 0.1 }}
          />
        </div>
        <span className="text-xs font-bold tabular-nums" style={{ color: '#3b82f6', opacity: winner === 2 ? 1 : 0.45 }}>
          {fmt2 ? fmt2(sv2) : sv2}
        </span>
      </div>
    </motion.div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function Compare({ darkMode, store, onReAnalyze }) {
  const dk = darkMode;
  const [t1Input, setT1Input]     = useState('');
  const [t2Input, setT2Input]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [comparison, setComparison] = useState(null);
  const [error, setError]         = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // ── Theme classes
  const card = dk ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const txt  = dk ? 'text-slate-100' : 'text-slate-800';
  const mute = dk ? 'text-slate-400' : 'text-slate-500';
  const sub  = dk ? 'bg-slate-800/70' : 'bg-slate-50';
  const inpt = dk
    ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-indigo-500'
    : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-indigo-400';
  const ttStyle = { background: dk ? '#1e293b' : '#fff', border: 'none', borderRadius: 10, fontSize: 11 };

  // ── Build a safe topic object from raw API data
  const mk = (name, data, ai) => {
    const answer      = ai?.data?.answer      ?? {};
    const description = ai?.data?.description ?? {};
    const specs       = ai?.data?.specs       ?? { specs: [] };

    return {
      name:        name ?? 'Unknown',
      description: typeof description === 'object' ? description : {},
      specs:       typeof specs === 'object' ? specs : { specs: [] },
      answer:      typeof answer === 'object' ? answer : {},
      pros:        Array.isArray(answer?.pros) ? answer.pros : [],
      cons:        Array.isArray(answer?.cons) ? answer.cons : [],
      tags:        Array.isArray(answer?.tags) ? answer.tags : [],
      verdict:     answer?.verdict    ?? '',
      keyInsight:  answer?.keyInsight ?? '',
      sentiment:   safeNum(data?.sentiment?.sentimentScore ?? data?.sentiment?.score, 50),
      social:      safeNum(data?.metrics?.social,    0),
      trend:       safeNum(data?.metrics?.trend,     0),
      newsCount:   safeNum(data?.news?.length,       0),
      news:        Array.isArray(data?.news) ? data.news : [],
      reach:       safeNum(data?.metrics?.reach,     0),
    };
  };

  // ── Run comparison
  const runCompare = async () => {
    const topic1 = t1Input.trim();
    const topic2 = t2Input.trim();
    if (!topic1 || !topic2) return;

    setLoading(true);
    setError(null);
    setComparison(null);

    try {
      const [data1, data2] = await Promise.all([
        fetchTopicData(topic1),
        fetchTopicData(topic2),
      ]);

      const [ai1, ai2] = await Promise.all([
        axios.post('http://localhost:5000/api/analysis/full', {
          topic: topic1, question: `Summarize ${topic1} for comparison`, topicData: data1,
        }),
        axios.post('http://localhost:5000/api/analysis/full', {
          topic: topic2, question: `Summarize ${topic2} for comparison`, topicData: data2,
        }),
      ]);

      const result = {
        topic1: mk(topic1, data1, ai1),
        topic2: mk(topic2, data2, ai2),
      };

      setComparison(result);
      setActiveTab('overview');
      store?.saveComparison?.(topic1, topic2, result);
    } catch (e) {
      console.error('Compare error:', e, e?.response);
      setError(e?.response?.data?.message || e?.message || 'Comparison failed. Check the server is running.');
    } finally {
      setLoading(false);
    }
  };

  // ── Compute winner safely
  const winner = useMemo(() => {
    if (!comparison?.topic1 || !comparison?.topic2) return null;
    const { topic1: t1, topic2: t2 } = comparison;
    const cats = [
      { label: 'Sentiment',    v1: safeNum(t1.sentiment), v2: safeNum(t2.sentiment) },
      { label: 'Social Reach', v1: safeNum(t1.social),    v2: safeNum(t2.social) },
      { label: 'Trend',        v1: safeNum(t1.trend),     v2: safeNum(t2.trend) },
      { label: 'News',         v1: safeNum(t1.newsCount), v2: safeNum(t2.newsCount) },
    ];
    let s1 = 0, s2 = 0;
    cats.forEach(c => { if (c.v1 > c.v2) s1++; else if (c.v2 > c.v1) s2++; });
    return { winner: s1 > s2 ? 1 : s2 > s1 ? 2 : 0, score1: s1, score2: s2, cats };
  }, [comparison]);

  // ────────────────────────────────────────────────────────────────────────────
  // EMPTY STATE
  // ────────────────────────────────────────────────────────────────────────────
  if (!comparison && !loading) {
    return (
      <div className="w-full space-y-6 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center pt-2 pb-1">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-bg mb-4 shadow-lg shadow-indigo-500/30">
            <Trophy className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-black gradient-text mb-1" style={{ fontFamily: 'Syne,sans-serif' }}>Battle Arena</h1>
          <p className={`text-sm ${mute}`}>Head-to-head AI comparison · Real data · Auto-saved</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
          className={`rounded-2xl border p-6 ${card}`}
        >
          <div className="grid grid-cols-[1fr,52px,1fr] gap-4 items-end mb-5">
            <div>
              <label className={`text-[10px] font-bold uppercase tracking-widest ${mute} mb-2 block`}>Challenger #1</label>
              <input
                type="text" value={t1Input} onChange={e => setT1Input(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && t2Input && runCompare()}
                placeholder="e.g. iPhone 17"
                className={`w-full px-4 py-3 rounded-xl border-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${inpt}`}
              />
            </div>
            <div className="flex items-end justify-center pb-2.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black ${dk ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>VS</div>
            </div>
            <div>
              <label className={`text-[10px] font-bold uppercase tracking-widest ${mute} mb-2 block`}>Challenger #2</label>
              <input
                type="text" value={t2Input} onChange={e => setT2Input(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && t1Input && runCompare()}
                placeholder="e.g. Galaxy S25"
                className={`w-full px-4 py-3 rounded-xl border-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${inpt}`}
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 px-4 py-3 rounded-xl bg-rose-950/40 border border-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-300">{error}</p>
            </div>
          )}

          <button
            onClick={runCompare} disabled={!t1Input.trim() || !t2Input.trim()}
            className="w-full py-3.5 gradient-bg text-white rounded-xl font-bold text-sm disabled:opacity-40 hover:opacity-90 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
          >
            <Flame className="w-4 h-4" /> Start Battle <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${mute} mb-3`}>Quick Battles</p>
          <div className="grid grid-cols-5 gap-2">
            {QUICK_PAIRS.map(([a, b], i) => (
              <button
                key={i} onClick={() => { setT1Input(a); setT2Input(b); }}
                className={`p-3 rounded-xl text-[11px] font-medium border text-center transition-all leading-snug ${card} ${mute} hover:border-indigo-500 hover:text-indigo-400`}
              >
                <span className="block font-bold">{a}</span>
                <span className="opacity-40 text-[9px] my-0.5 block">⚔</span>
                <span className="block font-bold">{b}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {store?.comparisons?.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${mute} mb-3`}>Recent Battles</p>
            <div className="grid grid-cols-4 gap-3">
              {store.comparisons.slice(0, 4).map(c => (
                <button
                  key={c.id} onClick={() => { setT1Input(c.topic1); setT2Input(c.topic2); }}
                  className={`p-3.5 rounded-xl border text-left transition-all hover:border-indigo-500 group ${card}`}
                >
                  <p className={`text-xs font-bold ${txt} mb-0.5`}>{c.topic1}</p>
                  <p className={`text-[10px] ${mute}`}>vs {c.topic2}</p>
                  <p className="text-[10px] text-indigo-400 mt-2 flex items-center gap-1 group-hover:gap-2 transition-all">
                    Re-run <ChevronRight className="w-2.5 h-2.5" />
                  </p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ────────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl gradient-bg flex items-center justify-center shadow-xl shadow-indigo-500/30">
            <motion.div
              animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white"
            />
          </div>
          <p className={`font-black text-lg ${txt}`} style={{ fontFamily: 'Syne,sans-serif' }}>
            <span className="text-emerald-400">{t1Input}</span>
            <span className={`mx-2 font-light ${mute}`}>vs</span>
            <span className="text-blue-400">{t2Input}</span>
          </p>
          <p className={`text-sm mt-2 ${mute}`}>Fetching data, running AI analysis…</p>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // RESULTS — guard against incomplete data
  // ────────────────────────────────────────────────────────────────────────────
  if (!comparison?.topic1 || !comparison?.topic2 || !winner) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-10 h-10 text-rose-400" />
        <p className={`text-sm font-semibold ${txt}`}>Something went wrong building the comparison.</p>
        <button
          onClick={() => { setComparison(null); setError(null); }}
          className="px-4 py-2 text-xs font-bold gradient-bg text-white rounded-xl hover:opacity-90 transition-opacity"
        >
          Try Again
        </button>
      </div>
    );
  }

  const t1 = comparison.topic1;
  const t2 = comparison.topic2;
  const w  = winner;

  // Simulated trend data (stable, seeded from sentiment)
  const trendData = Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    [t1.name]: clamp(t1.sentiment + Math.sin(i / 3 + 1) * 6 + Math.sin(i) * 2, 10, 100),
    [t2.name]: clamp(t2.sentiment + Math.cos(i / 3 + 2) * 6 + Math.cos(i) * 2, 10, 100),
  }));

  const radarData = [
    { m: 'Sentiment', A: clamp(t1.sentiment, 0, 100),                      B: clamp(t2.sentiment, 0, 100) },
    { m: 'Social',    A: clamp(t1.social / 5000, 0, 100),                  B: clamp(t2.social / 5000, 0, 100) },
    { m: 'Trend',     A: clamp(50 + t1.trend, 0, 100),                     B: clamp(50 + t2.trend, 0, 100) },
    { m: 'Coverage',  A: clamp(t1.newsCount * 5, 0, 100),                  B: clamp(t2.newsCount * 5, 0, 100) },
  ];

  const winnerTopic = w.winner === 1 ? t1 : w.winner === 2 ? t2 : null;
  const winnerColor = w.winner === 1 ? '#10b981' : '#3b82f6';

  return (
    <div className="w-full space-y-4 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className={`text-2xl font-black ${txt}`} style={{ fontFamily: 'Syne,sans-serif' }}>
            <span className="text-emerald-400">{t1.name}</span>
            <span className={`mx-3 font-light ${mute}`}>vs</span>
            <span className="text-blue-400">{t2.name}</span>
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs ${mute}`}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-700 text-emerald-400 font-semibold">✓ Saved</span>
          </div>
        </div>
        <button
          onClick={() => { setComparison(null); setT1Input(''); setT2Input(''); setActiveTab('overview'); }}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-colors ${card} ${mute} hover:border-indigo-500 hover:text-indigo-400`}
        >
          <RefreshCw className="w-3.5 h-3.5" /> New Battle
        </button>
      </div>

      {/* ── Winner Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border-2 overflow-hidden"
        style={{ borderColor: w.winner !== 0 ? winnerColor + '70' : (dk ? '#334155' : '#e2e8f0') }}
      >
        <div className="relative p-6" style={{ background: w.winner !== 0 ? `linear-gradient(135deg, ${winnerColor}12, ${winnerColor}20)` : undefined }}>
          <div className="flex items-center gap-4">

            {/* T1 */}
            <div className="flex-1 flex flex-col items-center text-center gap-1.5">
              {t1.description?.image
                ? <img src={t1.description.image} alt={t1.name} className="w-12 h-12 rounded-xl object-cover shadow" />
                : <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black bg-emerald-500/20 text-emerald-400">{t1.name[0]}</div>}
              <p className="text-xs font-bold text-emerald-400 max-w-[100px] truncate">{t1.name}</p>
              <p className="text-4xl font-black text-emerald-400">{w.score1}</p>
              <p className={`text-[10px] ${mute}`}>category wins</p>
              {w.winner === 1 && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40">
                  <Crown className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] font-black text-emerald-400">WINNER</span>
                </div>
              )}
            </div>

            {/* Center */}
            <div className="flex flex-col items-center gap-2 px-4 shrink-0">
              <Trophy className="w-10 h-10" style={{ color: w.winner !== 0 ? winnerColor : (dk ? '#475569' : '#94a3b8') }} />
              {w.winner !== 0 ? (
                <>
                  <p className={`text-[10px] uppercase tracking-widest font-bold ${mute}`}>🏆 Winner</p>
                  <p className="text-xl font-black" style={{ color: winnerColor }}>{winnerTopic.name}</p>
                  <p className={`text-xs ${mute}`}>{Math.max(w.score1, w.score2)} of {w.cats.length} categories</p>
                </>
              ) : (
                <>
                  <p className={`text-[10px] uppercase tracking-widest font-bold ${mute}`}>Result</p>
                  <p className={`text-xl font-black ${txt}`}>Dead Heat</p>
                </>
              )}
            </div>

            {/* T2 */}
            <div className="flex-1 flex flex-col items-center text-center gap-1.5">
              {t2.description?.image
                ? <img src={t2.description.image} alt={t2.name} className="w-12 h-12 rounded-xl object-cover shadow" />
                : <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black bg-blue-500/20 text-blue-400">{t2.name[0]}</div>}
              <p className="text-xs font-bold text-blue-400 max-w-[100px] truncate">{t2.name}</p>
              <p className="text-4xl font-black text-blue-400">{w.score2}</p>
              <p className={`text-[10px] ${mute}`}>category wins</p>
              {w.winner === 2 && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/20 border border-blue-500/40">
                  <Crown className="w-3 h-3 text-blue-400" />
                  <span className="text-[10px] font-black text-blue-400">WINNER</span>
                </div>
              )}
            </div>

          </div>
        </div>
      </motion.div>

      {/* ── Quick stat pills ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Sentiment Gap',  value: `${Math.abs(t1.sentiment - t2.sentiment).toFixed(0)} pts`, sub: `${Math.min(t1.sentiment, t2.sentiment)} vs ${Math.max(t1.sentiment, t2.sentiment)}`, icon: Activity,   color: '#6366f1' },
          { label: 'Social Delta',   value: `${(Math.abs(t1.social - t2.social) / 1000).toFixed(1)}K`, sub: 'mention difference',   icon: Zap,        color: '#06b6d4' },
          { label: 'Total Articles', value: `${t1.newsCount + t2.newsCount}`,                           sub: 'combined coverage',    icon: Newspaper,  color: '#8b5cf6' },
          { label: 'Trend Battle',   value: `${t1.trend >= 0 ? '+' : ''}${t1.trend}% vs ${t2.trend >= 0 ? '+' : ''}${t2.trend}%`, sub: '30-day momentum', icon: TrendingUp, color: '#f59e0b' },
        ].map((s, i) => (
          <motion.div
            key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className={`rounded-2xl border p-4 ${card}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: s.color + '22' }}>
                <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${mute}`}>{s.label}</span>
            </div>
            <p className="text-sm font-black" style={{ color: s.color }}>{s.value}</p>
            <p className={`text-[10px] mt-0.5 ${mute}`}>{s.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Tab bar ── */}
      <div className={`flex gap-1 p-1 rounded-xl border ${card} w-fit`}>
        {TABS.map(tab => (
          <button
            key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${activeTab === tab ? 'gradient-bg text-white shadow-sm' : `${mute} hover:text-indigo-400`}`}
          >
            {tab === 'battle' ? '⚔ Battle' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ══════════════════════════════════════════════════════════════════════
            OVERVIEW TAB
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <motion.div key="ov" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[t1, t2].map((t, idx) => {
                const color = idx === 0 ? '#10b981' : '#3b82f6';
                const isW   = w.winner === idx + 1;
                return (
                  <motion.div key={idx} className={`rounded-2xl border-2 overflow-hidden ${card}`} style={{ borderColor: isW ? color + '70' : undefined }}>
                    <div className="p-5" style={{ background: `linear-gradient(135deg, ${color}10, transparent)` }}>
                      <div className="flex items-start gap-3">
                        {t.description?.image
                          ? <img src={t.description.image} alt={t.name} className="w-14 h-14 rounded-xl object-cover shadow-lg shrink-0" />
                          : <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black shrink-0" style={{ background: color + '22', color }}>{t.name[0]}</div>}
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-lg font-black ${txt} truncate`}>{t.name}</h3>
                          {isW && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg mt-1 text-[10px] font-black" style={{ background: color + '25', color }}>
                              <Crown className="w-2.5 h-2.5" /> WINNER
                            </span>
                          )}
                          <div className="mt-1 text-xs font-semibold" style={{ color: sc(t.sentiment) }}>
                            {sl(t.sentiment)} · {t.sentiment}/100
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      {/* Score meters */}
                      <div className={`p-3 rounded-xl ${sub} flex justify-around`}>
                        <ScoreMeter value={t.sentiment}                        color={sc(t.sentiment)}                         label="Sentiment" delay={idx * 0.1} />
                        <ScoreMeter value={clamp(t.newsCount * 4, 0, 100)}     color={color}                                   label="Coverage"  delay={idx * 0.1 + 0.1} />
                        <ScoreMeter value={clamp(50 + t.trend, 0, 100)}        color={t.trend >= 0 ? '#10b981' : '#f43f5e'}   label="Momentum"  delay={idx * 0.1 + 0.2} />
                        <ScoreMeter value={clamp(t.social / 3000, 0, 100)}     color="#8b5cf6"                                 label="Buzz"      delay={idx * 0.1 + 0.3} />
                      </div>

                      {/* Key metrics */}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'Sentiment',     value: `${t.sentiment}/100`,                         color: sc(t.sentiment) },
                          { label: 'Trend (30d)',   value: `${t.trend >= 0 ? '+' : ''}${t.trend}%`,      color: t.trend >= 0 ? '#10b981' : '#f43f5e' },
                          { label: 'Social Buzz',   value: `${(t.social / 1000).toFixed(1)}K` },
                          { label: 'News Articles', value: `${t.newsCount}` },
                        ].map(m => (
                          <div key={m.label} className={`p-2.5 rounded-xl ${sub}`}>
                            <p className={`text-[10px] font-semibold uppercase tracking-wider ${mute} mb-0.5`}>{m.label}</p>
                            <p className="text-sm font-black" style={m.color ? { color: m.color } : {}}>{m.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Sentiment bars */}
                      <div className={`p-3 rounded-xl ${sub}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${mute} mb-2`}>Sentiment Split</p>
                        {[
                          { label: 'Positive', val: Math.round(t.sentiment * 0.9),         color: '#10b981' },
                          { label: 'Neutral',  val: Math.round((100 - t.sentiment) * 0.5), color: '#f59e0b' },
                          { label: 'Negative', val: Math.round((100 - t.sentiment) * 0.5), color: '#f43f5e' },
                        ].map((b, bi) => (
                          <div key={b.label} className="mb-1.5 last:mb-0">
                            <div className="flex justify-between text-[10px] mb-0.5">
                              <span className={mute}>{b.label}</span>
                              <span className="font-bold" style={{ color: b.color }}>{b.val}%</span>
                            </div>
                            <div className={`h-1.5 rounded-full overflow-hidden ${dk ? 'bg-slate-700' : 'bg-slate-200'}`}>
                              <motion.div
                                initial={{ width: 0 }} animate={{ width: `${clamp(b.val, 0, 100)}%` }}
                                transition={{ duration: 0.9, delay: 0.5 + bi * 0.07 }}
                                className="h-full rounded-full" style={{ background: b.color }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* AI Verdict */}
                      {t.verdict && (
                        <div className={`p-3 rounded-xl border ${dk ? 'border-indigo-700/40 bg-indigo-950/20' : 'border-indigo-200 bg-indigo-50'}`}>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-1">AI Verdict</p>
                          <p className={`text-xs leading-relaxed ${dk ? 'text-slate-300' : 'text-slate-700'}`}>{t.verdict}</p>
                        </div>
                      )}

                      {/* About */}
                      {t.description?.description && (
                        <div className={`p-3 rounded-xl ${sub}`}>
                          <p className={`text-[10px] font-bold uppercase tracking-wider ${mute} mb-1 flex items-center gap-1`}>
                            <Globe className="w-3 h-3" /> About
                          </p>
                          <p className={`text-xs leading-relaxed line-clamp-3 ${dk ? 'text-slate-300' : 'text-slate-600'}`}>{t.description.description}</p>
                        </div>
                      )}

                      <button
                        onClick={() => onReAnalyze?.(t.name, `Should I choose ${t.name}?`)}
                        className="w-full py-2.5 gradient-bg text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Deep Analyze {t.name} <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Insight / Rec / Verdict row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-2xl border-2 border-indigo-600/40 bg-indigo-950/20 p-5">
                <h4 className={`text-xs font-bold mb-2 flex items-center gap-1.5 ${txt}`}>
                  <Lightbulb className="w-3.5 h-3.5 text-indigo-400" /> Key Insight
                </h4>
                <p className={`text-sm leading-relaxed ${dk ? 'text-slate-200' : 'text-slate-700'}`}>
                  {w.winner === 1
                    ? `${t1.name} shows stronger sentiment (${t1.sentiment}/100) and ${t1.trend >= 0 ? 'positive' : 'declining'} momentum at ${t1.trend}%.`
                    : w.winner === 2
                    ? `${t2.name} outperforms with ${t2.sentiment}/100 sentiment and ${t2.social > t1.social ? 'higher' : 'comparable'} social reach.`
                    : 'Both topics are evenly matched. Your choice should come down to personal priorities.'}
                </p>
              </div>
              <div className="rounded-2xl border-2 border-cyan-600/40 bg-cyan-950/20 p-5">
                <h4 className={`text-xs font-bold mb-2 flex items-center gap-1.5 ${txt}`}>
                  <Target className="w-3.5 h-3.5 text-cyan-400" /> Recommendation
                </h4>
                <p className={`text-sm leading-relaxed ${dk ? 'text-slate-200' : 'text-slate-700'}`}>
                  {w.winner !== 0
                    ? `We recommend ${w.winner === 1 ? t1.name : t2.name} — it wins ${Math.max(w.score1, w.score2)} of ${w.cats.length} categories across sentiment, reach, trend and coverage.`
                    : 'Both options are comparable. Consider price, availability, or personal preference to decide.'}
                </p>
              </div>
              <div className="rounded-2xl border-2 border-violet-600/40 bg-violet-950/20 p-5">
                <h4 className={`text-xs font-bold mb-2 flex items-center gap-1.5 ${txt}`}>
                  <ShieldCheck className="w-3.5 h-3.5 text-violet-400" /> Final Verdict
                </h4>
                <p className={`text-sm leading-relaxed ${dk ? 'text-slate-200' : 'text-slate-700'}`}>
                  {w.winner === 1
                    ? `${t1.name} leads — ${t1.sentiment}/100 sentiment, ${(t1.social / 1000).toFixed(0)}K mentions, ${t1.trend >= 0 ? '+' : ''}${t1.trend}% trend. Wins ${w.score1}/${w.cats.length}.`
                    : w.winner === 2
                    ? `${t2.name} wins — ${t2.sentiment}/100 sentiment, ${(t2.social / 1000).toFixed(0)}K mentions, ${t2.trend >= 0 ? '+' : ''}${t2.trend}% trend. Wins ${w.score2}/${w.cats.length}.`
                    : `${t1.name} and ${t2.name} tie ${w.score1}-${w.score2}. The better choice depends on your priorities.`}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => onReAnalyze?.(t1.name, `Should I choose ${t1.name}?`)}
                className={`flex-1 py-2.5 border-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors ${dk ? 'border-emerald-700 text-emerald-400 hover:bg-emerald-950/30' : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50'}`}
              >
                <Sparkles className="w-3.5 h-3.5" /> Deep Analyze {t1.name}
              </button>
              <button
                onClick={() => onReAnalyze?.(t2.name, `Should I choose ${t2.name}?`)}
                className={`flex-1 py-2.5 border-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors ${dk ? 'border-blue-700 text-blue-400 hover:bg-blue-950/30' : 'border-blue-300 text-blue-600 hover:bg-blue-50'}`}
              >
                <Sparkles className="w-3.5 h-3.5" /> Deep Analyze {t2.name}
              </button>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            BATTLE TAB
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'battle' && (
          <motion.div key="bt" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className={`rounded-2xl border p-6 ${card}`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-sm font-bold flex items-center gap-2 ${txt}`} style={{ fontFamily: 'Syne,sans-serif' }}>
                  <Scale className="w-4 h-4 text-indigo-400" /> Head-to-Head
                </h3>
                <div className="flex items-center gap-5 text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-emerald-400"><div className="w-2 h-2 rounded-full bg-emerald-400" /> {t1.name}</span>
                  <span className="flex items-center gap-1.5 text-blue-400"><div className="w-2 h-2 rounded-full bg-blue-400" /> {t2.name}</span>
                </div>
              </div>
              <div className="space-y-5">
                <BattleRow label="Sentiment"     v1={t1.sentiment} v2={t2.sentiment} fmt1={v => `${v}/100`}                fmt2={v => `${v}/100`}                icon={Activity}   delay={0.00} />
                <BattleRow label="Social"        v1={t1.social}    v2={t2.social}    fmt1={v => `${(v/1000).toFixed(1)}K`} fmt2={v => `${(v/1000).toFixed(1)}K`} icon={Zap}        delay={0.08} />
                <BattleRow label="News Articles" v1={t1.newsCount} v2={t2.newsCount} fmt1={v => `${v}`}                   fmt2={v => `${v}`}                    icon={Newspaper}  delay={0.16} />
                <BattleRow
                  label="30d Trend"
                  v1={Math.max(0, t1.trend + 50)} v2={Math.max(0, t2.trend + 50)}
                  fmt1={() => `${t1.trend >= 0 ? '+' : ''}${t1.trend}%`}
                  fmt2={() => `${t2.trend >= 0 ? '+' : ''}${t2.trend}%`}
                  icon={TrendingUp} delay={0.24}
                />
              </div>
            </div>

            {/* Category result cards */}
            <div className={`rounded-2xl border p-5 ${card}`}>
              <h3 className={`text-sm font-bold mb-4 ${txt}`} style={{ fontFamily: 'Syne,sans-serif' }}>Category Results</h3>
              <div className="grid grid-cols-4 gap-3">
                {w.cats.map((cat, i) => {
                  const cw = cat.v1 > cat.v2 ? 1 : cat.v2 > cat.v1 ? 2 : 0;
                  return (
                    <motion.div
                      key={cat.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }}
                      className={`p-4 rounded-xl border-2 text-center ${cw === 1 ? 'border-emerald-600/50 bg-emerald-950/10' : cw === 2 ? 'border-blue-600/50 bg-blue-950/10' : dk ? 'border-slate-700' : 'border-slate-200'}`}
                    >
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${mute} mb-3`}>{cat.label}</p>
                      <div className="flex justify-around items-end gap-1 mb-2">
                        <div className="text-center">
                          <div className={`text-lg font-black ${cw === 1 ? 'text-emerald-400' : mute}`}>{cat.v1 > 1000 ? `${(cat.v1 / 1000).toFixed(1)}K` : cat.v1}</div>
                          <div className="text-[9px] text-emerald-500/60 truncate w-12">{t1.name.split(' ')[0]}</div>
                        </div>
                        <div className={`text-[10px] font-bold ${mute} pb-1`}>vs</div>
                        <div className="text-center">
                          <div className={`text-lg font-black ${cw === 2 ? 'text-blue-400' : mute}`}>{cat.v2 > 1000 ? `${(cat.v2 / 1000).toFixed(1)}K` : cat.v2}</div>
                          <div className="text-[9px] text-blue-500/60 truncate w-12">{t2.name.split(' ')[0]}</div>
                        </div>
                      </div>
                      {cw !== 0 && (
                        <div className="flex items-center justify-center gap-1">
                          <Crown className="w-3 h-3" style={{ color: cw === 1 ? '#10b981' : '#3b82f6' }} />
                          <p className="text-[10px] font-bold" style={{ color: cw === 1 ? '#10b981' : '#3b82f6' }}>{(cw === 1 ? t1 : t2).name.split(' ')[0]}</p>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Pros & Cons */}
            <div className="grid grid-cols-2 gap-4">
              {[t1, t2].map((t, idx) => (
                <div key={idx} className={`rounded-2xl border p-5 ${card} space-y-3`}>
                  <h4 className={`text-sm font-black ${txt} flex items-center gap-2`} style={{ fontFamily: 'Syne,sans-serif' }}>
                    <div className="w-3 h-3 rounded-full" style={{ background: idx === 0 ? '#10b981' : '#3b82f6' }} /> {t.name}
                  </h4>
                  {t.pros.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Pros</p>
                      <ul className="space-y-1.5">
                        {t.pros.slice(0, 4).map((p, i) => (
                          <li key={i} className={`flex items-start gap-2 text-xs ${dk ? 'text-slate-300' : 'text-slate-600'}`}>
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />{p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {t.cons.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-rose-400 mb-2 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Cons</p>
                      <ul className="space-y-1.5">
                        {t.cons.slice(0, 4).map((c, i) => (
                          <li key={i} className={`flex items-start gap-2 text-xs ${dk ? 'text-slate-300' : 'text-slate-600'}`}>
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />{c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {t.pros.length === 0 && t.cons.length === 0 && (
                    <p className={`text-xs ${mute} text-center py-4`}>Run a deep analysis for pros & cons</p>
                  )}
                  {t.specs?.specs?.filter(s => s.value !== 'N/A').length > 0 && (
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${mute} mb-2`}>Key Specs</p>
                      {t.specs.specs.filter(s => s.value !== 'N/A').slice(0, 5).map((s, i) => (
                        <div key={i} className={`flex justify-between text-xs p-2 rounded-lg mb-1 last:mb-0 ${sub}`}>
                          <span className={mute}>{s.label}</span>
                          <span className={`font-semibold ${txt}`}>{s.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            CHARTS TAB
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'charts' && (
          <motion.div key="ch" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className={`rounded-2xl border p-5 ${card}`}>
              <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${txt}`} style={{ fontFamily: 'Syne,sans-serif' }}>
                <Activity className="w-4 h-4 text-indigo-400" /> 30-Day Sentiment Trend
              </h3>
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={dk ? '#1e293b' : '#f1f5f9'} vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: dk ? '#475569' : '#94a3b8' }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis domain={[10, 100]} tick={{ fontSize: 9, fill: dk ? '#475569' : '#94a3b8' }} tickLine={false} axisLine={false} width={24} />
                  <Tooltip contentStyle={ttStyle} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <Area type="monotone" dataKey={t1.name} stroke="#10b981" fill="url(#g1)" strokeWidth={2.5} dot={false} />
                  <Area type="monotone" dataKey={t2.name} stroke="#3b82f6" fill="url(#g2)" strokeWidth={2.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className={`rounded-2xl border p-5 ${card}`}>
                <h3 className={`text-sm font-bold mb-4 ${txt}`}>Radar Profile</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke={dk ? '#1e293b' : '#e2e8f0'} />
                    <PolarAngleAxis dataKey="m" tick={{ fontSize: 9, fill: dk ? '#64748b' : '#94a3b8' }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name={t1.name} dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
                    <Radar name={t2.name} dataKey="B" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className={`rounded-2xl border p-5 ${card}`}>
                <h3 className={`text-sm font-bold mb-4 ${txt}`}>Category Bar Chart</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={[
                      { name: 'Sentiment', [t1.name]: clamp(t1.sentiment, 0, 100),               [t2.name]: clamp(t2.sentiment, 0, 100) },
                      { name: 'Coverage',  [t1.name]: clamp(t1.newsCount * 5, 0, 100),           [t2.name]: clamp(t2.newsCount * 5, 0, 100) },
                      { name: 'Trend+50',  [t1.name]: clamp(50 + t1.trend, 0, 100),              [t2.name]: clamp(50 + t2.trend, 0, 100) },
                      { name: 'Social/5K', [t1.name]: clamp(t1.social / 5000, 0, 100),           [t2.name]: clamp(t2.social / 5000, 0, 100) },
                    ]}
                    margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={dk ? '#1e293b' : '#f1f5f9'} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: dk ? '#475569' : '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: dk ? '#475569' : '#94a3b8' }} tickLine={false} axisLine={false} width={24} />
                    <Tooltip contentStyle={ttStyle} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey={t1.name} fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey={t2.name} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            NEWS TAB
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'news' && (
          <motion.div key="nw" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-2 gap-4">
              {[t1, t2].map((t, idx) => (
                <div key={idx} className={`rounded-2xl border p-5 ${card}`}>
                  <h4 className={`text-sm font-bold mb-4 flex items-center gap-2 ${txt}`}>
                    <Newspaper className="w-4 h-4" style={{ color: idx === 0 ? '#10b981' : '#3b82f6' }} />
                    {t.name}
                    <span className={`font-normal text-xs ${mute} ml-auto`}>{t.newsCount} articles</span>
                  </h4>
                  <div className="space-y-2">
                    {t.news.slice(0, 8).map((a, i) => (
                      <motion.a
                        key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                        href={a?.url || '#'} target="_blank" rel="noopener noreferrer"
                        className={`flex items-start gap-2.5 p-3 rounded-xl border-l-4 group transition-colors ${idx === 0 ? 'border-emerald-500' : 'border-blue-500'} ${dk ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100'}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium leading-snug group-hover:text-indigo-400 transition-colors ${txt} mb-1`}>{a?.title ?? 'Untitled'}</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${dk ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>{a?.source ?? 'News'}</span>
                            {a?.time && <span className={`text-[10px] ${mute}`}>{a.time}</span>}
                          </div>
                        </div>
                        <ExternalLink className={`w-3 h-3 shrink-0 mt-0.5 ${mute} group-hover:text-indigo-400`} />
                      </motion.a>
                    ))}
                    {t.news.length === 0 && <p className={`text-xs text-center py-8 ${mute}`}>No news found.</p>}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            DETAILS TAB
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'details' && (
          <motion.div key="dt" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-2 gap-4">
              {[t1, t2].map((t, idx) => (
                <div key={idx} className={`rounded-2xl border p-5 ${card} space-y-4`}>
                  <h4 className={`text-sm font-black flex items-center gap-2 ${txt}`} style={{ fontFamily: 'Syne,sans-serif' }}>
                    <Star className="w-4 h-4" style={{ color: idx === 0 ? '#10b981' : '#3b82f6' }} /> {t.name}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Sentiment',  value: `${t.sentiment}/100`,                        color: sc(t.sentiment) },
                      { label: 'Label',      value: sl(t.sentiment) },
                      { label: '30d Trend',  value: `${t.trend >= 0 ? '+' : ''}${t.trend}%`,     color: t.trend >= 0 ? '#10b981' : '#f43f5e' },
                      { label: 'Social',     value: `${(t.social / 1000).toFixed(1)}K` },
                      { label: 'Articles',   value: `${t.newsCount}` },
                      { label: 'Risk Level', value: t.answer?.riskLevel ?? '—' },
                    ].map((d, i) => (
                      <div key={i} className={`p-2.5 rounded-xl ${sub}`}>
                        <p className={`text-[10px] font-semibold uppercase tracking-wider ${mute} mb-0.5`}>{d.label}</p>
                        <p className="text-sm font-black" style={d.color ? { color: d.color } : {}}>{d.value}</p>
                      </div>
                    ))}
                  </div>

                  {t.specs?.specs?.filter(s => s.value !== 'N/A').length > 0 && (
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${mute} mb-2`}>Product Specs</p>
                      <div className="grid grid-cols-2 gap-2">
                        {t.specs.specs.filter(s => s.value !== 'N/A').map((s, i) => (
                          <div key={i} className={`p-2.5 rounded-xl ${sub}`}>
                            <p className={`text-[10px] ${mute}`}>{s.label}</p>
                            <p className={`text-xs font-semibold ${txt}`}>{s.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {t.tags?.length > 0 && (
                    <div>
                      <p className={`text-[10px] font-semibold ${mute} mb-2 flex items-center gap-1.5`}><Tag className="w-3 h-3" /> Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {t.tags.map(tag => (
                          <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${dk ? 'border-indigo-700 bg-indigo-950/40 text-indigo-300' : 'border-indigo-200 bg-indigo-50 text-indigo-700'}`}>#{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {t.description?.url && (
                    <a href={t.description.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                      <Globe className="w-3.5 h-3.5" /> Read on Wikipedia
                    </a>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}