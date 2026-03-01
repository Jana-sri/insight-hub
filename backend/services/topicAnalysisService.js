// topicAnalysisService.js — GPT-4o powered, date-aware, rich structured output
const axios = require('axios');
const Groq  = require('groq-sdk');

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const GROQ_KEY   = process.env.GROQ_API_KEY;
const TODAY      = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

/* ── AI callers ── */
async function callGPT(messages, maxTokens = 1400) {
  if (!OPENAI_KEY) throw new Error('No OpenAI key');
  const res = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    { model: 'gpt-4o-mini', temperature: 0.2, max_tokens: maxTokens, messages },
    { headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' }, timeout: 22000 }
  );
  return res.data.choices[0].message.content;
}

async function callGroq(messages, maxTokens = 1400) {
  const groq = new Groq({ apiKey: GROQ_KEY });
  const res  = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile', temperature: 0.15, max_tokens: maxTokens, messages,
  });
  return res.choices[0].message.content;
}

async function callAI(messages, maxTokens = 1400) {
  try   { return await callGPT(messages, maxTokens); }
  catch (e) { console.log('⚠️ GPT failed → Groq:', e.message); return await callGroq(messages, maxTokens); }
}

function safeJSON(raw) {
  const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try { return JSON.parse(clean); }
  catch { const m = clean.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); throw new Error('parse fail'); }
}

