'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function RelatorioMensalPage() {
  const router = useRouter()
  const supabase = createClient()
  const printRef = useRef<HTMLDivElement>(null)

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
    purple: '#9b59b6',
    indigo: '#5dade2',
    orange: '#e67e22',
    blue: '#3498db',
    yellow: '#f39c12',
    red: '#e74c3c'
  }

  // Estados
  const [loading, setLoading] = useState(true)
  const [ano, setAno] = useState(new Date().getFullYear())
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [dadosRelatorio, setDadosRelatorio] = useState<any>(null)
  const [exportando, setExportando] = useState(false)
  const [user, setUser] = useState<any>(null)

  const anos = [2024, 2025, 2026, 2027]
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const mesesAbreviados = [
    'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
    'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'
  ]

  // Cores para gráficos
  const CORES = {
    blue: '#3498db',
    green: '#27ae60',
    yellow: '#f39c12',
    red: '#e74c3c',
    purple: '#9b59b6',
    gray: '#7f8c8d',
    indigo: '#5dade2',
    orange: '#e67e22'
  }

  useEffect(() => {
    async function verificarAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
      }
    }
    verificarAuth()
  }, [router, supabase])

  useEffect(() => {
    async function carregarRelatorio() {
      setLoading(true)
      try {
        // 1. Buscar vendas do mês
        const { data: vendas } = await supabase
          .from('vendas_servicos')
          .select('*, tecnicos(nome)')
          .eq('ano', ano)
          .eq('mes', mes)

        // 2. Buscar metas dos técnicos
        const { data: metas } = await supabase
          .from('metas_tecnicos')
          .select('*, tecnicos(nome)')
          .eq('ano', ano)
          .eq('mes', mes)

        // 3. Buscar logística do mês
        const lastDay = new Date(ano, mes, 0).getDate()
        const startDate = `${ano}-${String(mes).padStart(2, '0')}-01`
        const endDate = `${ano}-${String(mes).padStart(2, '0')}-${lastDay}`
        
        const { data: logistica } = await supabase
          .from('caminhoes_logistica')
          .select('*')
          .gte('data', startDate)
          .lte('data', endDate)

        // 4. Buscar metas da fábrica
        const { data: fabrica } = await supabase
          .from('fabrica_metas')
          .select('*')
          .eq('ano', ano)
          .eq('mes', mes)

        // 5. Buscar vendas do mês anterior para comparativo
        const mesAnterior = mes === 1 ? 12 : mes - 1
        const anoAnterior = mes === 1 ? ano - 1 : ano
        
        const { data: vendasMesAnterior } = await supabase
          .from('vendas_servicos')
          .select('*')
          .eq('ano', anoAnterior)
          .eq('mes', mesAnterior)

        // 6. Buscar vendas do mesmo mês do ano anterior
        const { data: vendasAnoAnterior } = await supabase
          .from('vendas_servicos')
          .select('*')
          .eq('ano', ano - 1)
          .eq('mes', mes)

        // 7. Buscar todas as vendas do ano para o gráfico de tendência
        const { data: vendasAno } = await supabase
          .from('vendas_servicos')
          .select('*')
          .eq('ano', ano)
          .order('mes', { ascending: true })

        // Processar dados
        const relatorio = await processarDados(
          vendas || [], 
          metas || [], 
          logistica || [], 
          fabrica || [], 
          vendasMesAnterior || [],
          vendasAnoAnterior || [],
          vendasAno || []
        )
        setDadosRelatorio(relatorio)

      } catch (error) {
        console.error('Erro ao carregar relatório:', error)
      } finally {
        setLoading(false)
      }
    }

    carregarRelatorio()
  }, [ano, mes, supabase])

  async function processarDados(
    vendas: any[], 
    metas: any[], 
    logistica: any[], 
    fabrica: any[], 
    vendasAnterior: any[],
    vendasAnoAnterior: any[],
    vendasAno: any[]
  ) {
    // Totais de Vendas
    const totalPrevisto = vendas?.reduce((acc, v) => acc + (v.valor_previsto || 0), 0) || 0
    const totalRealizado = vendas?.reduce((acc, v) => acc + (v.valor_realizado || 0), 0) || 0
    
    // Vendas por tipo
    const vendasServicos = vendas?.filter(v => v.tipo === 'servico') || []
    const vendasTecnologia = vendas?.filter(v => v.tipo === 'tecnologia') || []
    
    const totalServicos = vendasServicos.reduce((acc, v) => acc + (v.valor_realizado || 0), 0)
    const totalTecnologia = vendasTecnologia.reduce((acc, v) => acc + (v.valor_realizado || 0), 0)
    
    // Vendas por técnico
    const vendasPorTecnico = vendasServicos.reduce((acc: any, venda: any) => {
      const nome = venda.tecnicos?.nome || 'Fábrica'
      if (!acc[nome]) {
        acc[nome] = {
          tecnico: nome,
          previsto: 0,
          realizado: 0,
          meta: 0
        }
      }
      acc[nome].previsto += venda.valor_previsto || 0
      acc[nome].realizado += venda.valor_realizado || 0
      return acc
    }, {})

    // Adicionar metas dos técnicos
    metas?.forEach((meta: any) => {
      const nome = meta.tecnicos?.nome
      if (nome && vendasPorTecnico[nome]) {
        vendasPorTecnico[nome].meta = meta.valor_meta || 0
      }
    })

    // Adicionar Fábrica
    if (fabrica && fabrica.length > 0) {
      vendasPorTecnico['FÁBRICA'] = {
        tecnico: 'FÁBRICA',
        previsto: fabrica[0].valor_meta || 0,
        realizado: vendasServicos
          .filter(v => !v.tecnicos)
          .reduce((acc, v) => acc + (v.valor_realizado || 0), 0),
        meta: fabrica[0].valor_meta || 0
      }
    }

    // Tecnologia por categoria
    const tecnologiaPorCategoria = vendasTecnologia.reduce((acc: any, venda: any) => {
      if (!acc[venda.categoria]) {
        acc[venda.categoria] = {
          categoria: venda.categoria,
          previsto: 0,
          realizado: 0
        }
      }
      acc[venda.categoria].previsto += venda.valor_previsto || 0
      acc[venda.categoria].realizado += venda.valor_realizado || 0
      return acc
    }, {})

    // Logística
    const totalDiesel = logistica?.reduce((acc, l) => acc + (l.diesel_valor || 0), 0) || 0
    const totalManutencao = logistica?.reduce((acc, l) => acc + (l.manutencao_valor || 0), 0) || 0
    const totalKM = logistica?.reduce((acc, l) => acc + (l.km_rodados || 0), 0) || 0
    const totalLitros = logistica?.reduce((acc, l) => acc + (l.diesel_litros || 0), 0) || 0
    
    const mediaKMPorLitro = totalLitros > 0 ? totalKM / totalLitros : 0
    const custoPorKM = totalKM > 0 ? (totalDiesel + totalManutencao) / totalKM : 0

    // Logística por veículo
    const gastosPorVeiculo = logistica?.reduce((acc: any, reg: any) => {
      if (!acc[reg.placa]) {
        acc[reg.placa] = {
          placa: reg.placa,
          diesel: 0,
          manutencao: 0,
          km: 0
        }
      }
      acc[reg.placa].diesel += reg.diesel_valor || 0
      acc[reg.placa].manutencao += reg.manutencao_valor || 0
      acc[reg.placa].km += reg.km_rodados || 0
      return acc
    }, {}) || {}

    // Comparativos
    const totalRealizadoAnterior = vendasAnterior?.reduce((acc, v) => acc + (v.valor_realizado || 0), 0) || 0
    const totalRealizadoAnoAnterior = vendasAnoAnterior?.reduce((acc, v) => acc + (v.valor_realizado || 0), 0) || 0
    
    const variacaoMesAnterior = totalRealizadoAnterior > 0 
      ? ((totalRealizado - totalRealizadoAnterior) / totalRealizadoAnterior) * 100 
      : 0
    
    const variacaoAnoAnterior = totalRealizadoAnoAnterior > 0 
      ? ((totalRealizado - totalRealizadoAnoAnterior) / totalRealizadoAnoAnterior) * 100 
      : 0

    // Dados para gráfico de tendência anual
    const tendenciaAnual = Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1
      const vendasMes = vendasAno.filter(v => v.mes === mes)
      const total = vendasMes.reduce((acc, v) => acc + (v.valor_realizado || 0), 0)
      return {
        mes: mesesAbreviados[i],
        valor: total
      }
    })

    // Ranking de produtos/serviços
    const rankingProdutos = [...vendasServicos, ...vendasTecnologia]
      .reduce((acc: any, venda: any) => {
        const nome = venda.categoria
        if (!acc[nome]) {
          acc[nome] = {
            produto: nome,
            quantidade: 0,
            valor: 0,
            tipo: venda.tipo
          }
        }
        acc[nome].quantidade += 1
        acc[nome].valor += venda.valor_realizado || 0
        return acc
      }, {})
    
    const rankingProdutosArray = Object.values(rankingProdutos)
      .sort((a: any, b: any) => b.valor - a.valor)
      .slice(0, 5)

    // Comissões
    const comissaoTecnologia = totalTecnologia * 0.10
    const comissaoSinais = (tecnologiaPorCategoria['SINAIS PTx Trimble']?.realizado || 0) * 0.046
    const comissaoLicencas = (tecnologiaPorCategoria['Licenças PTx Trimble']?.realizado || 0) * 0.10
    const comissaoHardwares = (tecnologiaPorCategoria['Hardwares PTx Trimble']?.realizado || 0) * 0.10
    const comissaoTreinamentos = (tecnologiaPorCategoria['Treinamentos Clientes']?.realizado || 0) * 0.83
    
    const totalComissoes = comissaoTecnologia + comissaoSinais + comissaoLicencas + 
                          comissaoHardwares + comissaoTreinamentos

    // Meta geral (80% do total previsto)
    const metaGeral = totalPrevisto * 0.80

    // Top técnico
    const topTecnico = Object.values(vendasPorTecnico)
      .sort((a: any, b: any) => b.realizado - a.realizado)[0]

    // Ticket médio
    const ticketMedio = vendas.length > 0 ? totalRealizado / vendas.length : 0

    // Performance geral
    const performanceGeral = totalPrevisto > 0 ? (totalRealizado / totalPrevisto) * 100 : 0

    return {
      periodo: `${meses[mes - 1]}/${ano}`,
      mes,
      ano,
      totalPrevisto,
      totalRealizado,
      performanceGeral,
      variacaoMesAnterior,
      variacaoAnoAnterior,
      totalServicos,
      totalTecnologia,
      percentualServicos: totalRealizado > 0 ? (totalServicos / totalRealizado) * 100 : 0,
      percentualTecnologia: totalRealizado > 0 ? (totalTecnologia / totalRealizado) * 100 : 0,
      desempenhoTecnicos: Object.values(vendasPorTecnico),
      tecnologiaCategorias: Object.values(tecnologiaPorCategoria),
      totalDiesel,
      totalManutencao,
      totalKM,
      totalLitros,
      mediaKMPorLitro,
      custoPorKM,
      gastosPorVeiculo: Object.values(gastosPorVeiculo),
      comissaoTecnologia,
      comissaoSinais,
      comissaoLicencas,
      comissaoHardwares,
      comissaoTreinamentos,
      totalComissoes,
      metaGeral,
      diferencaMeta: totalRealizado - metaGeral,
      topTecnico,
      rankingProdutos: rankingProdutosArray,
      ticketMedio,
      totalVendas: vendas.length,
      tendenciaAnual,
      totalRealizadoAnterior,
      totalRealizadoAnoAnterior
    }
  }

  const formatMoeda = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  const formatKM = (value: number) => {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }) + ' km'
  }

  async function handleExportarPDF() {
    setExportando(true)
    setTimeout(() => {
      setExportando(false)
      alert('✅ Relatório exportado com sucesso!\n\nFuncionalidade de PDF será implementada com html2canvas + jspdf.')
    }, 1500)
  }

  async function handleImprimir() {
    window.print()
  }

  // Custom Tooltip para gráficos
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 rounded-lg shadow-xl" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
          <p className="font-medium mb-1" style={{ color: theme.text }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span style={{ color: theme.textSecondary }}>{entry.name}:</span>
              <span className="font-medium" style={{ color: theme.text }}>
                {entry.name.includes('%') ? `${Number(entry.value).toFixed(1)}%` : 
                 entry.name.includes('KM') ? `${Number(entry.value).toLocaleString('pt-BR')} km` :
                 formatMoeda(entry.value)}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  const getStatusDesempenho = (percentual: number) => {
    if (percentual >= 100) return { bg: 'rgba(39, 174, 96, 0.2)', text: theme.success }
    if (percentual >= 80) return { bg: 'rgba(52, 152, 219, 0.2)', text: theme.blue }
    if (percentual >= 60) return { bg: 'rgba(243, 156, 18, 0.2)', text: theme.warning }
    return { bg: 'rgba(231, 76, 60, 0.2)', text: theme.danger }
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center" style={{ backgroundColor: theme.background }}>
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-transparent" style={{ borderColor: theme.primary, borderTopColor: 'transparent' }} />
        <p className="text-white mt-4 text-lg font-medium">Gerando relatório...</p>
        <p className="text-gray-400 text-sm mt-2">{meses[mes - 1]} de {ano}</p>
        <p className="text-gray-500 text-xs mt-4">Carregando dados do período</p>
      </div>
    )
  }

  if (!dadosRelatorio) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center" style={{ backgroundColor: theme.background }}>
        <div className="rounded-2xl shadow-xl p-8 max-w-md text-center" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
          <span className="text-6xl mb-4">📭</span>
          <h2 className="text-2xl font-bold mb-2" style={{ color: theme.text }}>Nenhum dado encontrado</h2>
          <p className="mb-6" style={{ color: theme.textSecondary }}>
            Não há dados disponíveis para {meses[mes - 1]}/{ano}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 rounded-lg transition-colors"
              style={{ backgroundColor: theme.border, color: theme.text }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a5a5a'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.border}
            >
              Voltar
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-lg transition-colors"
              style={{ backgroundColor: theme.primary, color: 'white' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.primaryDark}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.primary}
            >
              Tentar novamente
            </button>
          </div>
        </div>
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
                  <h1 className="text-2xl font-bold" style={{ color: theme.text }}>📋 Relatório Mensal</h1>
                  <span className="px-3 py-1 text-sm font-medium rounded-full" style={{ backgroundColor: 'rgba(231, 76, 60, 0.2)', color: theme.primary, border: `1px solid rgba(231, 76, 60, 0.3)` }}>
                    {dadosRelatorio.periodo}
                  </span>
                </div>
                <p className="text-sm mt-1" style={{ color: theme.textSecondary }}>
                  Análise completa de vendas, metas, comissões e logística
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg p-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                <select
                  value={mes}
                  onChange={(e) => setMes(Number(e.target.value))}
                  className="px-3 py-2 text-sm rounded-lg border-0 focus:ring-2 outline-none bg-transparent"
                  style={{ color: theme.text }}
                >
                  {meses.map((nome, index) => (
                    <option key={index + 1} value={index + 1} style={{ backgroundColor: theme.card, color: theme.text }}>{nome}</option>
                  ))}
                </select>
                <select
                  value={ano}
                  onChange={(e) => setAno(Number(e.target.value))}
                  className="px-3 py-2 text-sm rounded-lg border-0 focus:ring-2 outline-none bg-transparent"
                  style={{ color: theme.text }}
                >
                  {anos.map(a => (
                    <option key={a} value={a} style={{ backgroundColor: theme.card, color: theme.text }}>{a}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportarPDF}
                  disabled={exportando}
                  className="px-4 py-2 text-sm rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: theme.danger, color: 'white' }}
                  onMouseEnter={(e) => !exportando && (e.currentTarget.style.backgroundColor = theme.primaryDark)}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.danger}
                >
                  <span className="text-lg">📥</span>
                  {exportando ? 'Exportando...' : 'PDF'}
                </button>
                
                <button
                  onClick={handleImprimir}
                  className="px-4 py-2 text-sm rounded-lg transition-all flex items-center gap-2"
                  style={{ backgroundColor: theme.border, color: theme.text }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a5a5a'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.border}
                >
                  <span className="text-lg">🖨️</span>
                  Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Conteúdo do Relatório */}
      <main className="w-full pt-20 pb-12">
        <div ref={printRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Header do Relatório */}
          <div className="rounded-2xl shadow-xl p-8" style={{ backgroundColor: theme.primary, backgroundImage: 'linear-gradient(to right, #e74c3c, #c0392b)' }}>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center backdrop-blur-sm" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                    <span className="text-3xl text-white">📊</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">SM Service</h2>
                    <p className="text-white/90">Relatório de Desempenho Mensal</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-4xl font-bold text-white">{dadosRelatorio.periodo}</p>
                  <p className="text-white/90">
                    Gerado em {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} às {format(new Date(), "HH:mm")}
                  </p>
                </div>
              </div>
              
              <div className="rounded-xl p-6 w-full lg:w-auto" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <p className="text-sm text-white/80 mb-1">Meta Geral (80%)</p>
                    <p className="text-2xl font-bold text-white">{formatMoeda(dadosRelatorio.metaGeral)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-white/80 mb-1">Realizado</p>
                    <p className="text-3xl font-bold text-yellow-300">
                      {formatMoeda(dadosRelatorio.totalRealizado)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/20">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/80">Performance</span>
                    <span className="text-lg font-bold text-white">
                      {dadosRelatorio.performanceGeral.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full rounded-full h-2.5 mt-2" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                    <div 
                      className="bg-yellow-400 rounded-full h-2.5"
                      style={{ width: `${Math.min(dadosRelatorio.performanceGeral, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* KPIs Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-xl shadow-sm p-6 border-l-4 hover:shadow-md transition-all" style={{ backgroundColor: theme.card, borderLeftColor: theme.blue }}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm uppercase tracking-wider" style={{ color: theme.textSecondary }}>Faturamento</p>
                  <p className="text-2xl font-bold mt-2" style={{ color: theme.text }}>
                    {formatMoeda(dadosRelatorio.totalRealizado)}
                  </p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(52, 152, 219, 0.2)' }}>
                  <span className="text-2xl">💰</span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className={`text-sm font-semibold ${
                  dadosRelatorio.variacaoMesAnterior >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {dadosRelatorio.variacaoMesAnterior >= 0 ? '↑' : '↓'} 
                  {Math.abs(dadosRelatorio.variacaoMesAnterior).toFixed(1)}%
                </span>
                <span className="text-xs" style={{ color: theme.textMuted }}>vs mês anterior</span>
              </div>
            </div>

            <div className="rounded-xl shadow-sm p-6 border-l-4 hover:shadow-md transition-all" style={{ backgroundColor: theme.card, borderLeftColor: theme.success }}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm uppercase tracking-wider" style={{ color: theme.textSecondary }}>Meta Atingida</p>
                  <p className="text-2xl font-bold mt-2" style={{ color: theme.text }}>
                    {dadosRelatorio.performanceGeral.toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(39, 174, 96, 0.2)' }}>
                  <span className="text-2xl">🎯</span>
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full rounded-full h-2" style={{ backgroundColor: theme.border }}>
                  <div 
                    className="rounded-full h-2"
                    style={{ 
                      width: `${Math.min(dadosRelatorio.performanceGeral, 100)}%`,
                      backgroundColor: theme.success
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl shadow-sm p-6 border-l-4 hover:shadow-md transition-all" style={{ backgroundColor: theme.card, borderLeftColor: theme.purple }}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm uppercase tracking-wider" style={{ color: theme.textSecondary }}>Comissões</p>
                  <p className="text-2xl font-bold mt-2" style={{ color: theme.text }}>
                    {formatMoeda(dadosRelatorio.totalComissoes)}
                  </p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(155, 89, 182, 0.2)' }}>
                  <span className="text-2xl">💰</span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs" style={{ color: theme.textMuted }}>
                  {((dadosRelatorio.totalComissoes / dadosRelatorio.totalRealizado) * 100).toFixed(1)}% das vendas
                </span>
              </div>
            </div>

            <div className="rounded-xl shadow-sm p-6 border-l-4 hover:shadow-md transition-all" style={{ backgroundColor: theme.card, borderLeftColor: theme.orange }}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm uppercase tracking-wider" style={{ color: theme.textSecondary }}>Ticket Médio</p>
                  <p className="text-2xl font-bold mt-2" style={{ color: theme.text }}>
                    {formatMoeda(dadosRelatorio.ticketMedio)}
                  </p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(230, 126, 34, 0.2)' }}>
                  <span className="text-2xl">🎫</span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs" style={{ color: theme.textMuted }}>
                  {dadosRelatorio.totalVendas} vendas no período
                </span>
              </div>
            </div>
          </div>

          {/* Gráficos de Vendas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Desempenho por Técnico */}
            <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: theme.text }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.blue }}></span>
                Desempenho por Técnico
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dadosRelatorio.desempenhoTecnicos}
                    layout="vertical"
                    margin={{ left: 100 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme.border} />
                    <XAxis 
                      type="number" 
                      tickFormatter={(value) => `R$ ${(value/1000)}k`}
                      tick={{ fill: theme.textSecondary, fontSize: 12 }}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="tecnico" 
                      width={100}
                      tick={{ fill: theme.textSecondary, fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ color: theme.textSecondary }} />
                    <Bar dataKey="meta" name="Meta" fill={CORES.gray} radius={[0, 4, 4, 0]} />
                    <Bar dataKey="realizado" name="Realizado" fill={theme.blue} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tecnologia por Categoria */}
            <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: theme.text }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.purple }}></span>
                Vendas Tecnologia por Categoria
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosRelatorio.tecnologiaCategorias}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                    <XAxis 
                      dataKey="categoria" 
                      angle={-15} 
                      textAnchor="end" 
                      height={80}
                      tick={{ fill: theme.textSecondary, fontSize: 11 }}
                    />
                    <YAxis 
                      tickFormatter={(value) => `R$ ${(value/1000)}k`}
                      tick={{ fill: theme.textSecondary, fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ color: theme.textSecondary }} />
                    <Bar dataKey="previsto" name="Previsto" fill={CORES.gray} />
                    <Bar dataKey="realizado" name="Realizado" fill={theme.purple} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Tendência Anual */}
          <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: theme.text }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.indigo }}></span>
              Tendência de Vendas - {ano}
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dadosRelatorio.tendenciaAnual}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                  <XAxis dataKey="mes" tick={{ fill: theme.textSecondary, fontSize: 12 }} />
                  <YAxis 
                    tickFormatter={(value) => `R$ ${(value/1000)}k`}
                    tick={{ fill: theme.textSecondary, fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: theme.textSecondary }} />
                  <Area 
                    type="monotone" 
                    dataKey="valor" 
                    name="Vendas" 
                    stroke={theme.indigo} 
                    fill={theme.indigo} 
                    fillOpacity={0.1}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center mt-4">
              <div className="px-4 py-2 rounded-lg" style={{ backgroundColor: 'rgba(93, 173, 226, 0.1)' }}>
                <span className="text-sm" style={{ color: theme.indigo }}>
                  ⚡ Mês atual: {formatMoeda(dadosRelatorio.totalRealizado)} | 
                  Média anual: {formatMoeda(dadosRelatorio.tendenciaAnual.reduce((acc: any, d: any) => acc + d.valor, 0) / 12)}
                </span>
              </div>
            </div>
          </div>

          {/* Tabela de Desempenho Detalhada */}
          <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: theme.text }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.success }}></span>
              Detalhamento por Técnico
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Técnico</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Meta</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Previsto</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Realizado</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>% Atingimento</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Diferença</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: theme.border }}>
                  {dadosRelatorio.desempenhoTecnicos.map((tec: any, idx: number) => {
                    const percentual = tec.meta > 0 ? (tec.realizado / tec.meta) * 100 : 0
                    const diferenca = tec.realizado - tec.meta
                    const status = getStatusDesempenho(percentual)
                    
                    return (
                      <tr key={idx} className="transition-colors hover:bg-white/5">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: theme.text }}>
                          {tec.tecnico}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right" style={{ color: theme.text }}>
                          {formatMoeda(tec.meta)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right" style={{ color: theme.text }}>
                          {formatMoeda(tec.previsto)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold" style={{ color: theme.success }}>
                          {formatMoeda(tec.realizado)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <span className="px-2 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: status.bg, color: status.text, border: `1px solid ${status.text}30` }}>
                            {percentual.toFixed(1)}%
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold`} style={{ color: diferenca >= 0 ? theme.success : theme.danger }}>
                          {diferenca >= 0 ? '+' : ''}{formatMoeda(diferenca)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ranking e Logística */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ranking de Produtos */}
            <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: theme.text }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.warning }}></span>
                Ranking de Produtos/Serviços
              </h3>
              
              <div className="space-y-4">
                {dadosRelatorio.rankingProdutos.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white`}
                      style={{ 
                        backgroundColor: idx === 0 ? theme.warning : 
                                       idx === 1 ? '#95a5a6' : 
                                       idx === 2 ? theme.orange : theme.textMuted
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <div>
                          <span className="text-sm font-medium" style={{ color: theme.text }}>{item.produto}</span>
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ 
                            backgroundColor: item.tipo === 'servico' ? 'rgba(52, 152, 219, 0.2)' : 'rgba(155, 89, 182, 0.2)',
                            color: item.tipo === 'servico' ? theme.blue : theme.purple,
                            border: `1px solid ${item.tipo === 'servico' ? theme.blue : theme.purple}30`
                          }}>
                            {item.tipo === 'servico' ? '🔧 Serviço' : '💻 Tecnologia'}
                          </span>
                        </div>
                        <span className="text-sm font-semibold" style={{ color: theme.text }}>
                          {formatMoeda(item.valor)}
                        </span>
                      </div>
                      <div className="w-full rounded-full h-1.5" style={{ backgroundColor: theme.border }}>
                        <div 
                          className="rounded-full h-1.5"
                          style={{ 
                            width: `${(item.valor / dadosRelatorio.rankingProdutos[0].valor) * 100}%`,
                            backgroundColor: theme.blue
                          }}
                        />
                      </div>
                      <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
                        {item.quantidade} venda{item.quantidade > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gastos Logística */}
            <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: theme.text }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.red }}></span>
                Gastos com Logística
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 rounded-lg" style={{ backgroundColor: 'rgba(243, 156, 18, 0.1)' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" style={{ color: theme.warning }}>⛽</span>
                    <div>
                      <p className="text-sm font-medium" style={{ color: theme.text }}>Diesel</p>
                      <p className="text-xs" style={{ color: theme.textMuted }}>{dadosRelatorio.totalLitros.toFixed(1)} litros</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold" style={{ color: theme.text }}>{formatMoeda(dadosRelatorio.totalDiesel)}</p>
                    <p className="text-xs" style={{ color: theme.textMuted }}>
                      R$ {(dadosRelatorio.totalDiesel / (dadosRelatorio.totalLitros || 1)).toFixed(2)}/L
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-4 rounded-lg" style={{ backgroundColor: 'rgba(231, 76, 60, 0.1)' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" style={{ color: theme.red }}>🔧</span>
                    <div>
                      <p className="text-sm font-medium" style={{ color: theme.text }}>Manutenção</p>
                      <p className="text-xs" style={{ color: theme.textMuted }}>{dadosRelatorio.gastosPorVeiculo.length} veículos</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold" style={{ color: theme.text }}>{formatMoeda(dadosRelatorio.totalManutencao)}</p>
                    <p className="text-xs" style={{ color: theme.textMuted }}>
                      Média: {formatMoeda(dadosRelatorio.totalManutencao / (dadosRelatorio.gastosPorVeiculo.length || 1))}/veículo
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-4 rounded-lg" style={{ backgroundColor: 'rgba(52, 152, 219, 0.1)' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" style={{ color: theme.blue }}>📏</span>
                    <div>
                      <p className="text-sm font-medium" style={{ color: theme.text }}>Quilometragem</p>
                      <p className="text-xs" style={{ color: theme.textMuted }}>{dadosRelatorio.mediaKMPorLitro.toFixed(1)} km/l</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold" style={{ color: theme.text }}>{formatKM(dadosRelatorio.totalKM)}</p>
                    <p className="text-xs" style={{ color: theme.textMuted }}>
                      {formatMoeda(dadosRelatorio.custoPorKM)}/km
                    </p>
                  </div>
                </div>
              </div>

              {dadosRelatorio.gastosPorVeiculo.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium mb-3" style={{ color: theme.text }}>Detalhamento por Veículo</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {dadosRelatorio.gastosPorVeiculo.map((veiculo: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-2 rounded-lg text-sm" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                        <span className="font-medium" style={{ color: theme.text }}>{veiculo.placa}</span>
                        <div className="flex items-center gap-3">
                          <span style={{ color: theme.warning }}>⛽ {formatMoeda(veiculo.diesel)}</span>
                          <span style={{ color: theme.red }}>🔧 {formatMoeda(veiculo.manutencao)}</span>
                          <span style={{ color: theme.textMuted }}>{formatKM(veiculo.km)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Resumo de Comissões */}
          <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: 'rgba(155, 89, 182, 0.1)', border: `1px solid ${theme.purple}30` }}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: theme.text }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.purple }}></span>
              Resumo de Comissões
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="rounded-lg p-4" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
                <p className="text-xs mb-1" style={{ color: theme.textMuted }}>Tecnologia (10%)</p>
                <p className="text-lg font-bold" style={{ color: theme.text }}>{formatMoeda(dadosRelatorio.comissaoTecnologia)}</p>
              </div>
              <div className="rounded-lg p-4" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
                <p className="text-xs mb-1" style={{ color: theme.textMuted }}>Sinais (4,6%)</p>
                <p className="text-lg font-bold" style={{ color: theme.text }}>{formatMoeda(dadosRelatorio.comissaoSinais)}</p>
              </div>
              <div className="rounded-lg p-4" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
                <p className="text-xs mb-1" style={{ color: theme.textMuted }}>Licenças (10%)</p>
                <p className="text-lg font-bold" style={{ color: theme.text }}>{formatMoeda(dadosRelatorio.comissaoLicencas)}</p>
              </div>
              <div className="rounded-lg p-4" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
                <p className="text-xs mb-1" style={{ color: theme.textMuted }}>Hardwares (10%)</p>
                <p className="text-lg font-bold" style={{ color: theme.text }}>{formatMoeda(dadosRelatorio.comissaoHardwares)}</p>
              </div>
              <div className="rounded-lg p-4" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
                <p className="text-xs mb-1" style={{ color: theme.textMuted }}>Treinamentos (83%)</p>
                <p className="text-lg font-bold" style={{ color: theme.text }}>{formatMoeda(dadosRelatorio.comissaoTreinamentos)}</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t" style={{ borderColor: `${theme.purple}30` }}>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium" style={{ color: theme.text }}>Total de Comissões</span>
                <span className="text-2xl font-bold" style={{ color: theme.purple }}>
                  {formatMoeda(dadosRelatorio.totalComissoes)}
                </span>
              </div>
            </div>
          </div>

          {/* Análise e Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pontos Fortes */}
            <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(39, 174, 96, 0.1)', border: `1px solid ${theme.success}30` }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">✅</span>
                <h4 className="font-semibold" style={{ color: theme.text }}>Pontos Fortes</h4>
              </div>
              <ul className="space-y-3">
                {dadosRelatorio.performanceGeral >= 80 && (
                  <li className="flex items-start gap-2 text-sm">
                    <span className="mt-1" style={{ color: theme.success }}>•</span>
                    <span style={{ color: theme.textSecondary }}>
                      <span className="font-medium" style={{ color: theme.text }}>Meta atingida:</span> {dadosRelatorio.performanceGeral.toFixed(1)}% de performance
                    </span>
                  </li>
                )}
                {dadosRelatorio.topTecnico && (
                  <li className="flex items-start gap-2 text-sm">
                    <span className="mt-1" style={{ color: theme.success }}>•</span>
                    <span style={{ color: theme.textSecondary }}>
                      <span className="font-medium" style={{ color: theme.text }}>Destaque:</span> {dadosRelatorio.topTecnico.tecnico} com {formatMoeda(dadosRelatorio.topTecnico.realizado)}
                    </span>
                  </li>
                )}
                {dadosRelatorio.variacaoMesAnterior > 0 && (
                  <li className="flex items-start gap-2 text-sm">
                    <span className="mt-1" style={{ color: theme.success }}>•</span>
                    <span style={{ color: theme.textSecondary }}>
                      <span className="font-medium" style={{ color: theme.text }}>Crescimento:</span> {dadosRelatorio.variacaoMesAnterior.toFixed(1)}% vs mês anterior
                    </span>
                  </li>
                )}
              </ul>
            </div>

            {/* Oportunidades */}
            <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(243, 156, 18, 0.1)', border: `1px solid ${theme.warning}30` }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">⚠️</span>
                <h4 className="font-semibold" style={{ color: theme.text }}>Oportunidades</h4>
              </div>
              <ul className="space-y-3">
                {dadosRelatorio.desempenhoTecnicos
                  .filter((t: any) => t.tecnico !== 'FÁBRICA' && (t.realizado / t.meta) < 70)
                  .map((t: any, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="mt-1" style={{ color: theme.warning }}>•</span>
                      <span style={{ color: theme.textSecondary }}>
                        <span className="font-medium" style={{ color: theme.text }}>{t.tecnico}:</span> {((t.realizado / t.meta) * 100).toFixed(1)}% da meta
                      </span>
                    </li>
                  ))}
                {dadosRelatorio.percentualTecnologia < 40 && (
                  <li className="flex items-start gap-2 text-sm">
                    <span className="mt-1" style={{ color: theme.warning }}>•</span>
                    <span style={{ color: theme.textSecondary }}>
                      <span className="font-medium" style={{ color: theme.text }}>Foco em tecnologia:</span> Apenas {dadosRelatorio.percentualTecnologia.toFixed(1)}% das vendas
                    </span>
                  </li>
                )}
              </ul>
            </div>

            {/* Recomendações */}
            <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(52, 152, 219, 0.1)', border: `1px solid ${theme.blue}30` }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">💡</span>
                <h4 className="font-semibold" style={{ color: theme.text }}>Recomendações</h4>
              </div>
              <ul className="space-y-3">
                {dadosRelatorio.percentualTecnologia < 50 && (
                  <li className="flex items-start gap-2 text-sm">
                    <span className="mt-1" style={{ color: theme.blue }}>•</span>
                    <span style={{ color: theme.textSecondary }}>
                      Intensificar vendas de <span className="font-medium" style={{ color: theme.text }}>Tecnologia</span>
                    </span>
                  </li>
                )}
                <li className="flex items-start gap-2 text-sm">
                  <span className="mt-1" style={{ color: theme.blue }}>•</span>
                  <span style={{ color: theme.textSecondary }}>
                    <span className="font-medium" style={{ color: theme.text }}>Meta próximo mês:</span> {formatMoeda(dadosRelatorio.totalPrevisto * 1.1)} (crescimento de 10%)
                  </span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <span className="mt-1" style={{ color: theme.blue }}>•</span>
                  <span style={{ color: theme.textSecondary }}>
                    Foco em: {dadosRelatorio.rankingProdutos[0]?.produto}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Comparativos e Indicadores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <p className="text-sm mb-1" style={{ color: theme.textSecondary }}>vs Mês Anterior</p>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold" style={{ color: theme.text }}>
                  {dadosRelatorio.variacaoMesAnterior > 0 ? '+' : ''}{dadosRelatorio.variacaoMesAnterior.toFixed(1)}%
                </p>
                <span className={`text-lg ${dadosRelatorio.variacaoMesAnterior >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {dadosRelatorio.variacaoMesAnterior >= 0 ? '▲' : '▼'}
                </span>
              </div>
              <p className="text-xs mt-2" style={{ color: theme.textMuted }}>
                {formatMoeda(dadosRelatorio.totalRealizadoAnterior)} no mês anterior
              </p>
            </div>

            <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <p className="text-sm mb-1" style={{ color: theme.textSecondary }}>vs Ano Anterior</p>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold" style={{ color: theme.text }}>
                  {dadosRelatorio.variacaoAnoAnterior > 0 ? '+' : ''}{dadosRelatorio.variacaoAnoAnterior.toFixed(1)}%
                </p>
                <span className={`text-lg ${dadosRelatorio.variacaoAnoAnterior >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {dadosRelatorio.variacaoAnoAnterior >= 0 ? '▲' : '▼'}
                </span>
              </div>
              <p className="text-xs mt-2" style={{ color: theme.textMuted }}>
                {formatMoeda(dadosRelatorio.totalRealizadoAnoAnterior)} no mesmo período
              </p>
            </div>

            <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <p className="text-sm mb-1" style={{ color: theme.textSecondary }}>Meta Geral (80%)</p>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold" style={{ color: theme.text }}>
                  {formatMoeda(dadosRelatorio.metaGeral)}
                </p>
              </div>
              <p className="text-xs mt-2" style={{ color: dadosRelatorio.diferencaMeta >= 0 ? theme.success : theme.warning }}>
                {dadosRelatorio.diferencaMeta >= 0 ? '✓ Meta atingida' : `Faltam ${formatMoeda(Math.abs(dadosRelatorio.diferencaMeta))}`}
              </p>
            </div>

            <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <p className="text-sm mb-1" style={{ color: theme.textSecondary }}>Ticket Médio</p>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold" style={{ color: theme.text }}>
                  {formatMoeda(dadosRelatorio.ticketMedio)}
                </p>
              </div>
              <p className="text-xs mt-2" style={{ color: theme.textMuted }}>
                {dadosRelatorio.totalVendas} vendas realizadas
              </p>
            </div>
          </div>

          {/* Rodapé do Relatório */}
          <div className="rounded-xl p-6 text-center text-sm border" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', borderColor: theme.border }}>
            <div className="flex flex-col items-center gap-2">
              <p className="font-medium" style={{ color: theme.text }}>SM Service - Relatório de Desempenho Mensal</p>
              <p style={{ color: theme.textSecondary }}>
                Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} • 
                Período: {dadosRelatorio.periodo} • 
                Usuário: {user?.email || 'Sistema'}
              </p>
              <p className="text-xs mt-2" style={{ color: theme.textMuted }}>
                Este relatório é confidencial e de uso exclusivo da SM Service.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}