
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const NavItem: React.FC<{ to: string; icon: string; label: string; active: boolean }> = ({ to, icon, label, active }) => (
  <Link
    to={to}
    className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all group btn-press ${
      active 
        ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.2)]' 
        : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
    }`}
  >
    <i className={`fa-solid ${icon} text-base w-6 text-center ${active ? 'text-indigo-400' : 'text-slate-500 group-hover:text-indigo-400'}`}></i>
    <span className="font-medium text-sm tracking-wide">{label}</span>
  </Link>
);

const TabItem: React.FC<{ to: string; icon: string; label: string; active: boolean }> = ({ to, icon, label, active }) => (
  <Link
    to={to}
    className={`flex flex-col items-center justify-center space-y-1 flex-1 py-2 transition-all btn-press ${
      active ? 'text-indigo-400' : 'text-slate-500'
    }`}
  >
    <i className={`fa-solid ${icon} text-lg`}></i>
    <span className="text-[10px] font-bold tracking-tight">{label}</span>
  </Link>
);

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-[#030712] selection:bg-indigo-500/30">
      {/* Decorative Blur Orbs */}
      <div className="fixed top-[-10%] left-[-10%] w-[60%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[60%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-white/5 bg-slate-950/50 backdrop-blur-3xl fixed h-full flex-col overflow-y-auto z-50">
        <div className="p-8">
          <div className="flex items-center space-x-3 text-indigo-500">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <i className="fa-solid fa-bolt text-white text-lg"></i>
            </div>
            <h1 className="text-xl font-black text-white tracking-tighter uppercase italic">Lumina</h1>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] px-4 mb-3 mt-4">Core</p>
          <NavItem to="/" icon="fa-chart-pie" label="Dashboard" active={location.pathname === '/'} />
          <NavItem to="/clients" icon="fa-users" label="Contacts" active={location.pathname === '/clients'} />
          <NavItem to="/tasks" icon="fa-list-check" label="Tasks" active={location.pathname === '/tasks'} />
          
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] px-4 mb-3 mt-8">Sales Engine</p>
          <NavItem to="/quotes" icon="fa-file-invoice" label="Quotes" active={location.pathname === '/quotes'} />
          <NavItem to="/invoices" icon="fa-file-invoice-dollar" label="Invoices" active={location.pathname === '/invoices'} />
          <NavItem to="/transactions" icon="fa-money-bill-transfer" label="Ledger" active={location.pathname === '/transactions'} />
          
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] px-4 mb-3 mt-8">Intelligence</p>
          <NavItem to="/insights" icon="fa-wand-magic-sparkles" label="AI Insights" active={location.pathname === '/insights'} />

          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] px-4 mb-3 mt-8">System</p>
          <NavItem to="/settings" icon="fa-gear" label="Settings" active={location.pathname === '/settings'} />
        </nav>

        <div className="p-6 border-t border-white/5 mt-auto">
          <div className="flex items-center space-x-3 bg-white/5 p-3 rounded-2xl border border-white/5">
            <img src="https://ui-avatars.com/api/?name=Alex+Rivers&background=6366f1&color=fff" className="w-8 h-8 rounded-full ring-2 ring-indigo-500/20" alt="Profile" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">Alex Rivers</p>
              <p className="text-[10px] text-slate-500 font-medium">Business Pro</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-64 pb-24 lg:pb-10 relative">
        <div className="max-w-6xl mx-auto px-4 lg:px-10 py-6 lg:py-10">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-20 tab-bar-glass flex items-start px-4 pt-2 pb-[env(safe-area-inset-bottom)] z-[100] transition-transform">
        <TabItem to="/" icon="fa-chart-pie" label="Insights" active={location.pathname === '/'} />
        <TabItem to="/clients" icon="fa-users" label="Contacts" active={location.pathname === '/clients'} />
        <TabItem to="/invoices" icon="fa-file-invoice-dollar" label="Billing" active={location.pathname === '/invoices'} />
        <TabItem to="/tasks" icon="fa-list-check" label="Tasks" active={location.pathname === '/tasks'} />
        <TabItem to="/settings" icon="fa-gear" label="Settings" active={location.pathname === '/settings'} />
      </nav>
    </div>
  );
};
