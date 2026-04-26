import React from 'react'
import * as Avatar from '@radix-ui/react-avatar'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { LogOut, User as UserIcon, Settings, ChevronDown } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export const Navbar: React.FC = () => {
  const { user, signOut } = useAuth()

  return (
    <header className="h-16 border-b border-gray-100 bg-white flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold text-primary">AssessMate</h2>
      </div>

      <div className="flex items-center gap-4">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 hover:bg-gray-50 p-1.5 rounded-lg transition-colors outline-none">
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
              <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-gray-50 rounded-lg cursor-pointer outline-none">
                <UserIcon className="h-4 w-4" />
                Profile
              </DropdownMenu.Item>
              <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-gray-50 rounded-lg cursor-pointer outline-none">
                <Settings className="h-4 w-4" />
                Settings
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="h-px bg-gray-100 my-1" />
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
    </header>
  )
}
