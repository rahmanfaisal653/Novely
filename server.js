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

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// GET /api/models — list models from user's OpenAI-compatible provider
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

// POST /api/chat — chat completion via user's provider
app.post('/api/chat', async (req, res) => {
  const { serverUrl, apiKey, model, system, prompt } = req.body || {};
  if (!serverUrl || !apiKey || !model || !prompt) {
    return res.status(400).json({ error: 'serverUrl, apiKey, model, dan prompt wajib diisi.' });
  }
  const baseUrl = serverUrl.replace(/\/+$/, '');
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
      }),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      return res.status(r.status).json({ error: `Provider menolak: ${r.status} ${t}` });
    }
    const data = await r.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      return res.status(502).json({ error: 'Provider tidak mengembalikan konten.' });
    }
    return res.json({ content });
  } catch (e) {
    return res.status(502).json({ error: `Gagal menghubungi provider: ${e.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`Novely AI proxy running on http://localhost:${PORT}`);
});
