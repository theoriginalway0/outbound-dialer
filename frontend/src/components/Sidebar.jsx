import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Layers, Activity, Settings, Phone, ChevronLeft, ChevronRight
} from 'lucide-react'
import { useSidebar } from './Layout'
import { cn } from '../lib/utils'

const NAV_ITEMS = [
  { to: '/', end: true, icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/campaigns', icon: Layers, label: 'Campaigns' },
  { to: '/calls', icon: Activity, label: 'Call Log' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const { collapsed, toggle } = useSidebar()

  return (
    <aside
      className={[
        'fixed top-0 left-0 h-full z-40 flex flex-col',
        'bg-slate-900 border-r border-slate-800',
        'transition-all duration-200',
        collapsed ? 'w-16' : 'w-[220px]'
      ].join(' ')}
    >
      <div className={['flex items-center h-14 px-4 border-b border-slate-800', collapsed ? 'justify-center' : 'gap-3'].join(' ')}>
        <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Phone className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-white text-sm tracking-wide">Outbound Dialer</span>
        )}
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, end, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) => [
              'flex items-center h-9 px-2.5 rounded-lg text-sm font-medium transition-colors',
              collapsed ? 'justify-center' : 'gap-3',
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            ].join(' ')}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-2 border-t border-slate-800">
        <button
          onClick={toggle}
          className={[
            'flex items-center h-9 w-full rounded-lg px-2.5',
            'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
            'transition-colors text-sm',
            collapsed ? 'justify-center' : 'gap-3'
          ].join(' ')}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
