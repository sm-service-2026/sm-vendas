'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabaseClient' // Certifique-se que isso usa createBrowserClient

export interface RegistroLogistica {
  id: string
  placa: string
  data: string          // formato 'YYYY-MM-DD'
  km_rodados: number
  diesel_litros: number
  diesel_valor: number
  manutencao_descricao: string | null
  manutencao_valor: number
  motorista: string | null
  observacao: string | null
  created_at: string
}

export interface ResumoLogistica {
  total_diesel_mes: number
  total_manutencao_mes: number
  total_km_mes: number
  media_km_por_litro: number
  custo_por_km: number
}

interface Accumulator {
  total_diesel_mes: number
  total_manutencao_mes: number
  total_km_mes: number
  total_diesel_litros: number
}

export function useLogistica(mes?: number, ano: number = new Date().getFullYear()) {
  const [registros, setRegistros] = useState<RegistroLogistica[]>([])
  const [resumo, setResumo] = useState<ResumoLogistica>({
    total_diesel_mes: 0,
    total_manutencao_mes: 0,
    total_km_mes: 0,
    media_km_por_litro: 0,
    custo_por_km: 0,
  })
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  async function fetchRegistros() {
    setLoading(true)

    let query = supabase
      .from('caminhoes_logistica')
      .select('*')
      .order('data', { ascending: false })

    // Filtro por ano/mês
    if (ano) {
      if (mes !== undefined) {
        // Mês específico
        const monthStr = String(mes).padStart(2, '0')
        const startDate = `${ano}-${monthStr}-01`
        // Último dia do mês: truque simples com data
        const endDate = new Date(ano, mes, 0).toISOString().split('T')[0] // ex: 2025-02-28
        query = query.gte('data', startDate).lte('data', endDate)
      } else {
        // Todo o ano
        query = query.gte('data', `${ano}-01-01`).lte('data', `${ano}-12-31`)
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar registros:', error)
      toast.error('Erro ao carregar registros')
    }

    if (data) {
      setRegistros(data as RegistroLogistica[])
      calcularResumo(data as RegistroLogistica[])
    }

    setLoading(false)
  }

  function calcularResumo(regs: RegistroLogistica[]) {
    const acc = regs.reduce<Accumulator>(
      (acc, reg) => ({
        total_diesel_mes: acc.total_diesel_mes + (reg.diesel_valor || 0),
        total_manutencao_mes: acc.total_manutencao_mes + (reg.manutencao_valor || 0),
        total_km_mes: acc.total_km_mes + (reg.km_rodados || 0),
        total_diesel_litros: acc.total_diesel_litros + (reg.diesel_litros || 0),
      }),
      {
        total_diesel_mes: 0,
        total_manutencao_mes: 0,
        total_km_mes: 0,
        total_diesel_litros: 0,
      }
    )

    const mediaKmLitro =
      acc.total_diesel_litros > 0
        ? Number((acc.total_km_mes / acc.total_diesel_litros).toFixed(2))
        : 0

    const custoKm =
      acc.total_km_mes > 0
        ? Number(((acc.total_diesel_mes + acc.total_manutencao_mes) / acc.total_km_mes).toFixed(2))
        : 0

    setResumo({
      total_diesel_mes: acc.total_diesel_mes,
      total_manutencao_mes: acc.total_manutencao_mes,
      total_km_mes: acc.total_km_mes,
      media_km_por_litro: mediaKmLitro,
      custo_por_km: custoKm,
    })
  }

  async function criarRegistro(registro: Omit<RegistroLogistica, 'id' | 'created_at'>) {
    const { error } = await supabase.from('caminhoes_logistica').insert([registro])

    if (error) {
      toast.error('Erro ao criar: ' + error.message)
      return false
    }

    toast.success('Registro criado!')
    fetchRegistros()
    return true
  }

  async function atualizarRegistro(id: string, updates: Partial<RegistroLogistica>) {
    const { error } = await supabase
      .from('caminhoes_logistica')
      .update(updates)
      .eq('id', id)

    if (error) {
      toast.error('Erro ao atualizar: ' + error.message)
      return false
    }

    toast.success('Registro atualizado!')
    fetchRegistros()
    return true
  }

  async function deletarRegistro(id: string) {
    if (!confirm('Tem certeza que deseja deletar este registro?')) return false

    const { error } = await supabase.from('caminhoes_logistica').delete().eq('id', id)

    if (error) {
      toast.error('Erro ao deletar: ' + error.message)
      return false
    }

    toast.success('Registro deletado!')
    fetchRegistros()
    return true
  }

  useEffect(() => {
    fetchRegistros()
  }, [mes, ano])

  return {
    registros,
    resumo,
    loading,
    criarRegistro,
    atualizarRegistro,
    deletarRegistro,
    refetch: fetchRegistros,
  }
}

export function usePlacas() {
  const [placas, setPlacas] = useState<string[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function fetchPlacas() {
      const { data, error } = await supabase
        .from('caminhoes_logistica')
        .select('placa')
        .order('placa')

      if (error) {
        console.error('Erro ao buscar placas:', error)
        return
      }

      if (data) {
        const uniquePlacas = [...new Set(data.map((item) => item.placa))]
        setPlacas(uniquePlacas)
      }
    }

    fetchPlacas()
  }, [])

  return placas
}