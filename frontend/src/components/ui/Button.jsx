import { cn } from '../../lib/utils'

const variants = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white border-transparent shadow-sm',
  success: 'bg-green-600 hover:bg-green-700 text-white border-transparent shadow-sm',
  danger: 'bg-red-600 hover:bg-red-700 text-white border-transparent shadow-sm',
  outline: 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600',
  ghost: 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent',
}

const sizes = {
  sm: 'h-7 px-2.5 text-xs rounded-md gap-1.5',
  md: 'h-9 px-3.5 text-sm rounded-lg gap-2',
  lg: 'h-11 px-5 text-base rounded-lg gap-2',
  icon: 'h-8 w-8 rounded-lg p-0 justify-center',
}

export function Button({ variant = 'outline', size = 'md', className, children, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
