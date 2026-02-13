'use client'

import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { useGraficoTecnicos } from '@/hooks/useGraficos'

interface GraficoDesempenhoTecnicosProps {
  ano: number
  mes?: number
}

export default function GraficoDesempenhoTecnicos({ ano, mes }: GraficoDesempenhoTecnicosProps) {
  const [tipo, setTipo] = useState<'valor' | 'percentual'>('valor')
  const { dados, loading } = useGraficoTecnicos(ano, mes)

  const formatMoeda = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
  }

  const getCorDesempenho = (percentual: number) => {
    if (percentual >= 100) return '#10b981' // Verde
    if (percentual >= 70) return '#f59e0b'  // Amarelo
    return '#ef4444' // Vermelho
  }

  if (loading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="text-gray-500">Carregando desempenho...</div>
      </div>
    )
  }

  if (dados.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="text-gray-500 text-center">
          Nenhum dado encontrado para {mes ? `o mês ${mes}` : `o ano ${ano}`}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Desempenho dos Técnicos
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {mes ? `Mês ${mes}/${ano}` : `Acumulado ${ano}`}
          </p>
        </div>
        
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setTipo('valor')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tipo === 'valor'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            💰 Valores
          </button>
          <button
            onClick={() => setTipo('percentual')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tipo === 'percentual'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📊 Percentual
          </button>
        </div>
      </div>

      {/* Gráfico */}
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={dados}
            layout="vertical"
            margin={{ left: 100, right: 20, top: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
            <XAxis 
              type="number"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              axisLine={{ stroke: '#d1d5db' }}
              tickFormatter={(value) => 
                tipo === 'valor' 
                  ? `R$ ${(value / 1000)}k` 
                  : `${value}%`
              }
            />
            <YAxis 
              type="category"
              dataKey="tecnico"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              axisLine={{ stroke: '#d1d5db' }}
              width={100}
            />
            <Tooltip
              formatter={(value: any, name?: string) => {
                if (name === 'percentual') return [`${value.toFixed(1)}%`, 'Atingimento']
                if (name === 'meta') return [formatMoeda(value), 'Meta']
                if (name === 'realizado') return [formatMoeda(value), 'Realizado']
                return [value, name]
              }}
            />
            <Legend />
            {tipo === 'valor' ? (
              <>
                <Bar 
                  dataKey="meta" 
                  name="Meta" 
                  fill="#9ca3af"
                  radius={[0, 4, 4, 0]}
                />
                <Bar 
                  dataKey="realizado" 
                  name="Realizado" 
                  radius={[0, 4, 4, 0]}
                >
                  {dados.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getCorDesempenho(entry.percentual)}
                    />
                  ))}
                </Bar>
              </>
            ) : (
              <Bar 
                dataKey="percentual" 
                name="% Atingimento" 
                radius={[0, 4, 4, 0]}
              >
                {dados.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getCorDesempenho(entry.percentual)}
                  />
                ))}
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {dados.map((tecnico, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-900">{tecnico.tecnico}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Meta: {formatMoeda(tecnico.meta)}
                </p>
                <p className="text-xs text-gray-500">
                  Realizado: {formatMoeda(tecnico.realizado)}
                </p>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                tecnico.percentual >= 100 
                  ? 'bg-green-100 text-green-800'
                  : tecnico.percentual >= 70
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {tecnico.percentual.toFixed(1)}%
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-3">
              <div 
                className={`rounded-full h-1.5 ${
                  tecnico.percentual >= 100 
                    ? 'bg-green-500'
                    : tecnico.percentual >= 70
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(tecnico.percentual, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}