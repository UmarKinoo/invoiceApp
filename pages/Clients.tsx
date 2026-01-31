
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Client } from '../types';

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '', company: '', email: '', phone: '', address: ''
  });

  useEffect(() => {
    setClients(StorageService.getClients());
  }, []);

  const handleAdd = () => {
    if (!newClient.name || !newClient.email) return;
    StorageService.addClient({ ...newClient, tags: [], socials: {}, logs: [] } as any);
    setClients(StorageService.getClients());
    setShowAdd(false);
    setNewClient({ name: '', company: '', email: '', phone: '', address: '' });
  };

  return (
    <div className="space-y-6 lg:space-y-10 animate-in fade-in duration-500">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tighter">Contacts</h2>
          <p className="text-slate-400 text-sm font-medium">Enterprise Professional Network.</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="w-12 h-12 lg:w-auto lg:px-6 lg:py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all flex items-center justify-center lg:space-x-2 border border-white/10 btn-press"
        >
          <i className="fa-solid fa-plus lg:fa-user-plus text-lg lg:text-base"></i>
          <span className="hidden lg:inline uppercase text-xs tracking-wider">Expand</span>
        </button>
      </header>

      {showAdd && (
        <div className="glass p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border-indigo-500/30 shadow-2xl animate-in slide-in-from-bottom-8 duration-500 fixed inset-x-4 bottom-24 lg:relative lg:inset-auto lg:bottom-0 z-[110]">
          <h3 className="text-lg lg:text-xl font-black text-white mb-6 lg:mb-8 tracking-tight italic uppercase">New Registry</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase px-2">Identity</label>
              <input 
                placeholder="Full Name" 
                className="w-full px-5 py-3.5 bg-white/5 rounded-2xl border border-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-white text-sm"
                value={newClient.name}
                onChange={e => setNewClient({...newClient, name: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase px-2">Enterprise</label>
              <input 
                placeholder="Company Name" 
                className="w-full px-5 py-3.5 bg-white/5 rounded-2xl border border-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-white text-sm"
                value={newClient.company}
                onChange={e => setNewClient({...newClient, company: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase px-2">Email</label>
              <input 
                type="email"
                placeholder="email@provider.com" 
                className="w-full px-5 py-3.5 bg-white/5 rounded-2xl border border-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-white text-sm"
                value={newClient.email}
                onChange={e => setNewClient({...newClient, email: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase px-2">Phone</label>
              <input 
                type="tel"
                placeholder="+1 (000) 000-0000" 
                className="w-full px-5 py-3.5 bg-white/5 rounded-2xl border border-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-white text-sm"
                value={newClient.phone}
                onChange={e => setNewClient({...newClient, phone: e.target.value})}
              />
            </div>
          </div>
          <div className="flex space-x-3">
             <button onClick={() => setShowAdd(false)} className="flex-1 py-3.5 glass rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest btn-press">Discard</button>
             <button onClick={handleAdd} className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest btn-press">Save Entry</button>
          </div>
        </div>
      )}

      {showAdd && <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[105] lg:hidden" onClick={() => setShowAdd(false)}></div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {clients.map(client => (
          <div key={client.id} className="glass p-5 lg:p-7 rounded-[2rem] lg:rounded-[2.5rem] hover:border-indigo-500/40 hover:bg-white/[0.06] transition-all group relative overflow-hidden btn-press spring-up">
            <div className="flex items-center space-x-4 mb-6">
              <div className="relative">
                <img src={`https://picsum.photos/seed/${client.id}/200`} className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl lg:rounded-3xl object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" alt={client.name} />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-[3px] border-slate-950 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
              </div>
              <div className="min-w-0">
                <h4 className="font-black text-white text-sm lg:text-base tracking-tight leading-none mb-1 truncate">{client.name}</h4>
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest truncate">{client.company}</p>
              </div>
            </div>
            
            <div className="space-y-2.5 mb-6">
              <div className="flex items-center text-slate-400 text-[11px] lg:text-xs">
                <i className="fa-solid fa-at w-6 text-indigo-400/60"></i>
                <span className="truncate">{client.email}</span>
              </div>
              <div className="flex items-center text-slate-400 text-[11px] lg:text-xs">
                <i className="fa-solid fa-phone-volume w-6 text-indigo-400/60"></i>
                <span>{client.phone}</span>
              </div>
            </div>

            <div className="pt-5 border-t border-white/5 flex justify-between items-center">
              <button className="text-[9px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors">Records</button>
              <div className="flex space-x-2">
                <button className="w-8 h-8 rounded-xl bg-white/5 text-slate-500 hover:bg-indigo-500/20 hover:text-indigo-400 transition-all flex items-center justify-center">
                  <i className="fa-solid fa-pen-nib text-[10px]"></i>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Clients;
