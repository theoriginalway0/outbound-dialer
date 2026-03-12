import { cn } from '../../lib/utils'

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700',
        'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100',
        'placeholder:text-slate-400 dark:placeholder:text-slate-500',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'transition-colors',
        className
      )}
      {...props}
    />
  )
}

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        'h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700',
        'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'transition-colors',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700',
        'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100',
        'placeholder:text-slate-400 dark:placeholder:text-slate-500',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        'resize-none transition-colors',
        className
      )}
      {...props}
    />
  )
}
