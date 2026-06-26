'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { getUser, clearAuth } from '@/lib/auth'
import ThemeToggle from '@/components/ThemeToggle'

interface NavLink { label: string; href: string; icon: string }

const LINKS_TIENDA: NavLink[] = [
  { label: 'Paquetes',    href: '/tienda/paquetes',      icon: '📦' },
  { label: 'Ventas',      href: '/tienda/ventas',        icon: '🛒' },
  { label: 'Liquidación', href: '/tienda/liquidaciones', icon: '💰' },
  { label: 'Integrar',    href: '/tienda/integrar',      icon: '🔗' },
]
const LINKS_ADMIN: NavLink[] = [
  { label: 'Dashboard',     href: '/admin/dashboard',     icon: '🏠' },
  { label: 'Paquetes',      href: '/admin/paquetes',      icon: '📦' },
  { label: 'Choferes',      href: '/admin/choferes',      icon: '🚚' },
  { label: 'Tiendas',       href: '/admin/tiendas',       icon: '🏪' },
  { label: 'Repartos',      href: '/admin/repartos',      icon: '🗂️' },
  { label: 'Mapa',          href: '/admin/mapa',          icon: '🗺️' },
  { label: 'Tarifas',       href: '/admin/tarifas',       icon: '🏷️' },
  { label: 'Liquidaciones', href: '/admin/liquidaciones', icon: '💰' },
  { label: 'Feedback',      href: '/admin/feedback',      icon: '⭐' },
]

export default function Navbar() {
  const router = useRouter()
  const path = usePathname()
  const [user, setUser] = useState(() => getUser())
  const [menuOpen, setMenuOpen] = useState(false)
  const links = user?.role === 'admin' ? LINKS_ADMIN : LINKS_TIENDA

  useEffect(() => { setUser(getUser()) }, [])

  // Cerrar menu al cambiar de ruta
  useEffect(() => { setMenuOpen(false) }, [path])

  function logout() {
    clearAuth()
    router.push('/login')
  }

  return (
    <>
      <nav className="bg-brand text-white shadow-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          {/* Logo */}
          <span className="font-black text-lg tracking-tight">📦 Correo Postino</span>

          {/* Links desktop */}
          <div className="hidden md:flex gap-1 flex-1 ml-6">
            {links.map(l => (
              <Link key={l.href} href={l.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  path.startsWith(l.href) ? 'bg-white/20' : 'hover:bg-white/10'
                }`}>
                {l.label}
              </Link>
            ))}
          </div>

          {/* Derecha */}
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-80 hidden md:block">{user?.nombre}</span>
            <ThemeToggle />
            <button onClick={logout}
              className="hidden md:block text-sm bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition-colors">
              Salir
            </button>
            {/* Hamburger mobile */}
            <button onClick={() => setMenuOpen(v => !v)}
              className="md:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-white/10 transition-colors">
              <span className={`block w-5 h-0.5 bg-white transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block w-5 h-0.5 bg-white transition-all ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-0.5 bg-white transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>
        </div>
      </nav>

      {/* Drawer mobile */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-30" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute top-14 left-0 right-0 bg-white dark:bg-gray-900 shadow-xl border-b dark:border-gray-800"
            onClick={e => e.stopPropagation()}
          >
            <div className="py-2">
              {links.map(l => (
                <Link key={l.href} href={l.href}
                  className={`flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-colors ${
                    path.startsWith(l.href)
                      ? 'bg-brand/10 text-brand'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}>
                  <span className="text-xl">{l.icon}</span>
                  {l.label}
                </Link>
              ))}
              <div className="border-t dark:border-gray-800 mt-2 pt-2 px-5 pb-3 flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">{user?.nombre}</span>
                <button onClick={logout}
                  className="text-sm text-red-600 font-medium hover:underline">
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
