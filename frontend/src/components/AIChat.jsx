import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles, X, MessageSquare, ChevronDown, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const QUICK = [
  'What are the main risks?',
  'Should I invest?',
  'Compare with alternatives',
  'What do experts say?',
  'Price outlook?',
];

export default function AIChat({ darkMode, currentTopic, topicData }) {
  const dk = darkMode;
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: `Hi! I'm your AI analyst for **"${currentTopic}"**. I have access to ${topicData?.news?.length || 0} real articles and live data.\n\nAsk me anything — risks, trends, comparisons, investment outlook, or specific questions about the data.`,
  }]);
  const [input,  setInput]  = useState('');
  const [typing, setTyping] = useState(false);
  const [open,   setOpen]   = useState(false);
  const [unread, setUnread] = useState(0);
  const endRef = useRef(null);

  const card = dk ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const inpt = dk
    ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-600 focus:border-indigo-500'
    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-400';

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (!open && messages.length > 1) setUnread(u => u + 1);
  }, [messages]);

  const handleOpen = () => { setOpen(true); setUnread(0); };

  const send = async (text = input) => {
    const msg = typeof text === 'string' ? text.trim() : input.trim();
    if (!msg || typing) return;
    const userMsg = { role: 'user', content: msg };
    setMessages(p => [...p, userMsg]);
    setInput('');
    setTyping(true);
    try {
      const res = await axios.post('http://localhost:5000/api/chat', {
        messages: [...messages, userMsg],
        context: { topic: currentTopic, data: topicData },
      });
      setMessages(p => [...p, { role: 'assistant', content: res.data.message }]);
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally { setTyping(false); }
  };

  if (!open) return (
    <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
      onClick={handleOpen}
      className="fixed bottom-8 right-8 z-50 w-14 h-14 rounded-full gradient-bg shadow-xl shadow-indigo-500/30 flex items-center justify-center">
      <MessageSquare className="w-6 h-6 text-white" />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">{unread}</span>
      )}
    </motion.button>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="fixed bottom-8 right-8 z-50 w-[390px] h-[600px] flex flex-col rounded-2xl border shadow-2xl overflow-hidden"
      style={{ boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 gradient-bg shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">AI Analyst</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full status-dot" />
              <span className="text-white/70 text-[11px]">GPT-4o · {currentTopic}</span>
            </div>
          </div>
        </div>
        <button onClick={() => setOpen(false)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors">
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${dk ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-indigo-950 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                </div>
              )}
              <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'gradient-bg text-white rounded-tr-sm'
                  : `${dk ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'bg-white text-slate-700 border border-slate-200'} rounded-tl-sm shadow-sm`
              }`}>
                {m.role === 'assistant'
                  ? <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none">{m.content}</ReactMarkdown>
                  : m.content
                }
              </div>
              {m.role === 'user' && (
                <div className="w-7 h-7 rounded-full gradient-bg flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {typing && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-950 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className={`px-4 py-3 rounded-2xl rounded-tl-sm border ${dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex gap-1">
                {[0, 0.18, 0.36].map(d => (
                  <motion.span key={d} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.65, delay: d }}
                    className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
                ))}
              </div>
            </div>
          </motion.div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick prompts */}
      <div className={`px-3 py-2 border-t flex gap-1.5 overflow-x-auto shrink-0 ${dk ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        {QUICK.map(p => (
          <button key={p} onClick={() => send(p)}
            className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors shrink-0 ${
              dk ? 'bg-slate-800 border-slate-700 text-slate-400 hover:border-indigo-600 hover:text-indigo-400'
                 : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-indigo-400 hover:text-indigo-600'
            }`}>
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className={`px-3 pb-3 pt-2 shrink-0 ${dk ? 'bg-slate-900' : 'bg-white'}`}>
        <div className="flex gap-2">
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask me anything about the data…"
            className={`flex-1 px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all ${inpt}`}
          />
          <button onClick={() => send()} disabled={!input.trim() || typing}
            className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity shadow">
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}