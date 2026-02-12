import { createClient } from '@/lib/supabaseClient'
import { useEffect, useState } from 'react'

export interface DadosGraficoVendas {
  mes: string
  previsto: number
  realizado: number
  servicos: number
  tecnologia: number
}

export interface DadosGraficoLogistica {
  mes: string
  diesel: number
  manutencao: number
  km: number
}

export interface DadosGraficoTecnicos {
  tecnico: string
  meta: number
  realizado: number
  percentual: number
}

export function useGraficoVendasAnual(ano: number = new Date().getFullYear()) {
  const [dados, setDados] = useState<DadosGraficoVendas[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchDados() {
      const { data: vendas } = await supabase
        .from('vendas_servicos')
        .select('*')
        .eq('ano', ano)
        .order('mes')

      if (vendas) {
        const meses = [
          'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
          'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
        ]

        const dadosPorMes = meses.map((mes, index) => {
          const vendasMes = vendas.filter(v => v.mes === index + 1)
          
          const previsto = vendasMes.reduce((acc, v) => acc + (v.valor_previsto || 0), 0)
          const realizado = vendasMes.reduce((acc, v) => acc + (v.valor_realizado || 0), 0)
          const servicos = vendasMes
            .filter(v => v.tipo === 'servico')
            .reduce((acc, v) => acc + (v.valor_realizado || 0), 0)
          const tecnologia = vendasMes
            .filter(v => v.tipo === 'tecnologia')
            .reduce((acc, v) => acc + (v.valor_realizado || 0), 0)

          return {
            mes,
            previsto,
            realizado,
            servicos,
            tecnologia
          }
        })

        setDados(dadosPorMes)
      }
      setLoading(false)
    }

    fetchDados()
  }, [ano, supabase])

  return { dados, loading }
}

export function useGraficoLogisticaAnual(ano: number = new Date().getFullYear()) {
  const [dados, setDados] = useState<DadosGraficoLogistica[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchDados() {
      const meses = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
      ]

      const dadosPorMes = await Promise.all(
        meses.map(async (mes, index) => {
          const mesNum = index + 1
          const startDate = `${ano}-${String(mesNum).padStart(2, '0')}-01`
          const endDate = `${ano}-${String(mesNum).padStart(2, '0')}-31`

          const { data: logistica } = await supabase
            .from('caminhoes_logistica')
            .select('*')
            .gte('data', startDate)
            .lte('data', endDate)

          if (logistica) {
            const diesel = logistica.reduce((acc, reg) => acc + (reg.diesel_valor || 0), 0)
            const manutencao = logistica.reduce((acc, reg) => acc + (reg.manutencao_valor || 0), 0)
            const km = logistica.reduce((acc, reg) => acc + (reg.km_rodados || 0), 0)

            return {
              mes,
              diesel,
              manutencao,
              km
            }
          }

          return {
            mes,
            diesel: 0,
            manutencao: 0,
            km: 0
          }
        })
      )

      setDados(dadosPorMes)
      setLoading(false)
    }

    fetchDados()
  }, [ano, supabase])

  return { dados, loading }
}

export function useGraficoTecnicos(ano: number = new Date().getFullYear(), mes?: number) {
  const [dados, setDados] = useState<DadosGraficoTecnicos[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchDados() {
      let query = supabase
        .from('view_desempenho_tecnicos')
        .select('*')
        .eq('ano', ano)
        .order('nome')

      if (mes) {
        query = query.eq('mes', mes)
      }

      const { data } = await query

      if (data) {
        // Agrupar por técnico e calcular médias se for anual
        const tecnicosMap = new Map()
        
        data.forEach(item => {
          if (!tecnicosMap.has(item.tecnico_nome)) {
            tecnicosMap.set(item.tecnico_nome, {
              tecnico: item.tecnico_nome,
              meta: 0,
              realizado: 0,
              count: 0
            })
          }
          const tec = tecnicosMap.get(item.tecnico_nome)
          tec.meta += item.valor_meta || 0
          tec.realizado += item.valor_realizado || 0
          tec.count += 1
        })

        const dadosTecnicos = Array.from(tecnicosMap.values()).map(tec => ({
          tecnico: tec.tecnico,
          meta: tec.meta,
          realizado: tec.realizado,
          percentual: tec.meta > 0 ? (tec.realizado / tec.meta) * 100 : 0
        }))

        setDados(dadosTecnicos)
      }
      setLoading(false)
    }

    fetchDados()
  }, [ano, mes, supabase])

  return { dados, loading }
}