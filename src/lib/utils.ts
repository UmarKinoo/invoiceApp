import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const CURRENCY_SYMBOL: Record<string, string> = {
  MUR: 'Rs',
  USD: '$',
  EUR: '€',
  GBP: '£',
}

/** Format ISO date string for display (e.g. "12 Mar 2026"). Returns empty string for invalid/missing. */
export function formatDisplayDate(value: string | null | undefined): string {
  if (value == null || value === '') return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Format amount with currency symbol (e.g. "Rs 1,234.00" or "$1,234.00"). Defaults to MUR. */
export function formatCurrency(
  amount: number,
  currency: string = 'MUR',
  options?: { decimals?: number; locale?: string }
): string {
  const symbol = CURRENCY_SYMBOL[currency] ?? currency
  const decimals = options?.decimals ?? 2
  const locale = options?.locale ?? 'en-US'
  const formatted = Number(amount).toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return symbol === '$' || symbol === '€' || symbol === '£'
    ? `${symbol}${formatted}`
    : `${symbol} ${formatted}`
}
