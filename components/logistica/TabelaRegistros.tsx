'use client'

import { RegistroLogistica } from '@/hooks/useLogistica'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface TabelaRegistrosProps {
  registros: RegistroLogistica[]
  onEdit: (registro: RegistroLogistica) => void
  onDelete: (id: string) => Promise<boolean>
}

export default function TabelaRegistros({ registros, onEdit, onDelete }: TabelaRegistrosProps) {
  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  const formatarData = (data: string) => {
    return format(new Date(data), 'dd/MM/yyyy', { locale: ptBR })
  }

  if (registros.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500 text-lg">Nenhum registro encontrado</p>
        <p className="text-gray-400 text-sm mt-2">Comece adicionando um novo registro</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Data
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Placa
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              KM
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Diesel
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Manutenção
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Motorista
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {registros.map((registro) => (
            <tr key={registro.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatarData(registro.data)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {registro.placa}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {registro.km_rodados.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} km
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {registro.diesel_litros > 0 ? (
                  <>
                    <span className="font-medium">
                      {registro.diesel_litros.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} L
                    </span>
                    <br />
                    <span className="text-xs text-gray-500">{formatarMoeda(registro.diesel_valor)}</span>
                  </>
                ) : (
                  <span className="text-gray-400">---</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {registro.manutencao_valor > 0 ? (
                  <>
                    <span className="font-medium">{formatarMoeda(registro.manutencao_valor)}</span>
                    {registro.manutencao_descricao && (
                      <>
                        <br />
                        <span className="text-xs text-gray-500">{registro.manutencao_descricao}</span>
                      </>
                    )}
                  </>
                ) : (
                  <span className="text-gray-400">---</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {registro.motorista || <span className="text-gray-400">---</span>}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => onEdit(registro)}
                  className="text-blue-600 hover:text-blue-900 mr-3"
                >
                  Editar
                </button>
                <button
                  onClick={() => onDelete(registro.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  Excluir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}