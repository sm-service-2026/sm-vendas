'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Cores do tema
  const theme = {
    background: '#2d2d2d',
    card: '#3c3c3c',
    primary: '#e74c3c',
    primaryDark: '#c0392b',
    text: '#ffffff',
    textSecondary: '#cccccc',
    textMuted: '#999999',
    border: '#4a4a4a',
    success: '#27ae60',
    warning: '#f39c12',
    danger: '#e74c3c'
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Login realizado com sucesso!')
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.background }}>
      {/* Card de Login */}
      <div className="max-w-md w-full space-y-8 p-8 rounded-xl shadow-lg" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
        {/* Logo e Título */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-lg flex items-center justify-center shadow-md" style={{ backgroundColor: theme.primary }}>
              <span className="text-white text-2xl font-bold">SM</span>
            </div>
          </div>
          <h2 className="text-3xl font-bold" style={{ color: theme.text }}>
            SM Service
          </h2>
          <p className="mt-2" style={{ color: theme.textSecondary }}>
            Dashboard de Vendas e Logística
          </p>
        </div>

        {/* Formulário */}
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="text-sm font-medium" style={{ color: theme.textSecondary }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none"
                style={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  borderColor: theme.border,
                  color: theme.text
                }}
                placeholder="seu@email.com"
              />
            </div>

            {/* Senha */}
            <div>
              <label htmlFor="password" className="text-sm font-medium" style={{ color: theme.textSecondary }}>
                Senha
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none"
                style={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  borderColor: theme.border,
                  color: theme.text
                }}
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Botão de Login */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 shadow-md hover:shadow-lg"
            style={{ backgroundColor: theme.primary, color: 'white' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.primaryDark}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.primary}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {/* Linha decorativa inferior */}
        <div className="pt-4 mt-4 border-t text-center text-xs" style={{ borderColor: theme.border, color: theme.textMuted }}>
          SM Service © 2026 • Uso interno
        </div>
      </div>
    </div>
  )
}