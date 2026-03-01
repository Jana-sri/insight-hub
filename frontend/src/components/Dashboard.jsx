import React, { useState } from 'react';
import {
  Search, TrendingUp, TrendingDown, Sparkles, BarChart3, Users, Newspaper,
  ThumbsUp, ThumbsDown, AlertTriangle, Loader2, RefreshCw, ShieldCheck,
  ShieldAlert, ShieldX, CheckCircle2, XCircle, Tag, Star, Info,
  ExternalLink, Lightbulb, Target, ArrowRight, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { fetchTopicData } from '../services/api';
import axios from 'axios';

/* ─── helpers ─── */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const sc = (s) => s >= 65 ? '#10b981' : s >= 45 ? '#f59e0b' : '#f43f5e';
const sl = (s) => s >= 65 ? 'Positive' : s >= 45 ? 'Neutral' : 'Negative';

function genTrend(base, drift) {
  return Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    value: clamp(base + (drift / 30) * i + Math.sin(i / 2.5) * 4 + (Math.random() - 0.5) * 3, 5, 100),
  }));
}

function pieData(n) {
  return [
    { name: 'News',   value: n,               color: '#6366f1' },
    { name: 'Social', value: Math.round(n * 1.8), color: '#06b6d4' },
    { name: 'Forums', value: Math.round(n / 2),   color: '#8b5cf6' },
  ];
}

function radarData(sentiment, trend, social, newsCount) {
  return [
    { subject: 'Sentiment', value: sentiment },
    { subject: 'Momentum',  value: clamp(50 + trend, 0, 100) },
    { subject: 'Coverage',  value: clamp(newsCount * 4, 0, 100) },
    { subject: 'Buzz',      value: clamp(social / 3000, 0, 100) },
    { subject: 'Confidence',value: clamp(sentiment * 0.8 + 10, 0, 100) },
  ];
}

const RISK_CONFIG = {
  Low:    { color: '#10b981', icon: ShieldCheck, bg: 'bg-emerald-950/30 border-emerald-600/40' },
  Medium: { color: '#f59e0b', icon: ShieldAlert,  bg: 'bg-amber-950/30 border-amber-600/40'   },
  High:   { color: '#f43f5e', icon: ShieldX,      bg: 'bg-rose-950/30 border-rose-600/40'     },
};

