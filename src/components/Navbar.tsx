'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { getUser, clearAuth } from '@/lib/auth'
import ThemeToggle from '@/components/ThemeToggle'

interface NavLink { label: string; href: string }

const LINKS_TIENDA: NavLink[] = [
  { label: 'Dashboard', href: '/tienda/dashboard' },
  { label: 'Paquetes',  href: '/tienda/paquetes' },
  { label: 'Integrar',  href: '/tienda/integrar' },
]
const LINKS_ADMIN: NavLink[] = [
  { label: 'Dashboard',     href: '/admin/dashboard' },
  { label: 'Paquetes',      href: '/admin/paquetes' },
  { label: 'Choferes',      href: '/admin/choferes' },
  { label: 'Tiendas',       href: '/admin/tiendas' },
  { label: 'Repartos',      href: '/admin/repartos' },
  { label: 'Mapa',          href: '/admin/mapa' },
  { label: 'Tarifas',       href: '/admin/tarifas' },
  { label: 'Liquidaciones', href: '/admin/liquidaciones' },
  { label: 'Feedback',      href: '/admin/feedback' },
]

export default function Navbar() {
  const router = useRouter()
  const path = usePathname()
  const [user, setUser] = useState(() => getUser())
  const links = user?.role === 'admin' ? LINKS_ADMIN : LINKS_TIENDA

  useEffect(() => { setUser(getUser()) }, [])

  function logout() {
    clearAuth()
    router.push('/login')
  }

  return (
    <nav className="bg-brand text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          <span className="font-black text-lg tracking-tight">📦 Correo Postino</span>
          <div className="hidden sm:flex gap-1">
            {links.map(l => (
              <Link key={l.href} href={l.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  path.startsWith(l.href) ? 'bg-white/20' : 'hover:bg-white/10'
                }`}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm opacity-80 hidden sm:block">{user?.nombre}</span>
          <ThemeToggle />
          <button onClick={logout} className="text-sm bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition-colors">
            Salir
          </button>
        </div>
      </div>
    </nav>
  )
}
