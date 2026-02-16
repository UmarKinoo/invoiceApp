
import { Client, Invoice, InvoiceStatus, Quote, Task, Transaction, ActivityLog, GlobalSettings } from '../types';

const CLIENTS_KEY = 'lumina_clients';
const INVOICES_KEY = 'lumina_invoices';
const QUOTES_KEY = 'lumina_quotes';
const TASKS_KEY = 'lumina_tasks';
const TRANSACTIONS_KEY = 'lumina_transactions';
const SETTINGS_KEY = 'lumina_settings';

const defaultSettings: GlobalSettings = {
  businessName: 'Lumina Digital Inc.',
  businessAddress: '101 Innovation Way, San Francisco, CA',
  businessEmail: 'billing@lumina.io',
  businessPhone: '(555) 000-1234',
  businessWebsite: 'www.lumina.io',
  logoUrl: 'https://ui-avatars.com/api/?name=Lumina&background=6366f1&color=fff&bold=true',
  invoicePrefix: 'INV-',
  taxRateDefault: 0,
  currency: 'USD'
};

export const StorageService = {
  // Generic Getters
  get: <T>(key: string, defaultValue: T[] = []): T[] => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  },
  
  save: <T>(key: string, data: T) => {
    localStorage.setItem(key, JSON.stringify(data));
  },

  // Settings
  getSettings: (): GlobalSettings => {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : defaultSettings;
  },
  saveSettings: (settings: GlobalSettings) => {
    StorageService.save(SETTINGS_KEY, settings);
  },

  // Clients
  getClients: () => StorageService.get<Client>(CLIENTS_KEY),
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'logs'>) => {
    const clients = StorageService.getClients();
    const newClient: Client = { ...client, id: `c-${Date.now()}`, createdAt: new Date().toISOString(), logs: [] };
    StorageService.save(CLIENTS_KEY, [...clients, newClient]);
    return newClient;
  },
  addLog: (clientId: string, log: Omit<ActivityLog, 'id' | 'date'>) => {
    const clients = StorageService.getClients();
    const updated = clients.map(c => c.id === clientId ? { 
      ...c, 
      logs: [{ ...log, id: `l-${Date.now()}`, date: new Date().toISOString() }, ...c.logs] 
    } : c);
    StorageService.save(CLIENTS_KEY, updated);
  },

  // Invoices
  getInvoices: () => StorageService.get<Invoice>(INVOICES_KEY),
  addInvoice: (invoice: Omit<Invoice, 'id'>) => {
    const items = StorageService.getInvoices();
    const newItem = { ...invoice, id: `inv-${Date.now()}` };
    StorageService.save(INVOICES_KEY, [...items, newItem]);
    return newItem;
  },
  updateInvoice: (invoice: Invoice) => {
    const items = StorageService.getInvoices();
    StorageService.save(INVOICES_KEY, items.map(i => i.id === invoice.id ? invoice : i));
  },
  deleteInvoice: (id: string) => {
    const items = StorageService.getInvoices();
    StorageService.save(INVOICES_KEY, items.filter(i => i.id !== id));
  },

  // Quotes
  getQuotes: () => StorageService.get<Quote>(QUOTES_KEY),
  addQuote: (quote: Omit<Quote, 'id'>) => {
    const items = StorageService.getQuotes();
    const newItem = { ...quote, id: `q-${Date.now()}` };
    StorageService.save(QUOTES_KEY, [...items, newItem]);
    return newItem;
  },

  // Tasks
  getTasks: () => StorageService.get<Task>(TASKS_KEY),
  addTask: (task: Omit<Task, 'id'>) => {
    const items = StorageService.getTasks();
    const newItem = { ...task, id: `t-${Date.now()}` };
    StorageService.save(TASKS_KEY, [...items, newItem]);
    return newItem;
  },
  toggleTask: (id: string) => {
    const items = StorageService.getTasks();
    StorageService.save(TASKS_KEY, items.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  },

  // Transactions
  getTransactions: () => StorageService.get<Transaction>(TRANSACTIONS_KEY),
  addTransaction: (tx: Omit<Transaction, 'id'>) => {
    const items = StorageService.getTransactions();
    const newItem = { ...tx, id: `tx-${Date.now()}` };
    StorageService.save(TRANSACTIONS_KEY, [...items, newItem]);
    return newItem;
  }
};