function Tip({ active, payload, label, dk }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={`px-3 py-2 rounded-xl text-xs shadow-lg border ${dk ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}>
      <p className="font-semibold mb-0.5">Day {label}</p>
      <p style={{ color: payload[0]?.color }}>Sentiment: <b>{Number(payload[0]?.value).toFixed(1)}</b></p>
    </div>
  );
}

const QUICK = ['iPhone 17', 'Tesla Model Y', 'Bitcoin', 'ChatGPT', 'NVIDIA', 'Samsung Galaxy S25'];

/* ─── Main ─── */
export default function Dashboard({ darkMode }) {
  const dk = darkMode;
  const [q,        setQ]        = useState('');
  const [question, setQuestion] = useState('');
  const [showDlg,  setShowDlg]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error,    setError]    = useState(null);
  const [activeTab,setActiveTab]= useState('overview');

  const card  = dk ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const txt   = dk ? 'text-slate-100' : 'text-slate-800';
  const mute  = dk ? 'text-slate-400' : 'text-slate-500';
  const inpt  = dk
    ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-600 focus:border-indigo-500'
    : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-400';

  const open = (topic = q) => { if (!topic.trim()) return; setQ(topic); setError(null); setShowDlg(true); };

  const run = async () => {
    if (!question.trim()) return;
    setShowDlg(false); setLoading(true); setError(null);
    try {
      const topicData = await fetchTopicData(q);
      const res = await axios.post('http://localhost:5000/api/analysis/full', { topic: q, question, topicData });
      setAnalysis({ topic: q, question, topicData, ...res.data });
      setActiveTab('overview');
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Analysis failed. Is the backend running?');
    } finally {
      setLoading(false); setQuestion('');
    }
  };

  const reset = () => { setQ(''); setQuestion(''); setAnalysis(null); setError(null); };

  /* ── Welcome ── */
  if (!analysis && !loading) {
    return (
      <div className="w-full min-h-[78vh] flex items-center justify-center">
        <div className="w-full max-w-2xl px-4">
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-bg mb-5 shadow-xl shadow-indigo-500/30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl font-black mb-3 gradient-text" style={{ fontFamily: 'Syne,sans-serif' }}>InsightHub</h1>
            <p className={`text-base font-medium ${mute}`}>
              AI-powered analysis · Real data · Accurate answers
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="relative mb-4">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${mute}`} />
              <input
                type="text" value={q} onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && open()}
                placeholder="Analyze any topic — product, stock, crypto, brand…"
                className={`w-full pl-12 pr-36 py-4 text-[15px] rounded-2xl border-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-lg transition-all ${inpt}`}
              />
              <button onClick={() => open()} disabled={!q.trim()}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 px-5 py-2.5 gradient-bg text-white rounded-xl font-semibold text-sm disabled:opacity-40 hover:opacity-90 transition-opacity shadow">
                Analyze →
              </button>
            </div>

            {error && <div className="mb-4 px-4 py-3 rounded-xl bg-rose-900/30 border border-rose-700 text-sm text-rose-300">{error}</div>}

            <div className="flex flex-wrap gap-2 justify-center mb-8">
              {QUICK.map((s, i) => (
                <motion.button key={s} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }}
                  onClick={() => open(s)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${card} ${mute} hover:border-indigo-500 hover:text-indigo-400`}>
                  {s}
                </motion.button>
              ))}
            </div>

            {/* Feature tiles */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: BarChart3, label: 'Sentiment Analysis', desc: 'Real-time news sentiment scoring' },
                { icon: Lightbulb, label: 'AI Insights',        desc: 'GPT-4o powered data analysis' },
                { icon: Target,    label: 'Decision Engine',    desc: 'YES/NO answers with evidence' },
              ].map(f => (
                <div key={f.label} className={`rounded-xl border p-4 text-center ${card}`}>
                  <f.icon className="w-5 h-5 mx-auto mb-2 text-indigo-400" />
                  <p className={`text-xs font-semibold ${txt}`}>{f.label}</p>
                  <p className={`text-[11px] mt-0.5 ${mute}`}>{f.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Question dialog */}
        <AnimatePresence>
          {showDlg && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
                className={`w-full max-w-md mx-4 rounded-2xl border shadow-2xl p-6 ${card}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">AI Analysis</span>
                </div>
                <h3 className={`text-lg font-bold mb-1 ${txt}`} style={{ fontFamily: 'Syne,sans-serif' }}>
                  Question about <span className="gradient-text">"{q}"</span>
                </h3>
                <p className={`text-xs mb-4 ${mute}`}>A specific question yields sharper, more accurate answers.</p>

                <input type="text" value={question} onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && run()}
                  placeholder='e.g. "Should I buy it?" or "Is it overhyped?"'
                  autoFocus
                  className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 mb-3 transition-all ${inpt}`}
                />

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {['Should I buy it?', 'Is it worth the price?', 'What are the risks?', 'Is it trending up?', 'Is it overhyped?'].map(qp => (
                    <button key={qp} onClick={() => setQuestion(qp)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${question === qp
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                        : `${dk ? 'border-slate-700 text-slate-400 hover:border-indigo-600' : 'border-slate-200 text-slate-500 hover:border-indigo-400'}`}`}>
                      {qp}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setShowDlg(false)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${dk ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                    Cancel
                  </button>
                  <button onClick={run} disabled={!question.trim()}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold gradient-bg text-white disabled:opacity-40 hover:opacity-90 transition-opacity">
                    Run Analysis →
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl gradient-bg flex items-center justify-center shadow-lg">
            <Loader2 className="w-7 h-7 text-white animate-spin" />
          </div>
          <p className={`font-bold ${txt}`} style={{ fontFamily: 'Syne,sans-serif' }}>Analyzing "{q}"</p>
          <p className={`text-sm mt-1 ${mute}`}>Fetching news · Running AI · Building insights…</p>
        </div>
      </div>
    );
  }

  /* ── Results ── */
  const sentiment = analysis.topicData?.sentiment?.sentimentScore ?? analysis.topicData?.sentiment?.score ?? 55;
  const trend     = analysis.topicData?.metrics?.trend ?? 0;
  const social    = analysis.topicData?.metrics?.social ?? 0;
  const newsCount = analysis.topicData?.news?.length ?? 0;
  const ans       = analysis.answer;
  const isPos     = ans?.answer === 'YES' || (!String(ans?.answer).toLowerCase().includes('no') && sentiment >= 55);
  const sColor    = sc(sentiment);
  const riskCfg   = RISK_CONFIG[ans?.riskLevel] || RISK_CONFIG.Medium;
  const RiskIcon  = riskCfg.icon;
  const trendData = genTrend(sentiment, trend);
  const pie       = pieData(newsCount);
  const radar     = radarData(sentiment, trend, social, newsCount);

  const TABS = ['overview', 'insights', 'news', 'details'];

  return (
    <div className="w-full space-y-5">

      {/* ── Title row ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className={`text-2xl font-black ${txt}`} style={{ fontFamily: 'Syne,sans-serif' }}>
            Analysis: <span className="gradient-text">{analysis.topic}</span>
          </h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs ${mute}`}>{newsCount} articles · {sl(sentiment)} · {new Date().toLocaleDateString()}</span>
            {ans?.tags?.map(tag => (
              <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-full border ${dk ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                #{tag}
              </span>
            ))}
          </div>
        </div>
        <button onClick={reset}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl border ${card} ${mute} hover:border-indigo-500 hover:text-indigo-400 transition-colors`}>
          <RefreshCw className="w-3.5 h-3.5" /> New Search
        </button>
      </div>

      {/* ── Answer banner ── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        className={`w-full rounded-2xl border-2 p-6 ${isPos ? 'border-emerald-600/50 bg-emerald-950/20' : 'border-rose-600/50 bg-rose-950/20'}`}>
        <div className="flex items-start gap-5">
          <div className={`w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center shadow-lg ${isPos ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-rose-500 to-pink-600'}`}>
            {isPos ? <ThumbsUp className="w-7 h-7 text-white" /> : <ThumbsDown className="w-7 h-7 text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${mute}`}>"{analysis.question}"</p>
            <div className={`text-4xl font-black mb-1.5 ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>{ans?.answer ?? '—'}</div>
            <p className={`text-sm font-semibold mb-1 ${txt}`}>{ans?.verdict}</p>
            <p className={`text-sm leading-relaxed ${dk ? 'text-slate-300' : 'text-slate-600'}`}>{ans?.reasoning}</p>
          </div>
          <div className="shrink-0 flex flex-col items-center gap-2">
            <div className={`text-center px-4 py-3 rounded-xl ${dk ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <p className={`text-2xl font-black ${txt}`}>{ans?.confidence ?? '—'}%</p>
              <p className={`text-[10px] ${mute}`}>Confidence</p>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${riskCfg.bg}`}>
              <RiskIcon className="w-3.5 h-3.5" style={{ color: riskCfg.color }} />
              <span className="text-[11px] font-semibold" style={{ color: riskCfg.color }}>{ans?.riskLevel ?? 'Medium'} Risk</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── 4 metric cards ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: <BarChart3 className="w-5 h-5 text-white"/>, grad:'from-indigo-500 to-blue-500', label:'Sentiment', big:<>{sentiment}<span className="text-xl font-normal">/100</span></>, sub:`${sl(sentiment)} · ${newsCount} src`, style:{color:sColor} },
          { icon: <Users className="w-5 h-5 text-white"/>, grad:'from-violet-500 to-purple-600', label:'Social Buzz', big:<>{(social/1000).toFixed(1)}<span className="text-xl font-normal">K</span></>, sub:'Public mentions' },
          { icon: trend>=0?<TrendingUp className="w-5 h-5 text-white"/>:<TrendingDown className="w-5 h-5 text-white"/>, grad:trend>=0?'from-emerald-500 to-teal-500':'from-rose-500 to-pink-600', label:'Market Trend', big:<>{trend>=0?'+':''}{trend}<span className="text-xl font-normal">%</span></>, sub:'30-day momentum', style:{color:trend>=0?'#10b981':'#f43f5e'} },
          { icon: <Newspaper className="w-5 h-5 text-white"/>, grad:'from-cyan-500 to-blue-600', label:'Coverage', big:newsCount, sub:'Verified articles' },
        ].map((m,i) => (
          <motion.div key={i} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.06*(i+1)}}
            className={`rounded-2xl border p-4 shadow-sm ${card}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${m.grad} flex items-center justify-center shadow shrink-0`}>{m.icon}</div>
              <span className={`text-xs font-semibold ${txt}`}>{m.label}</span>
            </div>
            <div className={`text-3xl font-black mb-0.5 ${txt}`} style={m.style}>{m.big}</div>
            <p className={`text-[11px] ${mute}`}>{m.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Tab navigation ── */}
      <div className={`flex gap-1 p-1 rounded-xl ${dk ? 'bg-slate-900 border border-slate-800' : 'bg-slate-100'}`}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all capitalize ${
              activeTab === tab
                ? 'gradient-bg text-white shadow'
                : `${mute} ${dk ? 'hover:bg-slate-800' : 'hover:bg-white'}`
            }`}>
            {tab === 'overview' ? '📊 Overview' : tab === 'insights' ? '💡 Insights' : tab === 'news' ? '📰 News' : '🔍 Details'}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
            {/* Charts */}
            <div className={`rounded-2xl border p-5 shadow-sm ${card}`}>
              <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${txt}`} style={{fontFamily:'Syne,sans-serif'}}>
                <Sparkles className="w-4 h-4 text-indigo-400"/> Visual Analysis
              </h3>
              <div className="grid grid-cols-3 gap-6">
                {/* Area chart */}
                <div className="col-span-1">
                  <p className={`text-[10px] uppercase tracking-widest font-semibold mb-2 ${mute}`}>30-Day Trend</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={trendData} margin={{top:4,right:4,bottom:0,left:0}}>
                      <defs>
                        <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={sColor} stopOpacity={0.25}/>
                          <stop offset="100%" stopColor={sColor} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={dk?'#1e293b':'#f1f5f9'} vertical={false}/>
                      <XAxis dataKey="day" tick={{fontSize:9,fill:dk?'#475569':'#94a3b8'}} tickLine={false} axisLine={false} interval={4}/>
                      <YAxis domain={[0,100]} tick={{fontSize:9,fill:dk?'#475569':'#94a3b8'}} tickLine={false} axisLine={false} width={24}/>
                      <Tooltip content={<Tip dk={dk}/>}/>
                      <Area type="monotone" dataKey="value" stroke={sColor} strokeWidth={2.5} fill="url(#ag)" dot={false}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Radar chart */}
                <div className="col-span-1">
                  <p className={`text-[10px] uppercase tracking-widest font-semibold mb-2 ${mute}`}>Topic Health</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={radar} margin={{top:4,right:20,bottom:4,left:20}}>
                      <PolarGrid stroke={dk?'#1e293b':'#e2e8f0'}/>
                      <PolarAngleAxis dataKey="subject" tick={{fontSize:9,fill:dk?'#64748b':'#94a3b8'}}/>
                      <PolarRadiusAxis domain={[0,100]} tick={false} axisLine={false}/>
                      <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2}/>
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Donut */}
                <div className="col-span-1">
                  <p className={`text-[10px] uppercase tracking-widest font-semibold mb-2 ${mute}`}>Data Sources</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pie} dataKey="value" cx="50%" cy="50%" outerRadius={75} innerRadius={42}>
                        {pie.map((e,i)=><Cell key={i} fill={e.color}/>)}
                      </Pie>
                      <Tooltip formatter={(v,n)=>[v,n]} contentStyle={{background:dk?'#1e293b':'#fff',border:'none',borderRadius:8,fontSize:11}}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-3 mt-1">
                    {pie.map(d=>(
                      <div key={d.name} className="flex items-center gap-1 text-[10px]">
                        <span className="w-2 h-2 rounded-full" style={{background:d.color}}/>
                        <span className={mute}>{d.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Pros / Cons */}
            <div className="grid grid-cols-2 gap-4">
              <div className={`rounded-2xl border p-5 shadow-sm ${card}`}>
                <h4 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2" style={{fontFamily:'Syne,sans-serif'}}>
                  <CheckCircle2 className="w-4 h-4"/> Pros
                </h4>
                <ul className="space-y-2">
                  {(ans?.pros || []).map((p,i)=>(
                    <li key={i} className={`flex items-start gap-2 text-sm ${dk?'text-slate-300':'text-slate-600'}`}>
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"/>
                      {p}
                    </li>
                  ))}
                  {(!ans?.pros?.length) && <li className={`text-sm ${mute}`}>No pros extracted.</li>}
                </ul>
              </div>
              <div className={`rounded-2xl border p-5 shadow-sm ${card}`}>
                <h4 className="text-sm font-bold text-rose-400 mb-3 flex items-center gap-2" style={{fontFamily:'Syne,sans-serif'}}>
                  <XCircle className="w-4 h-4"/> Cons
                </h4>
                <ul className="space-y-2">
                  {(ans?.cons || []).map((c,i)=>(
                    <li key={i} className={`flex items-start gap-2 text-sm ${dk?'text-slate-300':'text-slate-600'}`}>
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"/>
                      {c}
                    </li>
                  ))}
                  {(!ans?.cons?.length) && <li className={`text-sm ${mute}`}>No cons extracted.</li>}
                </ul>
              </div>
            </div>

            {/* Key Insight + Recommendation */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border-2 border-indigo-600/40 bg-indigo-950/20 p-5">
                <h4 className={`text-sm font-bold mb-3 flex items-center gap-2 ${txt}`} style={{fontFamily:'Syne,sans-serif'}}>
                  <Lightbulb className="w-4 h-4 text-indigo-400"/> Key Insight
                </h4>
                <p className={`text-sm font-semibold leading-relaxed ${dk?'text-slate-200':'text-slate-700'}`}>
                  {ans?.keyInsight || 'No insight generated.'}
                </p>
              </div>
              <div className="rounded-2xl border-2 border-cyan-600/40 bg-cyan-950/20 p-5">
                <h4 className={`text-sm font-bold mb-3 flex items-center gap-2 ${txt}`} style={{fontFamily:'Syne,sans-serif'}}>
                  <Target className="w-4 h-4 text-cyan-400"/> Recommendation
                </h4>
                <p className={`text-sm font-semibold leading-relaxed ${dk?'text-slate-200':'text-slate-700'}`}>
                  {ans?.recommendation || 'No recommendation generated.'}
                </p>
                {ans?.priceOutlook && (
                  <div className={`mt-3 pt-3 border-t ${dk?'border-cyan-900':'border-cyan-200'}`}>
                    <p className={`text-[11px] font-semibold text-cyan-400 uppercase tracking-wider mb-0.5`}>Price Outlook</p>
                    <p className={`text-xs ${dk?'text-slate-300':'text-slate-600'}`}>{ans.priceOutlook}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* INSIGHTS TAB */}
        {activeTab === 'insights' && (
          <motion.div key="insights" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
            {/* Evidence */}
            <div className={`rounded-2xl border p-5 shadow-sm ${card}`}>
              <h4 className={`text-sm font-bold mb-4 flex items-center gap-2 ${txt}`} style={{fontFamily:'Syne,sans-serif'}}>
                <AlertTriangle className="w-4 h-4 text-amber-400"/> Supporting Evidence
              </h4>
              <div className="space-y-3">
                {(ans?.evidence || []).map((e,i)=>(
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${dk?'bg-slate-800':'bg-slate-50'}`}>
                    <span className={`mt-1 text-xs font-bold text-indigo-400 shrink-0`}>#{i+1}</span>
                    <p className={`text-sm ${dk?'text-slate-300':'text-slate-600'}`}>{e}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Sentiment breakdown */}
            <div className={`rounded-2xl border p-5 shadow-sm ${card}`}>
              <h4 className={`text-sm font-bold mb-4 ${txt}`} style={{fontFamily:'Syne,sans-serif'}}>Sentiment Breakdown</h4>
              <div className="space-y-3">
                {[
                  { label: 'Positive', value: analysis.topicData?.sentiment?.breakdown?.positive ?? Math.round(sentiment * 0.9), color: '#10b981' },
                  { label: 'Neutral',  value: analysis.topicData?.sentiment?.breakdown?.neutral  ?? Math.round((100 - sentiment) * 0.5), color: '#f59e0b' },
                  { label: 'Negative', value: analysis.topicData?.sentiment?.breakdown?.negative ?? Math.round((100 - sentiment) * 0.5), color: '#f43f5e' },
                ].map(b=>(
                  <div key={b.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={mute}>{b.label}</span>
                      <span className="font-semibold" style={{color:b.color}}>{b.value}%</span>
                    </div>
                    <div className={`h-2 rounded-full overflow-hidden ${dk?'bg-slate-800':'bg-slate-100'}`}>
                      <motion.div initial={{width:0}} animate={{width:`${b.value}%`}} transition={{duration:0.8,delay:0.2}}
                        className="h-full rounded-full" style={{background:b.color}}/>
                    </div>
                  </div>
                ))}
              </div>
              {analysis.topicData?.sentiment?.summary && (
                <p className={`text-xs mt-4 p-3 rounded-xl ${dk?'bg-slate-800 text-slate-300':'bg-slate-50 text-slate-600'}`}>
                  <Info className="inline w-3 h-3 mr-1 text-indigo-400"/>
                  {analysis.topicData.sentiment.summary}
                </p>
              )}
            </div>

            {/* Topic description from Wikipedia */}
            {analysis.description?.description && (
              <div className={`rounded-2xl border p-5 shadow-sm ${card}`}>
                <h4 className={`text-sm font-bold mb-3 flex items-center gap-2 ${txt}`} style={{fontFamily:'Syne,sans-serif'}}>
                  <Globe className="w-4 h-4 text-indigo-400"/> About {analysis.topic}
                </h4>
                <p className={`text-sm leading-relaxed ${dk?'text-slate-300':'text-slate-600'}`}>{analysis.description.description}</p>
                {analysis.description.url && (
                  <a href={analysis.description.url} target="_blank" rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                    <ExternalLink className="w-3 h-3"/> Read on Wikipedia
                  </a>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* NEWS TAB */}
        {activeTab === 'news' && (
          <motion.div key="news" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
            <div className={`rounded-2xl border p-5 shadow-sm ${card}`}>
              <h4 className={`text-sm font-bold mb-4 flex items-center gap-2 ${txt}`} style={{fontFamily:'Syne,sans-serif'}}>
                <Newspaper className="w-4 h-4 text-indigo-400"/>
                News Articles <span className={`font-normal ${mute}`}>({newsCount})</span>
              </h4>
              <div className="space-y-3">
                {(analysis.topicData?.news || []).slice(0, 12).map((a,i)=>(
                  <motion.a key={i} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}}
                    href={a.url || '#'} target="_blank" rel="noopener noreferrer"
                    className={`flex items-start gap-3 p-3.5 rounded-xl border-l-4 border-indigo-500 transition-colors cursor-pointer group ${dk?'bg-slate-800 hover:bg-slate-700':'bg-slate-50 hover:bg-slate-100'}`}>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-snug group-hover:text-indigo-400 transition-colors ${txt} mb-1`}>{a.title}</p>
                      {a.description && <p className={`text-[11px] leading-relaxed line-clamp-2 ${mute}`}>{a.description}</p>}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${dk?'bg-slate-700 text-slate-300':'bg-slate-200 text-slate-600'}`}>{a.source || 'News'}</span>
                        {a.time && <span className={`text-[10px] ${mute}`}>{a.time}</span>}
                      </div>
                    </div>
                    <ExternalLink className={`w-3.5 h-3.5 shrink-0 mt-1 ${mute} group-hover:text-indigo-400 transition-colors`}/>
                  </motion.a>
                ))}
                {newsCount === 0 && <p className={`text-sm text-center py-8 ${mute}`}>No news articles found for this topic.</p>}
              </div>
            </div>
          </motion.div>
        )}

        {/* DETAILS TAB */}
        {activeTab === 'details' && (
          <motion.div key="details" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
            {/* Specs */}
            {analysis.specs?.specs?.length > 0 && (
              <div className={`rounded-2xl border p-5 shadow-sm ${card}`}>
                <h4 className={`text-sm font-bold mb-4 flex items-center gap-2 ${txt}`} style={{fontFamily:'Syne,sans-serif'}}>
                  <Star className="w-4 h-4 text-amber-400"/> Product Details
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {analysis.specs.specs.filter(s=>s.value !== 'N/A').map((s,i)=>(
                    <div key={i} className={`p-3 rounded-xl ${dk?'bg-slate-800':'bg-slate-50'}`}>
                      <p className={`text-[10px] font-semibold uppercase tracking-wider ${mute} mb-0.5`}>{s.label}</p>
                      <p className={`text-sm font-semibold ${txt}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All metrics */}
            <div className={`rounded-2xl border p-5 shadow-sm ${card}`}>
              <h4 className={`text-sm font-bold mb-4 ${txt}`} style={{fontFamily:'Syne,sans-serif'}}>Full Data Breakdown</h4>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Sentiment Score',  value: `${sentiment}/100`, color: sColor },
                  { label: 'Sentiment Label',  value: sl(sentiment) },
                  { label: 'Market Trend',     value: `${trend >= 0 ? '+' : ''}${trend}%`, color: trend >= 0 ? '#10b981' : '#f43f5e' },
                  { label: 'Social Mentions',  value: social.toLocaleString() },
                  { label: 'Article Count',    value: newsCount },
                  { label: 'Risk Level',       value: ans?.riskLevel || 'Medium', color: riskCfg.color },
                  { label: 'Confidence',       value: `${ans?.confidence || '—'}%` },
                  { label: 'Category',         value: ans?.category || 'other' },
                  { label: 'Reach (est.)',     value: `${(analysis.topicData?.metrics?.reach / 1000 || 0).toFixed(0)}K` },
                ].map((d,i)=>(
                  <div key={i} className={`p-3 rounded-xl ${dk?'bg-slate-800':'bg-slate-50'}`}>
                    <p className={`text-[10px] font-semibold uppercase tracking-wider ${mute} mb-0.5`}>{d.label}</p>
                    <p className="text-sm font-bold" style={d.color?{color:d.color}:{}} >{d.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            {ans?.tags?.length > 0 && (
              <div className={`rounded-2xl border p-4 shadow-sm ${card}`}>
                <p className={`text-xs font-semibold ${mute} mb-2 flex items-center gap-1.5`}><Tag className="w-3 h-3"/> Topic Tags</p>
                <div className="flex flex-wrap gap-2">
                  {ans.tags.map(t=>(
                    <span key={t} className={`text-xs px-3 py-1 rounded-full border font-medium ${dk?'border-indigo-700 bg-indigo-950/40 text-indigo-300':'border-indigo-200 bg-indigo-50 text-indigo-700'}`}>
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}