import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// ייצוא פונקציות formatters למען נוחות
export * from './formatters' 