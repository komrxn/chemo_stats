import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number, decimals = 4): string {
  if (Math.abs(value) < 0.0001 && value !== 0) {
    return value.toExponential(2)
  }
  return value.toFixed(decimals)
}

export function formatPValue(p: number): string {
  if (p < 0.0001) return '<0.0001'
  if (p < 0.001) return p.toExponential(2)
  return p.toFixed(4)
}

