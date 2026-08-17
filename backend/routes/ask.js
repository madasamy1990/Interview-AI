const express = require('express');
const Groq = require('groq-sdk');
const authenticate = require('../middleware/auth');
const { supabaseAdmin } = require('../services/supabase');

const router = express.Router();

// Credit costs per query type
const CREDIT_COSTS = {
  mic: 2,
  text: 1,
  screenshot: 2,
};

// System prompt for interview answers
const SYSTEM_PROMPT = `You are an expert technical interview coach for a Senior .NET Full Stack Developer with 11+ years of experience.

IMPORTANT RULES:
1. Give concise, structured answers optimized for live interviews
2. Start with a 30-second simple answer
3. Then provide a deeper explanation with real project examples
4. Include code snippets when relevant
5. Mention trade-offs and best practices
6. Keep total response under 400 words
7. Use bullet points for clarity
8. Reference real-world scenarios from enterprise .NET projects`;

// POST /extract-ocr — Extract clean question from raw screen OCR
router.post('/extract-ocr', authenticate, async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText || rawText.trim().length === 0) {
      return res.status(400).json({ error: 'rawText is required' });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        {
          role: 'system',
          content: `You extract interview or coding questions from messy OCR text scraped from a computer screen.
The OCR text contains garbage: taskbar text, file names, status bars, browser tabs, random symbols, timestamps, window titles.

Your job: Extract ONLY the actual interview/coding question with its technical parts, examples, or constraints.
Do NOT include UI clutter, Notepad/Browser window titles, file paths, menu bars, or OS status text.
If no question is found, return exactly: NO_QUESTION_FOUND
Return ONLY the clean question text — no explanations, no labels.`
        },
        {
          role: 'user',
          content: `Extract the clean interview/coding question from this OCR text:\n\n${rawText.slice(0, 4000)}`
        }
      ],
      max_tokens: 500,
      temperature: 0
    });

    const extracted = completion.choices?.[0]?.message?.content?.trim() || rawText.replace(/\s+/g, ' ').trim().slice(0, 300);
    res.status(200).json({ question: extracted });
  } catch (err) {
    console.warn('OCR extraction error:', err.message);
    res.status(200).json({ question: req.body.rawText ? req.body.rawText.replace(/\s+/g, ' ').trim().slice(0, 300) : '' });
  }
});

// ═══════════════════════════════════════
// PROVIDER 1: GROQ (Fastest — 300ms, FREE)
// ═══════════════════════════════════════
async function streamGroq(question, res) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  
  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: question }
    ],
    model: 'openai/gpt-oss-120b',
    temperature: 0.7,
    max_tokens: 1024,
    stream: true,
  });

  for await (const chunk of chatCompletion) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) {
      res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
    }
  }
}

// ═══════════════════════════════════════
// PROVIDER 2: GEMINI (Free, 1-2s)
// ═══════════════════════════════════════
async function streamGemini(question, res) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContentStream({
    contents: [{ role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\nQuestion: ' + question }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  });

  for await (const chunk of result.stream) {
    const content = chunk.text();
    if (content) {
      res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
    }
  }
}

// ═══════════════════════════════════════
// PROVIDER 3: OPENAI (Paid, 2-3s, Last Resort)
// ═══════════════════════════════════════
async function streamOpenAI(question, res) {
  const OpenAI = require('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const stream = await openai.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: question }
    ],
    model: 'gpt-4o-mini',
    temperature: 0.7,
    max_tokens: 1024,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) {
      res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
    }
  }
}

// ═══════════════════════════════════════
// MAIN ROUTE: Triple Fallback
// Groq FREE → Gemini FREE → OpenAI Paid
// ═══════════════════════════════════════
router.post('/', authenticate, async (req, res) => {
  try {
    const { question, type = 'text' } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const cost = CREDIT_COSTS[type] || 1;
    const cleanQuestion = question.replace(/^\[SPEECH-TO-TEXT[^\]]*\]:\s*/i, '').trim();

    // 1. Check credits
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('credits_remaining, plan')
      .eq('id', req.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }

    if (profile.credits_remaining < cost) {
      return res.status(402).json({
        error: 'insufficient_credits',
        credits_remaining: profile.credits_remaining,
        credits_needed: cost,
        message: `Need ${cost} credits. You have ${profile.credits_remaining}. Please upgrade!`
      });
    }

    // 2. Deduct credits atomically
    const { data: remaining, error: deductError } = await supabaseAdmin.rpc('deduct_credits', {
      user_id_param: req.user.id,
      amount: cost,
      desc_text: `${type}: ${cleanQuestion.substring(0, 80)}`
    });

    if (deductError) {
      console.error('Deduct error:', deductError);
      return res.status(500).json({ error: 'Failed to deduct credits' });
    }

    // 3. Setup SSE streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // 4. Triple Fallback: Groq → Gemini → OpenAI
    let provider = 'none';
    const aiQuestion = type === 'mic' 
      ? `[SPEECH-TO-TEXT — auto-correct any technical terms]: ${cleanQuestion}` 
      : cleanQuestion;

    // Try GROQ first (fastest, free)
    if (process.env.GROQ_API_KEY) {
      try {
        provider = 'groq';
        console.log(`[ASK] Using Groq for: "${cleanQuestion.substring(0, 50)}..."`);
        await streamGroq(aiQuestion, res);
      } catch (groqError) {
        console.warn('[ASK] Groq failed:', groqError.message);
        provider = 'groq-failed';
      }
    }

    // Try GEMINI second (free, good quality)
    if (provider === 'none' || provider === 'groq-failed') {
      if (process.env.GEMINI_API_KEY) {
        try {
          provider = 'gemini';
          console.log(`[ASK] Falling back to Gemini...`);
          res.write(`data: ${JSON.stringify({ text: '' })}\n\n`); // Clear any partial groq data
          await streamGemini(aiQuestion, res);
        } catch (geminiError) {
          console.warn('[ASK] Gemini failed:', geminiError.message);
          provider = 'gemini-failed';
        }
      }
    }

    // Try OPENAI last (paid, always works)
    if (provider === 'none' || provider === 'groq-failed' || provider === 'gemini-failed') {
      if (process.env.OPENAI_API_KEY) {
        try {
          provider = 'openai';
          console.log(`[ASK] Falling back to OpenAI...`);
          res.write(`data: ${JSON.stringify({ text: '' })}\n\n`);
          await streamOpenAI(aiQuestion, res);
        } catch (openaiError) {
          console.error('[ASK] OpenAI also failed:', openaiError.message);
          provider = 'all-failed';
        }
      }
    }

    // All providers failed
    if (provider === 'none' || provider === 'all-failed') {
      res.write(`data: ${JSON.stringify({ text: 'All AI providers are currently unavailable. Please try again in a moment.' })}\n\n`);
    }

    // 5. Send final message with remaining credits + provider used
    res.write(`data: ${JSON.stringify({ credits_remaining: remaining, provider: provider })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (err) {
    console.error('Ask endpoint error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'An error occurred during processing.' })}\n\n`);
      res.end();
    }
  }
});

module.exports = router;