/* ── Wikipedia ── */
async function getDescription(topic) {
  try {
    const r = await axios.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`,
      { timeout: 4000 }
    );
    return {
      title: r.data.title,
      description: r.data.extract?.slice(0, 700) || '',
      image: r.data.thumbnail?.source || null,
      url: r.data.content_urls?.desktop?.page || null,
    };
  } catch {
    return { title: topic, description: '', image: null, url: null };
  }
}

/* ── Main export ── */
async function analyzeTopicWithQuestion(topic, question, topicData) {
  console.log(`\n🚀 [${TODAY}] "${topic}" | Q: "${question}"`);

  const sentiment = topicData.sentiment?.sentimentScore ?? topicData.sentiment?.score ?? 50;
  const trend     = topicData.metrics?.trend ?? 0;
  const social    = topicData.metrics?.social ?? 0;
  const newsCount = topicData.news?.length ?? 0;

  const headlines = (topicData.news || []).slice(0, 8)
    .map((n, i) => `${i + 1}. [${n.source || 'News'}] "${n.title}"${n.description ? ` — ${n.description.slice(0, 120)}` : ''}`)
    .join('\n');

  const SYS = `You are an expert analyst. Today is ${TODAY}.

KEY FACTS:
- iPhone 17 series (iPhone 17, 17 Pro, 17 Air, 17 Pro Max) launched in September 2025. It IS available now.
- You are analyzing REAL news data. If articles exist about something, that thing EXISTS.
- Never say a product "doesn't exist" when there are news articles about it.
- Give SPECIFIC, VARIED answers based on the unique data provided — not generic responses.
- Always cite actual numbers and headline references.

Respond ONLY with valid JSON. No markdown.`;

  const USR = `Analyze "${topic}" to answer: "${question}"

DATA (${TODAY}):
- Sentiment: ${sentiment}/100 (${sentiment >= 65 ? 'Positive' : sentiment >= 45 ? 'Neutral' : 'Negative'})  
- Social: ${social.toLocaleString()} mentions
- Trend: ${trend >= 0 ? '+' : ''}${trend}%
- Articles: ${newsCount}

REAL HEADLINES:
${headlines || '(no headlines — use general knowledge for this topic as of today)'}

Answer this question: "${question}"

Return JSON:
{
  "answer": "YES" or "NO",
  "verdict": "One bold direct sentence answering the question",
  "reasoning": "2-3 sentences with specific headline references and exact numbers",
  "confidence": number,
  "evidence": ["Evidence 1 with data", "Evidence 2 with headline ref", "Evidence 3"],
  "keyInsight": "The single most important insight about ${topic} right now",
  "pros": ["Pro 1", "Pro 2", "Pro 3"],
  "cons": ["Con 1", "Con 2", "Con 3"],
  "recommendation": "Specific action recommendation",
  "priceOutlook": "price/value outlook or null",
  "riskLevel": "Low" or "Medium" or "High",
  "category": "phone|crypto|stock|car|software|food|service|brand|person|other",
  "tags": ["tag1", "tag2", "tag3"]
}`;

  const [wikiData, analysisRaw, specsRaw] = await Promise.allSettled([
    getDescription(topic),
    callAI([{ role: 'system', content: SYS }, { role: 'user', content: USR }], 1400),
    callAI([
      { role: 'system', content: `Extract factual info. Today is ${TODAY}. Return ONLY JSON.` },
      { role: 'user', content: `Topic: "${topic}"\nHeadlines: ${(topicData.news || []).slice(0, 4).map(n => n.title).join('. ')}\n\nReturn:\n{\n  "isProduct": true|false,\n  "category": "phone/car/crypto/software/stock/service/person/brand/other",\n  "specs": [\n    {"label": "Price", "value": "...or N/A"},\n    {"label": "Released", "value": "...or N/A"},\n    {"label": "Made By", "value": "...or N/A"},\n    {"label": "Key Feature", "value": "...or N/A"}\n  ]\n}` },
    ], 350),
  ]);

  const wiki  = wikiData.status  === 'fulfilled' ? wikiData.value  : { title: topic, description: '', image: null, url: null };
  let analysis = {};
  let specs    = { isProduct: false, specs: [] };

  try { analysis = safeJSON(analysisRaw.value || '{}'); } catch (e) {
    console.error('Analysis parse fail:', e.message);
    analysis = buildFallback(topic, sentiment, trend, social, newsCount);
  }

  try { specs = safeJSON(specsRaw.value || '{}'); } catch { /* keep defaults */ }

  console.log(`✅ Answer: ${analysis.answer}, Confidence: ${analysis.confidence}`);

  return {
    description: wiki,
    specs,
    answer: {
      answer:         analysis.answer         ?? (sentiment >= 55 ? 'YES' : 'NO'),
      verdict:        analysis.verdict        ?? analysis.reasoning ?? '',
      reasoning:      analysis.reasoning      ?? '',
      confidence:     Number(analysis.confidence) || 70,
      evidence:       analysis.evidence       ?? [],
      keyInsight:     analysis.keyInsight     ?? '',
      pros:           analysis.pros           ?? [],
      cons:           analysis.cons           ?? [],
      recommendation: analysis.recommendation ?? '',
      priceOutlook:   analysis.priceOutlook   ?? null,
      riskLevel:      analysis.riskLevel      ?? 'Medium',
      category:       analysis.category       ?? 'other',
      tags:           analysis.tags           ?? [],
    },
  };
}

function buildFallback(topic, s, t, social, n) {
  const yes = s >= 55 && t > -30;
  return {
    answer: yes ? 'YES' : 'NO',
    verdict: `${topic} shows ${s >= 65 ? 'positive' : s >= 45 ? 'mixed' : 'negative'} indicators from ${n} sources.`,
    reasoning: `Sentiment ${s}/100 from ${n} articles. Social: ${social.toLocaleString()}. Trend: ${t >= 0 ? '+' : ''}${t}%.`,
    confidence: Math.max(55, Math.min(85, s)),
    evidence: [`Sentiment: ${s}/100`, `Social: ${social.toLocaleString()}`, `Trend: ${t >= 0 ? '+' : ''}${t}%`],
    keyInsight: `${topic} sentiment is ${s}/100 from ${n} verified sources.`,
    pros: ['News coverage available', s >= 55 ? 'Positive sentiment' : 'Neutral baseline'],
    cons: [s < 55 ? 'Below threshold sentiment' : 'Volatility possible', t < 0 ? 'Declining trend' : 'Monitor changes'],
    recommendation: `${yes ? 'Conditions look favorable' : 'Exercise caution'} for ${topic}.`,
    priceOutlook: null, riskLevel: 'Medium', category: 'other', tags: [],
  };
}

module.exports = { analyzeTopicWithQuestion };