import React, { useState, useEffect } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './components/Dashboard';
import Compare from './components/Compare';
import Dataset from './components/Dataset';
import AIChat from './components/AIChat';
import History from './components/History';
import { useStore } from './services/useStore';
import { fetchTopicData } from './services/api';
import axios from 'axios';

const pv = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.14 } },
};

function App() {
  const [activeTab,       setActiveTab]       = useState('dashboard');
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [currentTopic,    setCurrentTopic]    = useState(null);
  const [topicData,       setTopicData]       = useState(null);
  const [isSearching,     setIsSearching]     = useState(false);
  const [error,           setError]           = useState(null);
  const [darkMode,        setDarkMode]        = useState(true);
  const [toast,           setToast]           = useState(null);

  const store = useStore();
  const dk = darkMode;

  useEffect(() => { document.documentElement.classList.toggle('dark', dk); }, [dk]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const navigateTo = (tab) => { setActiveTab(tab); window.scrollTo(0, 0); };

  const onAnalysisComplete = (topic, question, topicDataResult, analysisResult) => {
    const full = { topic, question, topicData: topicDataResult, ...analysisResult };
    setCurrentAnalysis(full);
    setCurrentTopic(topic);
    setTopicData(topicDataResult);
    store.saveAnalysis(topic, question, topicDataResult, analysisResult);
    showToast(`✓ Analysis saved for "${topic}"`);
  };

  const reAnalyze = async (topic, question) => {
    navigateTo('dashboard');
    setIsSearching(true);
    setError(null);
    setCurrentAnalysis(null);
    try {
      const freshData = await fetchTopicData(topic);
      const res = await axios.post('http://localhost:5000/api/analysis/full', { topic, question, topicData: freshData });
      const full = { topic, question, topicData: freshData, ...res.data };
      setCurrentAnalysis(full);
      setCurrentTopic(topic);
      setTopicData(freshData);
      store.saveAnalysis(topic, question, freshData, res.data);
      showToast(`✓ Re-analyzed "${topic}"`);
    } catch (e) {
      setError('Re-analysis failed: ' + (e.message || 'Backend error'));
    } finally {
      setIsSearching(false);
    }
  };

  const loadAnalysis = (entry) => {
    const full = { topic: entry.topic, question: entry.question, topicData: entry.topicData, ...entry.result };
    setCurrentAnalysis(full);
    setCurrentTopic(entry.topic);
    setTopicData(entry.topicData);
    navigateTo('dashboard');
    showToast(`Loaded "${entry.topic}"`);
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${dk ? 'bg-[#0a0f1e]' : 'bg-slate-100'}`}>
      <Sidebar
        activeTab={activeTab} setActiveTab={setActiveTab}
        darkMode={dk} setDarkMode={setDarkMode}
        historyCount={store.totalCount}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar activeTab={activeTab} darkMode={dk} />

        <main className={`flex-1 overflow-y-auto overflow-x-hidden relative ${dk ? 'bg-[#0a0f1e]' : 'bg-slate-100'}`}>
          <AnimatePresence>
            {isSearching && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className={`rounded-2xl p-8 w-80 shadow-2xl border ${dk ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center shadow-lg">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-7 h-7 rounded-full border-2 border-white/30 border-t-white" />
                    </div>
                    <div className="text-center">
                      <p className={`font-bold ${dk ? 'text-white' : 'text-slate-800'}`} style={{ fontFamily: 'Syne,sans-serif' }}>Re-Analyzing…</p>
                      <p className={`text-sm mt-1 ${dk ? 'text-slate-400' : 'text-slate-500'}`}>Fetching fresh live data</p>
                    </div>
                    {['News articles', 'Social signals', 'GPT-4o analysis'].map((s, i) => (
                      <motion.div key={s} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.2 }}
                        className="flex items-center gap-2 self-start">
                        <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                          className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        <span className={`text-xs ${dk ? 'text-slate-400' : 'text-slate-500'}`}>{s}</span>
                      </motion.div>
                    ))}
                    <div className={`w-full h-1 rounded-full overflow-hidden ${dk ? 'bg-slate-800' : 'bg-slate-200'}`}>
                      <motion.div initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 4, ease: 'easeInOut' }} className="h-full gradient-bg" />
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mx-6 mt-4 px-4 py-3 rounded-xl bg-rose-900/30 border border-rose-700 flex items-center justify-between">
                <p className="text-sm text-rose-300 font-medium">{error}</p>
                <button onClick={() => setError(null)}><X className="w-4 h-4 text-rose-400" /></button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-6 w-full">
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <motion.div key="db" {...pv} className="w-full">
                  <Dashboard darkMode={dk} initialAnalysis={currentAnalysis} onAnalysisComplete={onAnalysisComplete} />
                </motion.div>
              )}
              {activeTab === 'compare' && (
                <motion.div key="cmp" {...pv} className="w-full">
                  <Compare darkMode={dk} store={store} onReAnalyze={reAnalyze} navigateTo={navigateTo} />
                </motion.div>
              )}
              {activeTab === 'dataset' && (
                <motion.div key="ds" {...pv} className="w-full">
                  <Dataset darkMode={dk} store={store} />
                </motion.div>
              )}
              {activeTab === 'history' && (
                <motion.div key="hist" {...pv} className="w-full">
                  <History darkMode={dk} store={store} onLoadAnalysis={loadAnalysis} onReAnalyze={reAnalyze} navigateTo={navigateTo} />
                </motion.div>
              )}
              {activeTab === 'settings' && (
                <motion.div key="set" {...pv} className="w-full">
                  <SettingsPage darkMode={dk} setDarkMode={setDarkMode} store={store} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {currentTopic && topicData && (
        <AIChat darkMode={dk} currentTopic={currentTopic} topicData={topicData} />
      )}

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}
            className={`fixed bottom-6 left-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium ${toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'} text-white`}>
            <CheckCircle2 className="w-4 h-4" />{toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <GlobalShortcuts onToggleDarkMode={() => setDarkMode(d => !d)} />
    </div>
  );
}

