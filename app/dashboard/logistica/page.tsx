'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface RegistroLogistica {
  id: string
  placa: string
  data: string
  km_rodados: number
  diesel_litros: number
  diesel_valor: number
  manutencao_descricao: string | null
  manutencao_valor: number
  motorista: string | null
  observacao: string | null
  created_at: string
}

interface Veiculo {
  placa: string
  total_diesel: number
  total_manutencao: number
  total_km: number
  total_litros: number
  custo_por_km: number
  eficiencia: number
}

export default function LogisticaPage() {
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
    yellow: '#e74c3c',
    yellowDark: '#e67e22',
    red: '#e74c3c',
    blue: '#3498db',
    purple: '#9b59b6'
  }

  // Estados principais
  const [loading, setLoading] = useState(true)
  const [ano, setAno] = useState(new Date().getFullYear())
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [registros, setRegistros] = useState<RegistroLogistica[]>([])
  
  // Estados para modais
  const [showModalRegistro, setShowModalRegistro] = useState(false)
  const [showModalExcluir, setShowModalExcluir] = useState(false)
  const [registroEditando, setRegistroEditando] = useState<RegistroLogistica | null>(null)
  const [itemParaExcluir, setItemParaExcluir] = useState<{ id: string, nome: string } | null>(null)
  
  // Estados para formulário
  const [formRegistro, setFormRegistro] = useState({
    placa: '',
    data: new Date().toISOString().split('T')[0],
    km_rodados: 0,
    diesel_litros: 0,
    diesel_valor: 0,
    manutencao_descricao: '',
    manutencao_valor: 0,
    motorista: '',
    observacao: ''
  })

  // Filtros
  const [filtroPlaca, setFiltroPlaca] = useState<string>('todas')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')

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
    carregarRegistros()
  }, [ano, mes])

  async function carregarRegistros() {
    setLoading(true)
    try {
      const startDate = `${ano}-${String(mes).padStart(2, '0')}-01`
      const lastDay = new Date(ano, mes, 0).getDate()
      const endDate = `${ano}-${String(mes).padStart(2, '0')}-${lastDay}`
      
      const { data, error } = await supabase
        .from('caminhoes_logistica')
        .select('*')
        .gte('data', startDate)
        .lte('data', endDate)
        .order('data', { ascending: false })

      if (error) throw error
      
      setRegistros(data || [])
    } catch (error) {
      console.error('Erro ao carregar registros:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  // ========== CRUD REGISTROS ==========
  function handleNovoRegistro() {
    setRegistroEditando(null)
    setFormRegistro({
      placa: '',
      data: new Date().toISOString().split('T')[0],
      km_rodados: 0,
      diesel_litros: 0,
      diesel_valor: 0,
      manutencao_descricao: '',
      manutencao_valor: 0,
      motorista: '',
      observacao: ''
    })
    setShowModalRegistro(true)
  }

  function handleEditarRegistro(registro: RegistroLogistica) {
    setRegistroEditando(registro)
    setFormRegistro({
      placa: registro.placa,
      data: registro.data.split('T')[0],
      km_rodados: registro.km_rodados,
      diesel_litros: registro.diesel_litros,
      diesel_valor: registro.diesel_valor,
      manutencao_descricao: registro.manutencao_descricao || '',
      manutencao_valor: registro.manutencao_valor,
      motorista: registro.motorista || '',
      observacao: registro.observacao || ''
    })
    setShowModalRegistro(true)
  }

  async function handleSalvarRegistro() {
    if (!formRegistro.placa.trim()) {
      toast.error('Placa do veículo é obrigatória')
      return
    }

    if (formRegistro.km_rodados < 0) {
      toast.error('KM rodados não pode ser negativo')
      return
    }

    if (formRegistro.diesel_valor < 0 || formRegistro.manutencao_valor < 0) {
      toast.error('Valores não podem ser negativos')
      return
    }

    try {
      if (registroEditando) {
        const { error } = await supabase
          .from('caminhoes_logistica')
          .update({
            placa: formRegistro.placa.toUpperCase(),
            data: formRegistro.data,
            km_rodados: formRegistro.km_rodados,
            diesel_litros: formRegistro.diesel_litros,
            diesel_valor: formRegistro.diesel_valor,
            manutencao_descricao: formRegistro.manutencao_descricao || null,
            manutencao_valor: formRegistro.manutencao_valor,
            motorista: formRegistro.motorista || null,
            observacao: formRegistro.observacao || null
          })
          .eq('id', registroEditando.id)

        if (error) throw error
        toast.success('Registro atualizado com sucesso!')
      } else {
        const { error } = await supabase
          .from('caminhoes_logistica')
          .insert([{
            placa: formRegistro.placa.toUpperCase(),
            data: formRegistro.data,
            km_rodados: formRegistro.km_rodados,
            diesel_litros: formRegistro.diesel_litros,
            diesel_valor: formRegistro.diesel_valor,
            manutencao_descricao: formRegistro.manutencao_descricao || null,
            manutencao_valor: formRegistro.manutencao_valor,
            motorista: formRegistro.motorista || null,
            observacao: formRegistro.observacao || null
          }])

        if (error) throw error
        toast.success('Registro cadastrado com sucesso!')
      }

      setShowModalRegistro(false)
      carregarRegistros()
    } catch (error) {
      console.error('Erro ao salvar registro:', error)
      toast.error('Erro ao salvar registro')
    }
  }

  // ========== EXCLUSÃO ==========
  function handleExcluirClick(id: string, nome: string) {
    setItemParaExcluir({ id, nome })
    setShowModalExcluir(true)
  }

  async function handleConfirmarExclusao() {
    if (!itemParaExcluir) return

    try {
      const { error } = await supabase
        .from('caminhoes_logistica')
        .delete()
        .eq('id', itemParaExcluir.id)

      if (error) throw error
      toast.success('Registro excluído com sucesso!')
      setShowModalExcluir(false)
      carregarRegistros()
    } catch (error) {
      console.error('Erro ao excluir registro:', error)
      toast.error('Erro ao excluir registro')
    }
  }

  // ========== UTILITÁRIOS ==========
  function getPlacasUnicas(): string[] {
    const placas = registros.map(r => r.placa)
    return ['todas', ...new Set(placas)]
  }

  function getRegistrosFiltrados() {
    return registros.filter(registro => {
      if (filtroPlaca !== 'todas' && registro.placa !== filtroPlaca) return false
      if (filtroTipo === 'diesel' && registro.diesel_valor === 0) return false
      if (filtroTipo === 'manutencao' && registro.manutencao_valor === 0) return false
      return true
    })
  }

  function calcularResumo() {
    const registrosFiltrados = getRegistrosFiltrados()
    
    const totalDiesel = registrosFiltrados.reduce((acc, r) => acc + (r.diesel_valor || 0), 0)
    const totalManutencao = registrosFiltrados.reduce((acc, r) => acc + (r.manutencao_valor || 0), 0)
    const totalKM = registrosFiltrados.reduce((acc, r) => acc + (r.km_rodados || 0), 0)
    const totalLitros = registrosFiltrados.reduce((acc, r) => acc + (r.diesel_litros || 0), 0)
    
    const mediaKMPorLitro = totalLitros > 0 ? totalKM / totalLitros : 0
    const custoPorKM = totalKM > 0 ? (totalDiesel + totalManutencao) / totalKM : 0
    const totalGastos = totalDiesel + totalManutencao

    return {
      totalDiesel,
      totalManutencao,
      totalKM,
      totalLitros,
      mediaKMPorLitro,
      custoPorKM,
      totalGastos,
      quantidadeRegistros: registrosFiltrados.length
    }
  }

  function calcularResumoPorVeiculo(): Veiculo[] {
    const veiculosMap = new Map<string, Veiculo>()
    
    registros.forEach(registro => {
      const existente = veiculosMap.get(registro.placa)
      
      if (existente) {
        existente.total_diesel += registro.diesel_valor || 0
        existente.total_manutencao += registro.manutencao_valor || 0
        existente.total_km += registro.km_rodados || 0
        existente.total_litros += registro.diesel_litros || 0
        existente.custo_por_km = existente.total_km > 0 
          ? (existente.total_diesel + existente.total_manutencao) / existente.total_km 
          : 0
        existente.eficiencia = existente.total_litros > 0 
          ? existente.total_km / existente.total_litros 
          : 0
      } else {
        veiculosMap.set(registro.placa, {
          placa: registro.placa,
          total_diesel: registro.diesel_valor || 0,
          total_manutencao: registro.manutencao_valor || 0,
          total_km: registro.km_rodados || 0,
          total_litros: registro.diesel_litros || 0,
          custo_por_km: registro.km_rodados > 0 
            ? ((registro.diesel_valor || 0) + (registro.manutencao_valor || 0)) / registro.km_rodados 
            : 0,
          eficiencia: registro.diesel_litros > 0 
            ? registro.km_rodados / registro.diesel_litros 
            : 0
        })
      }
    })
    
    return Array.from(veiculosMap.values())
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

  const resumo = calcularResumo()
  const veiculos = calcularResumoPorVeiculo()
  const registrosFiltrados = getRegistrosFiltrados()
  const placas = getPlacasUnicas()

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center" style={{ backgroundColor: theme.background }}>
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-transparent" style={{ borderColor: theme.yellow, borderTopColor: 'transparent' }} />
        <p className="text-white mt-4 text-lg font-medium">Carregando dados de logística...</p>
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
                  <h1 className="text-2xl font-bold" style={{ color: theme.text }}>🚛 Logística</h1>
                  <span className="px-3 py-1 text-sm font-medium rounded-full" style={{ backgroundColor: 'rgba(243, 156, 18, 0.2)', color: theme.yellow, border: `1px solid rgba(243, 156, 18, 0.3)` }}>
                    {meses[mes - 1]} / {ano}
                  </span>
                </div>
                <p className="text-sm mt-1" style={{ color: theme.textSecondary }}>
                  Controle de abastecimento, manutenções e quilometragem
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

              <button
                onClick={handleNovoRegistro}
                className="px-4 py-2 text-sm rounded-lg transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
                style={{ backgroundColor: theme.yellow, color: '#2d2d2d' }}
              >
                <span className="text-lg">+</span>
                Novo Registro
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="rounded-xl shadow-sm p-6 border-l-4 hover:shadow-md transition-all" style={{ backgroundColor: theme.card, borderLeftColor: theme.yellow }}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm uppercase tracking-wider" style={{ color: theme.textSecondary }}>Total Diesel</p>
                    <p className="text-2xl font-bold mt-2" style={{ color: theme.text }}>
                      {formatMoeda(resumo.totalDiesel)}
                    </p>
                    <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
                      {resumo.totalLitros.toFixed(1)} litros
                    </p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(243, 156, 18, 0.2)' }}>
                    <span className="text-2xl">⛽</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl shadow-sm p-6 border-l-4 hover:shadow-md transition-all" style={{ backgroundColor: theme.card, borderLeftColor: theme.red }}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm uppercase tracking-wider" style={{ color: theme.textSecondary }}>Total Manutenção</p>
                    <p className="text-2xl font-bold mt-2" style={{ color: theme.text }}>
                      {formatMoeda(resumo.totalManutencao)}
                    </p>
                    <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
                      {veiculos.length} veículos
                    </p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(231, 76, 60, 0.2)' }}>
                    <span className="text-2xl">🔧</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl shadow-sm p-6 border-l-4 hover:shadow-md transition-all" style={{ backgroundColor: theme.card, borderLeftColor: theme.blue }}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm uppercase tracking-wider" style={{ color: theme.textSecondary }}>Quilometragem</p>
                    <p className="text-2xl font-bold mt-2" style={{ color: theme.text }}>
                      {formatKM(resumo.totalKM)}
                    </p>
                    <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
                      Média: {resumo.mediaKMPorLitro.toFixed(1)} km/l
                    </p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(52, 152, 219, 0.2)' }}>
                    <span className="text-2xl">📏</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl shadow-sm p-6 border-l-4 hover:shadow-md transition-all" style={{ backgroundColor: theme.card, borderLeftColor: theme.purple }}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm uppercase tracking-wider" style={{ color: theme.textSecondary }}>Custo Total</p>
                    <p className="text-2xl font-bold mt-2" style={{ color: theme.text }}>
                      {formatMoeda(resumo.totalGastos)}
                    </p>
                    <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
                      {formatMoeda(resumo.custoPorKM)}/km
                    </p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(155, 89, 182, 0.2)' }}>
                    <span className="text-2xl">💰</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className="rounded-xl shadow-sm p-4 flex flex-wrap gap-4" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: theme.textSecondary }}>Veículo:</span>
                <select
                  value={filtroPlaca}
                  onChange={(e) => setFiltroPlaca(e.target.value)}
                  className="px-3 py-1.5 text-sm rounded-lg border focus:ring-2 outline-none"
                  style={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    borderColor: theme.border,
                    color: theme.text
                  }}
                >
                  {placas.map(placa => (
                    <option key={placa} value={placa} style={{ backgroundColor: theme.card, color: theme.text }}>
                      {placa === 'todas' ? 'Todos os veículos' : placa}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: theme.textSecondary }}>Tipo:</span>
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="px-3 py-1.5 text-sm rounded-lg border focus:ring-2 outline-none"
                  style={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    borderColor: theme.border,
                    color: theme.text
                  }}
                >
                  <option value="todos" style={{ backgroundColor: theme.card, color: theme.text }}>Todos os registros</option>
                  <option value="diesel" style={{ backgroundColor: theme.card, color: theme.text }}>Apenas abastecimentos</option>
                  <option value="manutencao" style={{ backgroundColor: theme.card, color: theme.text }}>Apenas manutenções</option>
                </select>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm" style={{ color: theme.textMuted }}>
                  {registrosFiltrados.length} registro(s) encontrado(s)
                </span>
              </div>
            </div>

            {/* Cards de Veículos */}
            {veiculos.length > 0 && (
              <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: theme.text }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.yellow }}></span>
                  Resumo por Veículo
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {veiculos.map((veiculo, index) => {
                    const cores = [
                      { bg: theme.blue, hover: '#2980b9' },
                      { bg: theme.success, hover: '#219a52' },
                      { bg: theme.purple, hover: '#8e44ad' },
                      { bg: theme.red, hover: '#c0392b' },
                      { bg: theme.yellow, hover: '#e67e22' },
                      { bg: '#5dade2', hover: '#3498db' }
                    ]

                    return (
                      <div 
                        key={veiculo.placa} 
                        className="rounded-lg p-4 text-white shadow-md hover:shadow-lg transition-all"
                        style={{ backgroundColor: cores[index % cores.length].bg }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium text-white/90">{veiculo.placa}</p>
                            <p className="text-2xl font-bold mt-1">
                              {formatMoeda(veiculo.total_diesel + veiculo.total_manutencao)}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                              {formatKM(veiculo.total_km)}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/80">
                          <div>
                            <span>⛽ Diesel</span>
                            <p className="font-semibold text-white">{formatMoeda(veiculo.total_diesel)}</p>
                          </div>
                          <div>
                            <span>🔧 Manutenção</span>
                            <p className="font-semibold text-white">{formatMoeda(veiculo.total_manutencao)}</p>
                          </div>
                          <div>
                            <span>📏 Eficiência</span>
                            <p className="font-semibold text-white">{veiculo.eficiencia.toFixed(1)} km/l</p>
                          </div>
                          <div>
                            <span>💰 Custo/km</span>
                            <p className="font-semibold text-white">{formatMoeda(veiculo.custo_por_km)}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Tabela de Registros */}
            <div className="rounded-xl shadow-sm overflow-hidden border" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
              <div className="px-6 py-4" style={{ backgroundColor: theme.yellow, borderBottom: `1px solid ${theme.border}` }}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center backdrop-blur-sm" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                      <span className="text-white text-xl">📋</span>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">Registros de Logística</h2>
                      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>
                        {meses[mes - 1]} de {ano} • {registrosFiltrados.length} registros
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                {registrosFiltrados.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🚛</div>
                    <h3 className="text-xl font-semibold mb-2" style={{ color: theme.text }}>Nenhum registro encontrado</h3>
                    <p className="mb-6" style={{ color: theme.textSecondary }}>Clique no botão "Novo Registro" para começar a cadastrar</p>
                    <button
                      onClick={handleNovoRegistro}
                      className="px-6 py-3 rounded-lg transition-all inline-flex items-center gap-2 shadow-lg"
                      style={{ backgroundColor: theme.yellow, color: '#2d2d2d' }}
                    >
                      <span className="text-lg">+</span>
                      Novo Registro
                    </button>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Data</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Placa</th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>KM</th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Diesel</th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Manutenção</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Motorista</th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: theme.border }}>
                      {registrosFiltrados.map((registro) => (
                        <tr key={registro.id} className="transition-colors hover:bg-white/5">
                          <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: theme.text }}>
                            {formatData(registro.data)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: theme.text }}>
                            {registro.placa}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right" style={{ color: theme.text }}>
                            {registro.km_rodados.toLocaleString('pt-BR')} km
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            {registro.diesel_valor > 0 ? (
                              <div>
                                <span className="font-medium" style={{ color: theme.yellow }}>
                                  {formatMoeda(registro.diesel_valor)}
                                </span>
                                <span className="text-xs block" style={{ color: theme.textMuted }}>
                                  {registro.diesel_litros.toFixed(1)} L
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: theme.textMuted }}>---</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            {registro.manutencao_valor > 0 ? (
                              <div>
                                <span className="font-medium" style={{ color: theme.red }}>
                                  {formatMoeda(registro.manutencao_valor)}
                                </span>
                                {registro.manutencao_descricao && (
                                  <span className="text-xs block" style={{ color: theme.textMuted }}>
                                    {registro.manutencao_descricao}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: theme.textMuted }}>---</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: registro.motorista ? theme.textSecondary : theme.textMuted }}>
                            {registro.motorista || '---'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEditarRegistro(registro)}
                                className="p-1.5 rounded-md transition-colors hover:bg-blue-500/20"
                                style={{ color: theme.blue }}
                                title="Editar registro"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleExcluirClick(registro.id, `Registro ${formatData(registro.data)}`)}
                                className="p-1.5 rounded-md transition-colors hover:bg-red-500/20"
                                style={{ color: theme.red }}
                                title="Excluir registro"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot style={{ backgroundColor: 'rgba(243, 156, 18, 0.1)' }}>
                      <tr>
                        <td className="px-6 py-4 text-sm font-semibold" style={{ color: theme.text }}>TOTAL</td>
                        <td className="px-6 py-4"></td>
                        <td className="px-6 py-4 text-sm text-right font-semibold" style={{ color: theme.text }}>{formatKM(resumo.totalKM)}</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold" style={{ color: theme.yellow }}>{formatMoeda(resumo.totalDiesel)}</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold" style={{ color: theme.red }}>{formatMoeda(resumo.totalManutencao)}</td>
                        <td className="px-6 py-4"></td>
                        <td className="px-6 py-4"></td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>

            {/* Rodapé com estatísticas */}
            {registrosFiltrados.length > 0 && (
              <div className="rounded-xl p-6 border" style={{ backgroundColor: 'rgba(243, 156, 18, 0.1)', borderColor: 'rgba(243, 156, 18, 0.3)' }}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(243, 156, 18, 0.2)' }}>
                      <span className="text-xl" style={{ color: theme.yellow }}>⛽</span>
                    </div>
                    <div>
                      <p className="text-sm" style={{ color: theme.textSecondary }}>Média de preço do diesel</p>
                      <p className="text-lg font-bold" style={{ color: theme.text }}>
                        {resumo.totalLitros > 0 
                          ? formatMoeda(resumo.totalDiesel / resumo.totalLitros)
                          : formatMoeda(0)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(52, 152, 219, 0.2)' }}>
                      <span className="text-xl" style={{ color: theme.blue }}>📊</span>
                    </div>
                    <div>
                      <p className="text-sm" style={{ color: theme.textSecondary }}>Média de KM por litro</p>
                      <p className="text-lg font-bold" style={{ color: theme.text }}>
                        {resumo.mediaKMPorLitro.toFixed(1)} km/l
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(155, 89, 182, 0.2)' }}>
                      <span className="text-xl" style={{ color: theme.purple }}>💰</span>
                    </div>
                    <div>
                      <p className="text-sm" style={{ color: theme.textSecondary }}>Custo médio por KM</p>
                      <p className="text-lg font-bold" style={{ color: theme.text }}>
                        {formatMoeda(resumo.custoPorKM)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MODAL: Registro */}
      {showModalRegistro && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setShowModalRegistro(false)} />
          
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-lg text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl" style={{ backgroundColor: theme.card }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: theme.border }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold" style={{ color: theme.text }}>
                    {registroEditando ? '✏️ Editar Registro' : '➕ Novo Registro'}
                  </h3>
                  <button
                    onClick={() => setShowModalRegistro(false)}
                    className="rounded-md text-2xl transition-colors hover:text-white"
                    style={{ color: theme.textMuted }}
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>
                        Placa do Veículo *
                      </label>
                      <input
                        type="text"
                        value={formRegistro.placa}
                        onChange={(e) => setFormRegistro({ ...formRegistro, placa: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none"
                        style={{ 
                          backgroundColor: 'rgba(0, 0, 0, 0.2)',
                          borderColor: theme.border,
                          color: theme.text
                        }}
                        placeholder="ABC1D23"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>
                        Data *
                      </label>
                      <input
                        type="date"
                        value={formRegistro.data}
                        onChange={(e) => setFormRegistro({ ...formRegistro, data: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none"
                        style={{ 
                          backgroundColor: 'rgba(0, 0, 0, 0.2)',
                          borderColor: theme.border,
                          color: theme.text
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>
                        KM Rodados *
                      </label>
                      <input
                        type="number"
                        value={formRegistro.km_rodados}
                        onChange={(e) => setFormRegistro({ ...formRegistro, km_rodados: Number(e.target.value) })}
                        className="w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none"
                        style={{ 
                          backgroundColor: 'rgba(0, 0, 0, 0.2)',
                          borderColor: theme.border,
                          color: theme.text
                        }}
                        placeholder="0"
                        min="0"
                        step="0.1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>
                        Motorista
                      </label>
                      <input
                        type="text"
                        value={formRegistro.motorista}
                        onChange={(e) => setFormRegistro({ ...formRegistro, motorista: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none"
                        style={{ 
                          backgroundColor: 'rgba(0, 0, 0, 0.2)',
                          borderColor: theme.border,
                          color: theme.text
                        }}
                        placeholder="Nome do motorista"
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4" style={{ borderColor: theme.border }}>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: theme.textSecondary }}>
                      <span style={{ color: theme.yellow }}>⛽</span>
                      Abastecimento
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>
                          Litros
                        </label>
                        <input
                          type="number"
                          value={formRegistro.diesel_litros}
                          onChange={(e) => setFormRegistro({ ...formRegistro, diesel_litros: Number(e.target.value) })}
                          className="w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none"
                          style={{ 
                            backgroundColor: 'rgba(0, 0, 0, 0.2)',
                            borderColor: theme.border,
                            color: theme.text
                          }}
                          placeholder="0,0"
                          min="0"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>
                          Valor (R$)
                        </label>
                        <input
                          type="number"
                          value={formRegistro.diesel_valor}
                          onChange={(e) => setFormRegistro({ ...formRegistro, diesel_valor: Number(e.target.value) })}
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

                  <div className="border-t pt-4" style={{ borderColor: theme.border }}>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: theme.textSecondary }}>
                      <span style={{ color: theme.red }}>🔧</span>
                      Manutenção
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>
                          Descrição
                        </label>
                        <input
                          type="text"
                          value={formRegistro.manutencao_descricao}
                          onChange={(e) => setFormRegistro({ ...formRegistro, manutencao_descricao: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none"
                          style={{ 
                            backgroundColor: 'rgba(0, 0, 0, 0.2)',
                            borderColor: theme.border,
                            color: theme.text
                          }}
                          placeholder="Ex: Troca de óleo, pneus, revisão..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>
                          Valor (R$)
                        </label>
                        <input
                          type="number"
                          value={formRegistro.manutencao_valor}
                          onChange={(e) => setFormRegistro({ ...formRegistro, manutencao_valor: Number(e.target.value) })}
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

                  <div className="border-t pt-4" style={{ borderColor: theme.border }}>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: theme.textSecondary }}>
                      <span style={{ color: theme.textMuted }}>📝</span>
                      Observação
                    </h4>
                    <textarea
                      value={formRegistro.observacao}
                      onChange={(e) => setFormRegistro({ ...formRegistro, observacao: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none"
                      style={{ 
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderColor: theme.border,
                        color: theme.text
                      }}
                      placeholder="Informações adicionais..."
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 flex justify-end gap-3" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                <button
                  onClick={() => setShowModalRegistro(false)}
                  className="px-4 py-2 rounded-lg transition-colors hover:bg-white/10"
                  style={{ backgroundColor: 'transparent', border: `1px solid ${theme.border}`, color: theme.textSecondary }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvarRegistro}
                  className="px-4 py-2 rounded-lg transition-all hover:shadow-lg"
                  style={{ backgroundColor: theme.yellow, color: '#2d2d2d' }}
                >
                  {registroEditando ? 'Salvar Alterações' : 'Cadastrar Registro'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirmar Exclusão - CORRIGIDO */}
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
                  style={{ backgroundColor: theme.red, color: 'white' }}
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