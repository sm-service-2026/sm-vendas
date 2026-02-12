'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Estados para os dados reais
  const [resumoVendas, setResumoVendas] = useState({
    total_realizado: 0,
    total_previsto: 0,
    total_servicos: 0,
    total_tecnologia: 0
  })

  const [resumoLogistica, setResumoLogistica] = useState({
    total_diesel_mes: 0,
    total_manutencao_mes: 0,
    total_km_mes: 0,
    media_km_por_litro: 0,
    custo_por_km: 0
  })

  const [metasTecnicos, setMetasTecnicos] = useState<any[]>([])
  const [ultimasVendas, setUltimasVendas] = useState<any[]>([])
  const [ultimosGastos, setUltimosGastos] = useState<any[]>([])
  const [dadosComparativo, setDadosComparativo] = useState<any[]>([])

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
    yellow: '#f39c12'
  }

  // Cores para gráficos
  const CORES = {
    primary: '#e74c3c',
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
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
      }
      setLoading(false)
    }
    getUser()
  }, [router, supabase])

  useEffect(() => {
    async function fetchDadosReais() {
      const mesAtual = new Date().getMonth() + 1
      const anoAtual = new Date().getFullYear()

      try {
        // 1. Buscar vendas do mês atual
        const { data: vendasMes } = await supabase
          .from('vendas_servicos')
          .select('*')
          .eq('ano', anoAtual)
          .eq('mes', mesAtual)

        // 2. Buscar vendas totais do ano
        const { data: vendasAno } = await supabase
          .from('vendas_servicos')
          .select('*')
          .eq('ano', anoAtual)

        // 3. Buscar metas do mês atual
        const { data: metas } = await supabase
          .from('metas_tecnicos')
          .select('*, tecnicos(nome)')
          .eq('ano', anoAtual)
          .eq('mes', mesAtual)

        // 4. Buscar logística do mês atual
        const lastDay = new Date(anoAtual, mesAtual, 0).getDate()
        const { data: logistica } = await supabase
          .from('caminhoes_logistica')
          .select('*')
          .gte('data', `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`)
          .lte('data', `${anoAtual}-${String(mesAtual).padStart(2, '0')}-${lastDay}`)

        // 5. Buscar últimas 5 vendas
        const { data: ultimasVendasData } = await supabase
          .from('vendas_servicos')
          .select('*, tecnicos(nome)')
          .order('created_at', { ascending: false })
          .limit(5)

        // 6. Buscar últimos 5 gastos com logística
        const { data: ultimosGastosData } = await supabase
          .from('caminhoes_logistica')
          .select('*')
          .order('data', { ascending: false })
          .limit(5)

        // Processar vendas
        if (vendasMes) {
          const totalRealizado = vendasMes.reduce((acc, v) => acc + (v.valor_realizado || 0), 0)
          const totalPrevisto = vendasMes.reduce((acc, v) => acc + (v.valor_previsto || 0), 0)
          const totalServicos = vendasMes
            .filter(v => v.tipo === 'servico')
            .reduce((acc, v) => acc + (v.valor_realizado || 0), 0)
          const totalTecnologia = vendasMes
            .filter(v => v.tipo === 'tecnologia')
            .reduce((acc, v) => acc + (v.valor_realizado || 0), 0)

          setResumoVendas({
            total_realizado: totalRealizado,
            total_previsto: totalPrevisto,
            total_servicos: totalServicos,
            total_tecnologia: totalTecnologia
          })
        }

        // Processar comparativo previsto x realizado
        if (vendasAno) {
          const comparativo = Array(12).fill(0).map((_, i) => ({
            mes: i + 1,
            previsto: 0,
            realizado: 0
          }))

          vendasAno.forEach(venda => {
            const idx = venda.mes - 1
            comparativo[idx].previsto += venda.valor_previsto || 0
            comparativo[idx].realizado += venda.valor_realizado || 0
          })

          const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
          setDadosComparativo(
            comparativo.map((item, index) => ({
              mes: meses[index],
              previsto: item.previsto,
              realizado: item.realizado
            }))
          )
        }

        // Processar logística
        if (logistica && logistica.length > 0) {
          const resumo = logistica.reduce((acc, reg) => ({
            total_diesel_mes: acc.total_diesel_mes + (reg.diesel_valor || 0),
            total_manutencao_mes: acc.total_manutencao_mes + (reg.manutencao_valor || 0),
            total_km_mes: acc.total_km_mes + (reg.km_rodados || 0),
            total_diesel_litros: acc.total_diesel_litros + (reg.diesel_litros || 0)
          }), { total_diesel_mes: 0, total_manutencao_mes: 0, total_km_mes: 0, total_diesel_litros: 0 })

          setResumoLogistica({
            total_diesel_mes: resumo.total_diesel_mes,
            total_manutencao_mes: resumo.total_manutencao_mes,
            total_km_mes: resumo.total_km_mes,
            media_km_por_litro: resumo.total_diesel_litros > 0 
              ? Number((resumo.total_km_mes / resumo.total_diesel_litros).toFixed(1)) 
              : 0,
            custo_por_km: resumo.total_km_mes > 0
              ? Number(((resumo.total_diesel_mes + resumo.total_manutencao_mes) / resumo.total_km_mes).toFixed(2))
              : 0
          })
        }

        setMetasTecnicos(metas || [])
        setUltimasVendas(ultimasVendasData || [])
        setUltimosGastos(ultimosGastosData || [])

      } catch (error) {
        console.error('Erro ao buscar dados:', error)
      }
    }

    if (user) {
      fetchDadosReais()
    }
  }, [user, supabase])

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
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }) + ' km'
  }

  const formatData = (data: string) => {
    try {
      return new Date(data).toLocaleDateString('pt-BR')
    } catch {
      return data
    }
  }

  const percentualAtingimento = resumoVendas.total_previsto > 0 
    ? (resumoVendas.total_realizado / resumoVendas.total_previsto) * 100 
    : 0

  const nomeUsuario = user?.email?.split('@')[0] || 'Usuário'
  const dataAtual = new Date()
  const mesAtual = dataAtual.toLocaleString('pt-BR', { month: 'long' })
  const ano = dataAtual.getFullYear()

  // Custom Tooltip
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
                {formatMoeda(entry.value)}
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
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-transparent" style={{ borderColor: theme.primary, borderTopColor: 'transparent' }} />
        <p className="text-white mt-4 text-lg font-medium">Carregando dashboard...</p>
        <p className="text-gray-400 text-sm mt-2">Buscando seus dados</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 py-6">
      {/* Header com Saudação */}
      <div className="card p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              Olá, {nomeUsuario}! 👋
              <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(39, 174, 96, 0.2)', color: theme.success, border: '1px solid rgba(39, 174, 96, 0.3)' }}>
                Online
              </span>
            </h2>
            <p className="text-gray-400 mt-1 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme.success }} />
              {mesAtual.charAt(0).toUpperCase() + mesAtual.slice(1)} de {ano} - Acompanhe seus indicadores
            </p>
          </div>
          <div className="px-4 py-2 rounded-xl" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
            <p className="text-sm text-gray-400">
              Última atualização: <span className="font-semibold text-white">{new Date().toLocaleTimeString('pt-BR')}</span>
            </p>
          </div>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card Vendas */}
        <div className="card-kpi">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-400 uppercase tracking-wider">Vendas (Mês)</p>
              <p className="text-3xl font-bold text-white mt-2">
                {formatMoeda(resumoVendas.total_realizado)}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Meta: {formatMoeda(resumoVendas.total_previsto)}
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(231, 76, 60, 0.2)' }}>
              <span className="text-2xl">💰</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t" style={{ borderColor: theme.border }}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">% Atingimento</span>
              <span className={`font-semibold ${
                percentualAtingimento >= 100 ? 'text-green-500' : 
                percentualAtingimento >= 70 ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {percentualAtingimento.toFixed(1)}%
              </span>
            </div>
            <div className="w-full rounded-full h-2 mt-2" style={{ backgroundColor: theme.border }}>
              <div 
                className={`rounded-full h-2 transition-all duration-500 ${
                  percentualAtingimento >= 100 ? 'bg-green-500' : 
                  percentualAtingimento >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(percentualAtingimento, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card Serviços */}
        <div className="card-kpi" style={{ borderLeftColor: theme.success }}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-400 uppercase tracking-wider">Serviços</p>
              <p className="text-3xl font-bold text-white mt-2">
                {formatMoeda(resumoVendas.total_servicos)}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Técnicos + Fábrica
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(39, 174, 96, 0.2)' }}>
              <span className="text-2xl">🔧</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t" style={{ borderColor: theme.border }}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">vs Tecnologia</span>
              <span className="text-sm font-semibold text-white">
                {resumoVendas.total_realizado > 0 
                  ? ((resumoVendas.total_servicos / resumoVendas.total_realizado) * 100).toFixed(1) 
                  : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Card Tecnologia */}
        <div className="card-kpi" style={{ borderLeftColor: theme.purple }}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-400 uppercase tracking-wider">Tecnologia</p>
              <p className="text-3xl font-bold text-white mt-2">
                {formatMoeda(resumoVendas.total_tecnologia)}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Sinais, Licenças, Hardwares
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(155, 89, 182, 0.2)' }}>
              <span className="text-2xl">💻</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t" style={{ borderColor: theme.border }}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Comissão (10%)</span>
              <span className="text-sm font-semibold text-white">
                {formatMoeda(resumoVendas.total_tecnologia * 0.1)}
              </span>
            </div>
          </div>
        </div>

        {/* Card Logística */}
        <div className="card-kpi" style={{ borderLeftColor: theme.yellow }}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-400 uppercase tracking-wider">Logística</p>
              <p className="text-3xl font-bold text-white mt-2">
                {formatMoeda(resumoLogistica.total_diesel_mes + resumoLogistica.total_manutencao_mes)}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                {formatKM(resumoLogistica.total_km_mes)} rodados
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(243, 156, 18, 0.2)' }}>
              <span className="text-2xl">🚛</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t" style={{ borderColor: theme.border }}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Custo por KM</span>
              <span className="font-semibold text-white">
                {formatMoeda(resumoLogistica.custo_por_km)}/km
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Vendas - Previsto x Realizado */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CORES.primary }} />
                Vendas - Previsto vs Realizado
              </h3>
              <p className="text-sm text-gray-400 mt-1">Comparativo mensal {ano}</p>
            </div>
            <a 
              href="/dashboard/analytics" 
              className="text-sm font-medium flex items-center gap-1 transition-colors"
              style={{ color: CORES.primary }}
              onMouseEnter={(e) => e.currentTarget.style.color = theme.primaryDark}
              onMouseLeave={(e) => e.currentTarget.style.color = CORES.primary}
            >
              Ver detalhes
              <span className="text-lg">→</span>
            </a>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosComparativo}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                <XAxis 
                  dataKey="mes" 
                  tick={{ fill: theme.textSecondary, fontSize: 12 }}
                  axisLine={{ stroke: theme.border }}
                />
                <YAxis 
                  tick={{ fill: theme.textSecondary, fontSize: 12 }}
                  axisLine={{ stroke: theme.border }}
                  tickFormatter={(value) => `R$ ${(value / 1000)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: theme.textSecondary }} />
                <Bar dataKey="previsto" name="Previsto" fill={CORES.gray} radius={[4, 4, 0, 0]} />
                <Bar dataKey="realizado" name="Realizado" fill={CORES.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Composição de Vendas */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CORES.purple }} />
                Composição de Vendas
              </h3>
              <p className="text-sm text-gray-400 mt-1">Serviços vs Tecnologia</p>
            </div>
          </div>
          <div className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Serviços', value: resumoVendas.total_servicos || 1 },
                    { name: 'Tecnologia', value: resumoVendas.total_tecnologia || 1 }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                  labelLine={{ stroke: theme.textSecondary }}
                >
                  <Cell fill={CORES.green} />
                  <Cell fill={CORES.purple} />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-8 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CORES.green }} />
              <span className="text-sm text-gray-400">Serviços</span>
              <span className="text-sm font-semibold text-white">{formatMoeda(resumoVendas.total_servicos)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CORES.purple }} />
              <span className="text-sm text-gray-400">Tecnologia</span>
              <span className="text-sm font-semibold text-white">{formatMoeda(resumoVendas.total_tecnologia)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metas dos Técnicos */}
      <div className="card p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CORES.green }} />
              Metas dos Técnicos - {mesAtual.charAt(0).toUpperCase() + mesAtual.slice(1)}
            </h3>
            <p className="text-sm text-gray-400 mt-1">Acompanhamento de desempenho individual</p>
          </div>
          <a 
            href="/dashboard/vendas/servicos" 
            className="text-sm font-medium flex items-center gap-1 transition-colors"
            style={{ color: CORES.primary }}
            onMouseEnter={(e) => e.currentTarget.style.color = theme.primaryDark}
            onMouseLeave={(e) => e.currentTarget.style.color = CORES.primary}
          >
            Gerenciar metas
            <span className="text-lg">→</span>
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {metasTecnicos.length > 0 ? (
            metasTecnicos.map((meta, idx) => {
              const percentual = meta.valor_meta > 0 ? (meta.valor_realizado / meta.valor_meta) * 100 : 0
              
              return (
                <div key={idx} className="p-5 rounded-xl" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-white text-lg">{meta.tecnicos?.nome}</p>
                      <p className="text-sm text-gray-400 mt-1">Meta mensal</p>
                    </div>
                    <div className={`px-3 py-1.5 rounded-full text-sm font-semibold border`} style={{ 
                      backgroundColor: percentual >= 100 ? 'rgba(39, 174, 96, 0.2)' : percentual >= 70 ? 'rgba(243, 156, 18, 0.2)' : 'rgba(231, 76, 60, 0.2)',
                      color: percentual >= 100 ? theme.success : percentual >= 70 ? theme.warning : theme.danger,
                      borderColor: percentual >= 100 ? `${theme.success}30` : percentual >= 70 ? `${theme.warning}30` : `${theme.danger}30`
                    }}>
                      {percentual.toFixed(1)}%
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Meta:</span>
                      <span className="font-medium text-white">{formatMoeda(meta.valor_meta || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Realizado:</span>
                      <span className="font-medium text-green-500">{formatMoeda(meta.valor_realizado || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Restante:</span>
                      <span className={`font-medium ${(meta.valor_meta - meta.valor_realizado) > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                        {formatMoeda(Math.max(meta.valor_meta - meta.valor_realizado, 0))}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="w-full rounded-full h-2.5" style={{ backgroundColor: theme.border }}>
                      <div 
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          percentual >= 100 ? 'bg-green-500' : percentual >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(percentual, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="col-span-2 text-center py-12 rounded-xl" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
              <p className="text-gray-400 text-lg">Nenhuma meta cadastrada para este mês</p>
              <p className="text-gray-500 text-sm mt-2">Cadastre metas em Vendas - Serviços</p>
            </div>
          )}
        </div>
      </div>

      {/* Módulos do Sistema */}
      <div className="card p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.indigo }} />
              Módulos do Sistema
            </h3>
            <p className="text-sm text-gray-400 mt-1">Acesso rápido às funcionalidades</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { href: '/dashboard/vendas/servicos', icon: '🔧', title: 'Serviços', desc: 'Metas e realizados', color: CORES.primary },
            { href: '/dashboard/vendas/tecnologia', icon: '💻', title: 'Tecnologia', desc: 'Sinais e licenças', color: CORES.purple },
            { href: '/dashboard/logistica', icon: '🚛', title: 'Logística', desc: 'Caminhões e diesel', color: CORES.yellow },
            { href: '/dashboard/analytics', icon: '📊', title: 'Analytics', desc: 'Gráficos e insights', color: theme.indigo },
            { href: '/dashboard/relatorios/mensal', icon: '📋', title: 'Relatório Mensal', desc: 'Análise completa do mês', color: CORES.orange }
          ].map((item, index) => (
            <a
              key={index}
              href={item.href}
              className="group p-5 rounded-xl transition-all border-2 hover:scale-105"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', borderColor: 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = item.color}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl shadow-sm group-hover:scale-110 transition-transform" style={{ backgroundColor: theme.card }}>
                  <span className="text-2xl">{item.icon}</span>
                </div>
                <div>
                  <h4 className="font-semibold text-white">{item.title}</h4>
                  <p className="text-xs text-gray-400 mt-1">{item.desc}</p>
                  <span className="text-xs font-medium mt-2 inline-block" style={{ color: item.color }}>
                    Acessar →
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Atividades Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimas Vendas */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CORES.green }} />
              Últimas Vendas
            </h3>
            <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: theme.textSecondary }}>
              {ultimasVendas.length} registros
            </span>
          </div>
          
          <div className="space-y-3">
            {ultimasVendas.length > 0 ? (
              ultimasVendas.map((venda, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center`} style={{ 
                      backgroundColor: venda.tipo === 'servico' ? 'rgba(39, 174, 96, 0.2)' : 'rgba(155, 89, 182, 0.2)'
                    }}>
                      <span>{venda.tipo === 'servico' ? '🔧' : '💻'}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{venda.categoria}</p>
                      <p className="text-xs text-gray-400">
                        {venda.tecnicos?.nome || 'Fábrica'} • {venda.mes}/{venda.ano}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-500">
                      {formatMoeda(venda.valor_realizado || 0)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Prev: {formatMoeda(venda.valor_previsto || 0)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 rounded-lg" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                <p className="text-gray-400">Nenhuma venda registrada</p>
              </div>
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t" style={{ borderColor: theme.border }}>
            <a 
              href="/dashboard/vendas/servicos" 
              className="text-sm font-medium flex items-center justify-center gap-1 transition-colors"
              style={{ color: CORES.primary }}
              onMouseEnter={(e) => e.currentTarget.style.color = theme.primaryDark}
              onMouseLeave={(e) => e.currentTarget.style.color = CORES.primary}
            >
              Ver todas as vendas <span>→</span>
            </a>
          </div>
        </div>

        {/* Últimos Gastos */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CORES.yellow }} />
              Últimos Gastos
            </h3>
            <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: theme.textSecondary }}>
              {ultimosGastos.length} registros
            </span>
          </div>
          
          <div className="space-y-3">
            {ultimosGastos.length > 0 ? (
              ultimosGastos.map((gasto, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(243, 156, 18, 0.2)' }}>
                      <span>🚛</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{gasto.placa}</p>
                      <p className="text-xs text-gray-400">
                        {gasto.motorista || 'Sem motorista'} • {formatData(gasto.data)}
                      </p>
                      {gasto.manutencao_descricao && (
                        <p className="text-xs text-gray-500 mt-1">
                          🔧 {gasto.manutencao_descricao}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {gasto.diesel_valor > 0 && (
                      <p className="text-sm font-semibold" style={{ color: CORES.yellow }}>
                        ⛽ {formatMoeda(gasto.diesel_valor)}
                      </p>
                    )}
                    {gasto.manutencao_valor > 0 && (
                      <p className="text-sm font-semibold" style={{ color: CORES.red }}>
                        🔧 {formatMoeda(gasto.manutencao_valor)}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      {gasto.km_rodados} km
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 rounded-lg" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                <p className="text-gray-400">Nenhum gasto registrado</p>
              </div>
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t" style={{ borderColor: theme.border }}>
            <a 
              href="/dashboard/logistica" 
              className="text-sm font-medium flex items-center justify-center gap-1 transition-colors"
              style={{ color: CORES.primary }}
              onMouseEnter={(e) => e.currentTarget.style.color = theme.primaryDark}
              onMouseLeave={(e) => e.currentTarget.style.color = CORES.primary}
            >
              Ver todos os gastos <span>→</span>
            </a>
          </div>
        </div>
      </div>

      {/* Atalhos Rápidos */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-yellow-500">⚡</span>
              Atalhos Rápidos
            </h3>
            <p className="text-gray-400 text-sm mt-1">Ações mais frequentes</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => router.push('/dashboard/logistica')}
            className="px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 font-medium shadow-lg"
            style={{ backgroundColor: CORES.yellow, color: '#2d2d2d' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e67e22'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = CORES.yellow}
          >
            <span>⛽</span> Novo Abastecimento
          </button>
          
          <button 
            onClick={() => router.push('/dashboard/vendas/servicos')}
            className="px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 font-medium shadow-lg text-white"
            style={{ backgroundColor: CORES.primary }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.primaryDark}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = CORES.primary}
          >
            <span>💰</span> Lançar Venda
          </button>
          
          <button 
            onClick={() => router.push('/dashboard/vendas/tecnologia')}
            className="px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 font-medium shadow-lg text-white"
            style={{ backgroundColor: CORES.purple }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#8e44ad'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = CORES.purple}
          >
            <span>💻</span> Tecnologia
          </button>
          
          <button 
            onClick={() => router.push('/dashboard/analytics')}
            className="px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 font-medium shadow-lg text-white"
            style={{ backgroundColor: theme.indigo }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2980b9'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.indigo}
          >
            <span>📊</span> Analytics
          </button>

          <button 
            onClick={() => router.push('/dashboard/relatorios/mensal')}
            className="px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 font-medium shadow-lg text-white"
            style={{ backgroundColor: CORES.orange }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d35400'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = CORES.orange}
          >
            <span>📋</span> Relatório Mensal
          </button>
        </div>

        <div className="mt-6 pt-6 border-t" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: CORES.green }} />
              <span className="text-gray-400">Sistema operacional</span>
            </div>
            <span className="text-gray-600">•</span>
            <span className="text-gray-400">Última atualização: Hoje {new Date().toLocaleTimeString('pt-BR')}</span>
            <span className="text-gray-600">•</span>
            <span className="text-gray-400">v2.0.0</span>
          </div>
        </div>
      </div>
    </div>
  )
}