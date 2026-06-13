'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'

export default function TiendaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  useEffect(() => {
    const user = getUser()
    if (!user) { router.push('/login?rol=tienda'); return }
    if (!['tienda', 'admin'].includes(user.role)) router.push('/login?rol=tienda')
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
