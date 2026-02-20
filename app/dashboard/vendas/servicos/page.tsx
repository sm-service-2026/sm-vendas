'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Tecnico {
  id: string
  nome: string
  base_meta: number
  ativo: boolean
  created_at: string
}

interface MetaTecnico {
  id: string
  tecnico_id: string
  tecnico_nome?: string
  ano: number
  mes: number
  valor_meta: number
  valor_realizado: number
  percentual?: number
}

interface FabricaMeta {
  id: string
  ano: number
  mes: number
  valor_meta: number
  valor_realizado: number
}

export default function VendasServicosPage() {
  const router = useRouter()
  const supabase = createClient()

  // Cores do tema
  const theme = {
    background: '#2d2d2d',
    card: '#3c3c3c',
    primary: '#e74c3c',
    primaryDark: '#c0392b',
    text: '#ffffff',
    textSecondary: '#cccccc',
    textMuted: '#999999',
    border: '#4a4a4a',
    success: '#27ae60',
    warning: '#f39c12',
    danger: '#e74c3c',
    info: '#3498db',
    blue: '#3498db',
    purple: '#9b59b6'
  }

  // Estados principais
  const [loading, setLoading] = useState(true)
  const [ano, setAno] = useState(new Date().getFullYear())
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [metas, setMetas] = useState<MetaTecnico[]>([])
  const [fabricaMeta, setFabricaMeta] = useState<FabricaMeta | null>(null)
 
  // Estados para modais
  const [showModalTecnico, setShowModalTecnico] = useState(false)
  const [showModalMeta, setShowModalMeta] = useState(false)
  const [showModalFabrica, setShowModalFabrica] = useState(false)
  const [showModalExcluir, setShowModalExcluir] = useState(false)
  const [tecnicoEditando, setTecnicoEditando] = useState<Tecnico | null>(null)
  const [metaEditando, setMetaEditando] = useState<MetaTecnico | null>(null)
  const [itemParaExcluir, setItemParaExcluir] = useState<{ id: string, nome: string, tipo: 'tecnico' | 'meta' | 'fabrica' } | null>(null)
 
  // Estados para formulários - USANDO STRINGS PARA VALORES META
  const [formTecnico, setFormTecnico] = useState({
    nome: '',
    base_meta: 0
  })
 
  const [formMeta, setFormMeta] = useState({
    tecnico_id: '',
    mes: new Date().getMonth() + 1,
    valor_meta: '',
    valor_realizado: ''
  })

  const [formFabrica, setFormFabrica] = useState({
    valor_meta: 28525,
    valor_realizado: 0
  })

  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const mesesAbreviados = [
    'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
    'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'
  ]

  const anos = [2024, 2025, 2026, 2027]

  // Função auxiliar para inputs numéricos
  const handleNumberInput = (value: string, field: string, setter: Function) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setter((prev: any) => ({ ...prev, [field]: value }))
    }
  }

  useEffect(() => {
    async function verificarAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      }
    }
    verificarAuth()
  }, [router, supabase])

  useEffect(() => {
    carregarDados()
  }, [ano])

  async function carregarDados() {
    setLoading(true)
    try {
      // 1. Carregar técnicos ativos
      const { data: tecnicosData, error: tecnicosError } = await supabase
        .from('tecnicos')
        .select('*')
        .order('nome')
      if (tecnicosError) throw tecnicosError
      setTecnicos(tecnicosData || [])

      // 2. Carregar metas dos técnicos do ano selecionado
      const { data: metasData, error: metasError } = await supabase
        .from('metas_tecnicos')
        .select('*, tecnicos(nome)')
        .eq('ano', ano)
        .order('mes')
      if (metasError) throw metasError

      const metasProcessadas = (metasData || []).map((meta: any) => ({
        ...meta,
        tecnico_nome: meta.tecnicos?.nome,
        percentual: meta.valor_meta > 0
          ? (meta.valor_realizado / meta.valor_meta) * 100
          : 0
      }))
      setMetas(metasProcessadas)

      // 3. Carregar meta da fábrica
      const { data: fabricaData, error: fabricaError } = await supabase
        .from('fabrica_metas')
        .select('*')
        .eq('ano', ano)
        .eq('mes', new Date().getMonth() + 1)
        .maybeSingle()
      if (fabricaError) throw fabricaError
      
      if (fabricaData) {
        setFabricaMeta(fabricaData)
        setFormFabrica({
          valor_meta: fabricaData.valor_meta,
          valor_realizado: fabricaData.valor_realizado || 0
        })
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  // ========== CRUD TÉCNICOS ==========
  function handleNovoTecnico() {
    setTecnicoEditando(null)
    setFormTecnico({ nome: '', base_meta: 0 })
    setShowModalTecnico(true)
  }

  function handleEditarTecnico(tecnico: Tecnico) {
    setTecnicoEditando(tecnico)
    setFormTecnico({
      nome: tecnico.nome,
      base_meta: tecnico.base_meta
    })
    setShowModalTecnico(true)
  }

  async function handleSalvarTecnico() {
    if (!formTecnico.nome.trim()) {
      toast.error('Nome do técnico é obrigatório')
      return
    }
    if (formTecnico.base_meta <= 0) {
      toast.error('Meta base deve ser maior que zero')
      return
    }
    try {
      if (tecnicoEditando) {
        const { error } = await supabase
          .from('tecnicos')
          .update({
            nome: formTecnico.nome.toUpperCase(),
            base_meta: formTecnico.base_meta
          })
          .eq('id', tecnicoEditando.id)
        if (error) throw error
        toast.success('Técnico atualizado com sucesso!')
      } else {
        const { data, error } = await supabase
          .from('tecnicos')
          .insert([{
            nome: formTecnico.nome.toUpperCase(),
            base_meta: formTecnico.base_meta,
            ativo: true
          }])
          .select()
          .single()
        if (error) throw error
        toast.success('Técnico cadastrado com sucesso!')
        await criarMetasPadraoParaTecnico(data.id, data.nome, data.base_meta)
      }
      setShowModalTecnico(false)
      carregarDados()
    } catch (error) {
      console.error('Erro ao salvar técnico:', error)
      toast.error('Erro ao salvar técnico')
    }
  }

  async function criarMetasPadraoParaTecnico(tecnicoId: string, nome: string, baseMeta: number) {
    try {
      const metasPadrao = []
      for (let mes = 1; mes <= 12; mes++) {
        let valorMeta = baseMeta
        if ((nome === 'ANDRÉ LUCAS' && mes === 7) || (nome === 'MARCOS MARTINS' && mes === 6)) {
          valorMeta = 0
        }
        metasPadrao.push({
          tecnico_id: tecnicoId,
          ano: ano,
          mes,
          valor_meta: valorMeta,
          valor_realizado: 0
        })
      }
      const { error } = await supabase
        .from('metas_tecnicos')
        .insert(metasPadrao)
      if (error) throw error
      toast.success('Metas padrão criadas para o técnico')
    } catch (error) {
      console.error('Erro ao criar metas padrão:', error)
      toast.error('Erro ao criar metas padrão')
    }
  }

  async function handleToggleAtivo(tecnico: Tecnico) {
    try {
      const { error } = await supabase
        .from('tecnicos')
        .update({ ativo: !tecnico.ativo })
        .eq('id', tecnico.id)
      if (error) throw error
      toast.success(`Técnico ${tecnico.ativo ? 'desativado' : 'ativado'} com sucesso!`)
      carregarDados()
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      toast.error('Erro ao alterar status do técnico')
    }
  }

  // ========== CRUD METAS ==========
  function handleNovaMeta(tecnicoId?: string, mes?: number) {
    const tecnico = tecnicos.find(t => t.id === tecnicoId)
   
    setMetaEditando(null)
    setFormMeta({
      tecnico_id: tecnicoId || tecnicos[0]?.id || '',
      mes: mes || new Date().getMonth() + 1,
      valor_meta: '',
      valor_realizado: ''
    })
    setShowModalMeta(true)
  }

  function handleEditarMeta(meta: MetaTecnico) {
    setMetaEditando(meta)
    setFormMeta({
      tecnico_id: meta.tecnico_id,
      mes: meta.mes,
      valor_meta: meta.valor_meta.toString(),
      valor_realizado: meta.valor_realizado.toString()
    })
    setShowModalMeta(true)
  }

  async function handleSalvarMeta() {
    if (!formMeta.tecnico_id) {
      toast.error('Selecione um técnico')
      return
    }

    // Converter strings para números
    const valorMeta = formMeta.valor_meta === '' ? 0 : Number(formMeta.valor_meta)
    const valorRealizado = formMeta.valor_realizado === '' ? 0 : Number(formMeta.valor_realizado)

    if (valorMeta < 0 || valorRealizado < 0) {
      toast.error('Valores não podem ser negativos')
      return
    }

    try {
      if (metaEditando) {
        const { error } = await supabase
          .from('metas_tecnicos')
          .update({
            valor_meta: valorMeta,
            valor_realizado: valorRealizado
          })
          .eq('id', metaEditando.id)
        if (error) throw error
        toast.success('Meta atualizada com sucesso!')
      } else {
        const { data: existente } = await supabase
          .from('metas_tecnicos')
          .select('id')
          .eq('tecnico_id', formMeta.tecnico_id)
          .eq('ano', ano)
          .eq('mes', formMeta.mes)
          .maybeSingle()
        if (existente) {
          toast.error('Já existe uma meta para este técnico e mês')
          return
        }
        const { error } = await supabase
          .from('metas_tecnicos')
          .insert([{
            tecnico_id: formMeta.tecnico_id,
            ano: ano,
            mes: formMeta.mes,
            valor_meta: valorMeta,
            valor_realizado: valorRealizado
          }])
        if (error) throw error
        toast.success('Meta cadastrada com sucesso!')
      }
      setShowModalMeta(false)
      carregarDados()
    } catch (error) {
      console.error('Erro ao salvar meta:', error)
      toast.error('Erro ao salvar meta')
    }
  }

  // ========== CRUD FÁBRICA ==========
  function handleEditarFabrica() {
    setFormFabrica({
      valor_meta: fabricaMeta?.valor_meta || 28525,
      valor_realizado: fabricaMeta?.valor_realizado || 0
    })
    setShowModalFabrica(true)
  }

  async function handleSalvarFabrica() {
    try {
      const mesAtual = new Date().getMonth() + 1
      if (fabricaMeta?.id) {
        const { error } = await supabase
          .from('fabrica_metas')
          .update({
            valor_meta: formFabrica.valor_meta,
            valor_realizado: formFabrica.valor_realizado
          })
          .eq('id', fabricaMeta.id)
        if (error) throw error
        toast.success('Meta da fábrica atualizada!')
      } else {
        const { error } = await supabase
          .from('fabrica_metas')
          .insert([{
            ano,
            mes: mesAtual,
            valor_meta: formFabrica.valor_meta,
            valor_realizado: formFabrica.valor_realizado
          }])
        if (error) throw error
        toast.success('Meta da fábrica cadastrada!')
      }
      setShowModalFabrica(false)
      carregarDados()
    } catch (error) {
      console.error('Erro ao salvar meta da fábrica:', error)
      toast.error('Erro ao salvar meta da fábrica')
    }
  }

  // ========== EXCLUSÃO ==========
  function handleExcluirClick(id: string, nome: string, tipo: 'tecnico' | 'meta' | 'fabrica') {
    setItemParaExcluir({ id, nome, tipo })
    setShowModalExcluir(true)
  }

  async function handleConfirmarExclusao() {
    if (!itemParaExcluir) return
    try {
      if (itemParaExcluir.tipo === 'tecnico') {
        const { data: vendas } = await supabase
          .from('vendas_servicos')
          .select('id')
          .eq('tecnico_id', itemParaExcluir.id)
          .limit(1)
        if (vendas && vendas.length > 0) {
          await supabase
            .from('tecnicos')
            .update({ ativo: false })
            .eq('id', itemParaExcluir.id)
         
          toast.success('Técnico desativado (possui vendas associadas)')
        } else {
          await supabase
            .from('tecnicos')
            .delete()
            .eq('id', itemParaExcluir.id)
         
          toast.success('Técnico excluído com sucesso!')
        }
      } else if (itemParaExcluir.tipo === 'meta') {
        await supabase
          .from('metas_tecnicos')
          .delete()
          .eq('id', itemParaExcluir.id)
       
        toast.success('Meta excluída com sucesso!')
      } else if (itemParaExcluir.tipo === 'fabrica') {
        await supabase
          .from('fabrica_metas')
          .delete()
          .eq('id', itemParaExcluir.id)
       
        toast.success('Meta da fábrica excluída!')
        setFabricaMeta(null)
      }
      setShowModalExcluir(false)
      carregarDados()
    } catch (error) {
      console.error('Erro ao excluir:', error)
      toast.error('Erro ao excluir item')
    }
  }

  // ========== UTILITÁRIOS ==========
  function getMetaPorTecnicoEMes(tecnicoId: string, mes: number): MetaTecnico | undefined {
    return metas.find(m => m.tecnico_id === tecnicoId && m.mes === mes)
  }

  function getStatusMeta(percentual: number): { texto: string, cor: string, bg: string, icone: string } {
    if (percentual >= 100) {
      return { texto: 'Batida', cor: theme.success, bg: 'rgba(39, 174, 96, 0.2)', icone: '🎯' }
    }
    if (percentual >= 70) {
      return { texto: 'Próximo', cor: theme.warning, bg: 'rgba(243, 156, 18, 0.2)', icone: '⚡' }
    }
    if (percentual > 0) {
      return { texto: 'Abaixo', cor: theme.danger, bg: 'rgba(231, 76, 60, 0.2)', icone: '⚠️' }
    }
    return { texto: 'Não iniciada', cor: theme.textMuted, bg: 'rgba(255, 255, 255, 0.1)', icone: '⏳' }
  }

  function calcularTotaisTecnico(tecnicoId: string) {
    const metasTecnico = metas.filter(m => m.tecnico_id === tecnicoId)
    const totalMeta = metasTecnico.reduce((acc, m) => acc + (m.valor_meta || 0), 0)
    const totalRealizado = metasTecnico.reduce((acc, m) => acc + (m.valor_realizado || 0), 0)
    const percentual = totalMeta > 0 ? (totalRealizado / totalMeta) * 100 : 0
   
    return { totalMeta, totalRealizado, percentual }
  }

  const formatMoeda = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  // Totais gerais
  const totaisGerais = tecnicos
    .filter(t => t.ativo)
    .reduce((acc, tecnico) => {
      const totais = calcularTotaisTecnico(tecnico.id)
      return {
        totalMeta: acc.totalMeta + totais.totalMeta,
        totalRealizado: acc.totalRealizado + totais.totalRealizado
      }
    }, { totalMeta: 0, totalRealizado: 0 })

  totaisGerais.totalMeta += fabricaMeta?.valor_meta || 28525
  totaisGerais.totalRealizado += fabricaMeta?.valor_realizado || 0

  const percentualGeral = totaisGerais.totalMeta > 0
    ? (totaisGerais.totalRealizado / totaisGerais.totalMeta) * 100
    : 0

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center" style={{ backgroundColor: theme.background }}>
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-transparent" style={{ borderColor: theme.primary, borderTopColor: 'transparent' }} />
        <p className="text-white mt-4 text-lg font-medium">Carregando vendas e serviços...</p>
        <p className="text-gray-400 text-sm mt-2">Buscando seus dados</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: theme.background }}>
      {/* Cabeçalho Fixo */}
      <nav className="fixed top-0 left-0 right-0 z-50 w-full" style={{ backgroundColor: theme.card, borderBottom: `1px solid ${theme.border}` }}>
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg transition-colors hover:bg-white/10"
                style={{ color: theme.textSecondary }}
              >
                <span className="text-xl">←</span>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold" style={{ color: theme.text }}>🔧 Vendas - Serviços</h1>
                  <span className="px-3 py-1 text-sm font-medium rounded-full" style={{ backgroundColor: 'rgba(231, 76, 60, 0.2)', color: theme.primary, border: `1px solid rgba(231, 76, 60, 0.3)` }}>
                    {ano}
                  </span>
                </div>
                <p className="text-sm mt-1" style={{ color: theme.textSecondary }}>
                  Gerencie técnicos, metas e acompanhe o desempenho
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                className="px-4 py-2 text-sm rounded-lg border focus:ring-2 outline-none"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  borderColor: theme.border,
                  color: theme.text
                }}
              >
                {anos.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <button
                onClick={handleNovoTecnico}
                className="px-4 py-2 text-sm rounded-lg transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
                style={{ backgroundColor: theme.primary, color: 'white' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.primaryDark}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.primary}
              >
                <span className="text-lg">+</span>
                Novo Técnico
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Conteúdo Principal */}
      <main className="w-full pt-20">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="rounded-xl shadow-sm p-6 border-l-4 hover:shadow-md transition-all" style={{ backgroundColor: theme.card, borderLeftColor: theme.primary }}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm uppercase tracking-wider" style={{ color: theme.textSecondary }}>Meta Total</p>
                    <p className="text-2xl font-bold mt-2" style={{ color: theme.text }}>
                      {formatMoeda(totaisGerais.totalMeta)}
                    </p>
                    <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
                      {tecnicos.filter(t => t.ativo).length} técnicos ativos
                    </p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(231, 76, 60, 0.2)' }}>
                    <span className="text-2xl">💰</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl shadow-sm p-6 border-l-4 hover:shadow-md transition-all" style={{ backgroundColor: theme.card, borderLeftColor: theme.success }}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm uppercase tracking-wider" style={{ color: theme.textSecondary }}>Realizado Total</p>
                    <p className="text-2xl font-bold mt-2" style={{ color: theme.success }}>
                      {formatMoeda(totaisGerais.totalRealizado)}
                    </p>
                    <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
                      {metas.filter(m => m.percentual && m.percentual >= 100).length} metas batidas
                    </p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(39, 174, 96, 0.2)' }}>
                    <span className="text-2xl">✅</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl shadow-sm p-6 border-l-4 hover:shadow-md transition-all" style={{ backgroundColor: theme.card, borderLeftColor: theme.purple }}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm uppercase tracking-wider" style={{ color: theme.textSecondary }}>% Atingimento</p>
                    <p className="text-2xl font-bold mt-2" style={{ color: theme.purple }}>
                      {percentualGeral.toFixed(1)}%
                    </p>
                    <div className="w-full rounded-full h-2 mt-2" style={{ backgroundColor: theme.border }}>
                      <div
                        className="rounded-full h-2"
                        style={{
                          backgroundColor: theme.purple,
                          width: `${Math.min(percentualGeral, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(155, 89, 182, 0.2)' }}>
                    <span className="text-2xl">📊</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl shadow-sm p-6 border-l-4 hover:shadow-md transition-all" style={{ backgroundColor: theme.card, borderLeftColor: theme.warning }}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm uppercase tracking-wider" style={{ color: theme.textSecondary }}>Meta Fábrica</p>
                    <p className="text-2xl font-bold mt-2" style={{ color: theme.text }}>
                      {formatMoeda(fabricaMeta?.valor_meta || 28525)}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs" style={{ color: theme.textMuted }}>
                        Realizado: {formatMoeda(fabricaMeta?.valor_realizado || 0)}
                      </p>
                      <button
                        onClick={handleEditarFabrica}
                        className="text-xs font-medium ml-2"
                        style={{ color: theme.primary }}
                        onMouseEnter={(e) => e.currentTarget.style.color = theme.primaryDark}
                        onMouseLeave={(e) => e.currentTarget.style.color = theme.primary}
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(243, 156, 18, 0.2)' }}>
                    <span className="text-2xl">🏭</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de Técnicos */}
            <div className="space-y-6">
              {tecnicos.filter(t => t.ativo).map((tecnico) => {
                const totais = calcularTotaisTecnico(tecnico.id)
                const statusAnual = getStatusMeta(totais.percentual)
                return (
                  <div key={tecnico.id} className="rounded-xl shadow-sm overflow-hidden border hover:shadow-md transition-all" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
                    {/* Cabeçalho do Técnico */}
                    <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', borderBottom: `1px solid ${theme.border}` }} className="px-6 py-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md" style={{ backgroundColor: theme.primary }}>
                            {tecnico.nome.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-xl font-bold" style={{ color: theme.text }}>{tecnico.nome}</h2>
                              <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: statusAnual.bg, color: statusAnual.cor, border: `1px solid ${statusAnual.cor}30` }}>
                                {statusAnual.icone} {statusAnual.texto}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-sm" style={{ color: theme.textSecondary }}>
                                Meta base: {formatMoeda(tecnico.base_meta)}/mês
                              </span>
                              <span style={{ color: theme.border }}>•</span>
                              <span className="text-sm" style={{ color: theme.textSecondary }}>
                                Total: <span style={{ color: theme.success }}>{formatMoeda(totais.totalRealizado)}</span> / {formatMoeda(totais.totalMeta)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleNovaMeta(tecnico.id)}
                            className="px-3 py-1.5 text-sm rounded-lg transition-all flex items-center gap-1"
                            style={{ backgroundColor: theme.success, color: 'white' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#219a52'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.success}
                          >
                            <span>+</span>
                            Nova Meta
                          </button>
                          <button
                            onClick={() => handleEditarTecnico(tecnico)}
                            className="p-2 rounded-lg transition-colors hover:bg-red-500/20"
                            style={{ color: theme.primary }}
                            title="Editar técnico"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleToggleAtivo(tecnico)}
                            className="p-2 rounded-lg transition-colors hover:bg-red-500/20"
                            style={{ color: theme.danger }}
                            title="Desativar técnico"
                          >
                            🔴
                          </button>
                          <button
                            onClick={() => handleExcluirClick(tecnico.id, tecnico.nome, 'tecnico')}
                            className="p-2 rounded-lg transition-colors hover:bg-red-500/20"
                            style={{ color: theme.danger }}
                            title="Excluir técnico"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      {/* Barra de progresso anual */}
                      <div className="mt-4">
                        <div className="flex justify-between items-center text-sm mb-1">
                          <span style={{ color: theme.textSecondary }}>Progresso anual</span>
                          <span className="font-semibold" style={{ color: theme.text }}>
                            {totais.percentual.toFixed(1)}% • {formatMoeda(totais.totalRealizado)} / {formatMoeda(totais.totalMeta)}
                          </span>
                        </div>
                        <div className="w-full rounded-full h-2.5" style={{ backgroundColor: theme.border }}>
                          <div
                            className="h-2.5 rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(totais.percentual, 100)}%`,
                              backgroundColor: totais.percentual >= 100 ? theme.success : totais.percentual >= 70 ? theme.warning : theme.danger
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Tabela de Metas Mensais */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Mês</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Meta (R$)</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Realizado (R$)</th>
                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Status</th>
                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>% Atingimento</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: theme.border }}>
                          {meses.map((nomeMes, index) => {
                            const mes = index + 1
                            const meta = getMetaPorTecnicoEMes(tecnico.id, mes)
                            const temFerias = (tecnico.nome === 'ANDRÉ LUCAS' && mes === 7) || (tecnico.nome === 'MARCOS MARTINS' && mes === 6)
                            const percentual = meta && meta.valor_meta > 0 ? (meta.valor_realizado / meta.valor_meta) * 100 : 0
                            const status = getStatusMeta(percentual)
                            return (
                              <tr key={mes} className="transition-colors hover:bg-white/5" style={{ backgroundColor: 'transparent' }}>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium" style={{ color: theme.text }}>
                                  <div className="flex items-center gap-2">
                                    {mesesAbreviados[index]}
                                    {temFerias && (
                                      <span className="px-2 py-0.5 text-xs rounded-full" style={{
                                        backgroundColor: 'rgba(243, 156, 18, 0.2)',
                                        color: theme.warning,
                                        border: '1px solid rgba(243, 156, 18, 0.3)'
                                      }}>
                                        Férias
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-right" style={{ color: theme.text }}>
                                  {meta ? formatMoeda(meta.valor_meta) : <span style={{ color: theme.textMuted }}>---</span>}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium">
                                  {meta ? (
                                    <span style={{ color: meta.valor_realizado > 0 ? theme.success : theme.textMuted }}>
                                      {formatMoeda(meta.valor_realizado)}
                                    </span>
                                  ) : (
                                    <span style={{ color: theme.textMuted }}>---</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                  {meta ? (
                                    <span className="px-2 py-1 rounded-full text-xs font-medium" style={{
                                      backgroundColor: status.bg,
                                      color: status.cor,
                                      border: `1px solid ${status.cor}30`
                                    }}>
                                      {status.icone} {status.texto}
                                    </span>
                                  ) : (
                                    <span style={{ color: theme.textMuted }}>---</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                  {meta ? (
                                    <div className="flex items-center justify-center gap-2">
                                      <span className="font-semibold" style={{
                                        color: percentual >= 100 ? theme.success :
                                              percentual >= 70 ? theme.warning :
                                              percentual > 0 ? theme.danger : theme.textMuted
                                      }}>
                                        {percentual.toFixed(1)}%
                                      </span>
                                      <div className="w-16 rounded-full h-1.5" style={{ backgroundColor: theme.border }}>
                                        <div
                                          className="h-1.5 rounded-full"
                                          style={{
                                            width: `${Math.min(percentual, 100)}%`,
                                            backgroundColor: percentual >= 100 ? theme.success :
                                                          percentual >= 70 ? theme.warning :
                                                          theme.danger
                                          }}
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <span style={{ color: theme.textMuted }}>---</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {meta ? (
                                      <>
                                        <button
                                          onClick={() => handleEditarMeta(meta)}
                                          className="p-1.5 rounded-md transition-colors hover:bg-blue-500/20"
                                          style={{ color: theme.blue }}
                                          title="Editar meta"
                                        >
                                          ✏️
                                        </button>
                                        <button
                                          onClick={() => handleExcluirClick(meta.id, `Meta ${nomeMes}`, 'meta')}
                                          className="p-1.5 rounded-md transition-colors hover:bg-red-500/20"
                                          style={{ color: theme.danger }}
                                          title="Excluir meta"
                                        >
                                          🗑️
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        onClick={() => handleNovaMeta(tecnico.id, mes)}
                                        className="p-1.5 rounded-md transition-colors hover:bg-green-500/20"
                                        style={{ color: theme.success }}
                                        title="Adicionar meta"
                                      >
                                        ➕
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot style={{ backgroundColor: 'rgba(231, 76, 60, 0.1)' }}>
                          <tr>
                            <td className="px-4 py-3 text-sm font-semibold" style={{ color: theme.text }}>TOTAL {tecnico.nome}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold" style={{ color: theme.text }}>{formatMoeda(totais.totalMeta)}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold" style={{ color: theme.success }}>{formatMoeda(totais.totalRealizado)}</td>
                            <td className="px-4 py-3 text-sm text-center">
                              <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: statusAnual.bg, color: statusAnual.cor, border: `1px solid ${statusAnual.cor}30` }}>
                                {statusAnual.icone} {statusAnual.texto}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              <span className="font-semibold" style={{
                                color: totais.percentual >= 100 ? theme.success : totais.percentual >= 70 ? theme.warning : theme.danger
                              }}>
                                {totais.percentual.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              <button
                                onClick={() => {
                                  metas
                                    .filter(m => m.tecnico_id === tecnico.id)
                                    .forEach(meta => {
                                      handleExcluirClick(meta.id, `Todas as metas de ${tecnico.nome}`, 'meta')
                                    })
                                }}
                                className="p-1.5 rounded-md transition-colors hover:bg-red-500/20"
                                style={{ color: theme.danger }}
                                title="Excluir todas as metas"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )
              })}

              {/* Card da Fábrica */}
              <div className="rounded-xl shadow-sm overflow-hidden border hover:shadow-md transition-all" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
                <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', borderBottom: `1px solid ${theme.border}` }} className="px-6 py-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md" style={{ backgroundColor: theme.warning }}>
                        🏭
                      </div>
                      <div>
                        <h2 className="text-xl font-bold" style={{ color: theme.text }}>FÁBRICA</h2>
                        <p className="text-sm mt-1" style={{ color: theme.textSecondary }}>
                          Meta mensal: {formatMoeda(fabricaMeta?.valor_meta || 28525)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleEditarFabrica}
                        className="px-3 py-1.5 text-sm rounded-lg transition-all flex items-center gap-1"
                        style={{ backgroundColor: theme.primary, color: 'white' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.primaryDark}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.primary}
                      >
                        <span>✏️</span>
                        Editar Meta
                      </button>
                      {fabricaMeta?.id && (
                        <button
                          onClick={() => handleExcluirClick(fabricaMeta.id, 'Meta da Fábrica', 'fabrica')}
                          className="p-2 rounded-lg transition-colors hover:bg-red-500/20"
                          style={{ color: theme.danger }}
                          title="Excluir meta"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm mb-1" style={{ color: theme.textSecondary }}>Meta do Mês</p>
                      <p className="text-2xl font-bold" style={{ color: theme.text }}>
                        {formatMoeda(fabricaMeta?.valor_meta || 28525)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm mb-1" style={{ color: theme.textSecondary }}>Realizado</p>
                      <p className="text-2xl font-bold" style={{ color: theme.success }}>
                        {formatMoeda(fabricaMeta?.valor_realizado || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm mb-1" style={{ color: theme.textSecondary }}>% Atingimento</p>
                      <p className="text-2xl font-bold" style={{ color: theme.purple }}>
                        {fabricaMeta?.valor_meta ? ((fabricaMeta.valor_realizado / fabricaMeta.valor_meta) * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Técnicos Inativos */}
              {tecnicos.filter(t => !t.ativo).length > 0 && (
                <div className="rounded-xl p-6 border" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', borderColor: theme.border }}>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: theme.text }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.textMuted }}></span>
                    Técnicos Inativos
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tecnicos.filter(t => !t.ativo).map(tecnico => (
                      <div key={tecnico.id} className="rounded-lg p-4 flex justify-between items-center border" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
                        <div>
                          <p className="font-medium" style={{ color: theme.text }}>{tecnico.nome}</p>
                          <p className="text-sm" style={{ color: theme.textMuted }}>Meta base: {formatMoeda(tecnico.base_meta)}</p>
                        </div>
                        <button
                          onClick={() => handleToggleAtivo(tecnico)}
                          className="px-3 py-1.5 text-sm rounded-lg transition-colors"
                          style={{ backgroundColor: theme.success, color: 'white' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#219a52'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.success}
                        >
                          Reativar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* MODAL: Técnico */}
      {showModalTecnico && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setShowModalTecnico(false)} />
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-lg text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg" style={{ backgroundColor: theme.card }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: theme.border }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold" style={{ color: theme.text }}>
                    {tecnicoEditando ? '✏️ Editar Técnico' : '➕ Novo Técnico'}
                  </h3>
                  <button
                    onClick={() => setShowModalTecnico(false)}
                    className="rounded-md text-2xl hover:text-white transition-colors"
                    style={{ color: theme.textMuted }}
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Nome do Técnico *</label>
                    <input
                      type="text"
                      value={formTecnico.nome}
                      onChange={(e) => setFormTecnico({ ...formTecnico, nome: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderColor: theme.border,
                        color: theme.text
                      }}
                      placeholder="Ex: JOÃO SILVA"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Meta Base Mensal (R$) *</label>
                    <input
                      type="number"
                      value={formTecnico.base_meta}
                      onChange={(e) => setFormTecnico({ ...formTecnico, base_meta: Number(e.target.value) })}
                      className="w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderColor: theme.border,
                        color: theme.text
                      }}
                      placeholder="0,00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  {!tecnicoEditando && (
                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(231, 76, 60, 0.1)' }}>
                      <p className="text-sm flex items-center gap-2" style={{ color: theme.primary }}>
                        <span className="text-lg">ℹ️</span>
                        Ao criar um novo técnico, metas padrão serão criadas automaticamente para todos os meses de {ano}.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-6 py-4 flex justify-end gap-3" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                <button
                  onClick={() => setShowModalTecnico(false)}
                  className="px-4 py-2 rounded-lg transition-colors hover:bg-white/10"
                  style={{ backgroundColor: 'transparent', border: `1px solid ${theme.border}`, color: theme.textSecondary }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvarTecnico}
                  className="px-4 py-2 rounded-lg transition-all hover:shadow-lg"
                  style={{ backgroundColor: theme.primary, color: 'white' }}
                >
                  {tecnicoEditando ? 'Salvar Alterações' : 'Cadastrar Técnico'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Meta - CORRIGIDO */}
      {showModalMeta && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setShowModalMeta(false)} />
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-lg text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg" style={{ backgroundColor: theme.card }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: theme.border }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold" style={{ color: theme.text }}>
                    {metaEditando ? '✏️ Editar Meta' : '➕ Nova Meta'}
                  </h3>
                  <button
                    onClick={() => setShowModalMeta(false)}
                    className="rounded-md text-2xl hover:text-white transition-colors"
                    style={{ color: theme.textMuted }}
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Técnico *</label>
                    <select
                      value={formMeta.tecnico_id}
                      onChange={(e) => setFormMeta({ ...formMeta, tecnico_id: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderColor: theme.border,
                        color: theme.text
                      }}
                      disabled={!!metaEditando}
                    >
                      <option value="">Selecione um técnico</option>
                      {tecnicos.filter(t => t.ativo).map(tecnico => (
                        <option key={tecnico.id} value={tecnico.id}>{tecnico.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Mês *</label>
                    <select
                      value={formMeta.mes}
                      onChange={(e) => setFormMeta({ ...formMeta, mes: Number(e.target.value) })}
                      className="w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderColor: theme.border,
                        color: theme.text
                      }}
                      disabled={!!metaEditando}
                    >
                      {meses.map((nome, index) => (
                        <option key={index + 1} value={index + 1}>{nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Valor da Meta (R$)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formMeta.valor_meta}
                      onChange={(e) => handleNumberInput(e.target.value, 'valor_meta', setFormMeta)}
                      className="w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderColor: theme.border,
                        color: theme.text
                      }}
                      placeholder="Digite o valor"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Valor Realizado (R$)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formMeta.valor_realizado}
                      onChange={(e) => handleNumberInput(e.target.value, 'valor_realizado', setFormMeta)}
                      className="w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderColor: theme.border,
                        color: theme.text
                      }}
                      placeholder="Digite o valor"
                    />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 flex justify-end gap-3" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                <button
                  onClick={() => setShowModalMeta(false)}
                  className="px-4 py-2 rounded-lg transition-colors hover:bg-white/10"
                  style={{ backgroundColor: 'transparent', border: `1px solid ${theme.border}`, color: theme.textSecondary }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvarMeta}
                  className="px-4 py-2 rounded-lg transition-all hover:shadow-lg"
                  style={{ backgroundColor: theme.primary, color: 'white' }}
                >
                  {metaEditando ? 'Salvar Alterações' : 'Cadastrar Meta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Fábrica */}
      {showModalFabrica && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setShowModalFabrica(false)} />
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-lg text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg" style={{ backgroundColor: theme.card }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: theme.border }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold" style={{ color: theme.text }}>
                    🏭 Editar Meta da Fábrica
                  </h3>
                  <button
                    onClick={() => setShowModalFabrica(false)}
                    className="rounded-md text-2xl hover:text-white transition-colors"
                    style={{ color: theme.textMuted }}
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Meta Mensal (R$)</label>
                    <input
                      type="number"
                      value={formFabrica.valor_meta}
                      onChange={(e) => setFormFabrica({ ...formFabrica, valor_meta: Number(e.target.value) })}
                      className="w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderColor: theme.border,
                        color: theme.text
                      }}
                      placeholder="0,00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Valor Realizado (R$)</label>
                    <input
                      type="number"
                      value={formFabrica.valor_realizado}
                      onChange={(e) => setFormFabrica({ ...formFabrica, valor_realizado: Number(e.target.value) })}
                      className="w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderColor: theme.border,
                        color: theme.text
                      }}
                      placeholder="0,00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(243, 156, 18, 0.1)' }}>
                    <p className="text-sm flex items-center gap-2" style={{ color: theme.warning }}>
                      <span className="text-lg">ℹ️</span>
                      A meta da fábrica é mensal e vale para {meses[new Date().getMonth()]} de {ano}.
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 flex justify-end gap-3" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                <button
                  onClick={() => setShowModalFabrica(false)}
                  className="px-4 py-2 rounded-lg transition-colors hover:bg-white/10"
                  style={{ backgroundColor: 'transparent', border: `1px solid ${theme.border}`, color: theme.textSecondary }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvarFabrica}
                  className="px-4 py-2 rounded-lg transition-all hover:shadow-lg"
                  style={{ backgroundColor: theme.primary, color: 'white' }}
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirmar Exclusão */}
      {showModalExcluir && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setShowModalExcluir(false)} />
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-lg text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg" style={{ backgroundColor: theme.card }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: theme.border }}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(231, 76, 60, 0.2)' }}>
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold" style={{ color: theme.text }}>Confirmar Exclusão</h3>
                    <p className="text-sm mt-1" style={{ color: theme.textMuted }}>Esta ação não poderá ser desfeita.</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4">
                <p style={{ color: theme.textSecondary }}>
                  Você tem certeza que deseja excluir <span className="font-bold" style={{ color: theme.text }}>{itemParaExcluir?.nome}</span>?
                </p>
                {itemParaExcluir?.tipo === 'tecnico' && (
                  <p className="text-sm mt-2" style={{ color: theme.textMuted }}>
                    Se este técnico possuir vendas associadas, ele será apenas desativado.
                  </p>
                )}
              </div>
              <div className="px-6 py-4 flex justify-end gap-3" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                <button
                  onClick={() => setShowModalExcluir(false)}
                  className="px-4 py-2 rounded-lg transition-colors hover:bg-white/10"
                  style={{ backgroundColor: 'transparent', border: `1px solid ${theme.border}`, color: theme.textSecondary }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmarExclusao}
                  className="px-4 py-2 rounded-lg transition-all hover:bg-[#c0392b]"
                  style={{ backgroundColor: theme.danger, color: 'white' }}
                >
                  Sim, excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}