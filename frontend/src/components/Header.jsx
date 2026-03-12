import { useLocation, useNavigate } from 'react-router-dom'
import { Sun, Moon, Plus } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { cn } from '../lib/utils'

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/contacts': 'Contacts',
  '/contacts/new': 'New Contact',
  '/campaigns': 'Campaigns',
  '/calls': 'Call Log',
  '/settings': 'Settings',
}

export default function Header() {
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  const isEdit = location.pathname.startsWith('/contacts/') && location.pathname !== '/contacts/new'
  const title = isEdit
    ? 'Edit Contact'
    : (PAGE_TITLES[location.pathname] || 'Outbound Dialer')

  const showNewContact = location.pathname === '/contacts'
  const showNewCampaign = location.pathname === '/campaigns'

  return (
    <header className={cn(
      'h-14 flex items-center justify-between px-6 flex-shrink-0',
      'bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm',
      'border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30'
    )}>
      <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h1>

      <div className="flex items-center gap-2">
        {showNewContact && (
          <button
            onClick={() => navigate('/contacts/new')}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Contact
          </button>
        )}
        {showNewCampaign && (
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('campaign:openCreate'))}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Campaign
          </button>
        )}

        <button
          onClick={toggleTheme}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  )
}
