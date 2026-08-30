// Tiny Express backend: proxies AI provider calls (OpenAI-compatible).
// Serves two endpoints used by the frontend:
//   GET  /api/models  — list models from the user's provider
//   POST /api/chat    — chat completion via the user's provider
//
// The browser sends the provider URL + API key in the request, and this
// server forwards them. Keeps the call out of the browser (CORS-free)
// and lets users bring their own provider/model.

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// POST /api/gemini — call Gemini SDK server-side.
// Uses GEMINI_API_KEY from .env by default; if the client sends its own
// key (overrideApiKey), that takes priority. Keeps the default key
// server-side (never exposed to the browser / GitHub).
app.post('/api/gemini', async (req, res) => {
  const { model, system, prompt, overrideApiKey } = req.body || {};
  const logTag = '[novely /api/gemini]';
  const apiKey = overrideApiKey || process.env.GEMINI_API_KEY || '';

  if (!model || !prompt) {
    return res.status(400).json({ error: 'model dan prompt wajib diisi.' });
  }
  if (!apiKey) {
    return res.status(400).json({ error: 'API key Gemini belum dikonfigurasi di server.' });
  }

  const startedAt = Date.now();
  console.log(`${logTag} request model=${model} (${overrideApiKey ? 'user key' : 'server default key'})`);

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        ...(system ? { systemInstruction: system } : {}),
        temperature: 0.7,
      },
    });
    const text = response?.text || '';
    console.log(`${logTag} done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s (${text.length} chars)`);
    return res.json({ text });
  } catch (e) {
    console.log(`${logTag} ERROR: ${e.message}`);
    return res.status(502).json({ error: `Gagal memanggil Gemini: ${e.message}` });
  }
});

// GET /api/gemini-key — expose the server-default Gemini key so the
// settings UI can show it as pre-filled (read-only display). The key
// lives in .env (never in the repo/bundle); users can still override.
app.get('/api/gemini-key', (req, res) => {
  return res.json({ key: process.env.GEMINI_API_KEY || '' });
});
app.get('/api/models', async (req, res) => {
  const serverUrl = req.header('x-server-url');
  const apiKey = req.header('x-api-key');
  if (!serverUrl || !apiKey) {
    return res.status(400).json({ error: 'X-Server-Url dan X-Api-Key header diperlukan.' });
  }
  const baseUrl = serverUrl.replace(/\/+$/, '');
  try {
    const r = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      return res.status(r.status).json({ error: `Provider menolak: ${r.status} ${t}` });
    }
    const data = await r.json();
    return res.json({ data: (data.data || []).map((m) => ({ id: m.id })) });
  } catch (e) {
    return res.status(502).json({ error: `Gagal menghubungi provider: ${e.message}` });
  }
});

// POST /api/chat — chat completion via user's provider, streamed as SSE.
// Response shape: `data: {"content": "<delta>"}\n\n` for each chunk,
// then a final `data: [DONE]\n\n`.
app.post('/api/chat', async (req, res) => {
  const { serverUrl, apiKey, model, system, prompt } = req.body || {};
  const logTag = `[novely /api/chat]`;

  if (!serverUrl || !apiKey || !model || !prompt) {
    return res.status(400).json({ error: 'serverUrl, apiKey, model, dan prompt wajib diisi.' });
  }
  const baseUrl = serverUrl.replace(/\/+$/, '');
  const startedAt = Date.now();
  console.log(`${logTag} request model=${model}`);

  try {
    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 8192,
        stream: true,
      }),
    });

    if (!r.ok) {
      const t = await r.text().catch(() => '');
      console.log(`${logTag} provider error ${r.status}: ${t.slice(0, 300)}`);
      return res.status(r.status).json({ error: `Provider menolak: ${r.status} ${t}` });
    }
    if (!r.body) {
      console.log(`${logTag} provider returned no body`);
      return res.status(502).json({ error: 'Provider tidak mengembalikan body.' });
    }

    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // disable nginx buffering → flush per chunk
    });

    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let totalChars = 0;

    const flush = () => {
      try { res.write(buffer); buffer = ''; } catch { /* client gone */ }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Split on SSE double-newline boundaries and forward each complete event.
      let idx;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const event = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        for (const line of event.split('\n')) {
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed?.choices?.[0]?.delta?.content;
            if (typeof delta === 'string' && delta.length > 0) {
              totalChars += delta.length;
              res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
            }
          } catch { /* skip malformed */ }
        }
      }
      flush();
    }

    // Flush any trailing partial event
    flush();
    res.write(`data: [DONE]\n\n`);
    res.end();
    console.log(`${logTag} done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s (${totalChars} chars)`);
  } catch (e) {
    console.log(`${logTag} ERROR: ${e.message}`);
    if (!res.headersSent) {
      return res.status(502).json({ error: `Gagal menghubungi provider: ${e.message}` });
    }
    try { res.end(); } catch { /* already closed */ }
  }
});

app.listen(PORT, () => {
  console.log(`Novely AI proxy running on http://localhost:${PORT}`);
});
