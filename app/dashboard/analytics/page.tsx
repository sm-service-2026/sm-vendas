'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart
} from 'recharts'

export default function AnalyticsPage() {
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
    purple: '#9b59b6',
    indigo: '#5dade2',
    orange: '#e67e22',
    teal: '#14b8a6',
    pink: '#ec4899'
  }

  // Estados
  const [loading, setLoading] = useState(true)
  const [ano, setAno] = useState(new Date().getFullYear())
  const [dadosAnalytics, setDadosAnalytics] = useState<any>(null)
  const [tipoVisao, setTipoVisao] = useState<'vendas' | 'tecnicos' | 'tecnologia' | 'logistica'>('vendas')

  const anos = [2024, 2025, 2026, 2027]
  const meses = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ]

  // Cores para gráficos - ajustadas para o tema escuro
  const CORES = {
    blue: '#3498db',
    green: '#27ae60',
    yellow: '#f39c12',
    red: '#e74c3c',
    purple: '#9b59b6',
    gray: '#7f8c8d',
    indigo: '#5dade2',
    orange: '#e67e22',
    teal: '#14b8a6',
    pink: '#ec4899'
  }

  const CORES_GRAFICO = [
    '#3498db', '#27ae60', '#f39c12', '#e74c3c', '#9b59b6',
    '#ec4899', '#14b8a6', '#e67e22', '#5dade2', '#1abc9c'
  ]

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
    async function carregarAnalytics() {
      setLoading(true)
      try {
        // 1. Buscar todas as vendas do ano
        const { data: vendasAno } = await supabase
          .from('vendas_servicos')
          .select('*, tecnicos(nome)')
          .eq('ano', ano)
          .order('mes', { ascending: true })

        // 2. Buscar vendas dos últimos 12 meses
        const { data: vendas12Meses } = await supabase
          .from('vendas_servicos')
          .select('*')
          .gte('ano', ano - 1)
          .order('ano', { ascending: true })
          .order('mes', { ascending: true })

        // 3. Buscar todas as metas do ano
        const { data: metasAno } = await supabase
          .from('metas_tecnicos')
          .select('*, tecnicos(nome)')
          .eq('ano', ano)

        // 4. Buscar logística do ano
        const startDate = `${ano}-01-01`
        const endDate = `${ano}-12-31`
        
        const { data: logisticaAno } = await supabase
          .from('caminhoes_logistica')
          .select('*')
          .gte('data', startDate)
          .lte('data', endDate)
          .order('data', { ascending: true })

        // 5. Buscar vendas por técnico (acumulado ano)
        const { data: vendasTecnicos } = await supabase
          .from('vendas_servicos')
          .select('*, tecnicos(nome)')
          .eq('ano', ano)
          .eq('tipo', 'servico')

        // 6. Buscar vendas de tecnologia por categoria
        const { data: vendasTecnologia } = await supabase
          .from('vendas_servicos')
          .select('*')
          .eq('ano', ano)
          .eq('tipo', 'tecnologia')

        // Processar dados
        const analytics = await processarDados(
          vendasAno || [],
          vendas12Meses || [],
          metasAno || [],
          logisticaAno || [],
          vendasTecnicos || [],
          vendasTecnologia || []
        )
        setDadosAnalytics(analytics)

      } catch (error) {
        console.error('Erro ao carregar analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    carregarAnalytics()
  }, [ano, supabase])

  async function processarDados(
    vendasAno: any[],
    vendas12Meses: any[],
    metasAno: any[],
    logisticaAno: any[],
    vendasTecnicos: any[],
    vendasTecnologia: any[]
  ) {
    // 1. EVOLUÇÃO DE VENDAS - SÉRIE HISTÓRICA
    const evolucaoVendas = Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1
      const vendasMes = vendasAno.filter(v => v.mes === mes)
      
      const previsto = vendasMes.reduce((acc, v) => acc + (v.valor_previsto || 0), 0)
      const realizado = vendasMes.reduce((acc, v) => acc + (v.valor_realizado || 0), 0)
      const servicos = vendasMes
        .filter(v => v.tipo === 'servico')
        .reduce((acc, v) => acc + (v.valor_realizado || 0), 0)
      const tecnologia = vendasMes
        .filter(v => v.tipo === 'tecnologia')
        .reduce((acc, v) => acc + (v.valor_realizado || 0), 0)
      
      return {
        mes: meses[i],
        mesNum: mes,
        previsto,
        realizado,
        servicos,
        tecnologia,
        atingimento: previsto > 0 ? (realizado / previsto) * 100 : 0
      }
    })

    // 2. ÚLTIMOS 12 MESES
    const ultimos12Meses = vendas12Meses
      .reduce((acc: any[], venda) => {
        const periodo = `${venda.mes.toString().padStart(2, '0')}/${venda.ano}`
        const existente = acc.find(item => item.periodo === periodo)
        
        if (existente) {
          existente.realizado += venda.valor_realizado || 0
          existente.previsto += venda.valor_previsto || 0
        } else {
          acc.push({
            periodo,
            mes: venda.mes,
            ano: venda.ano,
            realizado: venda.valor_realizado || 0,
            previsto: venda.valor_previsto || 0
          })
        }
        return acc
      }, [])
      .sort((a: any, b: any) => {
        if (a.ano !== b.ano) return a.ano - b.ano
        return a.mes - b.mes
      })
      .slice(-12)

    // 3. DESEMPENHO POR TÉCNICO (ACUMULADO ANO)
    const desempenhoTecnicos = vendasTecnicos
      .reduce((acc: any, venda) => {
        const nome = venda.tecnicos?.nome || 'Fábrica'
        if (!acc[nome]) {
          acc[nome] = {
            tecnico: nome,
            realizado: 0,
            meta: 0
          }
        }
        acc[nome].realizado += venda.valor_realizado || 0
        return acc
      }, {})

    // Adicionar metas
    metasAno.forEach((meta: any) => {
      const nome = meta.tecnicos?.nome
      if (nome && desempenhoTecnicos[nome]) {
        desempenhoTecnicos[nome].meta += meta.valor_meta || 0
      }
    })

    const desempenhoTecnicosArray = Object.values(desempenhoTecnicos)
      .map((tec: any) => ({
        ...tec,
        percentual: tec.meta > 0 ? (tec.realizado / tec.meta) * 100 : 0
      }))
      .sort((a: any, b: any) => b.realizado - a.realizado)

    // 4. ANÁLISE DE TECNOLOGIA POR CATEGORIA
    const tecnologiaCategorias = vendasTecnologia
      .reduce((acc: any, venda) => {
        if (!acc[venda.categoria]) {
          acc[venda.categoria] = {
            categoria: venda.categoria,
            previsto: 0,
            realizado: 0,
            quantidade: 0
          }
        }
        acc[venda.categoria].previsto += venda.valor_previsto || 0
        acc[venda.categoria].realizado += venda.valor_realizado || 0
        acc[venda.categoria].quantidade += 1
        return acc
      }, {})

    const tecnologiaCategoriasArray = Object.values(tecnologiaCategorias)
      .sort((a: any, b: any) => b.realizado - a.realizado)

    // 5. ANÁLISE DE TENDÊNCIA - CRESCIMENTO MENSAL
    const crescimentoMensal = evolucaoVendas
      .map((item, index, array) => {
        if (index === 0) return { ...item, crescimento: 0 }
        const anterior = array[index - 1].realizado
        const atual = item.realizado
        return {
          ...item,
          crescimento: anterior > 0 ? ((atual - anterior) / anterior) * 100 : 0
        }
      })

    // 6. ESTATÍSTICAS DE LOGÍSTICA
    const logisticaMensal = Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1
      const registros = logisticaAno.filter(l => {
        const data = new Date(l.data)
        return data.getMonth() + 1 === mes
      })

      const diesel = registros.reduce((acc, l) => acc + (l.diesel_valor || 0), 0)
      const manutencao = registros.reduce((acc, l) => acc + (l.manutencao_valor || 0), 0)
      const km = registros.reduce((acc, l) => acc + (l.km_rodados || 0), 0)
      const litros = registros.reduce((acc, l) => acc + (l.diesel_litros || 0), 0)

      return {
        mes: meses[i],
        diesel,
        manutencao,
        km,
        litros,
        custoPorKM: km > 0 ? (diesel + manutencao) / km : 0,
        eficiencia: litros > 0 ? km / litros : 0
      }
    })

    // 7. TOP PRODUTOS/SERVIÇOS
    const todosProdutos = [...vendasAno]
    const topProdutos = todosProdutos
      .reduce((acc: any, venda) => {
        const nome = venda.categoria
        if (!acc[nome]) {
          acc[nome] = {
            produto: nome,
            tipo: venda.tipo,
            valor: 0,
            quantidade: 0
          }
        }
        acc[nome].valor += venda.valor_realizado || 0
        acc[nome].quantidade += 1
        return acc
      }, {})

    const topProdutosArray = Object.values(topProdutos)
      .sort((a: any, b: any) => b.valor - a.valor)
      .slice(0, 10)

    // 8. ANÁLISE DE SAZONALIDADE
    const sazonalidade = evolucaoVendas.map(item => ({
      mes: item.mes,
      media: item.realizado,
      variacao: item.atingimento - 100
    }))

    // 9. KPIs ESTRATÉGICOS
    const totalRealizado = vendasAno.reduce((acc, v) => acc + (v.valor_realizado || 0), 0)
    const totalPrevisto = vendasAno.reduce((acc, v) => acc + (v.valor_previsto || 0), 0)
    const totalServicos = vendasAno
      .filter(v => v.tipo === 'servico')
      .reduce((acc, v) => acc + (v.valor_realizado || 0), 0)
    const totalTecnologia = vendasAno
      .filter(v => v.tipo === 'tecnologia')
      .reduce((acc, v) => acc + (v.valor_realizado || 0), 0)
    
    const ticketMedio = vendasAno.length > 0 ? totalRealizado / vendasAno.length : 0
    
    const mesesComMeta = evolucaoVendas.filter(m => m.atingimento >= 100).length
    const mesesAcimaMedia = evolucaoVendas.filter(m => m.realizado > totalRealizado / 12).length
    
    const crescimentoAnual = evolucaoVendas.length >= 2
      ? ((evolucaoVendas[11]?.realizado || 0) - (evolucaoVendas[0]?.realizado || 0)) / (evolucaoVendas[0]?.realizado || 1) * 100
      : 0

    const totalDiesel = logisticaMensal.reduce((acc, m) => acc + m.diesel, 0)
    const totalManutencao = logisticaMensal.reduce((acc, m) => acc + m.manutencao, 0)
    const totalKM = logisticaMensal.reduce((acc, m) => acc + m.km, 0)
    const custoMedioPorKM = totalKM > 0 ? (totalDiesel + totalManutencao) / totalKM : 0

    return {
      evolucaoVendas,
      ultimos12Meses,
      crescimentoMensal,
      desempenhoTecnicos: desempenhoTecnicosArray,
      tecnologiaCategorias: tecnologiaCategoriasArray,
      logisticaMensal,
      topProdutos: topProdutosArray,
      sazonalidade,
      kpis: {
        totalRealizado,
        totalPrevisto,
        totalServicos,
        totalTecnologia,
        ticketMedio,
        mesesComMeta,
        mesesAcimaMedia,
        crescimentoAnual,
        totalVendas: vendasAno.length,
        totalDiesel,
        totalManutencao,
        totalKM,
        custoMedioPorKM,
        performanceGeral: totalPrevisto > 0 ? (totalRealizado / totalPrevisto) * 100 : 0
      }
    }
  }

  const formatMoeda = (value: any): string => {
    const num = Number(value);
    if (isNaN(num) || value == null) {
      return 'R$ 0,00';
    }
    return num.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatKM = (value: number) => {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }) + ' km'
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

  if (loading) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-transparent" style={{ borderColor: theme.indigo, borderTopColor: 'transparent' }} />
        <p className="text-white mt-4 text-lg font-medium">Carregando Analytics...</p>
        <p className="text-gray-400 text-sm mt-2">Processando dados e gerando insights</p>
      </div>
    )
  }

  if (!dadosAnalytics) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20">
        <div className="rounded-2xl shadow-xl p-8 max-w-md text-center" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
          <span className="text-6xl mb-4">📊</span>
          <h2 className="text-2xl font-bold mb-2" style={{ color: theme.text }}>Nenhum dado encontrado</h2>
          <p className="mb-6" style={{ color: theme.textSecondary }}>
            Não há dados disponíveis para análise em {ano}
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 rounded-lg transition-colors"
            style={{ backgroundColor: theme.indigo, color: 'white' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2980b9'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.indigo}
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 py-6">
      {/* KPIs Estratégicos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-xl shadow-sm p-6 border-l-4" style={{ backgroundColor: theme.card, borderLeftColor: theme.indigo }}>
          <p className="text-sm uppercase tracking-wider" style={{ color: theme.textSecondary }}>Faturamento Anual</p>
          <p className="text-2xl font-bold mt-2" style={{ color: theme.text }}>
            {formatMoeda(dadosAnalytics.kpis.totalRealizado)}
          </p>
          <div className="flex items-center mt-2">
            <span className={`text-sm font-semibold ${
              dadosAnalytics.kpis.crescimentoAnual >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {dadosAnalytics.kpis.crescimentoAnual >= 0 ? '↑' : '↓'} 
              {Math.abs(dadosAnalytics.kpis.crescimentoAnual).toFixed(1)}%
            </span>
            <span className="text-xs ml-2" style={{ color: theme.textMuted }}>vs jan</span>
          </div>
        </div>

        <div className="rounded-xl shadow-sm p-6 border-l-4" style={{ backgroundColor: theme.card, borderLeftColor: theme.success }}>
          <p className="text-sm uppercase tracking-wider" style={{ color: theme.textSecondary }}>Performance</p>
          <p className="text-2xl font-bold mt-2" style={{ color: theme.text }}>
            {dadosAnalytics.kpis.performanceGeral.toFixed(1)}%
          </p>
          <div className="mt-2">
            <div className="w-full rounded-full h-2" style={{ backgroundColor: theme.border }}>
              <div 
                className="rounded-full h-2"
                style={{ 
                  width: `${Math.min(dadosAnalytics.kpis.performanceGeral, 100)}%`,
                  backgroundColor: theme.success
                }}
              />
            </div>
          </div>
          <p className="text-xs mt-2" style={{ color: theme.textMuted }}>
            {dadosAnalytics.kpis.mesesComMeta} meses com meta atingida
          </p>
        </div>

        <div className="rounded-xl shadow-sm p-6 border-l-4" style={{ backgroundColor: theme.card, borderLeftColor: theme.purple }}>
          <p className="text-sm uppercase tracking-wider" style={{ color: theme.textSecondary }}>Ticket Médio</p>
          <p className="text-2xl font-bold mt-2" style={{ color: theme.text }}>
            {formatMoeda(dadosAnalytics.kpis.ticketMedio)}
          </p>
          <p className="text-xs mt-2" style={{ color: theme.textMuted }}>
            {dadosAnalytics.kpis.totalVendas} vendas realizadas
          </p>
        </div>

        <div className="rounded-xl shadow-sm p-6 border-l-4" style={{ backgroundColor: theme.card, borderLeftColor: theme.warning }}>
          <p className="text-sm uppercase tracking-wider" style={{ color: theme.textSecondary }}>Mix de Vendas</p>
          <div className="flex items-center justify-between mt-2">
            <div>
              <p className="text-xs" style={{ color: theme.textMuted }}>Serviços</p>
              <p className="text-lg font-bold" style={{ color: theme.text }}>
                {((dadosAnalytics.kpis.totalServicos / dadosAnalytics.kpis.totalRealizado) * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: theme.textMuted }}>Tecnologia</p>
              <p className="text-lg font-bold" style={{ color: theme.text }}>
                {((dadosAnalytics.kpis.totalTecnologia / dadosAnalytics.kpis.totalRealizado) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* VISÃO: VENDAS */}
      {tipoVisao === 'vendas' && (
        <>
          {/* Evolução Anual - Previsto vs Realizado */}
          <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: theme.text }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CORES.blue }}></span>
                  Evolução de Vendas - {ano}
                </h3>
                <p className="text-sm mt-1" style={{ color: theme.textSecondary }}>
                  Comparativo mensal entre previsto e realizado
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: CORES.blue }}></span>
                  <span className="text-xs" style={{ color: theme.textSecondary }}>Realizado</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: CORES.gray }}></span>
                  <span className="text-xs" style={{ color: theme.textSecondary }}>Previsto</span>
                </div>
              </div>
            </div>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosAnalytics.evolucaoVendas}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                  <XAxis dataKey="mes" tick={{ fill: theme.textSecondary, fontSize: 12 }} />
                  <YAxis 
                    yAxisId="left"
                    tickFormatter={(value) => `R$ ${(value/1000)}k`}
                    tick={{ fill: theme.textSecondary, fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: theme.textSecondary }} />
                  <Bar yAxisId="left" dataKey="previsto" name="Previsto" fill={CORES.gray} radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="realizado" name="Realizado" fill={CORES.blue} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Crescimento Mensal e Composição */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Taxa de Crescimento Mensal */}
            <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: theme.text }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CORES.green }}></span>
                Taxa de Crescimento Mensal
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dadosAnalytics.crescimentoMensal}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                    <XAxis dataKey="mes" tick={{ fill: theme.textSecondary }} />
                    <YAxis 
                      tickFormatter={(value) => `${value.toFixed(0)}%`}
                      domain={[-50, 100]}
                      tick={{ fill: theme.textSecondary }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ color: theme.textSecondary }} />
                    <Line 
                      type="monotone" 
                      dataKey="crescimento" 
                      name="Crescimento %" 
                      stroke={CORES.green}
                      strokeWidth={2}
                      dot={{ r: 4, fill: CORES.green }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="atingimento" 
                      name="% Meta" 
                      stroke={CORES.blue}
                      strokeWidth={2}
                      dot={{ r: 4, fill: CORES.blue }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Composição por Tipo */}
            <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: theme.text }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CORES.purple }}></span>
                Composição de Vendas
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dadosAnalytics.evolucaoVendas}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                    <XAxis dataKey="mes" tick={{ fill: theme.textSecondary }} />
                    <YAxis tickFormatter={(value) => `R$ ${(value/1000)}k`} tick={{ fill: theme.textSecondary }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ color: theme.textSecondary }} />
                    <Area 
                      type="monotone" 
                      dataKey="servicos" 
                      name="Serviços" 
                      stackId="1"
                      stroke={CORES.blue} 
                      fill={CORES.blue} 
                      fillOpacity={0.6}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="tecnologia" 
                      name="Tecnologia" 
                      stackId="1"
                      stroke={CORES.purple} 
                      fill={CORES.purple} 
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Últimos 12 Meses */}
          <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: theme.text }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.indigo }}></span>
              Histórico - Últimos 12 Meses
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosAnalytics.ultimos12Meses}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                  <XAxis 
                    dataKey="periodo" 
                    angle={-45} 
                    textAnchor="end" 
                    height={70} 
                    tick={{ fill: theme.textSecondary, fontSize: 11 }}
                  />
                  <YAxis tickFormatter={(value) => `R$ ${(value/1000)}k`} tick={{ fill: theme.textSecondary }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: theme.textSecondary }} />
                  <Bar dataKey="realizado" name="Realizado" fill={theme.indigo} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* VISÃO: TÉCNICOS */}
      {tipoVisao === 'tecnicos' && (
        <>
          {/* Ranking de Técnicos */}
          <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: theme.text }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.orange }}></span>
              Ranking de Técnicos - Acumulado {ano}
            </h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dadosAnalytics.desempenhoTecnicos}
                  layout="vertical"
                  margin={{ left: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme.border} />
                  <XAxis 
                    type="number" 
                    tickFormatter={(value) => `R$ ${(value/1000)}k`}
                    tick={{ fill: theme.textSecondary }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="tecnico" 
                    width={120}
                    tick={{ fill: theme.textSecondary }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: theme.textSecondary }} />
                  <Bar 
                    dataKey="meta" 
                    name="Meta Anual" 
                    fill={CORES.gray} 
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar 
                    dataKey="realizado" 
                    name="Realizado" 
                    fill={theme.orange} 
                    radius={[0, 4, 4, 0]}
                  >
                    {dadosAnalytics.desempenhoTecnicos.map((entry: any, index: number) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.percentual >= 100 ? CORES.green : 
                              entry.percentual >= 70 ? CORES.yellow : CORES.red} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cards de Desempenho por Técnico */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dadosAnalytics.desempenhoTecnicos
              .filter((t: any) => t.tecnico !== 'FÁBRICA')
              .map((tecnico: any, idx: number) => (
              <div key={idx} className="rounded-xl shadow-sm p-6" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm uppercase tracking-wider" style={{ color: theme.textSecondary }}>
                      {tecnico.tecnico}
                    </p>
                    <p className="text-2xl font-bold mt-2" style={{ color: theme.text }}>
                      {formatMoeda(tecnico.realizado)}
                    </p>
                  </div>
                  <div className={`px-3 py-1.5 rounded-full text-sm font-semibold`} style={{ 
                    backgroundColor: tecnico.percentual >= 100 ? 'rgba(39, 174, 96, 0.2)' : 
                                    tecnico.percentual >= 70 ? 'rgba(243, 156, 18, 0.2)' : 
                                    'rgba(231, 76, 60, 0.2)',
                    color: tecnico.percentual >= 100 ? theme.success : 
                           tecnico.percentual >= 70 ? theme.warning : theme.danger,
                    border: `1px solid ${
                      tecnico.percentual >= 100 ? theme.success : 
                      tecnico.percentual >= 70 ? theme.warning : theme.danger
                    }30`
                  }}>
                    {tecnico.percentual.toFixed(1)}%
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: theme.textSecondary }}>Meta: {formatMoeda(tecnico.meta)}</span>
                    <span style={{ color: theme.textMuted }}>Faltam: {formatMoeda(Math.max(tecnico.meta - tecnico.realizado, 0))}</span>
                  </div>
                  <div className="w-full rounded-full h-2.5" style={{ backgroundColor: theme.border }}>
                    <div 
                      className="h-2.5 rounded-full"
                      style={{ 
                        width: `${Math.min(tecnico.percentual, 100)}%`,
                        backgroundColor: tecnico.percentual >= 100 ? theme.success : 
                                      tecnico.percentual >= 70 ? theme.warning : theme.danger
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* VISÃO: TECNOLOGIA */}
      {tipoVisao === 'tecnologia' && (
        <>
          {/* Vendas por Categoria */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: theme.text }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.purple }}></span>
                Vendas por Categoria
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosAnalytics.tecnologiaCategorias}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                    <XAxis 
                      dataKey="categoria" 
                      angle={-15} 
                      textAnchor="end" 
                      height={80}
                      tick={{ fill: theme.textSecondary, fontSize: 11 }}
                    />
                    <YAxis tickFormatter={(value) => `R$ ${(value/1000)}k`} tick={{ fill: theme.textSecondary }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ color: theme.textSecondary }} />
                    <Bar dataKey="previsto" name="Previsto" fill={CORES.gray} />
                    <Bar dataKey="realizado" name="Realizado" fill={theme.purple} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Distribuição por Categoria - CORRIGIDO */}
            <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: theme.text }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.pink }}></span>
                Distribuição de Receita
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosAnalytics.tecnologiaCategorias}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="realizado"
                      label={(entry) => {
                        // CORREÇÃO: Acessando a categoria corretamente
                        const categoria = entry.payload?.categoria || entry.name || 'Categoria';
                        return `${categoria.split(' ')[0]} ${(entry.percent * 100).toFixed(0)}%`;
                      }}
                      labelLine={{ stroke: theme.textSecondary }}
                    >
                      {dadosAnalytics.tecnologiaCategorias.map((entry: any, index: number) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={CORES_GRAFICO[index % CORES_GRAFICO.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Comissões */}
          <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: 'rgba(155, 89, 182, 0.1)', border: `1px solid ${theme.purple}30` }}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: theme.text }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.purple }}></span>
              Resumo de Comissões - Tecnologia
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {dadosAnalytics.tecnologiaCategorias.map((cat: any, idx: number) => {
                let comissao = 0
                let percentual = 0
                
                if (cat.categoria.includes('SINAIS')) percentual = 4.6
                else if (cat.categoria.includes('Licenças')) percentual = 10
                else if (cat.categoria.includes('Hardwares')) percentual = 10
                else if (cat.categoria.includes('Treinamentos')) percentual = 83
                
                comissao = cat.realizado * (percentual / 100)
                
                return (
                  <div key={idx} className="rounded-lg p-4" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
                    <p className="text-xs mb-1" style={{ color: theme.textMuted }}>{cat.categoria.split(' ').slice(0, 2).join(' ')}</p>
                    <p className="text-lg font-bold" style={{ color: theme.text }}>{formatMoeda(comissao)}</p>
                    <p className="text-xs mt-1" style={{ color: theme.purple }}>{percentual}% sobre vendas</p>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* VISÃO: LOGÍSTICA */}
      {tipoVisao === 'logistica' && (
        <>
          {/* Gastos Mensais */}
          <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: theme.text }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.warning }}></span>
              Gastos Logísticos Mensais - {ano}
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosAnalytics.logisticaMensal}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                  <XAxis dataKey="mes" tick={{ fill: theme.textSecondary }} />
                  <YAxis yAxisId="left" tickFormatter={(value) => `R$ ${(value/1000)}k`} tick={{ fill: theme.textSecondary }} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${(value/1000)}k km`} tick={{ fill: theme.textSecondary }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: theme.textSecondary }} />
                  <Bar yAxisId="left" dataKey="diesel" name="Diesel" fill={CORES.yellow} stackId="gastos" />
                  <Bar yAxisId="left" dataKey="manutencao" name="Manutenção" fill={CORES.red} stackId="gastos" />
                  <Line yAxisId="right" type="monotone" dataKey="km" name="KM Rodados" stroke={CORES.blue} strokeWidth={2} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Indicadores de Eficiência */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(52, 152, 219, 0.1)', border: `1px solid ${CORES.blue}30` }}>
              <p className="text-sm font-medium mb-1" style={{ color: CORES.blue }}>Custo por KM</p>
              <p className="text-3xl font-bold" style={{ color: theme.text }}>
                {formatMoeda(dadosAnalytics.kpis.custoMedioPorKM)}
              </p>
              <p className="text-xs mt-2" style={{ color: theme.textMuted }}>
                Média anual: {formatMoeda(dadosAnalytics.kpis.custoMedioPorKM)}/km
              </p>
            </div>

            <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(39, 174, 96, 0.1)', border: `1px solid ${CORES.green}30` }}>
              <p className="text-sm font-medium mb-1" style={{ color: CORES.green }}>Total KM Rodados</p>
              <p className="text-3xl font-bold" style={{ color: theme.text }}>
                {formatKM(dadosAnalytics.kpis.totalKM)}
              </p>
              <p className="text-xs mt-2" style={{ color: theme.textMuted }}>
                Média mensal: {formatKM(dadosAnalytics.kpis.totalKM / 12)}
              </p>
            </div>

            <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(155, 89, 182, 0.1)', border: `1px solid ${CORES.purple}30` }}>
              <p className="text-sm font-medium mb-1" style={{ color: CORES.purple }}>Total Gastos</p>
              <p className="text-3xl font-bold" style={{ color: theme.text }}>
                {formatMoeda(dadosAnalytics.kpis.totalDiesel + dadosAnalytics.kpis.totalManutencao)}
              </p>
              <p className="text-xs mt-2" style={{ color: theme.textMuted }}>
                Diesel: {formatMoeda(dadosAnalytics.kpis.totalDiesel)} | 
                Manut: {formatMoeda(dadosAnalytics.kpis.totalManutencao)}
              </p>
            </div>
          </div>

          {/* Eficiência Mensal */}
          <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: theme.text }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.teal }}></span>
              Eficiência da Frota
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dadosAnalytics.logisticaMensal}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                  <XAxis dataKey="mes" tick={{ fill: theme.textSecondary }} />
                  <YAxis yAxisId="left" tickFormatter={(value) => `${value.toFixed(1)} km/l`} tick={{ fill: theme.textSecondary }} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `R$ ${value.toFixed(2)}`} tick={{ fill: theme.textSecondary }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: theme.textSecondary }} />
                  <Bar 
                    yAxisId="left" 
                    dataKey="eficiencia" 
                    name="Eficiência (km/l)" 
                    fill={theme.teal} 
                    radius={[4, 4, 0, 0]} 
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="custoPorKM" 
                    name="Custo por KM" 
                    stroke={theme.orange} 
                    strokeWidth={2} 
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* TOP PRODUTOS - Visível em todas as abas */}
      <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: theme.text }}>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.warning }}></span>
          Top 10 Produtos/Serviços - {ano}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dadosAnalytics.topProdutos}
                layout="vertical"
                margin={{ left: 100 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme.border} />
                <XAxis 
                  type="number" 
                  tickFormatter={(value) => `R$ ${(value/1000)}k`}
                  tick={{ fill: theme.textSecondary }}
                />
                <YAxis 
                  type="category" 
                  dataKey="produto" 
                  width={120}
                  tick={{ fill: theme.textSecondary }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="valor" name="Faturamento" fill={theme.warning} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="space-y-3">
            {dadosAnalytics.topProdutos.slice(0, 5).map((item: any, idx: number) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
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
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium" style={{ color: theme.text }}>{item.produto}</span>
                    <span className="text-sm font-semibold" style={{ color: theme.text }}>
                      {formatMoeda(item.valor)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ 
                      backgroundColor: item.tipo === 'servico' ? 'rgba(52, 152, 219, 0.2)' : 'rgba(155, 89, 182, 0.2)',
                      color: item.tipo === 'servico' ? theme.blue : theme.purple,
                      border: `1px solid ${item.tipo === 'servico' ? theme.blue : theme.purple}30`
                    }}>
                      {item.tipo === 'servico' ? '🔧 Serviço' : '💻 Tecnologia'}
                    </span>
                    <span className="text-xs" style={{ color: theme.textMuted }}>
                      {item.quantidade} venda{item.quantidade > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Análise de Sazonalidade */}
      <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: 'rgba(93, 173, 226, 0.1)', border: `1px solid ${theme.indigo}30` }}>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: theme.text }}>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.indigo }}></span>
          Análise de Sazonalidade
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {dadosAnalytics.sazonalidade.map((mes: any, idx: number) => (
            <div key={idx} className="rounded-lg p-4" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium" style={{ color: theme.text }}>{mes.mes}</span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full`} style={{ 
                  backgroundColor: mes.variacao >= 0 ? 'rgba(39, 174, 96, 0.2)' : 'rgba(231, 76, 60, 0.2)',
                  color: mes.variacao >= 0 ? theme.success : theme.danger,
                  border: `1px solid ${mes.variacao >= 0 ? theme.success : theme.danger}30`
                }}>
                  {mes.variacao > 0 ? '+' : ''}{mes.variacao.toFixed(1)}%
                </span>
              </div>
              <p className="text-lg font-bold" style={{ color: theme.text }}>{formatMoeda(mes.media)}</p>
              <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
                {mes.variacao >= 0 ? 'Acima da meta' : 'Abaixo da meta'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Insights Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: theme.card, border: `1px solid ${theme.indigo}30` }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: theme.textMuted }}>Meta Anual</p>
              <p className="text-xl font-bold" style={{ color: theme.text }}>
                {((dadosAnalytics.kpis.totalRealizado / dadosAnalytics.kpis.totalPrevisto) * 100).toFixed(1)}%
              </p>
              <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
                {formatMoeda(dadosAnalytics.kpis.totalRealizado)} / {formatMoeda(dadosAnalytics.kpis.totalPrevisto)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: theme.card, border: `1px solid ${theme.success}30` }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">📈</span>
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: theme.textMuted }}>Melhor Mês</p>
              <p className="text-xl font-bold" style={{ color: theme.text }}>
                {dadosAnalytics.evolucaoVendas.sort((a: any, b: any) => b.realizado - a.realizado)[0]?.mes}
              </p>
              <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
                {formatMoeda(dadosAnalytics.evolucaoVendas.sort((a: any, b: any) => b.realizado - a.realizado)[0]?.realizado)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: theme.card, border: `1px solid ${theme.purple}30` }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: theme.textMuted }}>Top Técnico</p>
              <p className="text-xl font-bold" style={{ color: theme.text }}>
                {dadosAnalytics.desempenhoTecnicos[0]?.tecnico}
              </p>
              <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
                {formatMoeda(dadosAnalytics.desempenhoTecnicos[0]?.realizado)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: theme.card, border: `1px solid ${theme.warning}30` }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: theme.textMuted }}>Média Mensal</p>
              <p className="text-xl font-bold" style={{ color: theme.text }}>
                {formatMoeda(dadosAnalytics.kpis.totalRealizado / 12)}
              </p>
              <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
                {dadosAnalytics.kpis.mesesAcimaMedia} meses acima da média
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}