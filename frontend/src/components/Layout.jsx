import { useState, createContext, useContext } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import DialerPanel from './DialerPanel'

export const SidebarCtx = createContext({ collapsed: false, toggle: () => {} })
export const useSidebar = () => useContext(SidebarCtx)

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <SidebarCtx.Provider value={{ collapsed, toggle: () => setCollapsed(c => !c) }}>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
        <Sidebar />
        <div
          className="flex flex-col flex-1 min-w-0 transition-all duration-200"
          style={{ marginLeft: collapsed ? 64 : 220 }}
        >
          <Header />
          <main className="flex-1 overflow-y-auto p-6 pb-28">
            <Outlet />
          </main>
        </div>
        <DialerPanel />
      </div>
    </SidebarCtx.Provider>
  )
}
