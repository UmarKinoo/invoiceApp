
export enum InvoiceStatus {
  DRAFT = 'Draft',
  SENT = 'Sent',
  PAID = 'Paid',
  OVERDUE = 'Overdue',
  CANCELLED = 'Cancelled'
}

export enum QuoteStatus {
  DRAFT = 'Draft',
  PENDING = 'Pending',
  ACCEPTED = 'Accepted',
  EXPIRED = 'Expired'
}

export enum TaskPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High'
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

export interface ActivityLog {
  id: string;
  date: string;
  type: 'note' | 'call' | 'email' | 'meeting';
  content: string;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  tags: string[];
  socials: { twitter?: string; linkedin?: string };
  createdAt: string;
  logs: ActivityLog[];
}

export interface Quote {
  id: string;
  quoteNumber: string;
  clientId: string;
  date: string;
  items: LineItem[];
  status: QuoteStatus;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  date: string;
  dueDate: string;
  items: LineItem[];
  status: InvoiceStatus;
  taxRate: number; // Percent
  discount: number; // Flat amount
  shipping: number; // Flat amount
  notes: string;
  subtotal: number;
  tax: number;
  total: number;
}

export interface GlobalSettings {
  businessName: string;
  businessAddress: string;
  businessEmail: string;
  businessPhone: string;
  businessWebsite: string;
  logoUrl: string;
  invoicePrefix: string;
  taxRateDefault: number;
  currency: string;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  clientId: string;
  reference: string;
  method: string;
}

export interface Task {
  id: string;
  title: string;
  dueDate: string;
  priority: TaskPriority;
  clientId?: string;
  completed: boolean;
}
