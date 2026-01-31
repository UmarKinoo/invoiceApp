
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { GlobalSettings } from '../types';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<GlobalSettings>(StorageService.getSettings());
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleSave = () => {
    setStatus('saving');
    StorageService.saveSettings(settings);
    setTimeout(() => {
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    }, 500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tighter">System</h2>
          <p className="text-slate-400 text-sm font-medium">Global Enterprise Config.</p>
        </div>
        <button 
          onClick={handleSave}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all border border-white/10 btn-press uppercase text-[10px] tracking-widest"
        >
          {status === 'saving' ? 'Sync...' : status === 'saved' ? 'Synced' : 'Commit'}
        </button>
      </header>

      <div className="space-y-6">
        <section className="space-y-3">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] px-4">Organization Identity</p>
          <div className="glass rounded-[2rem] overflow-hidden divide-y divide-white/5">
            <div className="flex items-center px-6 py-4">
              <span className="text-xs font-bold text-slate-400 w-32">Legal Name</span>
              <input 
                className="flex-1 bg-transparent border-none text-right text-xs font-bold text-white focus:ring-0 p-0"
                value={settings.businessName}
                onChange={e => setSettings({...settings, businessName: e.target.value})}
              />
            </div>
            <div className="flex items-center px-6 py-4">
              <span className="text-xs font-bold text-slate-400 w-32">Enterprise Mail</span>
              <input 
                className="flex-1 bg-transparent border-none text-right text-xs font-bold text-white focus:ring-0 p-0"
                value={settings.businessEmail}
                onChange={e => setSettings({...settings, businessEmail: e.target.value})}
              />
            </div>
            <div className="flex items-center px-6 py-4">
              <span className="text-xs font-bold text-slate-400 w-32">Base Currency</span>
              <select 
                className="flex-1 bg-transparent border-none text-right text-xs font-bold text-indigo-400 focus:ring-0 p-0 appearance-none"
                value={settings.currency}
                onChange={e => setSettings({...settings, currency: e.target.value})}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] px-4">Billing Parameters</p>
          <div className="glass rounded-[2rem] overflow-hidden divide-y divide-white/5">
            <div className="flex items-center px-6 py-4">
              <span className="text-xs font-bold text-slate-400 w-32">Ledger Prefix</span>
              <input 
                className="flex-1 bg-transparent border-none text-right text-xs font-bold text-white focus:ring-0 p-0"
                value={settings.invoicePrefix}
                onChange={e => setSettings({...settings, invoicePrefix: e.target.value})}
              />
            </div>
            <div className="flex items-center px-6 py-4">
              <span className="text-xs font-bold text-slate-400 w-32">Fiscal Levy (%)</span>
              <input 
                type="number"
                className="flex-1 bg-transparent border-none text-right text-xs font-bold text-white focus:ring-0 p-0"
                value={settings.taxRateDefault}
                onChange={e => setSettings({...settings, taxRateDefault: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>
        </section>

        <section className="p-6 bg-slate-900/40 rounded-[2rem] border border-white/5 flex items-center justify-between">
           <div>
              <p className="text-xs font-bold text-white">Quantum Encryption</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">All data stored locally & synced via TLS.</p>
           </div>
           <i className="fa-solid fa-shield-halved text-emerald-500 text-xl"></i>
        </section>
      </div>
    </div>
  );
};

export default Settings;
