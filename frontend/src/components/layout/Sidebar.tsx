import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Compass, PlusCircle, FileText, BookOpen, ChevronLeft, ChevronRight, Cpu, TrendingUp } from 'lucide-react'
import { cn } from '../../lib/utils'
import { motion, useReducedMotion } from 'framer-motion'

interface SidebarProps {
  mobileOpen?: boolean
  onCloseMobile?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onCloseMobile }) => {
  const prefersReducedMotion = useReducedMotion()
  const easeOutCurve = [0, 0, 0.2, 1] as const
  const [isCollapsed, setIsCollapsed] = React.useState(false)

  React.useEffect(() => {
    if (window.innerWidth < 768) {
      setIsCollapsed(true)
    }
  }, [])

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Compass, label: 'My Journeys', path: '/journeys' },
    { icon: PlusCircle, label: 'New Journey', path: '/journeys/new' },
    { icon: FileText, label: 'Assignments', path: '/assignments' },
    { icon: TrendingUp, label: 'Upskill Assignment', path: '/upskill-assignment' },
    { icon: BookOpen, label: 'Learning Plan', path: '/learning-plan' },
    { icon: Cpu, label: 'Intelligence Agents', path: '/agents' },
  ]

  const navContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06, ease: easeOutCurve, duration: 0.3 }
    }
  }

  const navItem = {
    hidden: { opacity: 0, x: prefersReducedMotion ? 0 : -8 },
    show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: easeOutCurve } }
  }

  return (
    <aside
      className={cn(
        'bg-[#0B1220] text-white flex flex-col transition-all duration-300 ease-out relative z-30 h-screen md:h-auto md:min-h-screen',
        isCollapsed ? 'w-20' : 'w-64',
        'fixed md:relative left-0 top-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}
    >
      <div className="h-16 flex items-center px-6 mb-4">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="AssessMate logo"
              className="h-8 w-8 rounded-lg object-cover"
            />
            <h1 className="text-xl font-bold text-primary">AssessMate</h1>
          </div>
        )}
        {isCollapsed && (
          <img
            src="/logo.png"
            alt="AssessMate logo"
            className="h-8 w-8 rounded-lg object-cover mx-auto"
          />
        )}
      </div>

      <motion.nav className="flex-1 px-3 space-y-1" variants={navContainer} initial="hidden" animate="show">
        {navItems.map((item) => (
          <motion.div key={item.path} variants={navItem}>
            <NavLink
              to={item.path}
              title={isCollapsed ? item.label : undefined}
              onClick={() => {
                if (window.innerWidth < 768 && onCloseMobile) onCloseMobile()
              }}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group hover:translate-x-[3px]',
                  isActive
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-white/60 before:rounded-r'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                )
              }
            >
              <item.icon className={cn('h-5 w-5 shrink-0')} />
              {!isCollapsed && <span className="font-medium">{item.label}</span>}
            </NavLink>
          </motion.div>
        ))}
      </motion.nav>

      <div className="p-4 border-t border-white/5">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand' : 'Collapse'}
          className="flex items-center justify-center px-3 py-3 w-full rounded-xl text-gray-400 hover:text-white hover:bg-primary/10 transition-all"
        >
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
    </aside>
  )
}
