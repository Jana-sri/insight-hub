import React, { useState, useMemo, useCallback } from 'react';
import {
  Upload, FileSpreadsheet, TrendingUp, TrendingDown, Sparkles,
  Download, CheckCircle, RefreshCw, Database, Trash2, Activity,
  Target, Lightbulb, Tag, ArrowUpRight, ArrowDownRight, Minus,
  AlertTriangle, Search, Zap, BarChart3, Eye, Table,
  AlertCircle, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Legend
} from 'recharts';
import Papa from 'papaparse';
import axios from 'axios';

const PALETTE = ['#6366f1','#06b6d4','#8b5cf6','#10b981','#f59e0b','#f43f5e','#ec4899','#14b8a6'];
const TABS = ['dashboard','charts','profile','data'];

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

/* Animated circular gauge */
function Gauge({ value, color, label, size = 70, delay = 0 }) {
  const r = size * 0.36, circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth="5" />
          <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
            strokeLinecap="round" strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ * (1 - clamped / 100) }}
            transition={{ duration: 1.2, delay, ease: 'easeOut' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-black leading-none" style={{ color, fontSize: size * 0.2 }}>{Math.round(clamped)}</span>
          <span style={{ fontSize: size * 0.13, color: '#64748b' }}>/ 100</span>
        </div>
      </div>
      <span className="text-[10px] font-semibold text-slate-500 text-center leading-tight">{label}</span>
    </div>
  );
}

/* Compute all local stats from parsed data */
function computeStats(data) {
  if (!data || data.length === 0) return null;
  const columns = Object.keys(data[0]);
  const numCols = columns.filter(col => {
    const sample = data.slice(0, 10).map(r => r[col]).filter(v => v !== null && v !== '');
    return sample.length > 0 && sample.filter(v => !isNaN(parseFloat(v))).length >= sample.length * 0.6;
  });
  const txtCols = columns.filter(c => !numCols.includes(c));

  const colStats = {};
  columns.forEach(col => {
    const allVals = data.map(r => r[col]);
    const nullCount = allVals.filter(v => v === null || v === '' || v === undefined).length;
    const uniqueVals = new Set(allVals.filter(v => v !== null && v !== '')).size;
    const fillRate = +((1 - nullCount / data.length) * 100).toFixed(1);

    if (numCols.includes(col)) {
      const nums = allVals.map(v => parseFloat(v)).filter(v => !isNaN(v));
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      const sorted = [...nums].sort((a, b) => a - b);
      const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
      const firstVal = nums[0], lastVal = nums[nums.length - 1];
      const trendPct = firstVal !== 0 ? +((( lastVal - firstVal) / Math.abs(firstVal)) * 100).toFixed(1) : 0;
      colStats[col] = {
        type: 'numeric', nullCount, uniqueVals, fillRate,
        min: +sorted[0].toFixed(2), max: +sorted[sorted.length-1].toFixed(2),
        mean: +mean.toFixed(2), median: +sorted[Math.floor(sorted.length/2)].toFixed(2),
        std: +Math.sqrt(variance).toFixed(2),
        trend: lastVal > firstVal ? 'up' : lastVal < firstVal ? 'down' : 'flat', trendPct,
        histogram: (() => {
          const bins = 8, step = (sorted[sorted.length-1] - sorted[0]) / bins || 1;
          const h = Array.from({ length: bins }, (_, i) => ({ x: +(sorted[0]+i*step).toFixed(1), count: 0 }));
          nums.forEach(v => { const i = Math.min(Math.floor((v-sorted[0])/step), bins-1); h[i].count++; });
          return h;
        })(),
      };
    } else {
      const dist = {};
      allVals.filter(v => v !== null && v !== '').forEach(v => { const s = String(v); dist[s] = (dist[s]||0)+1; });
      colStats[col] = {
        type: 'text', nullCount, uniqueVals, fillRate,
        topValues: Object.entries(dist).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,count])=>({ name: name.slice(0,20), count })),
      };
    }
  });

  const missingTotal = columns.reduce((acc, col) => acc + (colStats[col]?.nullCount ?? 0), 0);
  const completeness = +(100 - (missingTotal / (data.length * columns.length)) * 100).toFixed(1);
  const qualityScore = data.length >= 500 ? 95 : data.length >= 100 ? 82 : data.length >= 30 ? 65 : 40;

  // Pearson correlation pairs
  const correlations = [];
  for (let i = 0; i < Math.min(numCols.length, 6); i++) {
    for (let j = i+1; j < Math.min(numCols.length, 6); j++) {
      const [c1, c2] = [numCols[i], numCols[j]];
      const v1 = data.map(r => parseFloat(r[c1])).filter(v => !isNaN(v));
      const v2 = data.map(r => parseFloat(r[c2])).filter(v => !isNaN(v));
      const n = Math.min(v1.length, v2.length);
      if (n < 3) continue;
      const m1 = v1.slice(0,n).reduce((a,b)=>a+b)/n;
      const m2 = v2.slice(0,n).reduce((a,b)=>a+b)/n;
      let num=0, d1=0, d2=0;
      for (let k=0;k<n;k++){const a=v1[k]-m1,b=v2[k]-m2;num+=a*b;d1+=a*a;d2+=b*b;}
      const r = d1&&d2 ? +(num/Math.sqrt(d1*d2)).toFixed(3) : 0;
      correlations.push({ col1:c1, col2:c2, r, strength: Math.abs(r) >= 0.7 ? 'Strong' : Math.abs(r) >= 0.4 ? 'Moderate' : 'Weak' });
    }
  }
  correlations.sort((a,b) => Math.abs(b.r)-Math.abs(a.r));

  return {
    rows: data.length, columns: columns.length,
    numCols, txtCols, colStats, correlations, missingTotal,
    completeness, qualityScore,
    qualityLabel: qualityScore >= 90 ? 'Excellent' : qualityScore >= 70 ? 'Good' : qualityScore >= 50 ? 'Fair' : 'Limited',
    gauges: [
      { label:'Completeness', value: completeness, color: completeness>=80?'#10b981':completeness>=50?'#f59e0b':'#f43f5e' },
      { label:'Volume',       value: Math.min(100, Math.round(data.length/5)), color:'#6366f1' },
      { label:'Data Quality', value: qualityScore, color:'#06b6d4' },
      { label:'Diversity',    value: Math.min(100, columns.length*7), color:'#8b5cf6' },
    ],
    radarQuality: [
      { subject:'Completeness', value: completeness },
      { subject:'Volume',       value: Math.min(100, Math.round(data.length/5)) },
      { subject:'Diversity',    value: Math.min(100, columns.length*7) },
      { subject:'Numeric',      value: Math.min(100, numCols.length*15) },
      { subject:'Quality',      value: qualityScore },
    ],
    rawData: data.slice(0, 20),
    // Pre-built chart data
    charts: buildChartData(data, numCols, txtCols, colStats),
  };
}

