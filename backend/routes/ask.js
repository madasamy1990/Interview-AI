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

// Master System prompt for structured interview answers
const SYSTEM_PROMPT = `You are ME — a Senior Full Stack Developer with 11+ years of experience, currently attending a real technical interview.

CRITICAL FORMAT RULES — ALWAYS OUTPUT ALL 6 SECTIONS IN THIS EXACT ORDER:

🎯 Simple Interview Answer (30 Seconds)
[2-3 sentences direct first-person answer explaining the concept, where you used it in your project, and 1 trade-off]

🟢 Real Project Usage
[Real-world project example e.g. Mobile Device Protection Platform / Claims Engine / NotificationService. Give clean, short code block and real metrics like '10,000+ notifications monthly with 99.8% reliability']

🔴 Interview Point / Must Remember
• Core senior differentiators as bullet points
• For comparative questions (Overloading vs Overriding, Abstract vs Interface, Class vs Struct, etc.) ALWAYS output a clean Markdown Comparison Table!
• State compile-time vs runtime, memory, or thread-safety distinctions

🔵 Definition / Main Concept
[Clear, crisp 1-2 sentence definition]

🟠 Advantages / Benefits
• 2-3 clear practical benefits

✅ Best Practice
• 2 senior best practices or rules of thumb

NEVER use filler phrases like 'Hope this helps' or 'If required I can explain'. Always write in First Person ('I used', 'In my project').`;

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

// POST /generate-resume-prompt — Analyze resume and generate persona prompt
router.post('/generate-resume-prompt', authenticate, async (req, res) => {
  try {
    const { resumeText } = req.body;
    if (!resumeText || resumeText.trim().length === 0) {
      return res.status(400).json({ error: 'resumeText is required' });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        {
          role: 'system',
          content: `You are an expert interview coach analyzing a candidate's resume.
Generate a FIRST-PERSON interview persona prompt. The prompt will configure an AI interview assistant.

FORMAT EXACTLY LIKE THIS:
# 🧠 [Role Title] / [Specialization] Interview Master Prompt

You are **ME — [Full Name]**, a **[Role with Years] of experience**, currently attending a real technical interview.

## My Background:
- [Years] years of experience across [Companies]
- Currently/Previously at [Latest Company] as [Role]
- Core expertise: [Primary Tech Stack]

## My Key Projects:
- [Project 1]: [Brief description with tech stack]
- [Project 2]: [Brief description with tech stack]
- [Project 3]: [Brief description with tech stack]

## My Tech Stack:
[List all technologies, frameworks, databases, cloud tools from resume]

## My Certifications:
[List certifications if any, otherwise write None]

## Answer Style:
- Answer as ME in first person — "I built", "In my project at [Company]", "I used"
- Reference MY actual projects, companies, and tech stack from above
- Use real metrics from my experience when possible

Keep under 400 words. Adapt strictly to the candidate's actual tech stack (Java, Python, .NET, React, DevOps, Data, etc.). Output ONLY the prompt text.`
        },
        {
          role: 'user',
          content: `Here is my resume text:\n\n${resumeText.slice(0, 5000)}`
        }
      ],
      max_tokens: 1000,
      temperature: 0.2
    });

    const prompt = completion.choices?.[0]?.message?.content?.trim();
    res.status(200).json({ prompt });
  } catch (err) {
    console.error('Resume prompt generation error:', err);
    res.status(500).json({ error: 'Failed to generate prompt', message: err.message });
  }
});

// ═══════════════════════════════════════
// PROVIDER 1: GROQ (Fastest — 300ms, FREE)
// ═══════════════════════════════════════
async function streamGroq(question, res, sysPrompt = SYSTEM_PROMPT) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  
  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: sysPrompt },
      { role: 'user', content: question }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.5,
    max_tokens: 1000,
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
async function streamGemini(question, res, sysPrompt = SYSTEM_PROMPT) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContentStream({
    contents: [{ role: 'user', parts: [{ text: sysPrompt + '\n\nQuestion: ' + question }] }],
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 1200,
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
async function streamOpenAI(question, res, sysPrompt = SYSTEM_PROMPT) {
  const OpenAI = require('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const stream = await openai.chat.completions.create({
    messages: [
      { role: 'system', content: sysPrompt },
      { role: 'user', content: question }
    ],
    model: 'gpt-4o-mini',
    temperature: 0.6,
    max_tokens: 1200,
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
    const { question, type = 'text', systemPrompt } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const cost = CREDIT_COSTS[type] || 1;
    const cleanQuestion = question.replace(/^\[SPEECH-TO-TEXT[^\]]*\]:\s*/i, '').trim();
    const activeSystemPrompt = (systemPrompt && systemPrompt.trim().length > 0) ? systemPrompt : SYSTEM_PROMPT;

    // 1. Single Atomic Credit Check & Deduction (0ms DB query overhead)
    const { data: remaining, error: deductError } = await supabaseAdmin.rpc('deduct_credits', {
      user_id_param: req.user.id,
      amount: cost,
      desc_text: `${type}: ${cleanQuestion.substring(0, 80)}`
    });

    if (deductError) {
      console.warn('Credit deduction rejected:', deductError.message);
      return res.status(402).json({
        error: 'insufficient_credits',
        credits_remaining: 0,
        credits_needed: cost,
        message: `Insufficient credits. Please upgrade your plan!`
      });
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
        await streamGroq(aiQuestion, res, activeSystemPrompt);
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
          await streamGemini(aiQuestion, res, activeSystemPrompt);
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
          await streamOpenAI(aiQuestion, res, activeSystemPrompt);
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
