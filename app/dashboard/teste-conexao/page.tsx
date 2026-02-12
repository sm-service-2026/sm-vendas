'use client'

import { useTecnicos, useVendas } from '@/hooks/useVendas'

export default function TesteConexaoPage() {
  const { data: tecnicos, loading: loadingTecnicos } = useTecnicos()
  const { data: vendas, loading: loadingVendas } = useVendas(2026)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Teste de Conexão com Supabase</h1>
      
      <div className="grid grid-cols-2 gap-8">
        {/* Técnicos */}
        <div className="bg-black rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">👨‍🔧 Técnicos</h2>
          {loadingTecnicos ? (
            <p>Carregando...</p>
          ) : (
            <pre className="bg-black-50 p-4 rounded overflow-auto">
              {JSON.stringify(tecnicos, null, 2)}
            </pre>
          )}
        </div>

        {/* Vendas */}
        <div className="bg-black rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">💰 Vendas 2026</h2>
          {loadingVendas ? (
            <p>Carregando...</p>
          ) : (
            <pre className="bg-black-50 p-4 rounded overflow-auto max-h-96">
              {JSON.stringify(vendas.slice(0, 5), null, 2)}
              {vendas.length > 5 && <p className="mt-2 text-gray-600">... e mais {vendas.length - 5} registros</p>}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}