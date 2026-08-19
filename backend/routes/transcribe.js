const express = require('express');
const Groq = require('groq-sdk');
const { toFile } = require('groq-sdk');

const router = express.Router();

// POST /transcribe — Transcribe audio chunk with Groq Whisper
router.post('/', async (req, res) => {
  try {
    const { audio, mimeType = 'audio/webm', language = 'en' } = req.body;
    if (!audio) {
      return res.status(400).json({ error: 'Audio data is required (base64)' });
    }
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return res.status(500).json({ error: 'Groq API key not configured on backend' });
    }
    const groq = new Groq({ apiKey: groqApiKey });
    const buffer = Buffer.from(audio, 'base64');
    const ext = mimeType.includes('ogg') ? 'ogg' : (mimeType.includes('mp4') || mimeType.includes('m4a') ? 'm4a' : 'webm');
    const file = await toFile(buffer, 'recording.' + ext, { type: mimeType });
    const transcription = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3',
      language: language || 'en',
      response_format: 'json',
    });
    res.json({ text: transcription.text ? transcription.text.trim() : '' });
  } catch (err) {
    console.error('Transcription route error:', err);
    res.status(500).json({ error: 'Transcription failed', message: err.message });
  }
});

module.exports = router;