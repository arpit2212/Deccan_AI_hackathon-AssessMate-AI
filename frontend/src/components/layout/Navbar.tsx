import React from 'react'
import * as Avatar from '@radix-ui/react-avatar'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { LogOut, ChevronDown, Menu } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { motion, useReducedMotion } from 'framer-motion'

interface NavbarProps {
  onOpenMobileSidebar?: () => void
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMobileSidebar }) => {
  const { user, signOut } = useAuth()
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.header
      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
      className="h-16 border-b border-primary/10 bg-white flex items-center justify-between px-4 sm:px-8 sticky top-0 z-20"
    >
      <button
        onClick={onOpenMobileSidebar}
        className="md:hidden h-10 w-10 rounded-lg border border-gray-200 flex items-center justify-center text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-4 ml-auto">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 hover:bg-primary/10 p-1.5 rounded-lg transition-colors duration-200 outline-none">
              <Avatar.Root className="h-8 w-8 rounded-full overflow-hidden bg-primary-light flex items-center justify-center">
                <Avatar.Image src={user?.avatar_url} alt={user?.full_name} className="h-full w-full object-cover" />
                <Avatar.Fallback className="text-primary font-bold text-sm">
                  {user?.full_name?.charAt(0) || user?.email.charAt(0).toUpperCase()}
                </Avatar.Fallback>
              </Avatar.Root>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-semibold text-text-primary leading-none">{user?.full_name || 'User'}</p>
                <p className="text-xs text-text-secondary">{user?.email}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-text-secondary" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-[200px] bg-white rounded-xl shadow-lg p-1.5 border border-gray-100 animate-in fade-in slide-in-from-top-2 z-50"
              sideOffset={5}
            >
              <DropdownMenu.Item
                onClick={signOut}
                className="flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-red-50 rounded-lg cursor-pointer outline-none"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </motion.header>
  )
}