function SettingsPage({ darkMode: dk, setDarkMode, store }) {
  const card = dk ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const txt  = dk ? 'text-slate-100' : 'text-slate-800';
  const mute = dk ? 'text-slate-400' : 'text-slate-500';
  return (
    <div className="max-w-2xl space-y-4">
      <div className={`rounded-2xl border shadow-sm overflow-hidden ${card}`}>
        <div className={`px-7 py-5 border-b ${dk ? 'border-slate-800' : 'border-slate-100'}`}>
          <h2 className={`text-xl font-bold ${txt}`} style={{ fontFamily: 'Syne,sans-serif' }}>Settings</h2>
          <p className={`text-sm mt-0.5 ${mute}`}>Configure InsightHub preferences</p>
        </div>
        {[
          { title: 'Appearance', desc: `Mode: ${dk ? 'Dark' : 'Light'}`, badge: dk ? 'Dark' : 'Light', action: () => setDarkMode(d => !d) },
          { title: 'AI Model', desc: 'GPT-4o-mini (primary) · LLaMA 3.3 70B (fallback)', badge: 'Active' },
          { title: 'Storage', desc: `${store.analyses.length} analyses · ${store.comparisons.length} comparisons · ${store.datasets.length} datasets saved`, badge: `${store.totalCount} items` },
          { title: 'API', desc: 'Backend at http://localhost:5000', badge: 'Active' },
        ].map(item => (
          <button key={item.title} onClick={item.action}
            className={`w-full flex items-center justify-between px-7 py-4 text-left border-b last:border-b-0 transition-colors ${dk ? 'border-slate-800 hover:bg-slate-800/40' : 'border-slate-100 hover:bg-slate-50'} ${item.action ? 'cursor-pointer' : 'cursor-default'}`}>
            <div>
              <p className={`text-sm font-medium ${txt}`}>{item.title}</p>
              <p className={`text-xs mt-0.5 ${mute}`}>{item.desc}</p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${dk ? 'bg-indigo-950/60 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>{item.badge}</span>
          </button>
        ))}
      </div>
      <div className={`rounded-2xl border border-rose-800/50 p-6 ${dk ? 'bg-slate-900' : 'bg-white'}`}>
        <h3 className="text-sm font-bold text-rose-400 mb-1">Danger Zone</h3>
        <p className={`text-xs ${mute} mb-3`}>Permanently delete all stored analyses, comparisons, and datasets.</p>
        <button onClick={() => { if (confirm('Delete ALL data? This cannot be undone.')) store.clearAll(); }}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-colors">
          Clear All Data
        </button>
      </div>
    </div>
  );
}

function GlobalShortcuts({ onToggleDarkMode }) {
  useEffect(() => {
    const h = e => { if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); onToggleDarkMode(); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onToggleDarkMode]);
  return null;
}

export default App;