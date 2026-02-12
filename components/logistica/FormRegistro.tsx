'use client'

import { useState } from 'react'
import { RegistroLogistica } from '@/hooks/useLogistica'
import toast from 'react-hot-toast'

interface FormRegistroProps {
  onSubmit: (data: any) => Promise<boolean>
  registro?: RegistroLogistica
  onCancel: () => void
}

export default function FormRegistro({ onSubmit, registro, onCancel }: FormRegistroProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    placa: registro?.placa || '',
    data: registro?.data?.split('T')[0] || new Date().toISOString().split('T')[0],
    km_rodados: registro?.km_rodados || 0,
    diesel_litros: registro?.diesel_litros || 0,
    diesel_valor: registro?.diesel_valor || 0,
    manutencao_descricao: registro?.manutencao_descricao || '',
    manutencao_valor: registro?.manutencao_valor || 0,
    motorista: registro?.motorista || '',
    observacao: registro?.observacao || ''
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    // Validações
    if (!formData.placa.trim()) {
      toast.error('Placa é obrigatória')
      setLoading(false)
      return
    }

    if (formData.km_rodados < 0) {
      toast.error('KM rodados não pode ser negativo')
      setLoading(false)
      return
    }

    const success = await onSubmit(formData)
    if (success) {
      onCancel()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Placa */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Placa do Caminhão *
          </label>
          <input
            type="text"
            value={formData.placa}
            onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
            placeholder="ABC1D23"
            maxLength={8}
            required
          />
        </div>

        {/* Data */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Data *
          </label>
          <input
            type="date"
            value={formData.data}
            onChange={(e) => setFormData({ ...formData, data: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        {/* KM Rodados */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            KM Rodados *
          </label>
          <input
            type="number"
            value={formData.km_rodados}
            onChange={(e) => setFormData({ ...formData, km_rodados: Number(e.target.value) })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
            placeholder="0"
            min="0"
            step="0.1"
            required
          />
        </div>

        {/* Motorista */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Motorista
          </label>
          <input
            type="text"
            value={formData.motorista}
            onChange={(e) => setFormData({ ...formData, motorista: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
            placeholder="Nome do motorista"
          />
        </div>

        {/* Seção Diesel */}
        <div className="md:col-span-2">
          <h3 className="text-lg font-medium text-gray-900 mb-2">⛽ Abastecimento</h3>
        </div>

        {/* Litros Diesel */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Litros de Diesel
          </label>
          <input
            type="number"
            value={formData.diesel_litros}
            onChange={(e) => setFormData({ ...formData, diesel_litros: Number(e.target.value) })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
            placeholder="0"
            min="0"
            step="0.1"
          />
        </div>

        {/* Valor Diesel */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Valor do Diesel (R$)
          </label>
          <input
            type="number"
            value={formData.diesel_valor}
            onChange={(e) => setFormData({ ...formData, diesel_valor: Number(e.target.value) })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
            placeholder="0,00"
            min="0"
            step="0.01"
          />
        </div>

        {/* Seção Manutenção */}
        <div className="md:col-span-2">
          <h3 className="text-lg font-medium text-gray-900 mb-2">🔧 Manutenção</h3>
        </div>

        {/* Descrição Manutenção */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Descrição da Manutenção
          </label>
          <input
            type="text"
            value={formData.manutencao_descricao}
            onChange={(e) => setFormData({ ...formData, manutencao_descricao: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
            placeholder="Ex: Troca de óleo, pneus, revisão..."
          />
        </div>

        {/* Valor Manutenção */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Valor da Manutenção (R$)
          </label>
          <input
            type="number"
            value={formData.manutencao_valor}
            onChange={(e) => setFormData({ ...formData, manutencao_valor: Number(e.target.value) })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
            placeholder="0,00"
            min="0"
            step="0.01"
          />
        </div>

        {/* Observação */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Observação
          </label>
          <textarea
            value={formData.observacao}
            onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
            placeholder="Informações adicionais..."
          />
        </div>
      </div>

      {/* Botões */}
      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Salvando...' : registro ? 'Atualizar' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}