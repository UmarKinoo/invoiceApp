
import React, { useState, useEffect, useMemo } from 'react';
import { StorageService } from '../services/storageService';
import { Invoice, InvoiceStatus, Client, LineItem, GlobalSettings } from '../types';
import { GeminiService } from '../services/geminiService';

enum ViewMode {
  LIST,
  FORM,
  PREVIEW
}

const Invoices: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.LIST);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>(StorageService.getSettings());
  
  const [activeInvoice, setActiveInvoice] = useState<Partial<Invoice>>({});
  const [items, setItems] = useState<LineItem[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  useEffect(() => {
    setInvoices(StorageService.getInvoices());
    setClients(StorageService.getClients());
    setSettings(StorageService.getSettings());
  }, []);

  const handleCreateNew = () => {
    const nextInvNum = `${settings.invoicePrefix}${invoices.length + 1001}`;
    setActiveInvoice({
      invoiceNumber: nextInvNum,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: InvoiceStatus.DRAFT,
      taxRate: settings.taxRateDefault,
      discount: 0,
      shipping: 0,
      notes: ''
    });
    setItems([]);
    setViewMode(ViewMode.FORM);
  };

  const handleEdit = (inv: Invoice) => {
    setActiveInvoice(inv);
    setItems(inv.items);
    setViewMode(ViewMode.FORM);
  };

  const handlePreview = (inv: Invoice) => {
    setActiveInvoice(inv);
    setItems(inv.items);
    setViewMode(ViewMode.PREVIEW);
  };

  const totals = useMemo(() => {
    const subtotal = items.reduce((acc, curr) => acc + (curr.quantity * curr.rate), 0);
    const discount = activeInvoice.discount || 0;
    const afterDiscount = subtotal - discount;
    const tax = (afterDiscount * (activeInvoice.taxRate || 0)) / 100;
    const total = afterDiscount + tax + (activeInvoice.shipping || 0);
    return { subtotal, tax, total };
  }, [items, activeInvoice.taxRate, activeInvoice.discount, activeInvoice.shipping]);

  const saveInvoice = () => {
    if (!activeInvoice.clientId || items.length === 0) {
      alert("Please select a recipient and add items.");
      return;
    }
    const finalInvoice: Invoice = { 
      ...activeInvoice as Invoice, 
      items, 
      subtotal: totals.subtotal, 
      tax: totals.tax, 
      total: totals.total 
    };
    if (finalInvoice.id) StorageService.updateInvoice(finalInvoice);
    else StorageService.addInvoice(finalInvoice);
    setInvoices(StorageService.getInvoices());
    setViewMode(ViewMode.LIST);
  };

  const handleMagicFill = async () => {
    if (!aiPrompt) return;
    setIsAiLoading(true);
    const data = await GeminiService.parseInvoiceDraft(aiPrompt);
    if (data.items) {
      setItems(data.items);
      if (data.clientName) {
        const found = clients.find(c => 
          c.name.toLowerCase().includes(data.clientName!.toLowerCase()) || 
          c.company.toLowerCase().includes(data.clientName!.toLowerCase())
        );
        if (found) setActiveInvoice(prev => ({ ...prev, clientId: found.id }));
      }
      if (data.notes) setActiveInvoice(prev => ({ ...prev, notes: data.notes }));
    }
    setIsAiLoading(false);
    setAiPrompt('');
  };

  const renderPreview = () => {
    const client = clients.find(c => c.id === activeInvoice.clientId);
    return (
      <div className="fixed inset-0 bg-[#030712] z-[150] flex flex-col animate-in fade-in zoom-in duration-300">
        <div className="ios-header px-6 py-4 border-b border-white/5 flex justify-between items-center">
          <button onClick={() => setViewMode(ViewMode.LIST)} className="text-indigo-400 font-bold flex items-center btn-press">
            <i className="fa-solid fa-chevron-left mr-2"></i> Done
          </button>
          <div className="flex space-x-3">
            <button onClick={() => window.print()} className="w-10 h-10 glass rounded-full flex items-center justify-center text-white btn-press">
              <i className="fa-solid fa-share-nodes"></i>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 no-scrollbar pb-20">
          <div className="max-w-3xl mx-auto bg-white rounded-2xl p-8 md:p-12 text-slate-900 shadow-2xl print:shadow-none print:p-0">
            <div className="flex justify-between items-start mb-10">
              <div>
                <img src={settings.logoUrl} className="h-12 mb-4" alt="Logo" />
                <h2 className="text-xl font-black">{settings.businessName}</h2>
                <div className="text-slate-500 text-[10px] mt-1 font-medium leading-relaxed">
                  <p>{settings.businessAddress}</p>
                </div>
              </div>
              <div className="text-right">
                <h1 className="text-3xl font-black text-slate-100 uppercase tracking-tighter mb-2">Invoice</h1>
                <p className="font-bold text-slate-900">{activeInvoice.invoiceNumber}</p>
                <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-2">{activeInvoice.date}</p>
              </div>
            </div>

            <div className="mb-10">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Bill To</p>
              <h3 className="text-lg font-black">{client?.name}</h3>
              <p className="text-slate-500 text-xs">{client?.company}</p>
            </div>

            <table className="w-full mb-10">
              <thead>
                <tr className="border-b-2 border-slate-100">
                  <th className="py-3 text-left text-[9px] font-black uppercase text-slate-400">Item</th>
                  <th className="py-3 text-right text-[9px] font-black uppercase text-slate-400">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map(item => (
                  <tr key={item.id}>
                    <td className="py-4">
                      <p className="text-sm font-bold">{item.description}</p>
                      <p className="text-[10px] text-slate-400">{item.quantity} × ${item.rate.toFixed(2)}</p>
                    </td>
                    <td className="py-4 text-right font-black text-sm">${(item.quantity * item.rate).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="space-y-2 border-t pt-6">
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span>Subtotal</span>
                <span>${totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs font-black text-indigo-600 pt-2 border-t">
                <span className="uppercase tracking-widest">Total Amount</span>
                <span className="text-2xl">${totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 lg:space-y-10 animate-in fade-in duration-500 pb-20 lg:pb-0">
      {viewMode === ViewMode.LIST && (
        <>
          <header className="flex justify-between items-end px-2 lg:px-0">
            <div>
              <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tighter">Billing</h2>
              <p className="text-slate-400 text-sm font-medium">Enterprise Ledger Registry.</p>
            </div>
            <button 
              onClick={handleCreateNew}
              className="w-12 h-12 lg:w-auto lg:px-6 lg:py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-500/20 border border-white/10 btn-press flex items-center justify-center transition-all active:scale-90"
            >
              <i className="fa-solid fa-plus text-lg lg:mr-2"></i>
              <span className="hidden lg:inline uppercase text-xs tracking-widest">New Invoice</span>
            </button>
          </header>

          <div className="space-y-3 px-2 lg:px-0">
            {invoices.length > 0 ? (
              invoices.map((inv) => {
                const client = clients.find(c => c.id === inv.clientId);
                return (
                  <div 
                    key={inv.id} 
                    onClick={() => handlePreview(inv)}
                    className="glass p-5 lg:p-6 rounded-[2rem] flex items-center justify-between group btn-press spring-up cursor-pointer active:bg-white/10"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-black italic border border-indigo-500/20">
                        {inv.invoiceNumber.split('-')[1] || '#'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-white text-sm tracking-tight truncate">{client?.name || 'Unknown Client'}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{inv.invoiceNumber} • {inv.date}</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="font-black text-white text-base lg:text-lg tracking-tighter">${inv.total.toFixed(2)}</p>
                      <span className={`mt-1 text-[8px] font-black px-2 py-0.5 rounded-md uppercase border ${
                        inv.status === InvoiceStatus.PAID ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' : 
                        inv.status === InvoiceStatus.OVERDUE ? 'text-rose-400 border-rose-500/20 bg-rose-500/5' : 'text-amber-400 border-amber-500/20 bg-amber-500/5'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-24 text-center flex flex-col items-center justify-center space-y-4">
                <div className="w-20 h-20 glass rounded-[2.5rem] flex items-center justify-center text-slate-700">
                  <i className="fa-solid fa-file-invoice-dollar text-3xl"></i>
                </div>
                <p className="text-slate-500 font-black uppercase text-[10px] italic tracking-[0.3em]">No billing flow detected.</p>
                <button onClick={handleCreateNew} className="text-indigo-400 text-xs font-black uppercase tracking-widest hover:underline">Initiate First Invoice</button>
              </div>
            )}
          </div>
        </>
      )}

      {(viewMode === ViewMode.FORM) && (
        <div className="fixed inset-0 bg-[#030712] z-[200] flex flex-col animate-in slide-in-from-bottom-12 duration-500 lg:relative lg:inset-auto lg:rounded-[3rem] lg:glass lg:overflow-hidden">
          <div className="ios-header p-6 border-b border-white/5 flex justify-between items-center bg-[#030712]">
            <button onClick={() => setViewMode(ViewMode.LIST)} className="text-slate-400 font-black text-[11px] uppercase tracking-widest btn-press">Cancel</button>
            <div className="text-center">
              <h3 className="text-lg font-black text-white uppercase italic tracking-tighter leading-none">Draft Registry</h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">{activeInvoice.invoiceNumber}</p>
            </div>
            <button onClick={saveInvoice} className="text-indigo-400 font-black text-[11px] uppercase tracking-widest btn-press">Save</button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 md:p-10 space-y-8 no-scrollbar pb-32">
            {/* AI Assistant Tool */}
            {!activeInvoice.id && (
              <div className="glass p-5 rounded-3xl border-indigo-500/20 bg-indigo-500/5">
                <div className="flex items-center space-x-2 text-indigo-400 mb-3">
                  <i className="fa-solid fa-wand-magic-sparkles text-xs"></i>
                  <span className="text-[10px] font-black uppercase tracking-widest">Quantum Drafting</span>
                </div>
                <div className="flex space-x-2">
                  <input 
                    placeholder="e.g. '10 hours dev at $100 for ACME Corp'"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                  />
                  <button 
                    onClick={handleMagicFill}
                    disabled={isAiLoading}
                    className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center btn-press disabled:opacity-50"
                  >
                    {isAiLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-bolt"></i>}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <section className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest">Recipient Entity</label>
                <div className="relative">
                  <select 
                    className="w-full px-5 py-4 bg-white/5 rounded-2xl border border-white/5 text-sm text-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={activeInvoice.clientId}
                    onChange={e => setActiveInvoice({...activeInvoice, clientId: e.target.value})}
                  >
                    <option value="" className="bg-slate-900">Select Connection...</option>
                    {clients.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
                  </select>
                  <i className="fa-solid fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none text-xs"></i>
                </div>
              </section>

              <section className="space-y-2">
                <div className="flex justify-between items-center px-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ledger Items</label>
                  <button 
                    onClick={() => setItems([...items, { id: Math.random().toString(36).substr(2, 9), description: '', quantity: 1, rate: 0 }])}
                    className="text-[9px] font-black text-indigo-400 uppercase tracking-widest"
                  >
                    Add Row
                  </button>
                </div>
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={item.id} className="glass p-4 rounded-2xl border-white/5 animate-in slide-in-from-right-4 duration-300">
                      <div className="flex justify-between items-start mb-3">
                        <input 
                          placeholder="Service Description"
                          className="flex-1 bg-transparent border-none p-0 text-sm font-bold text-white focus:ring-0 placeholder:text-slate-600"
                          value={item.description}
                          onChange={e => { const n = [...items]; n[idx].description = e.target.value; setItems(n); }}
                        />
                        <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-slate-600 hover:text-rose-500 ml-2">
                          <i className="fa-solid fa-times-circle"></i>
                        </button>
                      </div>
                      <div className="flex space-x-4">
                        <div className="flex-1">
                          <p className="text-[8px] font-black text-slate-600 uppercase mb-1">Quantity</p>
                          <input 
                            type="number"
                            className="w-full bg-white/5 rounded-lg border border-white/5 px-3 py-1.5 text-xs text-white"
                            value={item.quantity}
                            onChange={e => { const n = [...items]; n[idx].quantity = parseFloat(e.target.value) || 0; setItems(n); }}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-[8px] font-black text-slate-600 uppercase mb-1">Unit Rate</p>
                          <input 
                            type="number"
                            className="w-full bg-white/5 rounded-lg border border-white/5 px-3 py-1.5 text-xs text-white"
                            value={item.rate}
                            onChange={e => { const n = [...items]; n[idx].rate = parseFloat(e.target.value) || 0; setItems(n); }}
                          />
                        </div>
                        <div className="flex-1 text-right flex flex-col justify-end">
                          <p className="text-[8px] font-black text-slate-600 uppercase mb-1">Amount</p>
                          <p className="text-xs font-black text-white">${(item.quantity * item.rate).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="py-10 border-2 border-dashed border-white/5 rounded-[2rem] text-center text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">
                      No line items specified.
                    </div>
                  )}
                </div>
              </section>

              <section className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest">Status</label>
                  <select 
                    className="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/5 text-xs text-white focus:ring-0"
                    value={activeInvoice.status}
                    onChange={e => setActiveInvoice({...activeInvoice, status: e.target.value as InvoiceStatus})}
                  >
                    {Object.values(InvoiceStatus).map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest">Tax Rate (%)</label>
                  <input 
                    type="number"
                    className="w-full px-4 py-3 bg-white/5 rounded-xl border border-white/5 text-xs text-white focus:ring-0"
                    value={activeInvoice.taxRate}
                    onChange={e => setActiveInvoice({...activeInvoice, taxRate: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </section>

              <section className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest">Terms & Notes</label>
                <textarea 
                  className="w-full px-5 py-4 bg-white/5 rounded-2xl border border-white/5 text-xs text-white h-24 focus:ring-0 placeholder:text-slate-600"
                  placeholder="Payment instructions, bank details, etc..."
                  value={activeInvoice.notes}
                  onChange={e => setActiveInvoice({...activeInvoice, notes: e.target.value})}
                />
              </section>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6 tab-bar-glass pb-[env(safe-area-inset-bottom,24px)] lg:relative lg:rounded-b-[3rem] lg:bg-white/5">
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Settlement Total</p>
                <p className="text-3xl font-black text-white tracking-tighter">${totals.total.toFixed(2)}</p>
              </div>
              <button 
                onClick={saveInvoice}
                className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-500/20 btn-press active:scale-95 transition-all"
              >
                Sync Records
              </button>
            </div>
          </div>
        </div>
      )}

      {viewMode === ViewMode.PREVIEW && renderPreview()}
    </div>
  );
};

export default Invoices;
