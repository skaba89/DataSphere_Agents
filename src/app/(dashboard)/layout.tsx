'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  LayoutDashboard,
  Monitor,
  MessageSquare,
  FolderKanban,
  Settings,
  LogOut,
  Bell,
  Menu,
  Building2,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  HelpCircle,
  Settings2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

const COLLAPSED_KEY = 'sidebar-collapsed'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Agents', href: '/agents', icon: Monitor },
  { name: 'Conversations', href: '/conversations', icon: MessageSquare },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Settings', href: '/settings', icon: Settings },
]

const organizations = [
  { id: '1', name: 'DataSphere Inc.', plan: 'Pro' },
  { id: '2', name: 'Acme Corp.', plan: 'Team' },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [currentOrg, setCurrentOrg] = useState(organizations[0])
  const [userName, setUserName] = useState('User')
  const [userEmail, setUserEmail] = useState('user@example.com')
  const hasLoadedRef = useRef(false)

  // Load collapsed state from localStorage (wrapped in async to satisfy lint)
  useEffect(() => {
    const initCollapsed = async () => {
      try {
        const stored = localStorage.getItem(COLLAPSED_KEY)
        if (stored !== null) {
          setCollapsed(stored === 'true')
        }
      } catch {}
      hasLoadedRef.current = true
    }
    initCollapsed()
  }, [])

  // Persist collapsed state
  useEffect(() => {
    if (!hasLoadedRef.current) return
    try {
      localStorage.setItem(COLLAPSED_KEY, String(collapsed))
    } catch {}
  }, [collapsed])

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/users/me', { credentials: 'include' })
        const data = await res.json()
        if (data.success && data.data) {
          setUserName(data.data.name || 'User')
          setUserEmail(data.data.email || '')
          localStorage.setItem('user', JSON.stringify({ name: data.data.name, email: data.data.email }))
        }
      } catch {
        try {
          const stored = localStorage.getItem('user')
          if (stored) {
            const user = JSON.parse(stored)
            setUserName(user.name || 'User')
            setUserEmail(user.email || '')
          }
        } catch {}
      }
    }
    fetchUser()
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {}
    localStorage.removeItem('user')
    router.push('/login')
  }

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => !prev)
  }, [])

  const isNavActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/'
    return pathname === href || pathname.startsWith(href)
  }

  const sidebarWidth = collapsed ? 'w-20' : 'w-64'

  return (
    <div className="min-h-screen flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 ${sidebarWidth} bg-card border-r border-border flex flex-col transform transition-all duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo section */}
        <div className={`flex items-center h-16 border-b border-border shrink-0 ${collapsed ? 'px-4 justify-center' : 'px-6'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <Image
              src="/logo.svg"
              alt="DataSphere Agents"
              width={32}
              height={32}
              className="shrink-0"
              priority
            />
            {!collapsed && (
              <span className="font-bold text-base tracking-tight whitespace-nowrap overflow-hidden">
                DataSphere Agents
              </span>
            )}
          </div>
        </div>

        {/* Organization switcher */}
        <div className={`shrink-0 ${collapsed ? 'px-3 py-3' : 'px-4 py-3'}`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`flex items-center w-full rounded-lg border border-border hover:bg-muted/50 transition-colors duration-200 ${collapsed ? 'p-2 justify-center' : 'p-2.5 gap-2.5'}`}
                title={collapsed ? currentOrg.name : undefined}
              >
                <Building2 className="w-4 h-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                {!collapsed && (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate">{currentOrg.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{currentOrg.plan}</p>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" strokeWidth={2} />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" className="w-56">
              <DropdownMenuLabel>Organizations</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => setCurrentOrg(org)}
                  className={org.id === currentOrg.id ? 'bg-accent' : ''}
                >
                  <Building2 className="w-4 h-4 mr-2" strokeWidth={1.5} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{org.name}</p>
                    <p className="text-xs text-muted-foreground">{org.plan}</p>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Separator />

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-3">
          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = isNavActive(item.href)

              const navLink = (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  title={collapsed ? item.name : undefined}
                  className={`group relative flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-2.5'
                  } ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  }`}
                >
                  {/* Active left border indicator */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary transition-all duration-200" />
                  )}
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-colors duration-200 ${
                      isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                    }`}
                    strokeWidth={isActive ? 2.2 : 1.5}
                    fill={isActive ? 'currentColor' : 'none'}
                  />
                  {!collapsed && (
                    <span className="truncate">{item.name}</span>
                  )}
                </Link>
              )

              if (collapsed) {
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {item.name}
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return navLink
            })}
          </nav>
        </ScrollArea>

        <Separator />

        {/* Help & Support */}
        <div className={`shrink-0 ${collapsed ? 'px-3 py-2' : 'px-4 py-2'}`}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/settings"
                  className="flex items-center justify-center py-2 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors duration-200"
                  title="Help & Support"
                >
                  <HelpCircle className="w-5 h-5" strokeWidth={1.5} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Help & Support
              </TooltipContent>
            </Tooltip>
          ) : (
            <Link
              href="/settings"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors duration-200"
            >
              <HelpCircle className="w-5 h-5 shrink-0" strokeWidth={1.5} />
              <span>Help & Support</span>
            </Link>
          )}
        </div>

        {/* User profile section */}
        <div className={`shrink-0 border-t border-border ${collapsed ? 'p-3' : 'p-4'}`}>
          <div className={`flex items-center ${collapsed ? 'justify-center flex-col gap-2' : 'gap-3'}`}>
            {/* Avatar with online indicator */}
            <div className="relative shrink-0">
              <div className={`bg-primary/10 rounded-full flex items-center justify-center ${collapsed ? 'w-9 h-9' : 'w-10 h-10'}`}>
                <span className={`font-bold text-primary ${collapsed ? 'text-sm' : 'text-base'}`}>
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
              {/* Online status dot */}
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-card rounded-full" />
            </div>

            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{userName}</p>
                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              </div>
            )}

            {!collapsed && (
              <div className="flex items-center gap-0.5 shrink-0">
                <Link
                  href="/settings"
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors duration-200"
                  title="Settings"
                >
                  <Settings2 className="w-4 h-4" strokeWidth={1.5} />
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            )}

            {collapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  Sign out
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Collapse toggle - desktop only */}
        <button
          onClick={toggleCollapse}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 items-center justify-center rounded-full border border-border bg-card shadow-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors duration-200 z-10"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronsRight className="w-3.5 h-3.5" strokeWidth={2} />
          ) : (
            <ChevronsLeft className="w-3.5 h-3.5" strokeWidth={2} />
          )}
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 lg:px-8 gap-4 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors duration-200"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <Link href="/settings" className="relative p-2 rounded-lg hover:bg-muted transition-colors duration-200">
              <Bell className="w-5 h-5" strokeWidth={1.5} />
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
