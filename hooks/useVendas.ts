import { createClient } from '@/lib/supabaseClient'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export interface Venda {
  id: string
  tecnico_id: string | null
  tipo: 'servico' | 'tecnologia'
  categoria: string
  subcategoria: string | null
  ano: number
  mes: number
  valor_previsto: number
  valor_realizado: number
  observacao: string | null
}

export interface Tecnico {
  id: string
  nome: string
  base_meta: number
  ativo: boolean
}

export interface MetaTecnico {
  tecnico_id: string
  tecnico_nome: string
  ano: number
  mes: number
  valor_meta: number
  valor_realizado: number
  percentual: number
}

export interface ResumoVendas {
  total_previsto: number
  total_realizado: number
  percentual_atingimento: number
  total_servicos: number
  total_tecnologia: number
}

export function useVendas(ano?: number, mes?: number, tipo?: 'servico' | 'tecnologia') {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [resumo, setResumo] = useState<ResumoVendas>({
    total_previsto: 0,
    total_realizado: 0,
    percentual_atingimento: 0,
    total_servicos: 0,
    total_tecnologia: 0
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function fetchVendas() {
    setLoading(true)
    let query = supabase
      .from('vendas_servicos')
      .select('*')
      .order('mes', { ascending: true })

    if (ano) query = query.eq('ano', ano)
    if (mes) query = query.eq('mes', mes)
    if (tipo) query = query.eq('tipo', tipo)

    const { data, error } = await query

    if (!error && data) {
      setVendas(data)
      calcularResumo(data)
    }
    setLoading(false)
  }

  function calcularResumo(vendas: Venda[]) {
    const total_previsto = vendas.reduce((acc, v) => acc + (v.valor_previsto || 0), 0)
    const total_realizado = vendas.reduce((acc, v) => acc + (v.valor_realizado || 0), 0)
    const total_servicos = vendas
      .filter(v => v.tipo === 'servico')
      .reduce((acc, v) => acc + (v.valor_realizado || 0), 0)
    const total_tecnologia = vendas
      .filter(v => v.tipo === 'tecnologia')
      .reduce((acc, v) => acc + (v.valor_realizado || 0), 0)

    setResumo({
      total_previsto,
      total_realizado,
      percentual_atingimento: total_previsto > 0 ? (total_realizado / total_previsto) * 100 : 0,
      total_servicos,
      total_tecnologia
    })
  }

  async function salvarVenda(venda: Partial<Venda>) {
    if (!venda.ano || !venda.mes || !venda.tipo || !venda.categoria) {
      toast.error('Preencha todos os campos obrigatórios')
      return false
    }

    let error
    if (venda.id) {
      // Atualizar
      ({ error } = await supabase
        .from('vendas_servicos')
        .update(venda)
        .eq('id', venda.id))
    } else {
      // Criar
      ({ error } = await supabase
        .from('vendas_servicos')
        .insert([venda]))
    }

    if (error) {
      toast.error('Erro ao salvar venda: ' + error.message)
      return false
    }

    toast.success(venda.id ? 'Venda atualizada!' : 'Venda criada!')
    fetchVendas()
    return true
  }

  async function deletarVenda(id: string) {
    if (!confirm('Tem certeza que deseja deletar esta venda?')) return false

    const { error } = await supabase
      .from('vendas_servicos')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Erro ao deletar venda: ' + error.message)
      return false
    }

    toast.success('Venda deletada!')
    fetchVendas()
    return true
  }

  useEffect(() => {
    fetchVendas()
  }, [ano, mes, tipo])

  return {
    vendas,
    resumo,
    loading,
    salvarVenda,
    deletarVenda,
    refetch: fetchVendas
  }
}

export function useTecnicos() {
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchTecnicos() {
      const { data, error } = await supabase
        .from('tecnicos')
        .select('*')
        .eq('ativo', true)
        .order('nome')

      if (!error && data) {
        setTecnicos(data)
      }
      setLoading(false)
    }
    fetchTecnicos()
  }, [])

  return { tecnicos, loading }
}

export function useMetasTecnicos(ano: number = new Date().getFullYear()) {
  const [metas, setMetas] = useState<MetaTecnico[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchMetas() {
      const { data, error } = await supabase
        .from('view_desempenho_tecnicos')
        .select('*')
        .eq('ano', ano)
        .order('nome')
        .order('mes')

      if (!error && data) {
        setMetas(data)
      }
      setLoading(false)
    }
    fetchMetas()
  }, [ano])

  async function atualizarMeta(tecnico_id: string, mes: number, valor_meta: number) {
    const { error } = await supabase
      .from('metas_tecnicos')
      .upsert({
        tecnico_id,
        ano,
        mes,
        valor_meta
      })

    if (error) {
      toast.error('Erro ao atualizar meta: ' + error.message)
      return false
    }

    toast.success('Meta atualizada!')
    return true
  }

  async function atualizarRealizado(tecnico_id: string, mes: number, valor_realizado: number) {
    const { error } = await supabase
      .from('metas_tecnicos')
      .upsert({
        tecnico_id,
        ano,
        mes,
        valor_realizado
      })

    if (error) {
      toast.error('Erro ao atualizar realizado: ' + error.message)
      return false
    }

    toast.success('Realizado atualizado!')
    return true
  }

  return { metas, loading, atualizarMeta, atualizarRealizado }
}

export function useFabricaMetas(ano: number = new Date().getFullYear()) {
  const [metas, setMetas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchMetas() {
      const { data, error } = await supabase
        .from('fabrica_metas')
        .select('*')
        .eq('ano', ano)
        .order('mes')

      if (!error && data) {
        setMetas(data)
      }
      setLoading(false)
    }
    fetchMetas()
  }, [ano])

  return { metas, loading }
}