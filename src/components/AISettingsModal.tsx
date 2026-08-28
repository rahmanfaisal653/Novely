import React, { useState } from 'react';
import {
  AISettings,
  fetchModels,
} from '../services/aiClient';
import { X, Loader2, RefreshCw, KeyRound, Server, Cpu, CheckCircle2, Database, Eye, EyeOff } from 'lucide-react';

interface Props {
  settings: AISettings;
  onSave: (s: AISettings) => void;
  onClose: () => void;
}

export default function AISettingsModal({ settings, onSave, onClose }: Props) {
  const [serverUrl, setServerUrl] = useState(settings.serverUrl);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [model, setModel] = useState(settings.model);
  const [scopusApiKey, setScopusApiKey] = useState(settings.scopusApiKey);
  const [scopusView, setScopusView] = useState(settings.scopusView || 'standard');
  const [availableModels, setAvailableModels] = useState<string[]>(
    settings.model ? [settings.model] : []
  );
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [showScopusKey, setShowScopusKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleFetchModels = async () => {
    if (!serverUrl.trim() || !apiKey.trim()) {
      setModelError('Isi Alamat Server (URL) dan API Key terlebih dahulu.');
      return;
    }
    setLoadingModels(true);
    setModelError('');
    try {
      const models = await fetchModels(serverUrl.trim(), apiKey.trim());
      const ids = models.map((m) => m.id).filter(Boolean);
      if (ids.length === 0) {
        setModelError('Provider tidak mengembalikan model apa pun.');
        return;
      }
      setAvailableModels(ids);
      if (!ids.includes(model)) setModel(ids[0]);
    } catch (e: any) {
      setModelError(e.message || 'Gagal memuat model.');
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSave = () => {
    onSave({
      serverUrl: serverUrl.trim(),
      apiKey: apiKey.trim(),
      model: model.trim(),
      scopusApiKey: scopusApiKey.trim(),
      scopusView: scopusView,
    });
    setSaved(true);
    setTimeout(onClose, 800);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-600" />
            Pengaturan AI
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Server URL */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              <Server className="w-3.5 h-3.5" />
              Base URL Provider
            </label>
            <input
              type="url"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              <KeyRound className="w-3.5 h-3.5" />
              API Key
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-4 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  title={showKey ? 'Sembunyikan' : 'Lihat'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={handleFetchModels}
                disabled={loadingModels}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                {loadingModels ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Muat Model
              </button>
            </div>
            <div className="mt-1.5">
              <p className="text-xs text-slate-400">Seperti kata sandi — jangan disebarkan.</p>
            </div>
            {modelError && (
              <p className="mt-1.5 text-xs text-red-500">{modelError}</p>
            )}
          </div>

          {/* Model */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              {!availableModels.includes(model) && model && (
                <option value={model}>{model}</option>
              )}
              {availableModels.length === 0 && (
                <option value="">Klik "Muat Model" untuk memuat daftar</option>
              )}
              {availableModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-slate-400">
              {availableModels.length > 0
                ? `${availableModels.length} model tersedia dari provider ini.`
                : 'Masukkan URL + API key, lalu klik "Muat Model".'}
            </p>
          </div>

          {/* Scopus API Key */}
          <div className="border-t border-slate-100 pt-4">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              <Database className="w-3.5 h-3.5" />
              API Key Scopus (Opsional)
            </label>
            <div className="relative">
              <input
                type={showScopusKey ? 'text' : 'password'}
                value={scopusApiKey}
                onChange={(e) => setScopusApiKey(e.target.value)}
                placeholder="Dapatkan di dev.elsevier.com"
                className="w-full px-4 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowScopusKey(!showScopusKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                title={showScopusKey ? 'Sembunyikan' : 'Lihat'}
              >
                {showScopusKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="mt-1.5">
              <p className="text-xs text-slate-400">
                Wajib, agar dapat mengambil referensi literatur real dari Scopus.
              </p>
            </div>

            {/* Scopus View */}
            <div className="mt-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                View Scopus
              </label>
              <select
                value={scopusView}  
                onChange={(e) => setScopusView(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="standard">Standard (non-premium)</option>
                <option value="complete">Complete (premium)</option>
              </select>
              <p className="mt-1.5 text-xs text-slate-400">
                Standard tersedia untuk semua akun, Complete memerlukan akses premium/institusi.
              </p>
            </div>
          </div>

          {saved && (
            <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              Tersimpan!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
