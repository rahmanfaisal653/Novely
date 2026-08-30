/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, 
  MapPin, 
  Search, 
  BookOpen, 
  Sparkles, 
  Loader2, 
  ChevronRight,
  FileText,
  AlertCircle,
  Database,
  Cpu
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateResearchBlueprint } from './services/geminiService';
import { searchScopus } from './services/scopusService';
import Mermaid from './components/Mermaid';
import AISettingsModal from './components/AISettingsModal';
import { loadSettings, saveSettings, AISettings } from './services/aiClient';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [level, setLevel] = useState('S1');
  const [specialization, setSpecialization] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [blueprint, setBlueprint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [aiSettings, setAiSettings] = useState<AISettings>(() => loadSettings());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specialization.trim()) return;

    setLoading(true);
    setError(null);
    setBlueprint(null);

    try {
      setLoadingStep('Mengambil data referensi dari database publikasi internasional...');
      const scopusData = await searchScopus(specialization);
      
      setLoadingStep('Novely sedang merancang blueprint berbasis literatur terkini...');
      const result = await generateResearchBlueprint(level, specialization, location, scopusData);
      setBlueprint(result);
    } catch (err) {
      setError('Terjadi kesalahan saat menghubungi Novely. Silakan periksa koneksi atau coba lagi nanti.');
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Novely
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-sm font-medium text-slate-500">
            <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full text-slate-700">
              <Database className="w-4 h-4 text-indigo-500" />
              Database Terintegrasi
            </span>
            <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full text-slate-700">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              PLS-SEM Expert
            </span>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors"
              title="Pengaturan AI (provider & model)"
            >
              <Cpu className="w-4 h-4" />
              Pengaturan AI
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column: Form */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Temukan Kebaruan Risetmu dalam Hitungan Detik.</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Masukkan detail studi Anda untuk mendapatkan blueprint proposal standar publikasi penelitian ilmiah bereputasi internasional Q1/Q2.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Level Studi
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['S1', 'S2', 'S3'].map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLevel(l)}
                        className={cn(
                          "py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 border-2",
                          level === l 
                            ? "bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm" 
                            : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                        )}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Peminatan / Topik Utama
                  </label>
                  <div className="relative">
                    <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      placeholder="Contoh: Manajemen SDM, Pemasaran Digital"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Kerangka / Konteks Penelitian
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Contoh: UMKM di Jakarta, Perusahaan Tech"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !specialization.trim()}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 group"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Generate Blueprint
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Info Card */}
            <div className="bg-indigo-900 rounded-2xl p-8 text-white shadow-xl">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-300" />
                Metodologi PLS-SEM
              </h3>
              <p className="text-indigo-100 text-sm leading-relaxed mb-4">
                Blueprint ini dirancang khusus untuk analisis data menggunakan SmartPLS, mencakup model pengukuran (outer model) dan model struktural (inner model).
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs text-indigo-200 bg-indigo-800/50 p-3 rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  Standar Publikasi Internasional Q1/Q2
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center min-h-[600px]"
                >
                  <div className="relative mb-8">
                    <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Database className="w-8 h-8 text-indigo-600 animate-pulse" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{loadingStep || 'Novely sedang merancang blueprint...'}</h3>
                  <p className="text-slate-500 max-w-md mx-auto">
                    Menganalisis tren riset 2021-2026 dari database publikasi bereputasi internasional, memetakan grand theory, dan menyusun model PLS-SEM yang kokoh untuk Anda.
                  </p>
                </motion.div>
              ) : blueprint ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
                >
                  <div className="bg-slate-50 border-b border-slate-200 px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-600 font-semibold text-sm">
                      <FileText className="w-4 h-4" />
                      Blueprint Proposal Penelitian
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          if (blueprint) {
                            navigator.clipboard.writeText(blueprint);
                            alert('Blueprint berhasil disalin ke clipboard!');
                          }
                        }}
                        className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-wider"
                      >
                        Salin Teks
                      </button>
                      <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider">
                        {level} • {specialization}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-8 sm:p-12 prose prose-slate max-w-none prose-headings:text-slate-900 prose-headings:font-bold prose-p:leading-relaxed prose-p:text-slate-600 prose-strong:text-slate-900 prose-code:text-indigo-600 prose-code:bg-indigo-50 prose-code:px-1 prose-code:rounded prose-pre:bg-slate-900 prose-pre:text-slate-100">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ node, inline, className, children, ...props }: any) {
                          const match = /language-mermaid/.exec(className || '');
                          return !inline && match ? (
                            <Mermaid chart={String(children).replace(/\n$/, '')} />
                          ) : (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {blueprint}
                    </ReactMarkdown>
                  </div>

                  <div className="bg-slate-50 border-t border-slate-200 p-8 flex items-center justify-between">
                    <p className="text-xs text-slate-400 italic">
                      Disusun oleh Novely (PLS-SEM Expert)
                    </p>
                    <button 
                      onClick={() => window.print()}
                      className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-2"
                    >
                      Cetak Proposal
                    </button>
                  </div>
                </motion.div>
              ) : error ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-red-50 border border-red-200 rounded-2xl p-8 flex items-start gap-4"
                >
                  <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
                  <div>
                    <h3 className="font-bold text-red-900 mb-1">Gagal Menghasilkan Blueprint</h3>
                    <p className="text-red-700 text-sm">{error}</p>
                    <button 
                      onClick={handleSubmit}
                      className="mt-4 text-sm font-bold text-red-900 underline underline-offset-4"
                    >
                      Coba Lagi
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="bg-white rounded-2xl p-12 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center min-h-[600px]">
                  <div className="bg-slate-50 p-6 rounded-full mb-6">
                    <FileText className="w-12 h-12 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Belum ada blueprint yang dibuat</h3>
                  <p className="text-slate-500 max-w-md mx-auto">
                    Silakan isi formulir di sebelah kiri untuk mendapatkan rancangan proposal penelitian yang komprehensif dan tajam.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-slate-400 text-sm">
            &copy; {new Date().getFullYear()} Novely. Dirancang untuk keunggulan akademik.
          </p>
        </div>
      </footer>

      {showSettings && (
        <AISettingsModal
          settings={aiSettings}
          onSave={(s) => {
            setAiSettings(s);
            saveSettings(s);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
