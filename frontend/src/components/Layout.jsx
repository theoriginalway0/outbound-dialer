import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import DialerPanel from './DialerPanel'

export default function Layout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
      <DialerPanel />
    </div>
  )
}
