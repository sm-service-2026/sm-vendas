'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface VendedorTecnologia {
  id: string
  nome: string
  comissao_padrao: number
  ativo: boolean
  created_at: string
}

interface MetaVendedor {
  id: string
  vendedor_id: string
  vendedor_nome?: string
  ano: number
  mes: number
  categoria: string
  valor_meta: number
  valor_realizado: number
  percentual?: number
}

interface MetaCategoria {
  id: string
  ano: number
  mes: number
  categoria: string
  valor_meta: number
  valor_realizado: number
  percentual?: number
}

export default function VendasTecnologiaPage() {
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
    purple: '#e74c3c',     // corrigido: valor correto para purple
    indigo: '#5dade2'      // corrigido: vírgula adicionada antes
  }

  // Estados principais
  const [loading, setLoading] = useState(true)
  const [ano, setAno] = useState(new Date().getFullYear())
  const [vendedores, setVendedores] = useState<VendedorTecnologia[]>([])
  const [metasVendedores, setMetasVendedores] = useState<MetaVendedor[]>([])
  const [metasCategorias, setMetasCategorias] = useState<MetaCategoria[]>([])

  // Estados para modais - Vendedores
  const [showModalVendedor, setShowModalVendedor] = useState(false)
  const [showModalMetaVendedor, setShowModalMetaVendedor] = useState(false)
  const [vendedorEditando, setVendedorEditando] = useState<VendedorTecnologia | null>(null)
  const [metaVendedorEditando, setMetaVendedorEditando] = useState<MetaVendedor | null>(null)

  // Estados para modais - Categorias
  const [showModalMetaCategoria, setShowModalMetaCategoria] = useState(false)
  const [metaCategoriaEditando, setMetaCategoriaEditando] = useState<MetaCategoria | null>(null)
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('')

  // Estados para modais - Exclusão
  const [showModalExcluir, setShowModalExcluir] = useState(false)
  const [itemParaExcluir, setItemParaExcluir] = useState<{ id: string, nome: string, tipo: 'vendedor' | 'metaVendedor' | 'metaCategoria' } | null>(null)

  // Estados para formulários
  const [formVendedor, setFormVendedor] = useState({
    nome: '',
    comissao_padrao: 10
  })

  const [formMetaVendedor, setFormMetaVendedor] = useState({
    vendedor_id: '',
    mes: new Date().getMonth() + 1,
    valor_meta: 0,
    valor_realizado: 0
  })

  const [formMetaCategoria, setFormMetaCategoria] = useState({
    categoria: '',
    mes: new Date().getMonth() + 1,
    valor_meta: 0,
    valor_realizado: 0
  })

  const [filtroVendedor, setFiltroVendedor] = useState<string>('todos')

  // Categorias fixas do Excel
  const categorias = [
    {
      nome: 'SINAIS PTx Trimble',
      comissao: 460,
      tipo: 'fixo',
      descricao: 'Comissão fixa por venda',
      cor: '#3498db'
    },
    {
      nome: 'Licenças PTx Trimble',
      comissao: 10,
      tipo: 'percentual',
      descricao: '10% do valor vendido',
      cor: '#27ae60'
    },
    {
      nome: 'Treinamentos Clientes',
      comissao: 83,
      tipo: 'percentual',
      descricao: '83% do valor vendido',
      cor: '#f39c12'
    },
    {
      nome: 'Hardwares PTx Trimble',
      comissao: 10,
      tipo: 'percentual',
      descricao: '10% do valor vendido',
      cor: '#e74c3c'
    }
  ]

  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const mesesAbreviados = [
    'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
    'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'
  ]

  const anos = [2024, 2025, 2026, 2027]

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
      // 1. Carregar vendedores
      const { data: vendedoresData, error: vendedoresError } = await supabase
        .from('vendedores_tecnologia')
        .select('*')
        .order('nome')
      if (vendedoresError) {
        if (vendedoresError.message.includes('does not exist')) {
          await criarTabelas()
          return
        }
        throw vendedoresError
      }
      setVendedores(vendedoresData || [])

      // 2. Carregar metas dos vendedores do ano selecionado
      const { data: metasVendedoresData, error: metasVendedoresError } = await supabase
        .from('metas_vendedores_tecnologia')
        .select('*, vendedores_tecnologia(nome)')
        .eq('ano', ano)
        .order('mes')
      if (metasVendedoresError && !metasVendedoresError.message.includes('does not exist')) {
        throw metasVendedoresError
      }
      const metasVendedoresProcessadas = (metasVendedoresData || []).map((meta: any) => ({
        ...meta,
        vendedor_nome: meta.vendedores_tecnologia?.nome,
        percentual: meta.valor_meta > 0
          ? (meta.valor_realizado / meta.valor_meta) * 100
          : 0
      }))
      setMetasVendedores(metasVendedoresProcessadas)

      // 3. Carregar metas das categorias do ano selecionado
      const { data: metasCategoriasData, error: metasCategoriasError } = await supabase
        .from('metas_categorias_tecnologia')
        .select('*')
        .eq('ano', ano)
        .order('mes')
      if (metasCategoriasError && !metasCategoriasError.message.includes('does not exist')) {
        throw metasCategoriasError
      }
      const metasCategoriasProcessadas = (metasCategoriasData || []).map((meta: any) => ({
        ...meta,
        percentual: meta.valor_meta > 0
          ? (meta.valor_realizado / meta.valor_meta) * 100
          : 0
      }))
      setMetasCategorias(metasCategoriasProcessadas)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  async function criarTabelas() {
    try {
      // Tabela de vendedores
      await supabase.rpc('criar_tabela_vendedores_tecnologia', {})
      
      // Tabela de metas dos vendedores
      await supabase.rpc('criar_tabela_metas_vendedores_tecnologia', {})
      
      // Tabela de metas das categorias
      await supabase.rpc('criar_tabela_metas_categorias_tecnologia', {})
      
      toast.success('Tabelas criadas com sucesso!')
      carregarDados()
    } catch (error) {
      console.error('Erro ao criar tabelas:', error)
      toast.error('Erro ao criar tabelas. Por favor, crie manualmente no Supabase.')
    }
  }

  // ========== CRUD VENDEDORES ==========
  function handleNovoVendedor() {
    setVendedorEditando(null)
    setFormVendedor({ nome: '', comissao_padrao: 10 })
    setShowModalVendedor(true)
  }

  function handleEditarVendedor(vendedor: VendedorTecnologia) {
    setVendedorEditando(vendedor)
    setFormVendedor({
      nome: vendedor.nome,
      comissao_padrao: vendedor.comissao_padrao
    })
    setShowModalVendedor(true)
  }

  async function handleSalvarVendedor() {
    if (!formVendedor.nome.trim()) {
      toast.error('Nome do vendedor é obrigatório')
      return
    }
    if (formVendedor.comissao_padrao < 0) {
      toast.error('Comissão não pode ser negativa')
      return
    }
    try {
      if (vendedorEditando) {
        const { error } = await supabase
          .from('vendedores_tecnologia')
          .update({
            nome: formVendedor.nome.toUpperCase(),
            comissao_padrao: formVendedor.comissao_padrao
          })
          .eq('id', vendedorEditando.id)
        if (error) throw error
        toast.success('Vendedor atualizado com sucesso!')
      } else {
        const { error } = await supabase
          .from('vendedores_tecnologia')
          .insert([{
            nome: formVendedor.nome.toUpperCase(),
            comissao_padrao: formVendedor.comissao_padrao,
            ativo: true
          }])
        if (error) throw error
        toast.success('Vendedor cadastrado com sucesso!')
      }
      setShowModalVendedor(false)
      carregarDados()
    } catch (error) {
      console.error('Erro ao salvar vendedor:', error)
      toast.error('Erro ao salvar vendedor')
    }
  }

  async function handleToggleAtivoVendedor(vendedor: VendedorTecnologia) {
    try {
      const { error } = await supabase
        .from('vendedores_tecnologia')
        .update({ ativo: !vendedor.ativo })
        .eq('id', vendedor.id)
      if (error) throw error
      toast.success(`Vendedor ${vendedor.ativo ? 'desativado' : 'ativado'} com sucesso!`)
      carregarDados()
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      toast.error('Erro ao alterar status do vendedor')
    }
  }

  // ========== CRUD METAS DOS VENDEDORES ==========
  function handleNovaMetaVendedor(vendedorId?: string, mes?: number) {
    const vendedor = vendedores.find(v => v.id === vendedorId)
   
    setMetaVendedorEditando(null)
    setFormMetaVendedor({
      vendedor_id: vendedorId || vendedores[0]?.id || '',
      mes: mes || new Date().getMonth() + 1,
      valor_meta: 0,
      valor_realizado: 0
    })
    setShowModalMetaVendedor(true)
  }

  function handleEditarMetaVendedor(meta: MetaVendedor) {
    setMetaVendedorEditando(meta)
    setFormMetaVendedor({
      vendedor_id: meta.vendedor_id,
      mes: meta.mes,
      valor_meta: meta.valor_meta,
      valor_realizado: meta.valor_realizado
    })
    setShowModalMetaVendedor(true)
  }

  async function handleSalvarMetaVendedor() {
    if (!formMetaVendedor.vendedor_id) {
      toast.error('Selecione um vendedor')
      return
    }
    if (formMetaVendedor.valor_meta < 0 || formMetaVendedor.valor_realizado < 0) {
      toast.error('Valores não podem ser negativos')
      return
    }
    try {
      if (metaVendedorEditando) {
        const { error } = await supabase
          .from('metas_vendedores_tecnologia')
          .update({
            valor_meta: formMetaVendedor.valor_meta,
            valor_realizado: formMetaVendedor.valor_realizado
          })
          .eq('id', metaVendedorEditando.id)
        if (error) throw error
        toast.success('Meta atualizada com sucesso!')
      } else {
        const { data: existente } = await supabase
          .from('metas_vendedores_tecnologia')
          .select('id')
          .eq('vendedor_id', formMetaVendedor.vendedor_id)
          .eq('ano', ano)
          .eq('mes', formMetaVendedor.mes)
          .maybeSingle()
        if (existente) {
          toast.error('Já existe uma meta para este vendedor e mês')
          return
        }
        const { error } = await supabase
          .from('metas_vendedores_tecnologia')
          .insert([{
            vendedor_id: formMetaVendedor.vendedor_id,
            ano: ano,
            mes: formMetaVendedor.mes,
            valor_meta: formMetaVendedor.valor_meta,
            valor_realizado: formMetaVendedor.valor_realizado
          }])
        if (error) throw error
        toast.success('Meta cadastrada com sucesso!')
      }
      setShowModalMetaVendedor(false)
      carregarDados()
    } catch (error) {
      console.error('Erro ao salvar meta:', error)
      toast.error('Erro ao salvar meta')
    }
  }

  // ========== CRUD METAS DAS CATEGORIAS ==========
  function handleNovaMetaCategoria(categoria?: string, mes?: number) {
    setMetaCategoriaEditando(null)
    setFormMetaCategoria({
      categoria: categoria || categorias[0].nome,
      mes: mes || new Date().getMonth() + 1,
      valor_meta: 0,
      valor_realizado: 0
    })
    setCategoriaSelecionada(categoria || categorias[0].nome)
    setShowModalMetaCategoria(true)
  }

  function handleEditarMetaCategoria(meta: MetaCategoria) {
    setMetaCategoriaEditando(meta)
    setFormMetaCategoria({
      categoria: meta.categoria,
      mes: meta.mes,
      valor_meta: meta.valor_meta,
      valor_realizado: meta.valor_realizado
    })
    setCategoriaSelecionada(meta.categoria)
    setShowModalMetaCategoria(true)
  }

  async function handleSalvarMetaCategoria() {
    if (!formMetaCategoria.categoria) {
      toast.error('Selecione uma categoria')
      return
    }
    if (formMetaCategoria.valor_meta < 0 || formMetaCategoria.valor_realizado < 0) {
      toast.error('Valores não podem ser negativos')
      return
    }
    try {
      if (metaCategoriaEditando) {
        const { error } = await supabase
          .from('metas_categorias_tecnologia')
          .update({
            valor_meta: formMetaCategoria.valor_meta,
            valor_realizado: formMetaCategoria.valor_realizado
          })
          .eq('id', metaCategoriaEditando.id)
        if (error) throw error
        toast.success('Meta atualizada com sucesso!')
      } else {
        const { data: existente } = await supabase
          .from('metas_categorias_tecnologia')
          .select('id')
          .eq('categoria', formMetaCategoria.categoria)
          .eq('ano', ano)
          .eq('mes', formMetaCategoria.mes)
          .maybeSingle()
        if (existente) {
          toast.error('Já existe uma meta para esta categoria e mês')
          return
        }
        const { error } = await supabase
          .from('metas_categorias_tecnologia')
          .insert([{
            categoria: formMetaCategoria.categoria,
            ano: ano,
            mes: formMetaCategoria.mes,
            valor_meta: formMetaCategoria.valor_meta,
            valor_realizado: formMetaCategoria.valor_realizado
          }])
        if (error) throw error
        toast.success('Meta cadastrada com sucesso!')
      }
      setShowModalMetaCategoria(false)
      carregarDados()
    } catch (error) {
      console.error('Erro ao salvar meta:', error)
      toast.error('Erro ao salvar meta')
    }
  }

  // ========== EXCLUSÃO ==========
  function handleExcluirClick(id: string, nome: string, tipo: 'vendedor' | 'metaVendedor' | 'metaCategoria') {
    setItemParaExcluir({ id, nome, tipo })
    setShowModalExcluir(true)
  }

  async function handleConfirmarExclusao() {
    if (!itemParaExcluir) return
    try {
      if (itemParaExcluir.tipo === 'vendedor') {
        const { data: metas } = await supabase
          .from('metas_vendedores_tecnologia')
          .select('id')
          .eq('vendedor_id', itemParaExcluir.id)
          .limit(1)
        if (metas && metas.length > 0) {
          await supabase
            .from('vendedores_tecnologia')
            .update({ ativo: false })
            .eq('id', itemParaExcluir.id)
         
          toast.success('Vendedor desativado (possui metas associadas)')
        } else {
          await supabase
            .from('vendedores_tecnologia')
            .delete()
            .eq('id', itemParaExcluir.id)
         
          toast.success('Vendedor excluído com sucesso!')
        }
      } else if (itemParaExcluir.tipo === 'metaVendedor') {
        await supabase
          .from('metas_vendedores_tecnologia')
          .delete()
          .eq('id', itemParaExcluir.id)
       
        toast.success('Meta excluída com sucesso!')
      } else if (itemParaExcluir.tipo === 'metaCategoria') {
        await supabase
          .from('metas_categorias_tecnologia')
          .delete()
          .eq('id', itemParaExcluir.id)
       
        toast.success('Meta excluída com sucesso!')
      }
      setShowModalExcluir(false)
      carregarDados()
    } catch (error) {
      console.error('Erro ao excluir:', error)
      toast.error('Erro ao excluir item')
    }
  }

  // ========== UTILITÁRIOS ==========
  function getMetaVendedor(vendedorId: string, mes: number): MetaVendedor | undefined {
    return metasVendedores.find(m => m.vendedor_id === vendedorId && m.mes === mes)
  }

  function getMetaCategoria(categoria: string, mes: number): MetaCategoria | undefined {
    return metasCategorias.find(m => m.categoria === categoria && m.mes === mes)
  }

  function calcularTotalVendedor(vendedorId: string) {
    const metasVendedor = metasVendedores.filter(m => m.vendedor_id === vendedorId)
    const totalMeta = metasVendedor.reduce((acc, m) => acc + m.valor_meta, 0)
    const totalRealizado = metasVendedor.reduce((acc, m) => acc + m.valor_realizado, 0)
    const percentual = totalMeta > 0 ? (totalRealizado / totalMeta) * 100 : 0
   
    return { totalMeta, totalRealizado, percentual }
  }

  function calcularTotalCategoria(categoria: string) {
    const metasCategoria = metasCategorias.filter(m => m.categoria === categoria)
    const totalMeta = metasCategoria.reduce((acc, m) => acc + m.valor_meta, 0)
    const totalRealizado = metasCategoria.reduce((acc, m) => acc + m.valor_realizado, 0)
    const percentual = totalMeta > 0 ? (totalRealizado / totalMeta) * 100 : 0
   
    return { totalMeta, totalRealizado, percentual }
  }

  function calcularComissao(valor: number, categoriaNome: string) {
    if (valor <= 0) return 0
   
    const categoria = categorias.find(c => c.nome === categoriaNome)
    if (!categoria) return 0
   
    if (categoria.tipo === 'percentual') {
      return valor * (categoria.comissao / 100)
    } else {
      return categoria.comissao
    }
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

  const formatMoeda = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  const formatComissao = (categoriaNome: string) => {
    const categoria = categorias.find(c => c.nome === categoriaNome)
    if (!categoria) return ''
   
    if (categoria.tipo === 'percentual') {
      return `${categoria.comissao}%`
    } else {
      return formatMoeda(categoria.comissao)
    }
  }

  // Totais gerais
  const totalMetaVendedores = vendedores
    .filter(v => v.ativo)
    .reduce((acc, vendedor) => {
      const totais = calcularTotalVendedor(vendedor.id)
      return acc + totais.totalMeta
    }, 0)

  const totalRealizadoVendedores = vendedores
    .filter(v => v.ativo)
    .reduce((acc, vendedor) => {
      const totais = calcularTotalVendedor(vendedor.id)
      return acc + totais.totalRealizado
    }, 0)

  const totalMetaCategorias = categorias.reduce((acc, categoria) => {
    const totais = calcularTotalCategoria(categoria.nome)
    return acc + totais.totalMeta
  }, 0)

  const totalRealizadoCategorias = categorias.reduce((acc, categoria) => {
    const totais = calcularTotalCategoria(categoria.nome)
    return acc + totais.totalRealizado
  }, 0)

  const percentualGeralVendedores = totalMetaVendedores > 0
    ? (totalRealizadoVendedores / totalMetaVendedores) * 100
    : 0

  const percentualGeralCategorias = totalMetaCategorias > 0
    ? (totalRealizadoCategorias / totalMetaCategorias) * 100
    : 0

  // Total de comissões
  const totalComissoes = metasCategorias.reduce((acc, meta) => {
    return acc + calcularComissao(meta.valor_realizado, meta.categoria)
  }, 0)

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center" style={{ backgroundColor: theme.background }}>
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-transparent" style={{ borderColor: theme.purple, borderTopColor: 'transparent' }} />
        <p className="text-white mt-4 text-lg font-medium">Carregando vendas de tecnologia...</p>
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
                className="p-2 rounded-lg transition-colors"
                style={{ color: theme.textSecondary }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { 
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; 
                  e.currentTarget.style.color = theme.text; 
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { 
                  e.currentTarget.style.backgroundColor = 'transparent'; 
                  e.currentTarget.style.color = theme.textSecondary; 
                }}
              >
                <span className="text-xl">←</span>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold" style={{ color: theme.text }}>💻 Vendas - Tecnologia</h1>
                  <span className="px-3 py-1 text-sm font-medium rounded-full" style={{ backgroundColor: 'rgba(155, 89, 182, 0.2)', color: theme.purple, border: `1px solid rgba(155, 89, 182, 0.3)` }}>
                    {ano}
                  </span>
                </div>
                <p className="text-sm mt-1" style={{ color: theme.textSecondary }}>
                  Metas de vendedores e categorias de produtos
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
                onClick={handleNovoVendedor}
                className="px-4 py-2 text-sm rounded-lg transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
                style={{ backgroundColor: theme.purple, color: 'white' }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = '#cf1c08'}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = theme.purple}
              >
                <span className="text-lg">+</span>
                Novo Vendedor
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Conteúdo Principal */}
      <main className="w-full pt-20">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* ========== TABELA 1: VENDEDORES ========== */}
            <div className="rounded-xl shadow-sm overflow-hidden border" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
              <div className="px-6 py-4" style={{ backgroundColor: theme.purple, borderBottom: `1px solid ${theme.border}` }}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center backdrop-blur-sm" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                      <span className="text-white text-xl">👥</span>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">Metas dos Vendedores</h2>
                      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>
                        {vendedores.filter(v => v.ativo).length} vendedores ativos •
                        Total: {formatMoeda(totalRealizadoVendedores)} / {formatMoeda(totalMetaVendedores)}
                        ({percentualGeralVendedores.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={filtroVendedor}
                      onChange={(e) => setFiltroVendedor(e.target.value)}
                      className="px-3 py-1.5 text-sm rounded-lg border-0 focus:ring-2 focus:ring-white outline-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
                    >
                      <option value="todos" style={{ backgroundColor: theme.card, color: theme.text }}>Todos os vendedores</option>
                      {vendedores.filter(v => v.ativo).map(v => (
                        <option key={v.id} value={v.id} style={{ backgroundColor: theme.card, color: theme.text }}>{v.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-6">
                {vendedores.filter(v => v.ativo).length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">👥</div>
                    <h3 className="text-xl font-semibold mb-2" style={{ color: theme.text }}>Nenhum vendedor cadastrado</h3>
                    <p className="mb-6" style={{ color: theme.textSecondary }}>Clique no botão "Novo Vendedor" para começar a cadastrar</p>
                    <button
                      onClick={handleNovoVendedor}
                      className="px-6 py-3 rounded-lg transition-all inline-flex items-center gap-2 shadow-lg"
                      style={{ backgroundColor: theme.purple, color: 'white' }}
                      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = '#cf1c08'}
                      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = theme.purple}
                    >
                      <span className="text-lg">+</span>
                      Novo Vendedor
                    </button>
                  </div>
                ) : (
                  vendedores
                    .filter(v => v.ativo && (filtroVendedor === 'todos' ? true : v.id === filtroVendedor))
                    .map((vendedor) => {
                      const totais = calcularTotalVendedor(vendedor.id)
                      const statusAnual = getStatusMeta(totais.percentual)
                      return (
                        <div key={vendedor.id} className="rounded-xl shadow-sm overflow-hidden border" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
                          {/* Cabeçalho do Vendedor */}
                          <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', borderBottom: `1px solid ${theme.border}` }} className="px-6 py-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md" style={{ backgroundColor: theme.purple }}>
                                  {vendedor.nome.charAt(0)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-bold" style={{ color: theme.text }}>{vendedor.nome}</h2>
                                    <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: statusAnual.bg, color: statusAnual.cor, border: `1px solid ${statusAnual.cor}30` }}>
                                      {statusAnual.icone} {statusAnual.texto}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className="text-sm" style={{ color: theme.textSecondary }}>
                                      Comissão padrão: {vendedor.comissao_padrao}%
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
                                  onClick={() => handleNovaMetaVendedor(vendedor.id)}
                                  className="px-3 py-1.5 text-sm rounded-lg transition-all flex items-center gap-1"
                                  style={{ backgroundColor: theme.success, color: 'white' }}
                                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = '#219a52'}
                                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = theme.success}
                                >
                                  <span>+</span>
                                  Nova Meta
                                </button>
                                <button
                                  onClick={() => handleEditarVendedor(vendedor)}
                                  className="p-2 rounded-lg transition-colors"
                                  style={{ color: theme.purple }}
                                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { 
                                    e.currentTarget.style.backgroundColor = 'rgba(155, 89, 182, 0.1)'; 
                                    e.currentTarget.style.color = '#8e44ad'; 
                                  }}
                                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { 
                                    e.currentTarget.style.backgroundColor = 'transparent'; 
                                    e.currentTarget.style.color = theme.purple; 
                                  }}
                                  title="Editar vendedor"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleToggleAtivoVendedor(vendedor)}
                                  className="p-2 rounded-lg transition-colors"
                                  style={{ color: theme.danger }}
                                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = 'rgba(231, 76, 60, 0.1)'}
                                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = 'transparent'}
                                  title="Desativar vendedor"
                                >
                                  🔴
                                </button>
                                <button
                                  onClick={() => handleExcluirClick(vendedor.id, vendedor.nome, 'vendedor')}
                                  className="p-2 rounded-lg transition-colors"
                                  style={{ color: theme.danger }}
                                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = 'rgba(231, 76, 60, 0.1)'}
                                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = 'transparent'}
                                  title="Excluir vendedor"
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
                                  className={`h-2.5 rounded-full transition-all duration-500`}
                                  style={{
                                    width: `${Math.min(totais.percentual, 100)}%`,
                                    backgroundColor: totais.percentual >= 100 ? theme.success : totais.percentual >= 70 ? theme.warning : theme.danger
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Tabela de Metas Mensais do Vendedor */}
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
                                  const meta = getMetaVendedor(vendedor.id, mes)
                                  const percentual = meta && meta.valor_meta > 0 ? (meta.valor_realizado / meta.valor_meta) * 100 : 0
                                  const status = getStatusMeta(percentual)
                                  return (
                                    <tr key={mes} className="transition-colors hover:bg-opacity-10" style={{ backgroundColor: 'transparent' }}>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium" style={{ color: theme.text }}>
                                        {mesesAbreviados[index]}
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
                                          <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: status.bg, color: status.cor, border: `1px solid ${status.cor}30` }}>
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
                                              color: percentual >= 100 ? theme.success : percentual >= 70 ? theme.warning : theme.danger
                                            }}>
                                              {percentual.toFixed(1)}%
                                            </span>
                                            <div className="w-16 rounded-full h-1.5" style={{ backgroundColor: theme.border }}>
                                              <div
                                                className="h-1.5 rounded-full"
                                                style={{
                                                  width: `${Math.min(percentual, 100)}%`,
                                                  backgroundColor: percentual >= 100 ? theme.success : percentual >= 70 ? theme.warning : theme.danger
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
                                                onClick={() => handleEditarMetaVendedor(meta)}
                                                className="p-1.5 rounded-md transition-colors"
                                                style={{ color: theme.purple }}
                                                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { 
                                                  e.currentTarget.style.backgroundColor = 'rgba(155, 89, 182, 0.1)' 
                                                }}
                                                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { 
                                                  e.currentTarget.style.backgroundColor = 'transparent' 
                                                }}
                                                title="Editar meta"
                                              >
                                                ✏️
                                              </button>
                                              <button
                                                onClick={() => handleExcluirClick(meta.id, `Meta ${nomeMes}`, 'metaVendedor')}
                                                className="p-1.5 rounded-md transition-colors"
                                                style={{ color: theme.danger }}
                                                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { 
                                                  e.currentTarget.style.backgroundColor = 'rgba(231, 76, 60, 0.1)' 
                                                }}
                                                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { 
                                                  e.currentTarget.style.backgroundColor = 'transparent' 
                                                }}
                                                title="Excluir meta"
                                              >
                                                🗑️
                                              </button>
                                            </>
                                          ) : (
                                            <button
                                              onClick={() => handleNovaMetaVendedor(vendedor.id, mes)}
                                              className="p-1.5 rounded-md transition-colors"
                                              style={{ color: theme.success }}
                                              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { 
                                                e.currentTarget.style.backgroundColor = 'rgba(39, 174, 96, 0.1)' 
                                              }}
                                              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { 
                                                e.currentTarget.style.backgroundColor = 'transparent' 
                                              }}
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
                              <tfoot style={{ backgroundColor: 'rgba(155, 89, 182, 0.1)' }}>
                                <tr>
                                  <td className="px-4 py-3 text-sm font-semibold" style={{ color: theme.text }}>TOTAL</td>
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
                                        metasVendedores
                                          .filter(m => m.vendedor_id === vendedor.id)
                                          .forEach(meta => {
                                            handleExcluirClick(meta.id, `Todas as metas de ${vendedor.nome}`, 'metaVendedor')
                                          })
                                      }}
                                      className="p-1.5 rounded-md transition-colors"
                                      style={{ color: theme.danger }}
                                      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { 
                                        e.currentTarget.style.backgroundColor = 'rgba(231, 76, 60, 0.1)' 
                                      }}
                                      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { 
                                        e.currentTarget.style.backgroundColor = 'transparent' 
                                      }}
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
                    })
                )}

                {/* Vendedores Inativos */}
                {vendedores.filter(v => !v.ativo).length > 0 && (
                  <div className="rounded-xl p-6 border" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', borderColor: theme.border }}>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: theme.text }}>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.textMuted }}></span>
                      Vendedores Inativos
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {vendedores.filter(v => !v.ativo).map(vendedor => (
                        <div key={vendedor.id} className="rounded-lg p-4 flex justify-between items-center border" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
                          <div>
                            <p className="font-medium" style={{ color: theme.text }}>{vendedor.nome}</p>
                            <p className="text-sm" style={{ color: theme.textMuted }}>Comissão: {vendedor.comissao_padrao}%</p>
                          </div>
                          <button
                            onClick={() => handleToggleAtivoVendedor(vendedor)}
                            className="px-3 py-1.5 text-sm rounded-lg transition-colors"
                            style={{ backgroundColor: theme.success, color: 'white' }}
                            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = '#219a52'}
                            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = theme.success}
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

            {/* ========== TABELA 2: CATEGORIAS ========== */}
            <div className="rounded-xl shadow-sm overflow-hidden border" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
              <div className="px-6 py-4" style={{ backgroundColor: theme.indigo, borderBottom: `1px solid ${theme.border}` }}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center backdrop-blur-sm" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                      <span className="text-white text-xl">📦</span>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">Metas por Categoria</h2>
                      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>
                        SINAIS PTx • Licenças • Treinamentos • Hardwares •
                        Total: {formatMoeda(totalRealizadoCategorias)} / {formatMoeda(totalMetaCategorias)}
                        ({percentualGeralCategorias.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                  <div className="text-white text-sm px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                    Comissões totais: {formatMoeda(totalComissoes)}
                  </div>
                </div>
              </div>
              <div className="p-6">
                {/* Cards de resumo das categorias */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {categorias.map((categoria, index) => {
                    const totais = calcularTotalCategoria(categoria.nome)
                    const percentual = totais.percentual
                    return (
                      <div key={index} className="rounded-lg p-4 text-white shadow-md" style={{ backgroundColor: categoria.cor }}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium text-white/90">{categoria.nome}</p>
                            <p className="text-2xl font-bold mt-1">
                              {formatMoeda(totais.totalRealizado)}
                            </p>
                            <p className="text-xs text-white/80 mt-1">
                              Meta: {formatMoeda(totais.totalMeta)}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold">
                              {percentual.toFixed(1)}%
                            </span>
                            <p className="text-xs text-white/80 mt-1">
                              {formatComissao(categoria.nome)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 w-full bg-white/30 rounded-full h-1.5">
                          <div
                            className="bg-white rounded-full h-1.5"
                            style={{ width: `${Math.min(percentual, 100)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Tabela de Metas Mensais por Categoria */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Mês</th>
                        {categorias.map(categoria => (
                          <th key={categoria.nome} className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>
                            <div>{categoria.nome.split(' ')[0]}</div>
                            <div className="text-[10px] font-normal mt-0.5" style={{ color: theme.textMuted }}>
                              {formatComissao(categoria.nome)}
                            </div>
                          </th>
                        ))}
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Total</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: theme.border }}>
                      {meses.map((nomeMes, index) => {
                        const mes = index + 1
                       
                        let totalMetaMes = 0
                        let totalRealizadoMes = 0
                       
                        categorias.forEach(categoria => {
                          const meta = getMetaCategoria(categoria.nome, mes)
                          totalMetaMes += meta?.valor_meta || 0
                          totalRealizadoMes += meta?.valor_realizado || 0
                        })
                        const percentualMes = totalMetaMes > 0 ? (totalRealizadoMes / totalMetaMes) * 100 : 0
                        return (
                          <tr key={mes} className="transition-colors hover:bg-opacity-10">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium" style={{ color: theme.text }}>
                              {mesesAbreviados[index]}
                            </td>
                           
                            {categorias.map(categoria => {
                              const meta = getMetaCategoria(categoria.nome, mes)
                              const percentual = meta && meta.valor_meta > 0 ? (meta.valor_realizado / meta.valor_meta) * 100 : 0
                             
                              return (
                                <td key={categoria.nome} className="px-4 py-3 text-sm border-l" style={{ borderColor: theme.border }}>
                                  {meta ? (
                                    <div className="space-y-1">
                                      <div className="text-xs" style={{ color: theme.textMuted }}>
                                        Meta: <span style={{ color: theme.text }}>{formatMoeda(meta.valor_meta)}</span>
                                      </div>
                                      <div className="text-xs">
                                        <span style={{ color: theme.textMuted }}>Real: </span>
                                        <span style={{ color: meta.valor_realizado > 0 ? theme.success : theme.textMuted }}>
                                          {formatMoeda(meta.valor_realizado)}
                                        </span>
                                      </div>
                                      {meta.valor_realizado > 0 && (
                                        <div className="text-xs" style={{ color: theme.purple }}>
                                          Comissão: {formatMoeda(calcularComissao(meta.valor_realizado, categoria.nome))}
                                        </div>
                                      )}
                                      <div className="w-full rounded-full h-1 mt-1" style={{ backgroundColor: theme.border }}>
                                        <div
                                          className="h-1 rounded-full"
                                          style={{
                                            width: `${Math.min(percentual, 100)}%`,
                                            backgroundColor: percentual >= 100 ? theme.success : theme.warning
                                          }}
                                        />
                                      </div>
                                      <div className="flex justify-end">
                                        <button
                                          onClick={() => handleEditarMetaCategoria(meta)}
                                          className="text-xs transition-colors"
                                          style={{ color: theme.primary }}
                                          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.color = theme.primaryDark}
                                          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.color = theme.primary}
                                        >
                                          editar
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center gap-1">
                                      <button
                                        onClick={() => handleNovaMetaCategoria(categoria.nome, mes)}
                                        className="p-1.5 rounded-md transition-colors"
                                        style={{ color: theme.success }}
                                        onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = 'rgba(39, 174, 96, 0.1)'}
                                        onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        title="Adicionar meta"
                                      >
                                        ➕
                                      </button>
                                      <span className="text-[10px]" style={{ color: theme.textMuted }}>
                                        {formatComissao(categoria.nome)}
                                      </span>
                                    </div>
                                  )}
                                </td>
                              )
                            })}
                           
                            <td className="px-4 py-3 text-sm text-center border-l" style={{ borderColor: theme.border, backgroundColor: 'rgba(0,0,0,0.2)' }}>
                              <div className="space-y-1">
                                <div className="text-xs" style={{ color: theme.textMuted }}>
                                  Meta: <span className="font-medium" style={{ color: theme.text }}>{formatMoeda(totalMetaMes)}</span>
                                </div>
                                <div className="text-xs" style={{ color: theme.textMuted }}>
                                  Real: <span className="font-medium" style={{ color: theme.success }}>{formatMoeda(totalRealizadoMes)}</span>
                                </div>
                                <div className="text-xs font-semibold" style={{ color: theme.text }}>
                                  {percentualMes.toFixed(1)}%
                                </div>
                              </div>
                            </td>
                           
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                              <button
                                onClick={() => {
                                  categorias.forEach(categoria => {
                                    const meta = getMetaCategoria(categoria.nome, mes)
                                    if (meta) {
                                      handleExcluirClick(meta.id, `Meta ${nomeMes}`, 'metaCategoria')
                                    }
                                  })
                                }}
                                className="p-1.5 rounded-md transition-colors"
                                style={{ color: theme.danger }}
                                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = 'rgba(231, 76, 60, 0.1)'}
                                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = 'transparent'}
                                title="Excluir todas as metas do mês"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot style={{ backgroundColor: 'rgba(93, 173, 226, 0.1)' }}>
                      <tr>
                        <td className="px-4 py-3 text-sm font-semibold" style={{ color: theme.text }}>TOTAL ANUAL</td>
                        {categorias.map(categoria => {
                          const totais = calcularTotalCategoria(categoria.nome)
                          const percentual = totais.percentual
                          const totalComissao = metasCategorias
                            .filter(m => m.categoria === categoria.nome)
                            .reduce((acc, m) => acc + calcularComissao(m.valor_realizado, categoria.nome), 0)
                         
                          return (
                            <td key={categoria.nome} className="px-4 py-3 text-sm text-center border-l" style={{ borderColor: theme.border }}>
                              <div className="space-y-1">
                                <div className="text-xs font-medium" style={{ color: theme.text }}>
                                  {formatMoeda(totais.totalMeta)}
                                </div>
                                <div className="text-xs font-semibold" style={{ color: theme.success }}>
                                  {formatMoeda(totais.totalRealizado)}
                                </div>
                                <div className="text-xs font-medium" style={{
                                  color: percentual >= 100 ? theme.success : percentual >= 70 ? theme.warning : theme.danger
                                }}>
                                  {percentual.toFixed(1)}%
                                </div>
                                {totalComissao > 0 && (
                                  <div className="text-[10px]" style={{ color: theme.purple }}>
                                    Comissão: {formatMoeda(totalComissao)}
                                  </div>
                                )}
                              </div>
                            </td>
                          )
                        })}
                        <td className="px-4 py-3 text-sm text-center border-l" style={{ borderColor: theme.border, backgroundColor: 'rgba(93, 173, 226, 0.2)' }}>
                          <div className="space-y-1">
                            <div className="text-xs font-bold" style={{ color: theme.text }}>
                              {formatMoeda(totalMetaCategorias)}
                            </div>
                            <div className="text-xs font-bold" style={{ color: theme.success }}>
                              {formatMoeda(totalRealizadoCategorias)}
                            </div>
                            <div className="text-xs font-bold" style={{
                              color: percentualGeralCategorias >= 100 ? theme.success : percentualGeralCategorias >= 70 ? theme.warning : theme.danger
                            }}>
                              {percentualGeralCategorias.toFixed(1)}%
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-right"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL: Vendedor */}
      {showModalVendedor && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setShowModalVendedor(false)} />
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-lg text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg" style={{ backgroundColor: theme.card }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: theme.border }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold" style={{ color: theme.text }}>
                    {vendedorEditando ? '✏️ Editar Vendedor' : '➕ Novo Vendedor'}
                  </h3>
                  <button
                    onClick={() => setShowModalVendedor(false)}
                    className="rounded-md text-2xl transition-colors"
                    style={{ color: theme.textMuted }}
                    onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.color = theme.text}
                    onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.color = theme.textMuted}
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Nome do Vendedor *</label>
                    <input
                      type="text"
                      value={formVendedor.nome}
                      onChange={(e) => setFormVendedor({ ...formVendedor, nome: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderColor: theme.border,
                        color: theme.text
                      }}
                      placeholder="Ex: CARLOS SILVA"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Comissão Padrão (%)</label>
                    <input
                      type="number"
                      value={formVendedor.comissao_padrao}
                      onChange={(e) => setFormVendedor({ ...formVendedor, comissao_padrao: Number(e.target.value) })}
                      className="w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderColor: theme.border,
                        color: theme.text
                      }}
                      placeholder="10"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
                      Comissão padrão para vendas sem produto específico
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 flex justify-end gap-3" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                <button
                  onClick={() => setShowModalVendedor(false)}
                  className="px-4 py-2 rounded-lg transition-colors"
                  style={{ backgroundColor: 'transparent', border: `1px solid ${theme.border}`, color: theme.textSecondary }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { 
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; 
                    e.currentTarget.style.color = theme.text; 
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { 
                    e.currentTarget.style.backgroundColor = 'transparent'; 
                    e.currentTarget.style.color = theme.textSecondary; 
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvarVendedor}
                  className="px-4 py-2 rounded-lg transition-all"
                  style={{ backgroundColor: theme.purple, color: 'white' }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = '#8e44ad'}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = theme.purple}
                >
                  {vendedorEditando ? 'Salvar Alterações' : 'Cadastrar Vendedor'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Meta do Vendedor */}
      {showModalMetaVendedor && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setShowModalMetaVendedor(false)} />
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-lg text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg" style={{ backgroundColor: theme.card }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: theme.border }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold" style={{ color: theme.text }}>
                    {metaVendedorEditando ? '✏️ Editar Meta' : '➕ Nova Meta'}
                  </h3>
                  <button
                    onClick={() => setShowModalMetaVendedor(false)}
                    className="rounded-md text-2xl transition-colors"
                    style={{ color: theme.textMuted }}
                    onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.color = theme.text}
                    onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.color = theme.textMuted}
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Vendedor *</label>
                    <select
                      value={formMetaVendedor.vendedor_id}
                      onChange={(e) => setFormMetaVendedor({ ...formMetaVendedor, vendedor_id: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderColor: theme.border,
                        color: theme.text
                      }}
                      disabled={!!metaVendedorEditando}
                    >
                      <option value="" style={{ backgroundColor: theme.card, color: theme.text }}>Selecione um vendedor</option>
                      {vendedores.filter(v => v.ativo).map(vendedor => (
                        <option key={vendedor.id} value={vendedor.id} style={{ backgroundColor: theme.card, color: theme.text }}>
                          {vendedor.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Mês *</label>
                    <select
                      value={formMetaVendedor.mes}
                      onChange={(e) => setFormMetaVendedor({ ...formMetaVendedor, mes: Number(e.target.value) })}
                      className="w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderColor: theme.border,
                        color: theme.text
                      }}
                      disabled={!!metaVendedorEditando}
                    >
                      {meses.map((nome, index) => (
                        <option key={index + 1} value={index + 1} style={{ backgroundColor: theme.card, color: theme.text }}>{nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Valor da Meta (R$)</label>
                    <input
                      type="number"
                      value={formMetaVendedor.valor_meta}
                      onChange={(e) => setFormMetaVendedor({ ...formMetaVendedor, valor_meta: Number(e.target.value) })}
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
                      value={formMetaVendedor.valor_realizado}
                      onChange={(e) => setFormMetaVendedor({ ...formMetaVendedor, valor_realizado: Number(e.target.value) })}
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
                </div>
              </div>
              <div className="px-6 py-4 flex justify-end gap-3" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                <button
                  onClick={() => setShowModalMetaVendedor(false)}
                  className="px-4 py-2 rounded-lg transition-colors"
                  style={{ backgroundColor: 'transparent', border: `1px solid ${theme.border}`, color: theme.textSecondary }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { 
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; 
                    e.currentTarget.style.color = theme.text; 
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { 
                    e.currentTarget.style.backgroundColor = 'transparent'; 
                    e.currentTarget.style.color = theme.textSecondary; 
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvarMetaVendedor}
                  className="px-4 py-2 rounded-lg transition-all"
                  style={{ backgroundColor: theme.purple, color: 'white' }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = '#8e44ad'}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = theme.purple}
                >
                  {metaVendedorEditando ? 'Salvar Alterações' : 'Cadastrar Meta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Meta da Categoria */}
      {showModalMetaCategoria && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setShowModalMetaCategoria(false)} />
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-lg text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg" style={{ backgroundColor: theme.card }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: theme.border }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold" style={{ color: theme.text }}>
                    {metaCategoriaEditando ? '✏️ Editar Meta' : '➕ Nova Meta'}
                  </h3>
                  <button
                    onClick={() => setShowModalMetaCategoria(false)}
                    className="rounded-md text-2xl transition-colors"
                    style={{ color: theme.textMuted }}
                    onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.color = theme.text}
                    onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.color = theme.textMuted}
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Categoria *</label>
                    <select
                      value={formMetaCategoria.categoria}
                      onChange={(e) => setFormMetaCategoria({ ...formMetaCategoria, categoria: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderColor: theme.border,
                        color: theme.text
                      }}
                      disabled={!!metaCategoriaEditando}
                    >
                      {categorias.map((categoria, index) => (
                        <option key={index} value={categoria.nome} style={{ backgroundColor: theme.card, color: theme.text }}>
                          {categoria.nome} ({formatComissao(categoria.nome)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Mês *</label>
                    <select
                      value={formMetaCategoria.mes}
                      onChange={(e) => setFormMetaCategoria({ ...formMetaCategoria, mes: Number(e.target.value) })}
                      className="w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderColor: theme.border,
                        color: theme.text
                      }}
                      disabled={!!metaCategoriaEditando}
                    >
                      {meses.map((nome, index) => (
                        <option key={index + 1} value={index + 1} style={{ backgroundColor: theme.card, color: theme.text }}>{nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Valor da Meta (R$)</label>
                    <input
                      type="number"
                      value={formMetaCategoria.valor_meta}
                      onChange={(e) => setFormMetaCategoria({ ...formMetaCategoria, valor_meta: Number(e.target.value) })}
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
                      value={formMetaCategoria.valor_realizado}
                      onChange={(e) => setFormMetaCategoria({ ...formMetaCategoria, valor_realizado: Number(e.target.value) })}
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
                  {formMetaCategoria.categoria && (
                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(155, 89, 182, 0.1)' }}>
                      <p className="text-sm flex items-center gap-2" style={{ color: theme.purple }}>
                        <span className="text-lg">💰</span>
                        {(() => {
                          const comissao = calcularComissao(formMetaCategoria.valor_realizado, formMetaCategoria.categoria)
                          return `Comissão estimada: ${formatMoeda(comissao)}`
                        })()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-6 py-4 flex justify-end gap-3" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                <button
                  onClick={() => setShowModalMetaCategoria(false)}
                  className="px-4 py-2 rounded-lg transition-colors"
                  style={{ backgroundColor: 'transparent', border: `1px solid ${theme.border}`, color: theme.textSecondary }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { 
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; 
                    e.currentTarget.style.color = theme.text; 
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { 
                    e.currentTarget.style.backgroundColor = 'transparent'; 
                    e.currentTarget.style.color = theme.textSecondary; 
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvarMetaCategoria}
                  className="px-4 py-2 rounded-lg transition-all"
                  style={{ backgroundColor: theme.purple, color: 'white' }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = '#8e44ad'}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = theme.purple}
                >
                  {metaCategoriaEditando ? 'Salvar Alterações' : 'Cadastrar Meta'}
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
                {itemParaExcluir?.tipo === 'vendedor' && (
                  <p className="text-sm mt-2" style={{ color: theme.textMuted }}>
                    Se este vendedor possuir metas associadas, ele será apenas desativado.
                  </p>
                )}
              </div>
              <div className="px-6 py-4 flex justify-end gap-3" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                <button
                  onClick={() => setShowModalExcluir(false)}
                  className="px-4 py-2 rounded-lg transition-colors"
                  style={{ backgroundColor: 'transparent', border: `1px solid ${theme.border}`, color: theme.textSecondary }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { 
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; 
                    e.currentTarget.style.color = theme.text; 
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { 
                    e.currentTarget.style.backgroundColor = 'transparent'; 
                    e.currentTarget.style.color = theme.textSecondary; 
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmarExclusao}
                  className="px-4 py-2 rounded-lg transition-all"
                  style={{ backgroundColor: theme.danger, color: 'white' }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = '#c0392b'}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = theme.danger}
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