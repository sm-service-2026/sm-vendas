'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { useGraficoVendasAnual } from '@/hooks/useGraficos'

interface GraficoVendasAnualProps {
  ano: number
}

export default function GraficoVendasAnual({ ano }: GraficoVendasAnualProps) {
  const [tipo, setTipo] = useState<'linha' | 'barra'>('linha')
  const { dados, loading } = useGraficoVendasAnual(ano)

  const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b']

  const formatMoeda = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">{entry.name}:</span>
              <span className="font-medium text-gray-900">
                {formatMoeda(entry.value)}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="text-gray-500">Carregando gráfico...</div>
      </div>
    )
  }

  const totalPrevisto = dados.reduce((acc, d) => acc + d.previsto, 0)
  const totalRealizado = dados.reduce((acc, d) => acc + d.realizado, 0)
  const percentualAnual = totalPrevisto > 0 ? (totalRealizado / totalPrevisto) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Cabeçalho com totais */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Evolução Anual - {ano}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Total realizado: {formatMoeda(totalRealizado)} • 
            Meta: {formatMoeda(totalPrevisto)} • 
            <span className="ml-1 font-medium text-green-600">
              {percentualAnual.toFixed(1)}% atingido
            </span>
          </p>
        </div>
        
        {/* Seletor de tipo de gráfico */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setTipo('linha')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tipo === 'linha'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📈 Linha
          </button>
          <button
            onClick={() => setTipo('barra')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tipo === 'barra'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📊 Barra
          </button>
        </div>
      </div>

      {/* Gráfico Principal */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {tipo === 'linha' ? (
            <LineChart data={dados}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="mes" 
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#d1d5db' }}
              />
              <YAxis 
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#d1d5db' }}
                tickFormatter={(value) => `R$ ${(value / 1000)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="previsto"
                name="Previsto"
                stroke="#9ca3af"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="realizado"
                name="Realizado"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          ) : (
            <BarChart data={dados}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="mes" 
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#d1d5db' }}
              />
              <YAxis 
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#d1d5db' }}
                tickFormatter={(value) => `R$ ${(value / 1000)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="previsto" name="Previsto" fill="#9ca3af" radius={[4, 4, 0, 0]} />
              <Bar dataKey="realizado" name="Realizado" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Gráficos de Composição */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Composição por Tipo */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-4">
            Composição das Vendas - {ano}
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Serviços', value: dados.reduce((acc, d) => acc + d.servicos, 0) },
                    { name: 'Tecnologia', value: dados.reduce((acc, d) => acc + d.tecnologia, 0) }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {[0, 1].map((index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => formatMoeda(value)}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Meses */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-4">
            Melhores Meses em Vendas
          </h4>
          <div className="space-y-3">
            {dados
              .sort((a, b) => b.realizado - a.realizado)
              .slice(0, 3)
              .map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white
                    ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-400'}`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900">{item.mes}</span>
                      <span className="text-sm font-semibold text-green-600">
                        {formatMoeda(item.realizado)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div 
                        className="bg-blue-600 rounded-full h-1.5"
                        style={{ 
                          width: `${(item.realizado / dados[0]?.realizado) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}