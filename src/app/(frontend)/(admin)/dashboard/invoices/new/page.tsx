import { redirect } from 'next/navigation'

// Legacy has no separate /new route – everything is on the same page (LIST / FORM / PREVIEW).
// Redirect so "New Invoice" is handled by the single invoices page.
export default function NewInvoicePage() {
  redirect('/dashboard/invoices')
}
