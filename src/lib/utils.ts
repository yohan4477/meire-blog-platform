import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'KRW'): string {
  if (currency === 'KRW') {
    if (amount >= 1000000000000) {
      return `₩${(amount / 1000000000000).toFixed(1)}조원`;
    } else if (amount >= 100000000) {
      return `₩${(amount / 100000000).toFixed(1)}억원`;
    } else if (amount >= 10000) {
      return `₩${(amount / 10000).toFixed(1)}만원`;
    } else {
      return `₩${amount.toLocaleString()}`;
    }
  } else {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }
}

export function formatPercentage(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}
