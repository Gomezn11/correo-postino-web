'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUser, clearAuth } from '@/lib/auth'
import Navbar from '@/components/Navbar'

export default function TiendaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  useEffect(() => {
    const user = getUser()
    if (!user) { router.push('/login'); return }
    if (user.role !== 'tienda') { clearAuth(); router.push('/login') }
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
