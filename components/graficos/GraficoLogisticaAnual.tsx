'use client'

import { useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area
} from 'recharts'
import { useGraficoLogisticaAnual } from '@/hooks/useGraficos'

interface GraficoLogisticaAnualProps {
  ano: number
}

export default function GraficoLogisticaAnual({ ano }: GraficoLogisticaAnualProps) {
  const [tipo, setTipo] = useState<'gastos' | 'km'>('gastos')
  const { dados, loading } = useGraficoLogisticaAnual(ano)

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
                {entry.dataKey === 'km' 
                  ? `${entry.value.toLocaleString('pt-BR')} km`
                  : formatMoeda(entry.value)
                }
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

  const totalDiesel = dados.reduce((acc, d) => acc + d.diesel, 0)
  const totalManutencao = dados.reduce((acc, d) => acc + d.manutencao, 0)
  const totalKM = dados.reduce((acc, d) => acc + d.km, 0)
  const custoPorKM = totalKM > 0 ? (totalDiesel + totalManutencao) / totalKM : 0

  return (
    <div className="space-y-6">
      {/* Cabeçalho com totais */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          Análise Logística - {ano}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-yellow-50 rounded-lg p-3">
            <p className="text-xs text-yellow-700">Total Diesel</p>
            <p className="text-lg font-bold text-yellow-800">
              {formatMoeda(totalDiesel)}
            </p>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-xs text-red-700">Total Manutenção</p>
            <p className="text-lg font-bold text-red-800">
              {formatMoeda(totalManutencao)}
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-700">KM Total</p>
            <p className="text-lg font-bold text-blue-800">
              {totalKM.toLocaleString('pt-BR')} km
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <p className="text-xs text-purple-700">Custo por KM</p>
            <p className="text-lg font-bold text-purple-800">
              {formatMoeda(custoPorKM)}/km
            </p>
          </div>
        </div>
      </div>

      {/* Seletor de visualização */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTipo('gastos')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tipo === 'gastos'
              ? 'bg-white text-gray-900 shadow'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          💰 Gastos Mensais
        </button>
        <button
          onClick={() => setTipo('km')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tipo === 'km'
              ? 'bg-white text-gray-900 shadow'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📏 Quilometragem
        </button>
      </div>

      {/* Gráfico */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {tipo === 'gastos' ? (
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
              <Bar dataKey="diesel" name="Diesel" fill="#eab308" radius={[4, 4, 0, 0]} />
              <Bar dataKey="manutencao" name="Manutenção" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <ComposedChart data={dados}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="mes" 
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#d1d5db' }}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#d1d5db' }}
                tickFormatter={(value) => `${(value / 1000)}k km`}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#d1d5db' }}
                tickFormatter={(value) => `R$ ${(value / 1000)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                yAxisId="left"
                dataKey="km" 
                name="KM Rodados" 
                fill="#3b82f6" 
                radius={[4, 4, 0, 0]} 
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="diesel"
                name="Custo Diesel"
                stroke="#eab308"
                strokeWidth={2}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="manutencao"
                name="Custo Manutenção"
                stroke="#ef4444"
                strokeWidth={2}
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Insights Rápidos */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          💡 Insights da Frota
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-2">
            <span className="text-green-500 text-xl">📊</span>
            <div>
              <p className="text-xs text-gray-500">Média Mensal Diesel</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatMoeda(totalDiesel / 12)}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-500 text-xl">📈</span>
            <div>
              <p className="text-xs text-gray-500">Média Mensal KM</p>
              <p className="text-sm font-semibold text-gray-900">
                {(totalKM / 12).toLocaleString('pt-BR')} km
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-purple-500 text-xl">⚡</span>
            <div>
              <p className="text-xs text-gray-500">Mês mais caro</p>
              <p className="text-sm font-semibold text-gray-900">
                {dados.sort((a, b) => (b.diesel + b.manutencao) - (a.diesel + a.manutencao))[0]?.mes}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}