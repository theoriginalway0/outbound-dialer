import { cn } from '../../lib/utils'

const variants = {
  // Contact statuses
  new: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  contacted: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  qualified: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  unqualified: 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400',
  do_not_call: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  // Campaign statuses
  active: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  // Contact queue statuses
  pending: 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400',
  called: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  skipped: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  // Dispositions
  answered: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  voicemail: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  no_answer: 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400',
  busy: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  callback: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  not_interested: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  // Call statuses
  in_progress: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

export function Badge({ variant, children, className }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize',
      variants[variant] || 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400',
      className
    )}>
      {children}
    </span>
  )
}
