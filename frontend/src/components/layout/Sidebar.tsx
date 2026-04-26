import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Compass, Settings, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'

export const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = React.useState(false)

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Compass, label: 'Journeys', path: '/journeys' },
    { icon: Settings, label: 'Settings', path: '/settings' },
    { icon: HelpCircle, label: 'Help', path: '/help' },
  ]

  return (
    <aside
      className={cn(
        'bg-[#0B1220] text-white flex flex-col transition-all duration-300 relative z-20',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="h-16 flex items-center px-6 mb-4">
        {!isCollapsed && <h1 className="text-xl font-bold text-primary">AssessMate</h1>}
        {isCollapsed && <div className="h-8 w-8 bg-primary rounded-lg mx-auto" />}
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-3 rounded-xl transition-all group',
                isActive
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )
            }
          >
            <item.icon className={cn('h-5 w-5 shrink-0')} />
            {!isCollapsed && <span className="font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-3 px-3 py-3 w-full rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
        >
          {isCollapsed ? <ChevronRight className="h-5 w-5 mx-auto" /> : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span className="font-medium text-sm">Collapse Sidebar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
