'use client'

import { ResumoLogistica } from '@/hooks/useLogistica'

interface ResumoCardsProps {
  resumo: ResumoLogistica
}

export default function ResumoCards({ resumo }: ResumoCardsProps) {
  const cards = [
    {
      titulo: 'Total Diesel',
      valor: `R$ ${resumo.total_diesel_mes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icone: '⛽',
      cor: 'bg-yellow-50 border-yellow-200',
      textoCor: 'text-yellow-800'
    },
    {
      titulo: 'Total Manutenção',
      valor: `R$ ${resumo.total_manutencao_mes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icone: '🔧',
      cor: 'bg-red-50 border-red-200',
      textoCor: 'text-red-800'
    },
    {
      titulo: 'KM Rodados',
      valor: `${resumo.total_km_mes.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} km`,
      icone: '📊',
      cor: 'bg-blue-50 border-blue-200',
      textoCor: 'text-blue-800'
    },
    {
      titulo: 'Média KM/L',
      valor: resumo.media_km_por_litro > 0 
        ? `${resumo.media_km_por_litro} km/l` 
        : '---',
      icone: '📈',
      cor: 'bg-green-50 border-green-200',
      textoCor: 'text-green-800'
    },
    {
      titulo: 'Custo por KM',
      valor: `R$ ${resumo.custo_por_km.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/km`,
      icone: '💰',
      cor: 'bg-purple-50 border-purple-200',
      textoCor: 'text-purple-800'
    },
    {
      titulo: 'Custo Total',
      valor: `R$ ${(resumo.total_diesel_mes + resumo.total_manutencao_mes).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icone: '💵',
      cor: 'bg-indigo-50 border-indigo-200',
      textoCor: 'text-indigo-800'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`${card.cor} border rounded-lg p-6 transition-all hover:shadow-md`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${card.textoCor}`}>{card.titulo}</p>
              <p className={`text-2xl font-bold ${card.textoCor} mt-1`}>{card.valor}</p>
            </div>
            <span className="text-3xl">{card.icone}</span>
          </div>
        </div>
      ))}
    </div>
  )
}