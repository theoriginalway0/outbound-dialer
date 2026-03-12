import { cn } from '../../lib/utils'

export function Card({ className, children }) {
  return (
    <div className={cn(
      'bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm',
      className
    )}>
      {children}
    </div>
  )
}

export function CardHeader({ className, children }) {
  return (
    <div className={cn('flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children }) {
  return (
    <h3 className={cn('text-sm font-semibold text-slate-900 dark:text-slate-100', className)}>
      {children}
    </h3>
  )
}

export function CardContent({ className, children }) {
  return (
    <div className={cn('p-5', className)}>
      {children}
    </div>
  )
}
