'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { useEffect, useState } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    async function verificarAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
      }
    }
    verificarAuth()
  }, [router, supabase])

  return (
    <div style={{ backgroundColor: '#2d2d2d', minHeight: '100vh' }}>
      {/* Navbar simples */}
      <nav style={{ backgroundColor: '#3c3c3c', borderBottom: '1px solid #4a4a4a', padding: '1rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ backgroundColor: '#e74c3c', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontWeight: 'bold' }}>SM</span>
            </div>
            <h1 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 'bold' }}>Service Dashboard</h1>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: '#cccccc' }}>{user?.email}</span>
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/login')
              }}
              style={{ backgroundColor: '#e74c3c', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}
            >
              Sair
            </button>
          </div>
        </div>
      </nav>

      {/* Conteúdo da página */}
      <main style={{ maxWidth: '1280px', margin: '2rem auto', padding: '0 1rem' }}>
        {children}
      </main>
    </div>
  )
}