
import React, { useState, useEffect } from 'react';
import { GeminiService } from '../services/geminiService';
import { StorageService } from '../services/storageService';

const AIInsights: React.FC = () => {
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchInsights = async () => {
    setLoading(true);
    const invoices = StorageService.getInvoices();
    const clients = StorageService.getClients();
    const result = await GeminiService.getBusinessInsights(invoices, clients);
    setInsight(result);
    setLoading(false);
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <header>
        <h2 className="text-4xl font-black text-white tracking-tighter">Gemini Intelligence</h2>
        <p className="text-slate-400 mt-1 font-medium">Neural analysis of your enterprise ecosystem.</p>
      </header>

      <div className="glass rounded-[3rem] shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-transparent to-purple-600/10 opacity-50"></div>
        
        <div className="bg-slate-900/60 p-10 flex items-center justify-between border-b border-white/5 relative z-10 backdrop-blur-3xl">
          <div className="flex items-center space-x-6">
            <div className="w-16 h-16 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.4)] animate-pulse">
              <i className="fa-solid fa-brain text-white text-2xl"></i>
            </div>
            <div>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Synthesizing Reports</h3>
              <p className="text-indigo-400/80 text-xs font-black tracking-[0.2em] uppercase mt-1">Status: Active Engine</p>
            </div>
          </div>
          <button 
            onClick={fetchInsights}
            disabled={loading}
            className="px-8 py-3.5 bg-white text-slate-950 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-400 transition-all disabled:opacity-30 shadow-xl shadow-white/5"
          >
            {loading ? <i className="fa-solid fa-circle-notch fa-spin mr-3"></i> : <i className="fa-solid fa-bolt-lightning mr-3"></i>}
            Refresh Matrix
          </button>
        </div>

        <div className="p-12 relative z-10">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-6">
              <div className="flex space-x-3">
                <div className="w-4 h-4 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-4 h-4 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-4 h-4 bg-indigo-600 rounded-full animate-bounce"></div>
              </div>
              <p className="text-slate-500 font-black uppercase text-[10px] tracking-[0.3em]">Quantum Processing In Progress...</p>
            </div>
          ) : (
            <div className="prose prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-slate-300 text-lg leading-relaxed font-medium">
                {insight || "Awaiting data synchronization. Finalize active invoices to unlock deep analytics."}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { icon: 'fa-arrow-trend-up', title: 'Trajectory', desc: 'Predictive revenue models based on historical velocity.', color: 'text-emerald-400', bg: 'bg-emerald-500/5' },
          { icon: 'fa-microchip', title: 'Risk Neutral', desc: 'Auto-detection of high-risk payment delays.', color: 'text-amber-400', bg: 'bg-amber-500/5' },
          { icon: 'fa-sparkles', title: 'Brand Tone', desc: 'Hyper-personalized outreach optimized for conversion.', color: 'text-indigo-400', bg: 'bg-indigo-500/5' }
        ].map((item, i) => (
          <div key={i} className={`glass p-8 rounded-[2.5rem] border-white/5 hover:border-white/10 transition-all ${item.bg}`}>
             <i className={`fa-solid ${item.icon} ${item.color} text-2xl mb-5 block shadow-glow`}></i>
             <h5 className="font-black text-white mb-3 uppercase tracking-wider italic">{item.title}</h5>
             <p className="text-sm text-slate-400 leading-relaxed font-medium">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIInsights;