function buildChartData(data, numCols, txtCols, colStats) {
  const charts = [];
  if (numCols.length >= 1) {
    charts.push({
      id:'trend', type:'area', title:`${numCols[0]} — Trend Over Records`,
      data: data.slice(0,80).map((r,i) => ({ index:i+1, value: parseFloat(r[numCols[0]])||0 })),
      color:'#6366f1',
    });
  }
  if (numCols.length >= 2) {
    charts.push({
      id:'scatter', type:'scatter', title:`${numCols[0]} vs ${numCols[1]}`,
      data: data.slice(0,100).map(r => ({ x: parseFloat(r[numCols[0]])||0, y: parseFloat(r[numCols[1]])||0 })),
      xlabel: numCols[0], ylabel: numCols[1],
    });
  }
  if (txtCols.length > 0) {
    charts.push({
      id:'pie', type:'pie', title:`${txtCols[0]} Distribution`,
      data: (colStats[txtCols[0]]?.topValues ?? []).slice(0,8).map((d,i)=>({ name:d.name, value:d.count, color:PALETTE[i%PALETTE.length] })),
    });
  }
  if (numCols.length >= 2) {
    charts.push({
      id:'bar', type:'bar', title:'Column Averages',
      data: numCols.slice(0,6).map((col,i) => {
        const vals = data.map(r=>parseFloat(r[col])).filter(v=>!isNaN(v));
        return { name:col.slice(0,14), value:+(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2), color:PALETTE[i%PALETTE.length] };
      }),
    });
  }
  return charts;
}

