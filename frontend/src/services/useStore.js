// useStore.js — Central localStorage store for all InsightHub data
import { useState, useCallback } from 'react';

const KEYS = {
  analyses:    'ih_analyses_v1',
  comparisons: 'ih_comparisons_v1',
  datasets:    'ih_datasets_v1',
  watchlist:   'ih_watchlist_v2',
};

function load(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch { return []; }
}
function persist(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); }
  catch (e) { console.error('Store save failed:', e); }
}

export function useStore() {
  const [analyses,    setA] = useState(() => load(KEYS.analyses));
  const [comparisons, setC] = useState(() => load(KEYS.comparisons));
  const [datasets,    setD] = useState(() => load(KEYS.datasets));
  const [watchlist,   setW] = useState(() => load(KEYS.watchlist));

  const saveAnalysis = useCallback((topic, question, topicData, result) => {
    const entry = {
      id: Date.now(), type: 'analysis', topic, question, topicData, result,
      sentiment: topicData?.sentiment?.sentimentScore ?? topicData?.sentiment?.score ?? 50,
      trend: topicData?.metrics?.trend ?? 0,
      social: topicData?.metrics?.social ?? 0,
      newsCount: topicData?.news?.length ?? 0,
      answer: result?.answer?.answer ?? '—',
      createdAt: new Date().toISOString(),
    };
    setA(prev => {
      const filtered = prev.filter(a =>
        !(a.topic.toLowerCase() === topic.toLowerCase() &&
          a.question.toLowerCase() === question.toLowerCase() &&
          Date.now() - new Date(a.createdAt).getTime() < 5 * 60 * 1000)
      );
      const next = [entry, ...filtered].slice(0, 100);
      persist(KEYS.analyses, next);
      return next;
    });
    return entry;
  }, []);

  const deleteAnalysis = useCallback((id) => {
    setA(prev => { const n = prev.filter(a => a.id !== id); persist(KEYS.analyses, n); return n; });
  }, []);

  const saveComparison = useCallback((topic1, topic2, data) => {
    const entry = {
      id: Date.now(), type: 'comparison', topic1, topic2, data,
      createdAt: new Date().toISOString(),
    };
    setC(prev => { const n = [entry, ...prev].slice(0, 50); persist(KEYS.comparisons, n); return n; });
    return entry;
  }, []);

  const deleteComparison = useCallback((id) => {
    setC(prev => { const n = prev.filter(c => c.id !== id); persist(KEYS.comparisons, n); return n; });
  }, []);

  const saveDataset = useCallback((filename, purpose, result) => {
    const entry = {
      id: Date.now(), type: 'dataset', filename, purpose, result,
      rows: result?.overview?.rows ?? 0,
      columns: result?.overview?.columns ?? 0,
      createdAt: new Date().toISOString(),
    };
    setD(prev => { const n = [entry, ...prev].slice(0, 30); persist(KEYS.datasets, n); return n; });
    return entry;
  }, []);

  const deleteDataset = useCallback((id) => {
    setD(prev => { const n = prev.filter(d => d.id !== id); persist(KEYS.datasets, n); return n; });
  }, []);

  const saveWatchlistItem = useCallback((item) => {
    setW(prev => {
      const filtered = prev.filter(w => w.topic.toLowerCase() !== item.topic.toLowerCase());
      const n = [item, ...filtered].slice(0, 50);
      persist(KEYS.watchlist, n);
      return n;
    });
  }, []);

  const deleteWatchlistItem = useCallback((id) => {
    setW(prev => { const n = prev.filter(w => w.id !== id); persist(KEYS.watchlist, n); return n; });
  }, []);

  const clearAll = useCallback(() => {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    setA([]); setC([]); setD([]); setW([]);
  }, []);

  return {
    analyses, comparisons, datasets, watchlist,
    saveAnalysis, deleteAnalysis,
    saveComparison, deleteComparison,
    saveDataset, deleteDataset,
    saveWatchlistItem, deleteWatchlistItem,
    clearAll,
    totalCount: analyses.length + comparisons.length + datasets.length,
  };
}