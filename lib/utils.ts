import { type ClassValue, clsx } from 'clsx'

// Utility function to combine class names
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

// Format address for display
export function formatAddress(address: string, chars = 4): string {
  if (!address) return ''
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

// Format number with commas
export function formatNumber(num: number | string): string {
  return new Intl.NumberFormat().format(Number(num))
}

// Format currency
export function formatCurrency(amount: number | string, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(Number(amount))
}

// Sleep utility
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Check if running on client side
export const isClient = typeof window !== 'undefined'

// Copy to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!isClient || !navigator.clipboard) {
    return false
  }

  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}