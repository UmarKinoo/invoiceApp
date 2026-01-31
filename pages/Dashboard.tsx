
import React, { useMemo, useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { StorageService } from '../services/storageService';
import { InvoiceStatus, Invoice } from '../types';

const StatCard: React.FC<{ label: string; value: string; icon: string; color: string; glow: string }> = ({ label, value, icon, color, glow }) => (
  <div className="glass p-5 lg:p-6 rounded-[2rem] relative overflow-hidden group transition-all btn-press spring-up">
    <div className={`absolute top-0 right-0 w-24 h-24 blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity ${glow}`}></div>
    <div className="flex items-center justify-between mb-4 relative z-10">
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${color} shadow-lg shadow-black/20`}>
        <i className={`fa-solid ${icon} text-white text-lg`}></i>
      </div>
      <span className="text-[8px] font-black text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded-lg border border-indigo-400/20">REALTIME</span>
    </div>
    <p className="text-slate-500 text-[10px] lg:text-xs font-bold uppercase tracking-widest">{label}</p>
    <h3 className="text-2xl lg:text-3xl font-black text-white mt-1 tracking-tight">{value}</h3>
  </div>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => {
    setInvoices(StorageService.getInvoices());
    setClients(StorageService.getClients());
  }, []);

  const stats = useMemo(() => {
    const paid = invoices.filter(i => i.status === InvoiceStatus.PAID).reduce((acc, curr) => acc + curr.total, 0);
    const outstanding = invoices.filter(i => i.status !== InvoiceStatus.PAID).reduce((acc, curr) => acc + curr.total, 0);
    return {
      paid: paid,
      outstanding: outstanding,
      clients: clients.length,
      count: invoices.length
    };
  }, [invoices, clients]);

  const chartData = useMemo(() => [
    { name: 'Jan', amount: 4000 },
    { name: 'Feb', amount: 3000 },
    { name: 'Mar', amount: 2000 },
    { name: 'Apr', amount: 2780 },
    { name: 'May', amount: 1890 },
    { name: 'Jun', amount: 2390 },
    { name: 'Jul', amount: stats.paid || 100 },
  ], [stats.paid]);

  return (
    <div className="space-y-8 lg:space-y-12 animate-in fade-in duration-500">
      <header className="flex justify-between items-end px-2 lg:px-0">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter leading-none mb-1">Hub</h2>
          <p className="text-slate-500 text-xs font-black uppercase tracking-[0.2em]">Enterprise Control</p>
        </div>
        <div className="relative">
          <img src="https://ui-avatars.com/api/?name=Alex+Rivers&background=6366f1&color=fff" className="w-10 h-10 rounded-2xl ring-2 ring-indigo-500/20" alt="Profile" />
        </div>
      </header>

      {/* Quick Actions for Mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden px-2">
         <button 
           onClick={() => navigate('/invoices')}
           className="w-full p-6 glass rounded-[2.5rem] flex items-center space-x-5 border-indigo-500/30 bg-indigo-500/5 btn-press"
         >
            <div className="w-14 h-14 rounded-[1.5rem] bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
               <i className="fa-solid fa-file-circle-plus text-white text-xl"></i>
            </div>
            <div className="text-left">
               <h4 className="font-black text-white text-lg leading-none mb-1 italic">Initiate Billing</h4>
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Create New Invoice</p>
            </div>
         </button>
         <button 
           onClick={() => navigate('/clients')}
           className="w-full p-6 glass rounded-[2.5rem] flex items-center space-x-5 border-emerald-500/30 bg-emerald-500/5 btn-press"
         >
            <div className="w-14 h-14 rounded-[1.5rem] bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20">
               <i className="fa-solid fa-user-plus text-white text-xl"></i>
            </div>
            <div className="text-left">
               <h4 className="font-black text-white text-lg leading-none mb-1 italic">Expand Network</h4>
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Register New Contact</p>
            </div>
         </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 px-2 lg:px-0">
        <StatCard label="Cash Flow" value={`$${stats.paid.toLocaleString()}`} icon="fa-wallet" color="bg-indigo-600" glow="bg-indigo-50" />
        <StatCard label="Capital Out" value={`$${stats.outstanding.toLocaleString()}`} icon="fa-clock" color="bg-amber-500" glow="bg-amber-50" />
        <StatCard label="Network" value={stats.clients.toString()} icon="fa-user-group" color="bg-emerald-500" glow="bg-emerald-50" />
        <StatCard label="Registry" value={stats.count.toString()} icon="fa-chart-line" color="bg-rose-500" glow="bg-rose-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 px-2 lg:px-0">
        <div className="lg:col-span-2 glass p-6 lg:p-10 rounded-[2.5rem] relative overflow-hidden">
          <div className="flex items-center justify-between mb-8 lg:mb-10">
            <h4 className="text-xs lg:text-lg font-black text-white tracking-widest uppercase italic leading-none">Market Velocity</h4>
            <div className="bg-white/5 px-4 py-1.5 rounded-full border border-white/5 text-[9px] font-black text-indigo-400 uppercase tracking-widest">Q3 Performance</div>
          </div>
          <div className="h-64 lg:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff08" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10}} />
                <Tooltip 
                  contentStyle={{ background: '#0f172a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '11px' }}
                  cursor={{ stroke: '#6366f1', strokeWidth: 2 }}
                />
                <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorAmt)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass p-6 lg:p-10 rounded-[2.5rem] flex flex-col">
          <h4 className="text-xs lg:text-lg font-black text-white mb-8 tracking-widest uppercase italic leading-none">Recent Flow</h4>
          <div className="space-y-4">
            {invoices.slice(0, 5).map(inv => (
              <div 
                key={inv.id} 
                onClick={() => navigate('/invoices')}
                className="flex items-center justify-between p-4 rounded-3xl bg-white/3 border border-white/5 btn-press transition-all active:bg-white/10"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.6)]"></div>
                  <div>
                    <p className="font-black text-white text-[11px] tracking-tight">{inv.invoiceNumber}</p>
                    <p className="text-[9px] text-slate-600 font-bold uppercase">{inv.date}</p>
                  </div>
                </div>
                <p className="font-black text-white text-xs tracking-tighter">${inv.total.toFixed(0)}</p>
              </div>
            ))}
            {invoices.length === 0 && <p className="text-[10px] text-slate-700 font-black uppercase text-center py-10 italic">Zero transaction signals.</p>}
          </div>
          
          <button 
            onClick={() => navigate('/invoices')}
            className="mt-8 w-full py-4 bg-indigo-600 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-600/10 btn-press"
          >
             Analyze Full Ledger
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