export default function Dataset({ darkMode, store }) {
  const dk = darkMode;
  const [file,       setFile]       = useState(null);
  const [purpose,    setPurpose]    = useState('');
  const [step,       setStep]       = useState('upload'); // upload | parsing | ai | results
  const [stats,      setStats]      = useState(null);
  const [aiResult,   setAiResult]   = useState(null);
  const [parseError, setParseError] = useState(null);
  const [activeTab,  setActiveTab]  = useState('dashboard');
  const [dragActive, setDragActive] = useState(false);
  const [searchCol,  setSearchCol]  = useState('');
  const [aiLoading,  setAiLoading]  = useState(false);

  const card = dk ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const txt  = dk ? 'text-slate-100' : 'text-slate-800';
  const mute = dk ? 'text-slate-400' : 'text-slate-500';
  const sub  = dk ? 'bg-slate-800/70' : 'bg-slate-50';
  const inpt = dk ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-indigo-500'
                  : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-indigo-400';
  const ttStyle = { background: dk?'#1e293b':'#fff', border:'none', borderRadius:10, fontSize:11 };

  const handleDrag = e => { e.preventDefault(); e.stopPropagation(); setDragActive(e.type==='dragenter'||e.type==='dragover'); };
  const handleDrop = e => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if(e.dataTransfer.files[0]) pickFile(e.dataTransfer.files[0]); };

  const pickFile = f => {
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['csv','xlsx','xls'].includes(ext)) { setParseError('Please upload a CSV or Excel file'); return; }
    if (f.size > 10*1024*1024) { setParseError('File too large (max 10 MB)'); return; }
    setFile(f); setParseError(null);
  };

  const runAnalysis = async () => {
    if (!file || !purpose.trim()) return;
    setParseError(null);

    // Step 1: parse locally
    setStep('parsing');
    Papa.parse(file, {
      header: true, dynamicTyping: true, skipEmptyLines: true,
      complete: async results => {
        const data = results.data.filter(row => Object.values(row).some(v=>v!==null&&v!==''));
        if (!data.length) { setParseError('No valid data found in file'); setStep('upload'); return; }

        const localStats = computeStats(data);
        setStats(localStats);

        // Step 2: call AI
        setStep('ai');
        setAiLoading(true);
        try {
          // Build a compact summary to send to the AI backend
          const summary = {
            rowCount: localStats.rows,
            columns: Object.keys(data[0]),
            columnTypes: Object.fromEntries(
              Object.entries(localStats.colStats).map(([k,v]) => [k, v.type==='numeric'?'numeric':'categorical'])
            ),
            summary: Object.fromEntries(
              Object.entries(localStats.colStats).map(([k,v]) => [k,
                v.type==='numeric'
                  ? { min:v.min, max:v.max, avg:v.mean, count:localStats.rows-v.nullCount }
                  : { uniqueValues:v.uniqueVals, topValues:v.topValues?.slice(0,3) }
              ])
            ),
            preview: data.slice(0,5),
          };

          const res = await axios.post('http://localhost:5000/api/dataset/analyze', {
            analysis: summary, purpose,
          });

          setAiResult(res.data);
        } catch (err) {
          console.error('AI analysis error:', err);
          // Fallback AI result built locally
          setAiResult(buildFallbackAI(localStats, purpose));
        } finally {
          setAiLoading(false);
        }

        store?.saveDataset?.(file.name, purpose, { overview: localStats, purpose });
        setStep('results');
        setActiveTab('dashboard');
      },
      error: err => { setParseError('Parse error: ' + err.message); setStep('upload'); },
    });
  };

  const buildFallbackAI = (s, purpose) => {
    const topCol = s.numCols[0] ?? s.txtCols[0] ?? 'data';
    const hasNum = s.numCols.length > 0;
    return {
      answer: `${hasNum ? 'YES' : 'PARTIAL'} — the dataset has ${s.rows} rows across ${s.columns} columns (${s.numCols.length} numeric, ${s.txtCols.length} text). ${hasNum ? `Key column "${topCol}" has mean=${s.colStats[topCol]?.mean}, range [${s.colStats[topCol]?.min}–${s.colStats[topCol]?.max}].` : ''}`,
      insights: [
        { title: 'Dataset Structure', description: `${s.rows} rows, ${s.numCols.length} numeric + ${s.txtCols.length} text columns. ${s.missingTotal===0?'Zero missing values — clean dataset.':s.missingTotal+' missing values detected.'}`, type: s.missingTotal===0?'positive':'neutral' },
        hasNum ? { title: `Key Column: ${topCol}`, description: `Mean ${s.colStats[topCol]?.mean}, range ${s.colStats[topCol]?.min}–${s.colStats[topCol]?.max}, std dev ${s.colStats[topCol]?.std}. Trend: ${s.colStats[topCol]?.trend}.`, type: s.colStats[topCol]?.trend==='up'?'positive':'neutral' } : { title:'Text-Heavy Dataset', description:`${s.txtCols.length} categorical columns. Good for distribution and frequency analysis.`, type:'neutral' },
        s.correlations.length > 0 ? { title:'Notable Correlation', description:`${s.correlations[0].col1} ↔ ${s.correlations[0].col2}: r=${s.correlations[0].r} (${s.correlations[0].strength})`, type:Math.abs(s.correlations[0].r)>=0.7?'positive':'neutral' } : { title:'Diversity', description:`${s.columns} columns provide multi-dimensional analysis opportunities.`, type:'positive' },
      ],
      recommendation: `For "${purpose}": ${hasNum ? `Focus on ${s.numCols.slice(0,3).join(', ')} — these numeric columns directly answer your question. ${s.correlations.length>0?`Check the ${s.correlations[0].col1}/${s.correlations[0].col2} correlation (r=${s.correlations[0].r}).`:''}` : `Group by ${s.txtCols[0]} to understand distribution patterns.`}`,
      recommendedCharts: [
        hasNum ? { chartType:'line', columns:[s.numCols[0]], title:`${s.numCols[0]} over records` } : { chartType:'bar', columns:[s.txtCols[0]], title:`${s.txtCols[0]} distribution` },
        s.numCols.length>=2 ? { chartType:'scatter', columns:s.numCols.slice(0,2), title:`${s.numCols[0]} vs ${s.numCols[1]}` } : null,
      ].filter(Boolean),
    };
  };

  const reset = () => { setFile(null); setPurpose(''); setStats(null); setAiResult(null); setParseError(null); setStep('upload'); setActiveTab('dashboard'); };

  const exportCSV = () => {
    if (!stats) return;
    const rows = ['Column,Type,Mean,Std,Min,Max,Unique,Missing,Fill%'];
    Object.entries(stats.colStats).forEach(([col, s]) => {
      rows.push(`${col},${s.type},${s.mean??''},${s.std??''},${s.min??''},${s.max??''},${s.uniqueVals},${s.nullCount},${s.fillRate}`);
    });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([rows.join('\n')], { type:'text/csv' })), download:`${file?.name}_analysis.csv` });
    a.click();
  };

  const filteredCols = useMemo(() =>
    stats ? Object.entries(stats.colStats).filter(([col]) => col.toLowerCase().includes(searchCol.toLowerCase())) : [],
    [stats, searchCol]
  );

  /* ── UPLOAD SCREEN ── */
  if (step === 'upload') {
    return (
      <div className="w-full space-y-6 max-w-3xl mx-auto">
        <motion.div initial={{ opacity:0,y:-10 }} animate={{ opacity:1,y:0 }} className="text-center pt-2 pb-1">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-bg mb-4 shadow-lg shadow-indigo-500/30">
            <Database className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-black gradient-text mb-1" style={{ fontFamily:'Syne,sans-serif' }}>Dataset Analyzer</h1>
          <p className={`text-sm ${mute}`}>Upload CSV or Excel · Auto-stats + AI insights · Dashboard view</p>
        </motion.div>

        <motion.div initial={{ opacity:0,y:10 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.06 }}
          className={`rounded-2xl border p-6 ${card}`}>
          {/* Drop zone */}
          <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
            onClick={() => !file && document.getElementById('dsFile')?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-all mb-5 cursor-pointer ${
              dragActive ? 'border-indigo-500 bg-indigo-950/20 scale-[1.01]'
              : file ? 'border-emerald-500 bg-emerald-950/10'
              : dk ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300'
            }`}>
            {file ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                </div>
                <p className={`font-bold text-base ${txt} mb-0.5`}>{file.name}</p>
                <p className={`text-sm ${mute} mb-3`}>{(file.size/1024).toFixed(1)} KB</p>
                <button onClick={e => { e.stopPropagation(); setFile(null); }}
                  className="px-4 py-1.5 rounded-xl bg-rose-600/20 border border-rose-600/40 text-rose-400 text-xs font-semibold hover:bg-rose-600/30 transition-colors">
                  Remove File
                </button>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center mx-auto mb-3">
                  <Upload className={`w-6 h-6 ${mute}`} />
                </div>
                <p className={`font-semibold text-base ${txt} mb-1`}>Drop your file here, or click to browse</p>
                <p className={`text-xs ${mute}`}>CSV, Excel (.xlsx, .xls) · Max 10 MB</p>
                <input id="dsFile" type="file" accept=".csv,.xlsx,.xls" className="hidden"
                  onChange={e => e.target.files[0] && pickFile(e.target.files[0])} />
              </>
            )}
          </div>

          {/* Purpose */}
          <div className="mb-5">
            <label className={`text-[10px] font-bold uppercase tracking-widest ${mute} mb-2 block`}>What do you want to learn?</label>
            <textarea value={purpose} onChange={e => setPurpose(e.target.value)} rows={2}
              placeholder="e.g. Find sales trends, identify best-performing products, detect anomalies in user data…"
              className={`w-full px-4 py-3 rounded-xl border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${inpt}`} />
          </div>

          {parseError && (
            <div className="mb-4 flex items-start gap-2 px-4 py-3 rounded-xl bg-rose-950/40 border border-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-300">{parseError}</p>
            </div>
          )}

          <button onClick={runAnalysis} disabled={!file || !purpose.trim()}
            className="w-full py-3.5 gradient-bg text-white rounded-xl font-bold text-sm disabled:opacity-40 hover:opacity-90 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2">
            <Zap className="w-4 h-4" /> Analyze & Build Dashboard →
          </button>
        </motion.div>

        {store?.datasets?.length > 0 && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.15 }}>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${mute} mb-3`}>Recent Datasets</p>
            <div className="grid grid-cols-3 gap-3">
              {store.datasets.slice(0,6).map(d => (
                <div key={d.id} className={`rounded-xl border p-4 ${card} group relative`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <button onClick={() => store.deleteDataset?.(d.id)}
                      className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg ${dk?'hover:bg-slate-800':'hover:bg-slate-100'}`}>
                      <Trash2 className="w-3 h-3 text-rose-400" />
                    </button>
                  </div>
                  <p className={`text-xs font-bold ${txt} mb-0.5 truncate`}>{d.filename}</p>
                  <p className={`text-[10px] ${mute} line-clamp-1`}>{d.purpose}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${dk?'bg-slate-800 text-slate-400':'bg-slate-100 text-slate-500'}`}>{d.rows} rows</span>
                    <span className={`text-[10px] ${mute}`}>{timeAgo(d.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  /* ── LOADING SCREEN ── */
  if (step === 'parsing' || step === 'ai') {
    const steps = [
      { key:'parsing', label:'Parsing file structure' },
      { key:'ai',      label:'Computing statistics & correlations' },
      { key:'ai',      label:'Running AI analysis (GPT-4o)' },
      { key:'ai',      label:'Building dashboard' },
    ];
    const currentIdx = step === 'parsing' ? 0 : 2;
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl gradient-bg flex items-center justify-center shadow-xl shadow-indigo-500/30">
            <motion.div animate={{ rotate:360 }} transition={{ duration:1, repeat:Infinity, ease:'linear' }}
              className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white" />
          </div>
          <p className={`font-black text-lg ${txt} mb-1`} style={{ fontFamily:'Syne,sans-serif' }}>{file?.name}</p>
          <p className={`text-sm ${mute} mb-4`}>{step === 'parsing' ? 'Parsing data…' : 'Running AI analysis…'}</p>
          <div className="space-y-2.5">
            {steps.map((s, i) => (
              <motion.div key={i} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.25 }}
                className={`flex items-center gap-3 text-xs justify-center`}>
                {i <= currentIdx
                  ? <motion.div animate={{ scale:[1,1.4,1] }} transition={{ delay:i*0.25+0.1, repeat:Infinity, repeatDelay:1.2 }}
                      className={`w-1.5 h-1.5 rounded-full ${i < currentIdx ? 'bg-emerald-400' : 'bg-indigo-400'}`} />
                  : <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />}
                <span className={i <= currentIdx ? txt : mute}>{s.label}</span>
                {i < currentIdx && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── RESULTS ── */
  const s = stats;
  const ai = aiResult;

  return (
    <div className="w-full space-y-4 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className={`text-2xl font-black ${txt}`} style={{ fontFamily:'Syne,sans-serif' }}>
            <span className="gradient-text">{file?.name}</span>
          </h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs ${mute}`}>{s.rows.toLocaleString()} rows · {s.columns} columns</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-700 text-emerald-400 font-semibold">✓ Saved</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
              s.qualityLabel==='Excellent'?'border-emerald-700 text-emerald-400 bg-emerald-950/30':
              s.qualityLabel==='Good'?'border-blue-700 text-blue-400 bg-blue-950/30':
              'border-amber-700 text-amber-400 bg-amber-950/30'}`}>{s.qualityLabel}</span>
            {ai && <span className="text-[10px] px-2 py-0.5 rounded-full border border-indigo-700 text-indigo-400 bg-indigo-950/30 font-semibold flex items-center gap-1"><Sparkles className="w-2.5 h-2.5" /> AI Analyzed</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors ${card} ${mute} hover:border-indigo-500 hover:text-indigo-400`}>
            <Download className="w-3.5 h-3.5" /> Export Stats
          </button>
          <button onClick={reset} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors ${card} ${mute} hover:border-indigo-500 hover:text-indigo-400`}>
            <RefreshCw className="w-3.5 h-3.5" /> New File
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label:'Total Rows',      value:s.rows.toLocaleString(),       icon:Database,       grad:'from-indigo-500 to-blue-500' },
          { label:'Columns',         value:s.columns,                     icon:Table,          grad:'from-violet-500 to-purple-600' },
          { label:'Numeric Columns', value:s.numCols.length,              icon:TrendingUp,     grad:'from-emerald-500 to-teal-500' },
          { label:'Missing Values',  value: s.missingTotal===0?'✓ None':s.missingTotal, icon:AlertTriangle, grad:s.missingTotal===0?'from-emerald-500 to-teal-500':'from-amber-500 to-orange-500' },
        ].map((item,i) => (
          <motion.div key={i} initial={{ opacity:0,y:10 }} animate={{ opacity:1,y:0 }} transition={{ delay:i*0.07 }}
            className={`rounded-2xl border p-4 ${card}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${item.grad} flex items-center justify-center shadow shrink-0`}>
                <item.icon className="w-4 h-4 text-white" />
              </div>
              <span className={`text-xs font-semibold ${txt}`}>{item.label}</span>
            </div>
            <p className={`text-2xl font-black ${txt}`}>{item.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Health gauges */}
      <div className={`rounded-2xl border p-5 ${card}`}>
        <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${txt}`} style={{ fontFamily:'Syne,sans-serif' }}>
          <Activity className="w-4 h-4 text-indigo-400" /> Dataset Health
        </h3>
        <div className="flex items-center justify-around">
          {s.gauges.map((g,i) => <Gauge key={g.label} value={g.value} color={g.color} label={g.label} delay={i*0.15} />)}
        </div>
      </div>

      {/* Tab bar */}
      <div className={`flex gap-1 p-1 rounded-xl border ${card} w-fit`}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${activeTab===tab?'gradient-bg text-white shadow-sm':`${mute} hover:text-indigo-400`}`}>
            {tab === 'dashboard' ? '📊 Dashboard' : tab.charAt(0).toUpperCase()+tab.slice(1)}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── DASHBOARD TAB ── */}
        {activeTab === 'dashboard' && (
          <motion.div key="db" initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }} className="space-y-4">

            {/* AI Answer Banner */}
            {ai?.answer && (
              <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                className="rounded-2xl border-2 border-indigo-600/50 bg-indigo-950/20 p-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center shrink-0 shadow">
                    <Sparkles className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1.5">AI Analysis — "{purpose}"</p>
                    <p className={`text-sm leading-relaxed ${dk?'text-slate-200':'text-slate-700'}`}>{ai.answer}</p>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Radar profile */}
              <div className={`rounded-2xl border p-5 ${card}`}>
                <h3 className={`text-sm font-bold mb-4 ${txt}`} style={{ fontFamily:'Syne,sans-serif' }}>Dataset Profile</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={s.radarQuality} margin={{ top:4, right:20, bottom:4, left:20 }}>
                    <PolarGrid stroke={dk?'#1e293b':'#e2e8f0'} />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize:9, fill:dk?'#64748b':'#94a3b8' }} />
                    <PolarRadiusAxis domain={[0,100]} tick={false} axisLine={false} />
                    <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* AI Insights list */}
              <div className={`rounded-2xl border p-5 ${card}`}>
                <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${txt}`} style={{ fontFamily:'Syne,sans-serif' }}>
                  <Sparkles className="w-4 h-4 text-indigo-400" /> AI Insights
                </h3>
                <div className="space-y-2.5">
                  {(ai?.insights ?? []).slice(0,5).map((ins,i) => {
                    const colors = { positive:'emerald', negative:'rose', neutral:'indigo' };
                    const c = colors[ins.type] || 'indigo';
                    return (
                      <motion.div key={i} initial={{ opacity:0,x:-6 }} animate={{ opacity:1,x:0 }} transition={{ delay:i*0.08 }}
                        className={`p-3 rounded-xl border ${dk?`bg-${c}-950/20 border-${c}-700/30`:`bg-${c}-50 border-${c}-200`}`}>
                        <div className="flex items-start gap-2">
                          <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${ins.type==='positive'?'bg-emerald-400':ins.type==='negative'?'bg-rose-400':'bg-indigo-400'}`} />
                          <div>
                            <p className={`text-xs font-bold ${txt} mb-0.5`}>{ins.title}</p>
                            <p className={`text-[11px] leading-relaxed ${mute}`}>{ins.description}</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  {(!ai?.insights || ai.insights.length === 0) && (
                    <p className={`text-xs text-center py-6 ${mute}`}>No AI insights available</p>
                  )}
                </div>
              </div>
            </div>

            {/* Recommendation + Correlations row */}
            <div className="grid grid-cols-2 gap-4">
              {/* AI Recommendation */}
              <div className="rounded-2xl border-2 border-cyan-600/40 bg-cyan-950/15 p-5">
                <h4 className={`text-xs font-bold mb-2 flex items-center gap-1.5 ${txt}`}>
                  <Target className="w-3.5 h-3.5 text-cyan-400" /> AI Recommendation
                </h4>
                <p className={`text-sm leading-relaxed ${dk?'text-slate-200':'text-slate-700'}`}>
                  {ai?.recommendation ?? 'Run AI analysis to get recommendations.'}
                </p>
                {ai?.recommendedCharts?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ai.recommendedCharts.map((c,i) => (
                      <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${dk?'border-cyan-700 bg-cyan-950/40 text-cyan-300':'border-cyan-200 bg-cyan-50 text-cyan-700'}`}>
                        📊 {c.chartType}: {c.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Correlations */}
              <div className={`rounded-2xl border p-5 ${card}`}>
                <h4 className={`text-xs font-bold mb-3 flex items-center gap-1.5 ${txt}`}>
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-400" /> Top Correlations
                </h4>
                {s.correlations.length > 0 ? (
                  <div className="space-y-2">
                    {s.correlations.slice(0,4).map((c,i) => {
                      const strength = Math.abs(c.r);
                      const color = strength>=0.7?'#10b981':strength>=0.4?'#f59e0b':'#94a3b8';
                      return (
                        <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl ${sub}`}>
                          <div className="flex-1 min-w-0 flex items-center gap-1.5">
                            <span className={`text-xs font-bold ${txt} truncate`}>{c.col1}</span>
                            <span className={`text-[10px] ${mute}`}>↔</span>
                            <span className={`text-xs font-bold ${txt} truncate`}>{c.col2}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className={`h-1.5 w-16 rounded-full overflow-hidden ${dk?'bg-slate-700':'bg-slate-200'}`}>
                              <motion.div className="h-full rounded-full" style={{ background:color }}
                                initial={{ width:0 }} animate={{ width:`${strength*100}%` }} transition={{ duration:0.8, delay:i*0.1 }} />
                            </div>
                            <span className="text-xs font-black tabular-nums" style={{ color }}>{c.r>0?'+':''}{c.r}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ color, background:color+'20' }}>{c.strength}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className={`text-xs ${mute} text-center py-4`}>Need ≥2 numeric columns for correlations</p>
                )}
              </div>
            </div>

            {/* Quick summary for numeric columns */}
            {s.numCols.length > 0 && (
              <div className={`rounded-2xl border p-5 ${card}`}>
                <h3 className={`text-sm font-bold mb-4 ${txt}`} style={{ fontFamily:'Syne,sans-serif' }}>Numeric Column Summary</h3>
                <div className="grid grid-cols-3 gap-3">
                  {s.numCols.slice(0,6).map((col,i) => {
                    const cs = s.colStats[col];
                    return (
                      <motion.div key={col} initial={{ opacity:0,y:4 }} animate={{ opacity:1,y:0 }} transition={{ delay:i*0.06 }}
                        className={`p-4 rounded-xl ${sub}`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className={`text-xs font-bold ${txt} truncate`}>{col}</p>
                          {cs.trend==='up' && <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                          {cs.trend==='down' && <ArrowDownRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                          {cs.trend==='flat' && <Minus className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[['Mean',cs.mean],['Std',cs.std],['Min',cs.min],['Max',cs.max]].map(([l,v]) => (
                            <div key={l}>
                              <p className={`text-[9px] font-semibold uppercase ${mute}`}>{l}</p>
                              <p className={`text-xs font-bold ${txt}`}>{v}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 flex items-center gap-1">
                          <span className="text-[10px]" style={{ color:cs.trend==='up'?'#10b981':cs.trend==='down'?'#f43f5e':'#94a3b8' }}>
                            {cs.trendPct>0?'+':''}{cs.trendPct}% trend
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── CHARTS TAB ── */}
        {activeTab === 'charts' && (
          <motion.div key="ch" initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {s.charts.map((viz, i) => (
                <motion.div key={viz.id} initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} transition={{ delay:i*0.08 }}
                  className={`rounded-2xl border p-5 ${card}`}>
                  <p className={`text-sm font-bold mb-4 ${txt}`} style={{ fontFamily:'Syne,sans-serif' }}>{viz.title}</p>
                  <ResponsiveContainer width="100%" height={200}>
                    {viz.type === 'area' ? (
                      <AreaChart data={viz.data} margin={{ top:4,right:4,bottom:0,left:0 }}>
                        <defs>
                          <linearGradient id={`ag${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={viz.color||'#6366f1'} stopOpacity={0.35}/>
                            <stop offset="100%" stopColor={viz.color||'#6366f1'} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={dk?'#1e293b':'#f1f5f9'} vertical={false}/>
                        <XAxis dataKey="index" tick={{ fontSize:9,fill:dk?'#475569':'#94a3b8' }} tickLine={false} axisLine={false} interval={Math.floor(viz.data.length/6)}/>
                        <YAxis tick={{ fontSize:9,fill:dk?'#475569':'#94a3b8' }} tickLine={false} axisLine={false} width={34}/>
                        <Tooltip contentStyle={ttStyle}/>
                        <Area type="monotone" dataKey="value" stroke={viz.color||'#6366f1'} fill={`url(#ag${i})`} strokeWidth={2} dot={false}/>
                      </AreaChart>
                    ) : viz.type === 'scatter' ? (
                      <ScatterChart margin={{ top:4,right:4,bottom:0,left:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={dk?'#1e293b':'#f1f5f9'}/>
                        <XAxis dataKey="x" name={viz.xlabel} tick={{ fontSize:9,fill:dk?'#475569':'#94a3b8' }} tickLine={false} axisLine={false}/>
                        <YAxis dataKey="y" name={viz.ylabel} tick={{ fontSize:9,fill:dk?'#475569':'#94a3b8' }} tickLine={false} axisLine={false} width={34}/>
                        <Tooltip contentStyle={ttStyle} cursor={{ strokeDasharray:'3 3' }}/>
                        <Scatter data={viz.data} fill="#6366f1" fillOpacity={0.6}/>
                      </ScatterChart>
                    ) : viz.type === 'pie' ? (
                      <PieChart>
                        <Pie data={viz.data} dataKey="value" cx="50%" cy="50%" outerRadius={75} innerRadius={38}>
                          {viz.data.map((d,j) => <Cell key={j} fill={d.color||PALETTE[j%PALETTE.length]}/>)}
                        </Pie>
                        <Tooltip contentStyle={ttStyle}/>
                        <Legend iconSize={8} wrapperStyle={{ fontSize:9 }}/>
                      </PieChart>
                    ) : (
                      <BarChart data={viz.data} margin={{ top:4,right:4,bottom:0,left:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={dk?'#1e293b':'#f1f5f9'} vertical={false}/>
                        <XAxis dataKey="name" tick={{ fontSize:9,fill:dk?'#475569':'#94a3b8' }} tickLine={false} axisLine={false}/>
                        <YAxis tick={{ fontSize:9,fill:dk?'#475569':'#94a3b8' }} tickLine={false} axisLine={false} width={34}/>
                        <Tooltip contentStyle={ttStyle}/>
                        <Bar dataKey="value" radius={[4,4,0,0]}>
                          {viz.data.map((d,j) => <Cell key={j} fill={d.color||PALETTE[j%PALETTE.length]}/>)}
                        </Bar>
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </motion.div>
              ))}
            </div>

            {/* Histograms */}
            {s.numCols.length > 0 && (
              <div className={`rounded-2xl border p-5 ${card}`}>
                <h3 className={`text-sm font-bold mb-5 ${txt}`} style={{ fontFamily:'Syne,sans-serif' }}>Value Distributions</h3>
                <div className="grid grid-cols-3 gap-4">
                  {s.numCols.slice(0,6).map((col,i) => {
                    const cs = s.colStats[col];
                    return (
                      <div key={col} className={`p-3 rounded-xl ${sub}`}>
                        <p className={`text-xs font-bold ${txt} mb-0.5`}>{col}</p>
                        <p className={`text-[10px] ${mute} mb-2`}>μ={cs.mean} σ={cs.std}</p>
                        <ResponsiveContainer width="100%" height={75}>
                          <BarChart data={cs.histogram} margin={{ top:0,right:0,bottom:0,left:0 }}>
                            <Bar dataKey="count" fill={PALETTE[i%PALETTE.length]} radius={[2,2,0,0]}/>
                            <Tooltip contentStyle={ttStyle}/>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── PROFILE TAB ── */}
        {activeTab === 'profile' && (
          <motion.div key="pr" initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }} className="space-y-4">
            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${card}`}>
              <Search className={`w-4 h-4 ${mute} shrink-0`}/>
              <input type="text" value={searchCol} onChange={e=>setSearchCol(e.target.value)}
                placeholder="Search columns…"
                className={`flex-1 text-sm bg-transparent outline-none ${txt}`}/>
              {searchCol && <button onClick={()=>setSearchCol('')} className={`text-xs ${mute} hover:text-indigo-400`}>Clear</button>}
            </div>

            <div className={`rounded-2xl border p-5 ${card}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm font-bold ${txt}`} style={{ fontFamily:'Syne,sans-serif' }}>Column Profiles</h3>
                <div className="flex items-center gap-3 text-[10px] font-semibold">
                  <span className="text-emerald-400 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400"/>Numeric ({s.numCols.length})</span>
                  <span className="text-indigo-400 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-400"/>Text ({s.txtCols.length})</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {filteredCols.map(([col, cs], i) => (
                  <motion.div key={col} initial={{ opacity:0,y:4 }} animate={{ opacity:1,y:0 }} transition={{ delay:i*0.04 }}
                    className={`p-3.5 rounded-xl border transition-colors ${dk?'border-slate-800 hover:border-slate-700':'border-slate-100 hover:border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className={`text-xs font-bold ${txt} truncate`}>{col}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold shrink-0 ml-1 ${cs.type==='numeric'?dk?'bg-emerald-950/40 text-emerald-400':'bg-emerald-50 text-emerald-600':dk?'bg-indigo-950/40 text-indigo-400':'bg-indigo-50 text-indigo-600'}`}>
                        {cs.type==='numeric'?'NUM':'TXT'}
                      </span>
                    </div>
                    <div className="space-y-1 mb-2">
                      <div className="flex justify-between text-[10px]">
                        <span className={mute}>Unique</span><span className={`font-semibold ${txt}`}>{cs.uniqueVals}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className={mute}>Fill rate</span>
                        <span className={`font-semibold ${cs.fillRate===100?'text-emerald-400':cs.fillRate>=80?'text-amber-400':'text-rose-400'}`}>{cs.fillRate}%</span>
                      </div>
                    </div>
                    <div className={`h-1.5 rounded-full overflow-hidden mb-2 ${dk?'bg-slate-700':'bg-slate-200'}`}>
                      <motion.div className="h-full rounded-full"
                        style={{ background: cs.fillRate===100?'#10b981':cs.fillRate>=80?'#f59e0b':'#f43f5e' }}
                        initial={{ width:0 }} animate={{ width:`${cs.fillRate}%` }} transition={{ duration:0.7, delay:i*0.03 }}/>
                    </div>
                    {cs.type==='numeric' && (
                      <div className="space-y-0.5 pt-1 border-t border-slate-800/20">
                        {[['Mean',cs.mean],['Std',cs.std],['Min',cs.min],['Max',cs.max]].map(([l,v]) => (
                          <div key={l} className="flex justify-between text-[10px]">
                            <span className={mute}>{l}</span><span className={`font-semibold ${txt} tabular-nums`}>{v}</span>
                          </div>
                        ))}
                        <div className="flex items-center gap-1 mt-0.5">
                          {cs.trend==='up'&&<ArrowUpRight className="w-3 h-3 text-emerald-400"/>}
                          {cs.trend==='down'&&<ArrowDownRight className="w-3 h-3 text-rose-400"/>}
                          {cs.trend==='flat'&&<Minus className="w-3 h-3 text-slate-400"/>}
                          <span className="text-[10px]" style={{ color:cs.trend==='up'?'#10b981':cs.trend==='down'?'#f43f5e':'#94a3b8' }}>
                            {cs.trendPct>0?'+':''}{cs.trendPct}%
                          </span>
                        </div>
                      </div>
                    )}
                    {cs.type==='text' && cs.topValues && (
                      <div className="pt-1 border-t border-slate-800/20 space-y-0.5">
                        {cs.topValues.slice(0,3).map(v => (
                          <div key={v.name} className="flex items-center justify-between text-[10px] gap-1">
                            <span className={`${mute} truncate`}>{v.name}</span>
                            <span className={`font-semibold ${txt} shrink-0`}>{v.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
                {filteredCols.length === 0 && (
                  <div className={`col-span-3 text-center py-8 text-sm ${mute}`}>No columns match "{searchCol}"</div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── DATA PREVIEW TAB ── */}
        {activeTab === 'data' && (
          <motion.div key="dv" initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}>
            <div className={`rounded-2xl border p-5 ${card}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm font-bold flex items-center gap-2 ${txt}`} style={{ fontFamily:'Syne,sans-serif' }}>
                  <Eye className="w-4 h-4 text-indigo-400"/> Data Preview
                </h3>
                <span className={`text-xs ${mute}`}>First 20 of {s.rows.toLocaleString()} rows</span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-800/20">
                <table className="w-full text-xs">
                  <thead>
                    <tr className={`border-b ${dk?'border-slate-800 bg-slate-800/50':'border-slate-100 bg-slate-50'}`}>
                      <th className={`p-2.5 text-left font-bold ${mute} w-8 shrink-0`}>#</th>
                      {Object.keys(s.rawData[0]??{}).map((col,i) => (
                        <th key={i} className={`p-2.5 text-left font-bold ${txt} whitespace-nowrap`}>
                          <div className="flex items-center gap-1">
                            {col}
                            <span className={`text-[9px] px-1 py-0.5 rounded font-semibold ${s.colStats[col]?.type==='numeric'?'text-emerald-500':'text-indigo-400'}`}>
                              {s.colStats[col]?.type==='numeric'?'N':'T'}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {s.rawData.map((row, i) => (
                      <tr key={i} className={`border-b transition-colors ${dk?'border-slate-800/30 hover:bg-slate-800/30':'border-slate-50 hover:bg-slate-50'}`}>
                        <td className={`p-2.5 ${mute} font-mono`}>{i+1}</td>
                        {Object.keys(row).map((col,j) => (
                          <td key={j} className={`p-2.5 ${mute} whitespace-nowrap max-w-[140px] truncate`}>
                            {String(row[col]??'')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className={`text-xs mt-3 ${mute} text-center`}>Showing 20 of {s.rows.toLocaleString()} rows · {s.columns} columns</p>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}