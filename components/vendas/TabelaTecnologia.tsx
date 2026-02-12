'use client'

import { useState } from 'react'
import { useVendas } from '@/hooks/useVendas'
import toast from 'react-hot-toast'

interface TabelaTecnologiaProps {
  ano: number
}

export default function TabelaTecnologia({ ano }: TabelaTecnologiaProps) {
  const [mesSelecionado, setMesSelecionado] = useState<number | null>(null)
  const { vendas, loading, salvarVenda } = useVendas(ano, undefined, 'tecnologia')

  const meses = [
    'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
    'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'
  ]

  const categorias = [
    { nome: 'SINAIS PTx Trimble', comissao: 460, unidade: 'sinais' },
    { nome: 'Licenças PTx Trimble', comissao: '10%' },
    { nome: 'Treinamentos Clientes', comissao: '83%' },
    { nome: 'Hardwares PTx Trimble', comissao: '10%' }
  ]

  function getValorPrevisto(categoria: string, mes: number) {
    const venda = vendas.find(v => v.categoria === categoria && v.mes === mes)
    return venda?.valor_previsto || 0
  }

  function getValorRealizado(categoria: string, mes: number) {
    const venda = vendas.find(v => v.categoria === categoria && v.mes === mes)
    return venda?.valor_realizado || 0
  }

  async function handleUpdateValor(categoria: string, mes: number, campo: 'previsto' | 'realizado', valor: string) {
    const valorNumerico = parseFloat(valor.replace(',', '.')) || 0
    
    const vendaExistente = vendas.find(v => v.categoria === categoria && v.mes === mes)
    
    await salvarVenda({
      id: vendaExistente?.id,
      tipo: 'tecnologia',
      categoria,
      ano,
      mes,
      valor_previsto: campo === 'previsto' ? valorNumerico : (vendaExistente?.valor_previsto || 0),
      valor_realizado: campo === 'realizado' ? valorNumerico : (vendaExistente?.valor_realizado || 0)
    })
  }

  // Calcular totais
  const totais = {
    previsto: vendas.reduce((acc, v) => acc + (v.valor_previsto || 0), 0),
    realizado: vendas.reduce((acc, v) => acc + (v.valor_realizado || 0), 0)
  }

  if (loading) {
    return <div className="text-center py-8">Carregando vendas...</div>
  }

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                TÉCNICO / CATEGORIA
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                COMISSÃO
              </th>
              {meses.map((mes, idx) => (
                <th 
                  key={idx} 
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => setMesSelecionado(mesSelecionado === idx + 1 ? null : idx + 1)}
                >
                  {mes}
                  {mesSelecionado === idx + 1 && (
                    <span className="ml-1 text-blue-600">▼</span>
                  )}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100">
                TOTAL
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categorias.map((categoria, idx) => {
              const totalPrevisto = meses.reduce((acc, _, i) => {
                return acc + getValorPrevisto(categoria.nome, i + 1)
              }, 0)
              
              const totalRealizado = meses.reduce((acc, _, i) => {
                return acc + getValorRealizado(categoria.nome, i + 1)
              }, 0)

              return (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white hover:bg-gray-50">
                    {categoria.nome}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {typeof categoria.comissao === 'number' 
                      ? `R$ ${categoria.comissao}` 
                      : categoria.comissao
                    }
                  </td>
                  {meses.map((_, i) => {
                    const mes = i + 1
                    const previsto = getValorPrevisto(categoria.nome, mes)
                    const realizado = getValorRealizado(categoria.nome, mes)
                    const editando = mesSelecionado === mes

                    return (
                      <td key={i} className="px-4 py-3 text-sm border-l border-gray-100">
                        {editando ? (
                          <div className="space-y-2">
                            <div>
                              <label className="text-xs text-gray-500 block">Previsto</label>
                              <input
                                type="text"
                                defaultValue={previsto.toLocaleString('pt-BR')}
                                onBlur={(e) => handleUpdateValor(categoria.nome, mes, 'previsto', e.target.value)}
                                className="w-24 px-2 py-1 text-xs border rounded"
                                placeholder="0,00"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block">Realizado</label>
                              <input
                                type="text"
                                defaultValue={realizado.toLocaleString('pt-BR')}
                                onBlur={(e) => handleUpdateValor(categoria.nome, mes, 'realizado', e.target.value)}
                                className="w-24 px-2 py-1 text-xs border rounded"
                                placeholder="0,00"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="text-xs text-gray-500">
                              Prev: <span className="text-gray-900">R$ {previsto.toLocaleString('pt-BR')}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              Real: <span className={`font-medium ${realizado > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                R$ {realizado.toLocaleString('pt-BR')}
                              </span>
                            </div>
                          </div>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-4 py-3 whitespace-nowrap text-sm border-l border-gray-200 bg-gray-50">
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500">
                        Prev: <span className="font-medium text-gray-900">R$ {totalPrevisto.toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Real: <span className="font-medium text-green-600">R$ {totalRealizado.toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="bg-gray-100">
            <tr>
              <td className="px-4 py-3 text-sm font-bold text-gray-900 sticky left-0 bg-gray-100">
                TOTAL GERAL
              </td>
              <td className="px-4 py-3"></td>
              {meses.map((_, i) => {
                const mes = i + 1
                const totalPrevistoMes = categorias.reduce((acc, cat) => {
                  return acc + getValorPrevisto(cat.nome, mes)
                }, 0)
                const totalRealizadoMes = categorias.reduce((acc, cat) => {
                  return acc + getValorRealizado(cat.nome, mes)
                }, 0)

                return (
                  <td key={i} className="px-4 py-3 text-sm border-l border-gray-300">
                    <div className="space-y-1">
                      <div className="text-xs">
                        R$ {totalPrevistoMes.toLocaleString('pt-BR')}
                      </div>
                      <div className="text-xs font-medium text-green-700">
                        R$ {totalRealizadoMes.toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </td>
                )
              })}
              <td className="px-4 py-3 text-sm font-bold border-l border-gray-300">
                <div className="space-y-1">
                  <div>R$ {totais.previsto.toLocaleString('pt-BR')}</div>
                  <div className="text-green-700">R$ {totais.realizado.toLocaleString('pt-BR')}</div>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-blue-800">📊 Resumo Tecnologia</h4>
            <p className="text-xs text-blue-600 mt-1">
              Total Previsto: R$ {totais.previsto.toLocaleString('pt-BR')} | 
              Total Realizado: R$ {totais.realizado.toLocaleString('pt-BR')} | 
              Atingimento: {totais.previsto > 0 ? ((totais.realizado / totais.previsto) * 100).toFixed(1) : 0}%
            </p>
          </div>
          <button
            onClick={() => setMesSelecionado(null)}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Fechar edição
          </button>
        </div>
      </div>
    </div>
  )
}