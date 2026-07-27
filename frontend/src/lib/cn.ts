import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Joins class names and resolves Tailwind conflicts.
 *
 * `clsx` handles the conditional forms; `twMerge` is what makes component
 * variants composable — a caller passing `className="px-6"` to a button whose
 * variant already sets `px-3` gets 6, not both. Without it the later class in
 * the stylesheet wins, which is not the one the caller wrote.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
