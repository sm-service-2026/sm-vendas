'use client'

import { useState } from 'react'
import { MetaTecnico, useMetasTecnicos } from '@/hooks/useVendas'
import toast from 'react-hot-toast'

interface TabelaMetasTecnicosProps {
  ano: number
}

export default function TabelaMetasTecnicos({ ano }: TabelaMetasTecnicosProps) {
  const { metas, loading, atualizarMeta, atualizarRealizado } = useMetasTecnicos(ano)
  const [editandoMeta, setEditandoMeta] = useState<{ tecnico_id: string, mes: number } | null>(null)
  const [editandoRealizado, setEditandoRealizado] = useState<{ tecnico_id: string, mes: number } | null>(null)
  const [valorEdit, setValorEdit] = useState('')

  const meses = [
    'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
    'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'
  ]

  // Agrupar metas por técnico
  const tecnicosMetas = metas.reduce((acc, meta) => {
    if (!acc[meta.tecnico_nome || '']) {
      acc[meta.tecnico_nome || ''] = {
        id: meta.tecnico_id,
        nome: meta.tecnico_nome || 'Técnico',
        // CORREÇÃO: Não temos base_meta no MetaTecnico, então removemos
        metas: []
      }
    }
    acc[meta.tecnico_nome || ''].metas[meta.mes - 1] = meta
    return acc
  }, {} as Record<string, any>)

  function handleEditMeta(tecnico_id: string, mes: number, valorAtual: number) {
    setEditandoMeta({ tecnico_id, mes })
    setValorEdit(valorAtual.toString())
  }

  function handleEditRealizado(tecnico_id: string, mes: number, valorAtual: number) {
    setEditandoRealizado({ tecnico_id, mes })
    setValorEdit(valorAtual.toString())
  }

  async function salvarMeta() {
    if (!editandoMeta) return
    const valor = parseFloat(valorEdit.replace(',', '.'))
    if (isNaN(valor) || valor < 0) {
      toast.error('Digite um valor válido')
      return
    }
    await atualizarMeta(editandoMeta.tecnico_id, editandoMeta.mes, valor)
    setEditandoMeta(null)
  }

  async function salvarRealizado() {
    if (!editandoRealizado) return
    const valor = parseFloat(valorEdit.replace(',', '.'))
    if (isNaN(valor) || valor < 0) {
      toast.error('Digite um valor válido')
      return
    }
    await atualizarRealizado(editandoRealizado.tecnico_id, editandoRealizado.mes, valor)
    setEditandoRealizado(null)
  }

  const formatMoeda = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Carregando metas...</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-800">
        <thead className="bg-gray-900/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-900/50">
              TÉCNICO
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              BASE
            </th>
            {meses.map((mes, idx) => (
              <th key={idx} className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                {mes}
                {idx + 1 === 7 && <span className="ml-1 text-yellow-500">⛱️</span>}
                {idx + 1 === 6 && <span className="ml-1 text-yellow-500">⛱️</span>}
              </th>
            ))}
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
              TOTAL
            </th>
          </tr>
        </thead>
        <tbody className="bg-gray-900/20 divide-y divide-gray-800">
          {Object.values(tecnicosMetas).map((tecnico: any) => {
            const totalMeta = tecnico.metas.reduce((sum: number, m: any) => sum + (m?.valor_meta || 0), 0)
            const totalRealizado = tecnico.metas.reduce((sum: number, m: any) => sum + (m?.valor_realizado || 0), 0)
            const percentual = totalMeta > 0 ? (totalRealizado / totalMeta) * 100 : 0

            return (
              <tr key={tecnico.id} className="hover:bg-white/5">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white sticky left-0 bg-gray-900 hover:bg-white/5">
                  {tecnico.nome}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                  {/* CORREÇÃO: Como não temos base_meta, mostramos um placeholder */}
                  R$ 0
                </td>
                {meses.map((_, idx) => {
                  const mes = idx + 1
                  const meta = tecnico.metas[idx]
                  const temFerias = (tecnico.nome === 'ANDRÉ LUCAS' && mes === 7) || 
                                  (tecnico.nome === 'MARCOS MARTINS' && mes === 6)

                  return (
                    <td key={idx} className="px-4 py-3 text-sm border-l border-gray-800">
                      {temFerias ? (
                        <div className="text-center text-yellow-500 font-medium">
                          FÉRIAS
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {/* Meta */}
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs text-gray-500">Meta:</span>
                            {editandoMeta?.tecnico_id === tecnico.id && editandoMeta?.mes === mes ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={valorEdit}
                                  onChange={(e) => setValorEdit(e.target.value)}
                                  className="w-20 px-1 py-0.5 text-xs bg-gray-800 border border-gray-700 rounded text-white"
                                  placeholder="0,00"
                                />
                                <button
                                  onClick={salvarMeta}
                                  className="text-green-500 hover:text-green-400"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => setEditandoMeta(null)}
                                  className="text-red-500 hover:text-red-400"
                                >
                                  ✗
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-medium text-white">
                                  {meta ? formatMoeda(meta.valor_meta) : 'R$ 0,00'}
                                </span>
                                <button
                                  onClick={() => handleEditMeta(tecnico.id, mes, meta?.valor_meta || 0)}
                                  className="text-gray-500 hover:text-gray-400"
                                >
                                  ✏️
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Realizado */}
                          <div className="flex items-center justify-between gap-1 border-t border-gray-800 pt-1">
                            <span className="text-xs text-gray-500">Real:</span>
                            {editandoRealizado?.tecnico_id === tecnico.id && editandoRealizado?.mes === mes ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={valorEdit}
                                  onChange={(e) => setValorEdit(e.target.value)}
                                  className="w-20 px-1 py-0.5 text-xs bg-gray-800 border border-gray-700 rounded text-white"
                                  placeholder="0,00"
                                />
                                <button
                                  onClick={salvarRealizado}
                                  className="text-green-500 hover:text-green-400"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => setEditandoRealizado(null)}
                                  className="text-red-500 hover:text-red-400"
                                >
                                  ✗
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span className={`text-sm font-medium ${
                                  meta?.valor_realizado > 0 ? 'text-green-500' : 'text-gray-500'
                                }`}>
                                  {meta ? formatMoeda(meta.valor_realizado) : 'R$ 0,00'}
                                </span>
                                <button
                                  onClick={() => handleEditRealizado(tecnico.id, mes, meta?.valor_realizado || 0)}
                                  className="text-gray-500 hover:text-gray-400"
                                >
                                  ✏️
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  )
                })}
                <td className="px-4 py-3 whitespace-nowrap text-sm border-l border-gray-800">
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500">
                      Meta: <span className="font-medium text-white">R$ {totalMeta.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Real: <span className="font-medium text-green-500">R$ {totalRealizado.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="text-xs font-medium text-white">
                      {percentual.toFixed(1)}%
                    </div>
                  </div>
                </td>
              </tr>
            )
          })}

          {/* Linha da Fábrica */}
          <tr className="bg-gray-900/40 font-medium">
            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white sticky left-0 bg-gray-900/40">
              FÁBRICA
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
              R$ 28.525
            </td>
            {meses.map((_, idx) => (
              <td key={idx} className="px-4 py-3 text-sm text-center border-l border-gray-800">
                R$ 28.525
              </td>
            ))}
            <td className="px-4 py-3 whitespace-nowrap text-sm text-center border-l border-gray-800">
              R$ 342.300
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}