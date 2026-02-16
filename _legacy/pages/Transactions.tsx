
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Transaction, Client } from '../types';

const Transactions: React.FC = () => {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTx, setNewTx] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    clientId: '',
    reference: '',
    method: 'Stripe'
  });

  useEffect(() => {
    setTxs(StorageService.getTransactions());
    setClients(StorageService.getClients());
  }, []);

  const handleAdd = () => {
    if (!newTx.amount || !newTx.clientId) return;
    StorageService.addTransaction(newTx);
    setTxs(StorageService.getTransactions());
    setShowAdd(false);
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Transactions</h2>
          <p className="text-slate-500 mt-1">View your revenue ledger and incoming payments</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center space-x-2"
        >
          <i className="fa-solid fa-plus"></i>
          <span>Log Payment</span>
        </button>
      </header>

      {showAdd && (
        <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-xl mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Amount</label>
              <input 
                type="number"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none"
                value={newTx.amount}
                onChange={e => setNewTx({...newTx, amount: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Contact</label>
              <select 
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none"
                value={newTx.clientId}
                onChange={e => setNewTx({...newTx, clientId: e.target.value})}
              >
                <option value="">Select...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Reference</label>
              <input 
                placeholder="INV-001"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none"
                value={newTx.reference}
                onChange={e => setNewTx({...newTx, reference: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Method</label>
              <select 
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none"
                value={newTx.method}
                onChange={e => setNewTx({...newTx, method: e.target.value})}
              >
                <option value="Stripe">Stripe</option>
                <option value="PayPal">PayPal</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-6 space-x-3">
            <button onClick={() => setShowAdd(false)} className="text-slate-500 font-bold">Cancel</button>
            <button onClick={handleAdd} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold">Save</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase">Date</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase">Contact</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase">Amount</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase">Reference</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase">Method</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {txs.map(tx => {
              const client = clients.find(c => c.id === tx.clientId);
              return (
                <tr key={tx.id}>
                  <td className="px-6 py-4 text-sm text-slate-500 font-medium">{tx.date}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{client?.name || 'Unknown'}</td>
                  <td className="px-6 py-4 text-sm font-black text-emerald-600">+ ${tx.amount.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{tx.reference}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    <span className="px-2 py-1 rounded bg-slate-100 text-[10px] font-bold uppercase">{tx.method}</span>
                  </td>
                </tr>
              )
            })}
            {txs.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">No transactions recorded.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Transactions;
