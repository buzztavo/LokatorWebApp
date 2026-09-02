import React, { useState } from 'react';
import { X, Database, CheckCircle2, AlertCircle, Key, Globe, ShieldCheck } from 'lucide-react';
import { getSupabaseCredentials, saveCustomSupabaseCredentials } from '../lib/supabase';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  dataSource: 'supabase' | 'local';
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onRefresh,
  dataSource,
}) => {
  const credentials = getSupabaseCredentials();
  const [url, setUrl] = useState(credentials.url);
  const [anonKey, setAnonKey] = useState(credentials.anonKey);
  const [savedStatus, setSavedStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveCustomSupabaseCredentials(url, anonKey);
    setSavedStatus('Credentials updated! Reloading POIs from Supabase...');
    setTimeout(() => {
      onRefresh();
      setSavedStatus(null);
      onClose();
    }, 900);
  };

  return (
    <div
      id="supabase-config-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="supabase-config-modal-card"
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${dataSource === 'supabase' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 leading-tight">Supabase Connection</h2>
              <p className="text-xs text-slate-500">Database connection and table configuration</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Status Badge */}
          <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
            dataSource === 'supabase'
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
              : 'bg-amber-50/80 border-amber-200 text-amber-900'
          }`}>
            {dataSource === 'supabase' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs leading-relaxed">
              <span className="font-semibold block text-sm">
                {dataSource === 'supabase' ? 'Connected to Supabase' : 'Active: Local Session Mode'}
              </span>
              {dataSource === 'supabase' ? (
                'Live queries are communicating with table "poi" on your Supabase instance.'
              ) : (
                'Currently storing POIs locally. When deployed to Cloudflare Pages (with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY configured) or entered below, the map queries your live Supabase database.'
              )}
            </div>
          </div>

          {/* Quick Credential Inputs (Useful for preview testing) */}
          <form onSubmit={handleSave} className="space-y-3.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              Credentials Config
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                <Globe className="w-3 h-3 text-slate-400" />
                VITE_SUPABASE_URL
              </label>
              <input
                type="text"
                placeholder="https://your-project.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                <Key className="w-3 h-3 text-slate-400" />
                VITE_SUPABASE_ANON_KEY
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {savedStatus && (
              <p className="text-xs text-emerald-600 font-medium">{savedStatus}</p>
            )}

            <button
              type="submit"
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              Update Credentials
            </button>
          </form>

          {/* Database Schema Reference */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
            <span className="text-xs font-semibold text-slate-700 block">Table Schema: poi</span>
            <div className="text-[11px] font-mono text-slate-600 space-y-1 bg-white p-3 rounded-lg border border-slate-200 overflow-x-auto">
              <div>• id: uuid (primary key)</div>
              <div>• name: text</div>
              <div>• description: text (nullable)</div>
              <div>• category: text</div>
              <div>• latitude: double precision</div>
              <div>• longitude: double precision</div>
              <div>• elevation: double precision (nullable)</div>
              <div>• created_at: timestamptz</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
