
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Quote, QuoteStatus, Client, LineItem } from '../types';

const Quotes: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [items, setItems] = useState<LineItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');

  useEffect(() => {
    setQuotes(StorageService.getQuotes());
    setClients(StorageService.getClients());
  }, []);

  const addItem = () => {
    setItems([...items, { id: Math.random().toString(36).substr(2, 9), description: '', quantity: 1, rate: 0 }]);
  };

  const calculateTotal = () => items.reduce((acc, curr) => acc + (curr.quantity * curr.rate), 0);

  const saveQuote = () => {
    if (!selectedClientId || items.length === 0) return;
    StorageService.addQuote({
      quoteNumber: `QT-${Date.now().toString().slice(-4)}`,
      clientId: selectedClientId,
      date: new Date().toISOString().split('T')[0],
      items,
      status: QuoteStatus.PENDING,
      total: calculateTotal()
    });
    setQuotes(StorageService.getQuotes());
    setIsCreating(false);
    setItems([]);
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Quotes</h2>
          <p className="text-slate-500 mt-1">Proposal management and pipeline tracking</p>
        </div>
        {!isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center space-x-2"
          >
            <i className="fa-solid fa-plus"></i>
            <span>New Quote</span>
          </button>
        )}
      </header>

      {isCreating ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
             <div>
               <label className="block text-sm font-semibold text-slate-700 mb-1">Select Contact</label>
               <select 
                 className="w-full px-4 py-3 rounded-xl border border-slate-200"
                 value={selectedClientId}
                 onChange={(e) => setSelectedClientId(e.target.value)}
               >
                 <option value="">Select a contact...</option>
                 {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
             </div>
             <div className="bg-indigo-50 p-6 rounded-2xl flex flex-col justify-center items-center">
                <p className="text-xs font-bold text-indigo-400 uppercase">Estimated Total</p>
                <h4 className="text-3xl font-black text-indigo-600">${calculateTotal().toFixed(2)}</h4>
             </div>
          </div>

          <div className="space-y-4 mb-8">
            <h4 className="font-bold text-slate-800">Proposal Items</h4>
            {items.map((item, idx) => (
              <div key={item.id} className="flex space-x-4">
                <input 
                  placeholder="Service description..."
                  className="flex-1 px-4 py-2 border rounded-lg"
                  value={item.description}
                  onChange={e => {
                    const next = [...items];
                    next[idx].description = e.target.value;
                    setItems(next);
                  }}
                />
                <input 
                  type="number"
                  placeholder="Qty"
                  className="w-20 px-4 py-2 border rounded-lg"
                  value={item.quantity}
                  onChange={e => {
                    const next = [...items];
                    next[idx].quantity = parseFloat(e.target.value) || 0;
                    setItems(next);
                  }}
                />
                <input 
                  type="number"
                  placeholder="Rate"
                  className="w-32 px-4 py-2 border rounded-lg"
                  value={item.rate}
                  onChange={e => {
                    const next = [...items];
                    next[idx].rate = parseFloat(e.target.value) || 0;
                    setItems(next);
                  }}
                />
              </div>
            ))}
            <button onClick={addItem} className="text-indigo-600 font-bold text-sm">+ Add Line Item</button>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button onClick={() => setIsCreating(false)} className="px-6 py-2 font-bold text-slate-500">Cancel</button>
            <button onClick={saveQuote} className="px-8 py-2 bg-indigo-600 text-white rounded-lg font-bold">Create Quote</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quotes.map(q => {
            const client = clients.find(c => c.id === q.clientId);
            return (
              <div key={q.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-slate-900">{q.quoteNumber}</h4>
                    <p className="text-xs text-slate-500">{q.date}</p>
                  </div>
                  <span className="px-2 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase rounded-md">{q.status}</span>
                </div>
                <div className="mb-6">
                  <p className="text-sm font-semibold text-slate-800">{client?.name}</p>
                  <p className="text-xs text-slate-500 truncate">{client?.company}</p>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                  <span className="text-xl font-black text-slate-900">${q.total.toFixed(2)}</span>
                  <button className="text-indigo-600 font-bold text-xs hover:underline">Send Proposal</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
};

export default Quotes;
