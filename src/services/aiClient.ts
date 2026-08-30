// AI Provider settings + OpenAI-compatible client.
// Settings are stored in localStorage. The actual API calls go through
// the local backend proxy (server.js) to avoid CORS and keep the key
// out of the browser bundle.

export interface AISettings {
  serverUrl: string;
  apiKey: string;
  model: string;
  /** Gemini API key — default built-in, bisa diganti user. Tanpa URL (Gemini native). */
  geminiApiKey: string;
  /** Optional Elsevier Scopus API key (from dev.elsevier.com). */
  scopusApiKey: string;
  /** Scopus view: 'standard' (free) or 'complete' (premium only). */
  scopusView: string;
}

export const DEFAULT_SETTINGS: AISettings = {
  serverUrl: '',
  apiKey: '',
  model: '',
  // Default Gemini key dipegang SERVER (.env) — bukan di frontend.
  // Kosong berarti app pakai key server via /api/gemini.
  geminiApiKey: '',
  scopusApiKey: 'd7c988d15ff04d05ebf23dc7332454e9',
  scopusView: 'standard',
};

const STORAGE_KEY = 'novely_ai_settings';

export function loadSettings(): AISettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      serverUrl: parsed.serverUrl || '',
      apiKey: parsed.apiKey || '',
      model: parsed.model || '',
      geminiApiKey: parsed.geminiApiKey || DEFAULT_SETTINGS.geminiApiKey,
      scopusApiKey: parsed.scopusApiKey || DEFAULT_SETTINGS.scopusApiKey,
      scopusView: parsed.scopusView || 'standard',
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: AISettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function hasCustomSettings(s: AISettings): boolean {
  return Boolean(s.serverUrl && s.apiKey && s.model);
}

export interface ModelInfo {
  id: string;
}

/** Ask our backend proxy to list models from the user's provider. */
export async function fetchModels(serverUrl: string, apiKey: string): Promise<ModelInfo[]> {
  const res = await fetch('/api/models', {
    method: 'GET',
    headers: {
      'X-Server-Url': serverUrl,
      'X-Api-Key': apiKey,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Gagal memuat model (${res.status})${text ? ': ' + text : ''}`);
  }
  const data = await res.json();
  if (!data || !Array.isArray(data.data)) {
    throw new Error('Format respons model tidak valid.');
  }
  return data.data;
}

/** Ask our backend proxy to generate a chat completion. */
export async function generateChat(
  settings: AISettings,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serverUrl: settings.serverUrl,
      apiKey: settings.apiKey,
      model: settings.model,
      system: systemPrompt,
      prompt: userPrompt,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Gagal menghubungi AI (${res.status})${text ? ': ' + text : ''}`);
  }
  if (!res.body) {
    throw new Error('Respons AI tidak valid (body kosong).');
  }

  // Parse SSE stream: lines `data: {...}` with { content: "<delta>" },
  // terminated by `data: [DONE]`.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  const errorMsg = (s: string) => `Gagal membaca respons AI: ${s}`;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

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
          if (parsed.error) {
            throw new Error(errorMsg(parsed.error));
          }
          const delta = parsed?.content;
          if (typeof delta === 'string') full += delta;
        } catch (e) {
          if (e instanceof Error && e.message.startsWith(errorMsg(''))) throw e;
          // Malformed SSE line — skip
        }
      }
    }
  }

  if (!full.trim()) {
    throw new Error('Respons AI tidak valid (kosong).');
  }
  return full;
}
