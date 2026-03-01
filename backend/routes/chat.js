const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

router.post('/', async (req, res) => {
  try {
    const { messages, context } = req.body;

    // Build context-aware prompt
    const systemPrompt = `You are an expert data analyst assistant for InsightHub. 

Current Analysis Context:
- Topic: ${context.topic || 'General'}
- Sentiment: ${context.data?.sentiment?.sentiment} (${context.data?.sentiment?.sentimentScore}/100)
- Summary: ${context.data?.sentiment?.summary}
- Trend Score: ${context.data?.metrics?.trend}%
- Social Mentions: ${context.data?.metrics?.social}
- Relevance: ${context.data?.metrics?.relevance}%
- Potential Reach: ${context.data?.metrics?.reach}

Guidelines:
- Provide concise, actionable insights
- Use bullet points when helpful
- Be professional but conversational
- Reference the data when answering
- If asked about risks, analyze sentiment breakdown
- If asked about investment, consider trend + sentiment
- Keep responses under 200 words`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    res.json({
      message: completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.'
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      message: 'The AI assistant is temporarily unavailable. Please try again.' 
    });
  }
});

module.exports = router;