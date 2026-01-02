'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/user-avatar'
import { cn } from '@/lib/utils'
import {
  BookOpen,
  Home,
  Library,
  Users,
  Search,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import type { Profile } from '@/lib/types'

const navItems = [
  { href: '/', label: 'Feed', icon: Home },
  { href: '/shelf', label: 'Minha Estante', icon: Library },
  { href: '/clubs', label: 'Meus Clubes', icon: Users },
  { href: '/search', label: 'Buscar', icon: Search },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('leitura_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) setProfile(data)
    }

    fetchProfile()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 md:hidden z-40">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg">Leitura</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 top-14 bg-white dark:bg-zinc-900 z-30 md:hidden p-4">
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800',
                    pathname === item.href && 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-500'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
          <div className="absolute bottom-4 left-4 right-4">
            <Button variant="outline" className="w-full" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold text-xl">Leitura</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors',
                  pathname === item.href && 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-500 font-medium'
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {profile && (
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
            <Link
              href={`/profile/${profile.username}`}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <UserAvatar
                src={profile.avatar_url}
                name={profile.display_name || profile.username}
                className="h-10 w-10"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {profile.display_name || profile.username}
                </p>
                <p className="text-xs text-zinc-500 truncate">@{profile.username}</p>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-zinc-500"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        )}
      </aside>

      {/* Mobile padding */}
      <div className="h-14 md:hidden" />
    </>
  )
}
