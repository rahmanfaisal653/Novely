// AI Provider settings + OpenAI-compatible client.
// Settings are stored in localStorage. The actual API calls go through
// the local backend proxy (server.js) to avoid CORS and keep the key
// out of the browser bundle.

export interface AISettings {
  serverUrl: string;
  apiKey: string;
  model: string;
  /** Optional Elsevier Scopus API key (from dev.elsevier.com). */
  scopusApiKey: string;
  /** Scopus view: 'standard' (free) or 'complete' (premium only). */
  scopusView: string;
}

export const DEFAULT_SETTINGS: AISettings = {
  serverUrl: '',
  apiKey: '',
  model: '',
  scopusApiKey: '',
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
      scopusApiKey: parsed.scopusApiKey || '',
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
  const data = await res.json();
  if (!data || typeof data.content !== 'string') {
    throw new Error('Respons AI tidak valid.');
  }
  return data.content;
}
