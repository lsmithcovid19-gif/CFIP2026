'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from './lib/supabase'

const bases = [
  'Los jugadores deben ser colegiados activos.',
  'Cada equipo puede inscribir hasta 30 jugadores.',
  'Los partidos se jugarán en formato Futsal.',
  'Categoría LIBRE: jugadores hasta 40 años.',
  'Categoría MÁSTER: jugadores mayores de 40 años.',
  'El carnet de jugador es obligatorio para participar.',
  'Queda prohibido participar en más de un equipo.',
  'Las protestas deben presentarse por escrito.',
]

export default function HomePage() {
  const [tiempoRestante, setTiempoRestante] = useState({ dias: 0, horas: 0, minutos: 0, segundos: 0 })
  const [categoriaFiltro, setCategoriaFiltro] = useState('TODOS')
  const [equiposReales, setEquiposReales] = useState<any[]>([])
  const [paginaActual, setPaginaActual] = useState(1)
  const EQUIPOS_POR_PAGINA = 12
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<any>(null)
  const [jugadoresEquipo, setJugadoresEquipo] = useState<any[]>([])
  const [cargandoJugadores, setCargandoJugadores] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [loginUsuario, setLoginUsuario] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('inicio')
  const [sesion, setSesion] = useState<{rol: string, equipo_nombre?: string, equipo_categoria?: string} | null>(null)
  const [basesUrl, setBasesUrl] = useState('')
  const [fixtureList, setFixtureList] = useState<{id: string, fecha_numero: number, descripcion: string, url: string}[]>([])
  const [tablaData, setTablaData] = useState<any[]>([])
  const [categoriaTabla, setCategoriaTabla] = useState('LIBRE')
  const [descuentosData, setDescuentosData] = useState<any[]>([])
  const [showDescuentosPublico, setShowDescuentosPublico] = useState<string | null>(null)
  const [equipoDescuentoPublico, setEquipoDescuentoPublico] = useState<any>(null)
  const [goleadoresData, setGoleadoresData] = useState<any[]>([])
  const [categoriaGoleadores, setCategoriaGoleadores] = useState('LIBRE')
  const [mostrarTodosGoleadores, setMostrarTodosGoleadores] = useState(false)
  const [tarjetasData, setTarjetasData] = useState<any[]>([])
  const [categoriaTarjetasPublico, setCategoriaTarjetasPublico] = useState('LIBRE')

useEffect(() => {
  const rol = localStorage.getItem('rol')
  if (rol) {
    setSesion({
      rol,
      equipo_nombre: localStorage.getItem('equipo_nombre') || '',
      equipo_categoria: localStorage.getItem('equipo_categoria') || '',
    })
  }
}, [])

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoginLoading(true)
  setLoginError('')

  const { data: adminData } = await supabase
    .from('admins').select('*')
    .eq('usuario', loginUsuario).eq('password', loginPassword).single()

  if (adminData) {
    localStorage.setItem('rol', 'admin')
    localStorage.setItem('usuario', loginUsuario)
    setSesion({ rol: 'admin' })
    setShowLogin(false)
    setLoginUsuario(''); setLoginPassword('')
    setLoginLoading(false)
    return
  }

  const { data: equipoData } = await supabase
    .from('equipos').select('*')
    .eq('usuario', loginUsuario).eq('password', loginPassword).single()

  if (equipoData) {
    localStorage.setItem('rol', 'delegado')
    localStorage.setItem('equipo_id', equipoData.id)
    localStorage.setItem('equipo_nombre', equipoData.nombre)
    localStorage.setItem('equipo_categoria', equipoData.categoria)
    localStorage.setItem('usuario', loginUsuario)
    setSesion({ rol: 'delegado', equipo_nombre: equipoData.nombre, equipo_categoria: equipoData.categoria })
    setShowLogin(false)
    setLoginUsuario(''); setLoginPassword('')
    setLoginLoading(false)
    return
  }

  setLoginError('Usuario o contraseña incorrectos')
  setLoginLoading(false)
}
const handleCerrarSesion = () => {
  localStorage.clear()
  setSesion(null)
}

  useEffect(() => {
    const fechaInicio = new Date('2026-06-20T00:00:00')
    const interval = setInterval(() => {
      const ahora = new Date()
      const diff = fechaInicio.getTime() - ahora.getTime()
      if (diff <= 0) { clearInterval(interval); return }
      setTiempoRestante({
        dias: Math.floor(diff / (1000 * 60 * 60 * 24)),
        horas: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutos: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        segundos: Math.floor((diff % (1000 * 60)) / 1000),
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMenuOpen(false)
    setActiveSection(id)
  }

  const equiposFiltrados = equiposReales.filter(e =>
  categoriaFiltro === 'TODOS' || e.categoria === categoriaFiltro
  )
  const totalPaginas = Math.ceil(equiposFiltrados.length / EQUIPOS_POR_PAGINA)
  const equiposPagina = equiposFiltrados.slice(
    (paginaActual - 1) * EQUIPOS_POR_PAGINA,
    paginaActual * EQUIPOS_POR_PAGINA
  )

  useEffect(() => {
  const cargarDatos = async () => {
    const { data: equipos } = await supabase.from('equipos').select('*').order('categoria').order('nombre')
    setEquiposReales(equipos || [])

    const { data: descuentos } = await supabase.from('descuentos').select('*').order('created_at', { ascending: false })
    setDescuentosData(descuentos || [])

    const { data: bases } = await supabase.from('bases').select('*').order('created_at', { ascending: false }).limit(1)
    if (bases && bases.length > 0) setBasesUrl(bases[0].url)

    const { data: fixture, error: errorFixture } = await supabase.from('fixture').select('*').order('fecha_numero')
    console.log('FIXTURE DATA:', fixture, 'ERROR:', errorFixture)
    setFixtureList(fixture || [])

    const { data: tabla } = await supabase.from('tabla_puntajes').select('*, equipos(nombre)').order('puntos', { ascending: false })
    setTablaData(tabla || [])

    // Goleadores
    const { data: goles } = await supabase
      .from('goleadores')
      .select('*, jugadores(nombres, apellidos), equipos(nombre)')
      .order('goles', { ascending: false })
    setGoleadoresData(goles || [])

    const { data: tarjetas } = await supabase
      .from('tarjetas')
      .select('*, jugadores(nombres, apellidos), equipos(nombre)')
      .order('amarillas', { ascending: false })
    setTarjetasData(tarjetas || [])
  }
  cargarDatos()
}, [])
const handleVerEquipo = async (equipo: any) => {
  setEquipoSeleccionado(equipo)
  setCargandoJugadores(true)
  const { data } = await supabase.from('jugadores').select('*').eq('equipo_id', equipo.id).order('apellidos')
  setJugadoresEquipo(data || [])
  setCargandoJugadores(false)
}

const ocultarDNI = (dni: string) => {
  if (!dni || dni.length < 4) return dni
  return dni.substring(0, 4) + '****'
}
  return (
    <main className="min-h-screen bg-gray-950 font-sans">

      {/* NAVBAR */}
<nav className="fixed top-0 left-0 right-0 z-50 bg-[#7b0a0a] shadow-lg">
  <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <Image src="/logos/logo_cip.png" alt="CIP" width={40} height={40} className="rounded-full" />
      <div>
        <p className="text-white font-black text-sm leading-none">INTERCOLEGIOS</p>
        <p className="text-[#c9a227] font-bold text-xs leading-none">PROFESIONALES 2026</p>
      </div>
    </div>

    {/* Desktop menu */}
    <div className="hidden lg:flex items-center gap-1">
      {[
        { id: 'inicio', label: 'Inicio' },
        { id: 'campeonato', label: 'Campeonato' },
        { id: 'equipos', label: 'Equipos' },
        { id: 'bases', label: 'Bases' },
        { id: 'fixture', label: 'Fixture' },
        { id: 'tabla', label: 'Tabla' },
        { id: 'goleadores', label: 'Goleadores' },
        { id: 'tarjetas', label: 'Tarjetas' },
        { id: 'contacto', label: 'Contacto' },
      ].map(item => (
        <button key={item.id} onClick={() => scrollTo(item.id)}
          className={`px-3 py-1.5 rounded text-sm font-semibold transition ${activeSection === item.id ? 'bg-[#c9a227] text-black' : 'text-white hover:bg-white/10'}`}>
          {item.label}
        </button>
      ))}
    </div>

    {/* Botones derecha */}
    <div className="flex items-center gap-3">
      {sesion ? (
        <div className="flex items-center gap-2">
          <div className="hidden md:block text-right">
            <p className="text-white font-bold text-xs">{sesion.equipo_nombre || ''}</p>
            <p className="text-[#c9a227] text-xs">{sesion.rol === 'admin' ? '' : `Categoría ${sesion.equipo_categoria}`}</p>
          </div>
          <Link href={sesion.rol === 'admin' ? '/admin' : '/dashboard'}
            className="bg-[#c9a227] text-black font-black px-3 py-2 rounded-lg hover:bg-yellow-400 transition text-xs">
            {sesion.rol === 'admin' ? 'Panel Administrador' : 'Mi Panel'}
          </Link>
          <button onClick={handleCerrarSesion}
            className="bg-white/20 hover:bg-white/30 text-white font-bold px-3 py-2 rounded-lg transition text-xs border border-white/30">
            Salir
          </button>
        </div>
      ) : (
        <button onClick={() => setShowLogin(true)}
          className="bg-[#c9a227] text-black font-black px-4 py-2 rounded-lg hover:bg-yellow-400 transition text-sm">
          Ingresar
        </button>
      )}
      <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden text-white text-2xl">☰</button>
    </div>
  </div>

  {/* Mobile menu */}
  {menuOpen && (
    <div className="lg:hidden bg-[#5a0808] px-4 pb-4">
      {['inicio', 'campeonato', 'equipos', 'bases', 'fixture', 'tabla', 'contacto'].map(id => (
        <button key={id} onClick={() => scrollTo(id)}
          className="block w-full text-left text-white py-2 font-semibold capitalize hover:text-[#c9a227] transition">
          {id}
        </button>
      ))}
      {sesion && (
        <div className="border-t border-white/20 mt-2 pt-2">
          <Link href={sesion.rol === 'admin' ? '/admin' : '/dashboard'}
            className="block text-[#c9a227] font-bold py-2">
            {sesion.rol === 'admin' ? 'Panel Administrador' : 'Mi Panel'}
          </Link>
          <button onClick={handleCerrarSesion} className="block text-white/70 py-2">
            Cerrar Sesión
          </button>
        </div>
      )}
    </div>
  )}
  {/* MODAL LOGIN */}
  {showLogin && (
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4" onClick={() => setShowLogin(false)}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-[#7b0a0a] px-6 py-6 text-center relative">
          <button onClick={() => setShowLogin(false)} className="absolute top-4 right-4 text-white hover:text-[#c9a227] text-xl">✕</button>
          <Image src="/logos/logo_cip.png" alt="CIP" width={64} height={64} className="rounded-full mx-auto mb-3 border-2 border-[#c9a227]" />
          <h2 className="text-white font-black text-xl">INTERCOLEGIOS 2026</h2>
          <p className="text-[#c9a227] text-sm font-semibold mt-1">Portal de Delegados y Administración</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleLogin} className="p-6 flex flex-col gap-4">
          <div>
            <label className="text-sm font-bold text-gray-700 mb-1 block">Usuario</label>
            <input type="text" value={loginUsuario} onChange={e => setLoginUsuario(e.target.value)}
              placeholder="Ingresa tu usuario"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7b0a0a]"
              required />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-700 mb-1 block">Contraseña</label>
            <div className="relative">
              <input type={mostrarPassword ? 'text' : 'password'} value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7b0a0a]"
                required />
              <button type="button" onClick={() => setMostrarPassword(!mostrarPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#7b0a0a] text-lg">
                {mostrarPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {loginError && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm font-semibold">
              ❌ {loginError}
            </div>
          )}

          <button type="submit" disabled={loginLoading}
            className="bg-[#7b0a0a] text-white font-black py-3 rounded-lg hover:bg-[#5a0808] transition disabled:opacity-50 mt-2">
            {loginLoading ? 'Verificando...' : 'Ingresar →'}
          </button>
        </form>

        <p className="text-center text-gray-400 text-xs pb-5">
          ¿Problemas para ingresar? Contacta al administrador
        </p>
      </div>
    </div>
  )}
</nav>

      {/* HERO */}
      <section id="inicio" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Foto de fondo */}
        <div className="absolute inset-0">
          <img src="/foto2.png" alt="fondo" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a0000]/60 via-[#7b0a0a]/50 to-[#1a0000]/70"></div>
        </div>

        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <div className="flex justify-center mb-6">
            <Image src="/logos/logo_cip.png" alt="CIP" width={100} height={100} className="rounded-full border-4 border-[#c9a227] shadow-2xl" />
          </div>
          <p className="text-[#c9a227] font-bold tracking-[4px] text-sm uppercase mb-3">Juliaca, Puno - Perú</p>
          <h1 className="text-3xl md:text-5xl font-black text-[#c9a227] leading-tight mb-2">
            XXXVIII
          </h1>
          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-2">
            CAMPEONATO DE FUTSAL
          </h1>
          <h1 className="text-4xl md:text-6xl font-black text-[#c9a227] leading-tight mb-2">
            INTERCOLEGIOS
          </h1>
          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-2">
            PROFESIONALES
          </h1>
          <div className="bg-[#c9a227] text-black font-black text-2xl md:text-3xl px-8 py-3 inline-block rounded mb-8">
            OFICIAL 2026
          </div>

          {/* CONTADOR */}
          <div className="flex justify-center gap-4 mb-10">
            {[
              { valor: tiempoRestante.dias, label: 'Días' },
              { valor: tiempoRestante.horas, label: 'Horas' },
              { valor: tiempoRestante.minutos, label: 'Min' },
              { valor: tiempoRestante.segundos, label: 'Seg' },
            ].map(item => (
              <div key={item.label} className="bg-black/40 border border-[#c9a227] rounded-xl px-4 py-3 min-w-[70px]">
                <p className="text-[#c9a227] font-black text-3xl md:text-4xl leading-none">
                  {String(item.valor).padStart(2, '0')}
                </p>
                <p className="text-white text-xs mt-1">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => scrollTo('campeonato')}
              className="bg-[#c9a227] text-black font-black px-10 py-4 rounded-xl hover:bg-yellow-400 transition text-lg tracking-wide">
              CONOCER MÁS ↓
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="text-[#c9a227] text-2xl">↓</div>
        </div>
      </section>

      {/* SOBRE EL CAMPEONATO */}
      <section id="campeonato" className="py-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <img src="/foto1.png" alt="fondo" className="w-full h-full object-cover object-top" />
          <div className="absolute inset-0 bg-white/45"></div>
        </div>
        <div className="max-w-6xl mx-auto px-4 relative z-10"></div>
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <div className="text-center mb-14">
            <p className="text-[#8B6914] font-bold tracking-widest text-sm uppercase mb-2">Conoce más</p>
            <h2 className="text-4xl font-black text-[#1a0000]">SOBRE EL CAMPEONATO</h2>
            <div className="w-24 h-1 bg-[#c9a227] mx-auto mt-4"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { numero: '📍', titulo: 'LUGAR', desc: 'Cancha Deportiva FULL SPORT (Zarumilla) - Juliaca, Puno' },
              { numero: '📅', titulo: 'INICIO', desc: '20 de Junio · 2026' },
              { numero: '2', titulo: 'CATEGORÍAS', desc: 'Libre y Máster' },
              { numero: '49', titulo: 'Clubes', desc: 'Equipos Participantes' },
              { numero: '25', titulo: 'JUGADORES', desc: 'Por Equipo' },
              { numero: 'ORGANIZA', titulo: 'Equipo Campeón · 2025', desc: 'Ingenieros "C" · Categoría Libre' },
            ].map(item => (
              <div key={item.titulo}
                className="relative bg-gradient-to-br from-[#fff5f5] to-[#ffe8e8] border border-[#c9a227]/30 rounded-2xl p-7 hover:border-[#c9a227] transition-all duration-300 group overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#c9a227]/5 rounded-full -translate-y-8 translate-x-8 group-hover:bg-[#c9a227]/10 transition"></div>
                <div className="text-[#c9a227] font-black text-4xl mb-3 leading-none">{item.numero}</div>
                <p className="text-[#c9a227]/70 font-bold text-xs uppercase tracking-widest mb-1">{item.titulo}</p>
                <p className="text-[#1a0000] font-semibold text-lg">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EQUIPOS */}
      <section id="equipos" className="py-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <img src="/foto3.png" alt="fondo" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-[#1a0000]/65"></div>
        </div>
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <p className="text-[#c9a227] font-bold tracking-widest text-sm uppercase mb-2">Participantes</p>
            <h2 className="text-4xl font-black text-white">EQUIPOS INSCRITOS</h2>
            <div className="w-24 h-1 bg-[#c9a227] mx-auto mt-4"></div>
          </div>

          <div className="flex justify-center gap-3 mb-8">
            {['TODOS', 'LIBRE', 'MASTER'].map(cat => (
              <button   key={cat} onClick={() => { setCategoriaFiltro(cat); setPaginaActual(1) }}
                className={`px-5 py-2 rounded-full font-bold text-sm transition ${categoriaFiltro === cat ? 'bg-[#c9a227] text-black' : 'bg-gray-800 text-white hover:bg-gray-700'}`}>
                {cat === 'MASTER' ? 'MÁSTER' : cat}
              </button>
            ))}
          </div>

          {equiposFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/50">Aún no hay equipos registrados</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {equiposPagina.map((equipo) => (
                <div key={equipo.id} onClick={() => handleVerEquipo(equipo)}
                  className="bg-[#2a0000] border border-[#c9a227]/20 rounded-xl p-4 text-center hover:border-[#c9a227] transition cursor-pointer group">
                  <div className="w-14 h-14 bg-[#7b0a0a] rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-[#c9a227] transition">
                    <span className="text-white group-hover:text-black font-black text-lg">⚽</span>
                  </div>
                  <p className="text-white font-bold text-sm leading-tight">{equipo.nombre}</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full mt-2 inline-block ${equipo.categoria === 'LIBRE' ? 'bg-[#7b0a0a] text-[#c9a227]' : 'bg-[#4a0000] text-[#c9a227]'}`}>
                    {equipo.categoria}
                  </span>
                </div>
              ))}
            </div>
          )}
          {totalPaginas > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <button onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1}
              className="bg-[#2a0000] border border-[#c9a227]/30 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-30 hover:bg-[#3a0000] transition">
              ← Anterior
            </button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(num => (
              <button key={num} onClick={() => setPaginaActual(num)}
                className={`w-10 h-10 rounded-lg font-bold transition ${paginaActual === num ? 'bg-[#c9a227] text-black' : 'bg-[#2a0000] text-white border border-[#c9a227]/30 hover:bg-[#3a0000]'}`}>
                {num}
              </button>
            ))}
            <button onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}
              className="bg-[#2a0000] border border-[#c9a227]/30 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-30 hover:bg-[#3a0000] transition">
              Siguiente →
            </button>
          </div>
        )}
          <p className="text-white/40 text-center mt-6 text-sm">* Haz clic en un equipo para ver sus jugadores</p>
        </div>
        {/* MODAL JUGADORES DEL EQUIPO */}
        {equipoSeleccionado && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onClick={() => setEquipoSeleccionado(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="bg-[#7b0a0a] px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div>
                  <h2 className="text-white font-black text-xl">{equipoSeleccionado.nombre}</h2>
                  <p className="text-[#c9a227] text-sm font-semibold">Categoría {equipoSeleccionado.categoria} · {jugadoresEquipo.length} jugadores</p>
                </div>
                <button onClick={() => setEquipoSeleccionado(null)} className="text-white hover:text-[#c9a227] text-2xl">✕</button>
              </div>
              <div className="p-6">
                {cargandoJugadores ? (
                  <div className="text-center py-10 text-gray-400">Cargando jugadores...</div>
                ) : jugadoresEquipo.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">Este equipo aún no tiene jugadores registrados</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {jugadoresEquipo.map(j => (
                      <div key={j.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-200">
                        {j.foto_url ? (
                          <img src={j.foto_url} alt="foto" className="w-14 h-14 rounded-full object-cover border-2 border-[#c9a227]" />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">Sin foto</div>
                        )}
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{j.nombres} {j.apellidos}</p>
                          <p className="text-gray-500 text-xs">DNI: {j.dni}</p>
                          <p className="text-gray-500 text-xs">Colegiatura: {j.nro_colegiatura}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL DESCUENTOS PÚBLICO */}
{showDescuentosPublico && equipoDescuentoPublico && (
  <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
    onClick={() => setShowDescuentosPublico(null)}>
    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[85vh] overflow-y-auto"
      onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="font-black text-gray-800 text-lg">{equipoDescuentoPublico.equipos?.nombre}</h2>
          <p className="text-gray-500 text-sm">Detalle de descuentos</p>
        </div>
        <button onClick={() => setShowDescuentosPublico(null)}
          className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
      </div>

      <div className="space-y-2 mb-4">
        {descuentosData.filter(d => d.equipo_id === equipoDescuentoPublico.equipo_id).length === 0 ? (
          <p className="text-gray-400 text-center py-4">No hay descuentos registrados</p>
        ) : (
          descuentosData.filter(d => d.equipo_id === equipoDescuentoPublico.equipo_id).map(d => (
            <div key={d.id} className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div>
                <p className="font-semibold text-gray-800 text-sm">{d.motivo}</p>
                {d.fecha_partido && <p className="text-gray-500 text-xs">Fecha: {d.fecha_partido}</p>}
              </div>
              <span className="bg-orange-500 text-white font-black px-2 py-1 rounded text-sm">
                -{d.puntos_descontados} pts
              </span>
            </div>
          ))
        )}
      </div>

      <div className="border-t pt-3">
        <p className="text-right font-black text-orange-600">
          Total descontado: {descuentosData.filter(d => d.equipo_id === equipoDescuentoPublico.equipo_id).reduce((sum, d) => sum + d.puntos_descontados, 0)} pts
        </p>
      </div>
    </div>
  </div>
)}
      </section>

      {/* BASES */}
      <section id="bases" className="py-20 relative overflow-hidden" style={{background: 'linear-gradient(135deg, #fff9f0 0%, #fff3dc 50%, #fff9f0 100%)'}}>
        <div className="absolute inset-0 opacity-45" style={{backgroundImage: 'repeating-linear-gradient(45deg, #c9a227 0, #c9a227 2px, transparent 0, transparent 50%)', backgroundSize: '20px 20px'}}></div>
        <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(circle, #c9a227 1px, transparent 1px)', backgroundSize: '30px 30px'}}></div>
        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <p className="text-[#c9a227] font-bold tracking-widest text-sm uppercase mb-2">Reglamento</p>
            <h2 className="text-4xl font-black text-[#1a0000]">BASES DEL CAMPEONATO</h2>
            <div className="w-24 h-1 bg-[#c9a227] mx-auto mt-4"></div>
          </div>
          <div className="bg-[#1a0000] rounded-2xl p-8 border border-[#c9a227]/30">
            <div className="text-center py-8">
              {basesUrl ? (
                <a href={basesUrl} target="_blank" download
                  className="bg-[#c9a227] text-black font-black px-10 py-4 rounded-xl hover:bg-yellow-400 transition inline-block text-lg">
                  📄 Descargar Bases del Campeonato
                </a>
              ) : (
                <p className="text-white/50 text-base">Las bases estarán disponibles próximamente</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FIXTURE */}
      <section id="fixture" className="py-20 relative overflow-hidden" style={{background: 'linear-gradient(135deg, #1a0000 0%, #3d0000 50%, #1a0000 100%)'}}>
        <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(circle at 20px 20px, #c9a227 2px, transparent 2px)', backgroundSize: '40px 40px'}}></div>
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'linear-gradient(0deg, #c9a227 1px, transparent 1px), linear-gradient(90deg, #c9a227 1px, transparent 1px)', backgroundSize: '60px 60px'}}></div>
        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <p className="text-[#c9a227] font-bold tracking-widest text-sm uppercase mb-2">Calendario</p>
            <h2 className="text-4xl font-black text-white">FIXTURE</h2>
            <div className="w-24 h-1 bg-[#c9a227] mx-auto mt-4"></div>
          </div>

          {fixtureList.length === 0 ? (
            <div className="bg-[#2a0000] rounded-2xl border border-[#c9a227]/30 p-8 text-center">
              <div className="text-6xl mb-4">📅</div>
              <p className="text-white font-bold text-xl mb-2">Fixture en preparación</p>
              <p className="text-white/50 mb-4">El fixture completo estará disponible próximamente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fixtureList.map(f => (
                <div key={f.id} className="bg-[#2a0000] border border-[#c9a227]/30 rounded-xl p-4 flex items-center justify-between hover:border-[#c9a227] transition">
                  <div>
                    <p className="text-white font-black">📅 Fecha {f.fecha_numero}</p>
                    <p className="text-white/60 text-sm">{f.descripcion}</p>
                  </div>
                  <a href={f.url} target="_blank"
                    className="bg-[#c9a227] text-black font-black px-5 py-2 rounded-lg hover:bg-yellow-400 transition text-sm">
                    📥 Descargar PDF
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* TABLA DE PUNTAJES */}
      <section id="tabla" className="py-20 relative overflow-hidden" style={{background: 'linear-gradient(135deg, #fff9f0 0%, #fff3dc 50%, #fff9f0 100%)'}}>
        <div className="absolute inset-0 opacity-30" style={{backgroundImage: 'repeating-linear-gradient(45deg, #c9a227 0, #c9a227 2px, transparent 0, transparent 50%)', backgroundSize: '20px 20px'}}></div>
        <div className="absolute inset-0 opacity-15" style={{backgroundImage: 'radial-gradient(circle, #c9a227 1px, transparent 1px)', backgroundSize: '30px 30px'}}></div>
        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <p className="text-[#a67c00] font-extrabold tracking-[0.2em] text-xl uppercase mb-2">Posiciones</p>
            <h2 className="text-4xl font-black text-[#1a0000]">TABLA DE PUNTAJES</h2>
            <div className="w-24 h-1 bg-[#c9a227] mx-auto mt-4"></div>
          </div>

          <div className="flex justify-center gap-3 mb-6">
            {['LIBRE', 'MASTER'].map(cat => (
              <button key={cat} onClick={() => setCategoriaTabla(cat)}
                className={`px-5 py-2 rounded-full font-bold text-sm transition ${categoriaTabla === cat ? 'bg-[#c9a227] text-black' : 'bg-white text-gray-700 border border-gray-300'}`}>
                {cat === 'MASTER' ? 'MÁSTER' : cat}
              </button>
            ))}
          </div>

          <div className="bg-[#1a0000] rounded-2xl border border-[#c9a227]/30 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#7b0a0a]">
                <tr>
                  {['#', 'Equipo', 'PJ', 'PG', 'PE', 'PP', 'WO', 'GF', 'GC', 'DG', 'Pts', '-Pts', 'Total'].map(h => (
                    <th key={h} className={`px-3 py-3 font-black text-center ${h === '-Pts' ? 'text-orange-400' : h === 'Total' ? 'text-yellow-300' : 'text-[#c9a227]'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tablaData.filter(t => t.categoria === categoriaTabla).length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-10 text-white/40">El campeonato aún no ha comenzado</td></tr>
                ) : (
                  tablaData
                    .filter(t => t.categoria === categoriaTabla)
                    .sort((a, b) => {
                      const totalA = (a.puntos || 0) - (a.pts_descontados || 0)
                      const totalB = (b.puntos || 0) - (b.pts_descontados || 0)
                      if (totalB !== totalA) return totalB - totalA
                      const dgA = (a.gf || 0) - (a.gc || 0)
                      const dgB = (b.gf || 0) - (b.gc || 0)
                      if (dgB !== dgA) return dgB - dgA
                      return (b.gf || 0) - (a.gf || 0)
                    })
                    .map((t, i) => (
                      <tr key={t.id} className={i % 2 === 0 ? 'bg-[#1a0000]' : 'bg-[#2a0000]'}>
                        <td className="px-3 py-3 text-center font-bold text-[#c9a227]">{i + 1}</td>
                        <td className="px-3 py-3 font-bold text-white">{t.equipos?.nombre || '—'}</td>
                        <td className="px-3 py-3 text-center text-white">{t.pj}</td>
                        <td className="px-3 py-3 text-center text-green-400 font-semibold">{t.pg}</td>
                        <td className="px-3 py-3 text-center text-yellow-400 font-semibold">{t.pe}</td>
                        <td className="px-3 py-3 text-center text-red-400 font-semibold">{t.pp}</td>
                        <td className="px-3 py-3 text-center text-purple-400 font-semibold">{t.wo || 0}</td>
                        <td className="px-3 py-3 text-center text-white">{t.gf}</td>
                        <td className="px-3 py-3 text-center text-white">{t.gc}</td>
                        <td className="px-3 py-3 text-center text-white">{(t.gf || 0) - (t.gc || 0)}</td>
                        <td className="px-3 py-3 text-center font-black text-[#c9a227] text-base">{t.puntos}</td>
                        <td className="px-3 py-3 text-center">
                          <button onClick={() => { setEquipoDescuentoPublico(t); setShowDescuentosPublico(t.id) }}
                            className={`font-bold px-2 py-1 rounded text-xs transition ${(t.pts_descontados || 0) > 0 ? 'bg-orange-500 text-white hover:bg-orange-600' : 'text-orange-400'}`}>
                            {t.pts_descontados || 0}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-center font-black text-yellow-300 text-base">{(t.puntos || 0) - (t.pts_descontados || 0)}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* TABLA DE GOLEADORES */}
<section id="goleadores" className="py-20 relative overflow-hidden" style={{background: 'linear-gradient(135deg, #1a0000 0%, #3d0000 50%, #1a0000 100%)'}}>
  <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(circle at 20px 20px, #c9a227 2px, transparent 2px)', backgroundSize: '40px 40px'}}></div>
  <div className="max-w-5xl mx-auto px-4 relative z-10">
    <div className="text-center mb-12">
      <p className="text-[#c9a227] font-bold tracking-widest text-sm uppercase mb-2">Estadísticas</p>
      <h2 className="text-4xl font-black text-white">TABLA DE GOLEADORES</h2>
      <div className="w-24 h-1 bg-[#c9a227] mx-auto mt-4"></div>
    </div>

    <div className="flex justify-center gap-3 mb-6">
      {['LIBRE', 'MASTER'].map(cat => (
        <button key={cat} onClick={() => { setCategoriaGoleadores(cat); setMostrarTodosGoleadores(false) }}
          className={`px-5 py-2 rounded-full font-bold text-sm transition ${categoriaGoleadores === cat ? 'bg-[#c9a227] text-black' : 'bg-[#2a0000] text-white border border-[#c9a227]/30 hover:bg-[#3a0000]'}`}>
          {cat === 'MASTER' ? 'MÁSTER' : cat}
        </button>
      ))}
    </div>

    <div className="bg-[#1a0000] rounded-2xl border border-[#c9a227]/30 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-[#7b0a0a]">
          <tr>
            <th className="px-4 py-3 text-center text-[#c9a227] font-black">#</th>
            <th className="px-4 py-3 text-left text-[#c9a227] font-black">Jugador</th>
            <th className="px-4 py-3 text-left text-[#c9a227] font-black">Equipo</th>
            <th className="px-4 py-3 text-center text-[#c9a227] font-black">⚽ Goles</th>
          </tr>
        </thead>
        <tbody>
          {goleadoresData.filter(g => g.categoria === categoriaGoleadores).length === 0 ? (
            <tr><td colSpan={4} className="text-center py-10 text-white/40">No hay goleadores registrados aún</td></tr>
          ) : (
            goleadoresData
              .filter(g => g.categoria === categoriaGoleadores)
              .slice(0, mostrarTodosGoleadores ? undefined : 10)
              .map((g, i) => (
                <tr key={g.id} className={i % 2 === 0 ? 'bg-[#1a0000]' : 'bg-[#2a0000]'}>
                  <td className="px-4 py-3 text-center font-bold text-[#c9a227]">{i + 1}</td>
                  <td className="px-4 py-3 font-bold text-white">{g.jugadores?.nombres} {g.jugadores?.apellidos}</td>
                  <td className="px-4 py-3 text-white/70">{g.equipos?.nombre}</td>
                  <td className="px-4 py-3 text-center font-black text-[#c9a227] text-lg">{g.goles}</td>
                </tr>
              ))
          )}
        </tbody>
        {goleadoresData.filter(g => g.categoria === categoriaGoleadores).length > 10 && (
          <div className="text-center py-4">
            <button onClick={() => setMostrarTodosGoleadores(!mostrarTodosGoleadores)}
              className="bg-[#c9a227] text-black font-black px-6 py-2 rounded-xl hover:bg-yellow-400 transition">
              {mostrarTodosGoleadores ? '▲ Ver menos' : `▼ Ver todos (${goleadoresData.filter(g => g.categoria === categoriaGoleadores).length})`}
            </button>
          </div>
        )}
      </table>
    </div>
  </div>
</section>

{/* TABLA DE TARJETAS */}
<section id="tarjetas" className="py-20 relative overflow-hidden" style={{background: 'linear-gradient(135deg, #fff9f0 0%, #fff3dc 50%, #fff9f0 100%)'}}>
  <div className="absolute inset-0 opacity-30" style={{backgroundImage: 'repeating-linear-gradient(45deg, #c9a227 0, #c9a227 2px, transparent 0, transparent 50%)', backgroundSize: '20px 20px'}}></div>
  <div className="max-w-5xl mx-auto px-4 relative z-10">
    <div className="text-center mb-12">
      <p className="text-[#a67c00] font-bold tracking-widest text-sm uppercase mb-2">Disciplina</p>
      <h2 className="text-4xl font-black text-[#1a0000]">TABLA DE TARJETAS</h2>
      <div className="w-24 h-1 bg-[#c9a227] mx-auto mt-4"></div>
    </div>

    <div className="flex justify-center gap-3 mb-6">
      {['LIBRE', 'MASTER'].map(cat => (
        <button key={cat} onClick={() => setCategoriaTarjetasPublico(cat)}
          className={`px-5 py-2 rounded-full font-bold text-sm transition ${categoriaTarjetasPublico === cat ? 'bg-[#c9a227] text-black' : 'bg-white text-gray-700 border border-gray-300'}`}>
          {cat === 'MASTER' ? 'MÁSTER' : cat}
        </button>
      ))}
    </div>

    <div className="bg-white rounded-2xl shadow overflow-hidden border border-[#c9a227]/30">
      <table className="w-full text-sm">
        <thead className="bg-[#7b0a0a]">
          <tr>
            <th className="px-4 py-3 text-left text-[#c9a227] font-black">#</th>
            <th className="px-4 py-3 text-left text-[#c9a227] font-black">Jugador</th>
            <th className="px-4 py-3 text-left text-[#c9a227] font-black">Equipo</th>
            <th className="px-4 py-3 text-center text-yellow-300 font-black">🟨</th>
            <th className="px-4 py-3 text-center text-red-300 font-black">🟥</th>
            <th className="px-4 py-3 text-center text-[#c9a227] font-black">Estado</th>
          </tr>
        </thead>
        <tbody>
          {tarjetasData.filter(t => t.categoria === categoriaTarjetasPublico).length === 0 ? (
            <tr><td colSpan={6} className="text-center py-10 text-gray-400">No hay tarjetas registradas aún</td></tr>
          ) : (
            tarjetasData
              .filter(t => t.categoria === categoriaTarjetasPublico)
              .sort((a, b) => b.amarillas - a.amarillas)
              .map((t, i) => (
                <tr key={t.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${t.suspendido ? 'border-l-4 border-red-500' : ''}`}>
                  <td className="px-4 py-3 font-bold text-[#7b0a0a]">{i + 1}</td>
                  <td className="px-4 py-3 font-bold text-gray-800">{t.jugadores?.nombres} {t.jugadores?.apellidos}</td>
                  <td className="px-4 py-3 text-gray-600">{t.equipos?.nombre}</td>
                  <td className="px-4 py-3 text-center font-black text-yellow-500 text-lg">{t.amarillas}</td>
                  <td className="px-4 py-3 text-center font-black text-red-500 text-lg">{t.rojas}</td>
                  <td className="px-4 py-3 text-center">
                    {t.suspendido ? (
                      <span className="bg-red-100 text-red-700 font-black px-3 py-1 rounded-full text-xs">🚫 SUSPENDIDO</span>
                    ) : (t.amarillas_restantes || 0) >= 2 ? (
                      <span className="bg-yellow-100 text-yellow-700 font-bold px-3 py-1 rounded-full text-xs">⚠️ EN RIESGO</span>
                    ) : (
                      <span className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full text-xs">✅ HABILITADO</span>
                    )}
                  </td>
                </tr>
              ))
          )}
        </tbody>
      </table>
    </div>
  </div>
</section>

      {/* CONTACTO + FOOTER CON FOTO COMPLETA */}
<section id="contacto" className="relative overflow-hidden">
  {/* FOTO DE FONDO COMPLETA */}
  <img src="/foto4.png" alt="fondo" className="w-full object-cover object-center" />
  
  {/* OVERLAY CON CONTENIDO */}
  <div className="absolute inset-0 bg-[#1a0000]/60 flex flex-col items-center justify-between py-16">
    {/* CONTACTO */}
    <div className="text-center w-full px-4">
      <p className="text-[#c9a227] font-bold tracking-widest text-sm uppercase mb-2">Comunícate</p>
      <h2 className="text-4xl font-black text-white mb-4">CONTACTO</h2>
      <div className="w-24 h-1 bg-[#c9a227] mx-auto mb-10"></div>
      <div className="flex flex-col md:flex-row gap-6 justify-center max-w-2xl mx-auto">
        <a href="https://wa.me/51942157266" target="_blank"
          className="bg-green-600 hover:bg-green-500 text-white font-black px-8 py-5 rounded-xl transition flex items-center justify-center gap-3 text-lg">
          <span className="text-2xl">WhatsApp</span>
        </a>
        <a href="https://wa.me/51942157266" target="_blank"
          className="bg-white/20 hover:bg-white/30 backdrop-blur text-white font-bold px-8 py-5 rounded-xl transition flex items-center justify-center gap-3 text-lg border border-white/30">
          <span className="text-2xl">📞</span> 942 157 266
        </a>
      </div>
    </div>

    {/* FOOTER DENTRO */}
    <div className="text-center mt-16">
      <Image src="/logos/logo_cip.png" alt="CIP" width={50} height={50} className="rounded-full mx-auto mb-3" />
      <p className="text-white font-black text-lg">CAMPEONATO INTERCOLEGIOS PROFESIONALES 2026</p>
      <p className="text-white/50 text-sm mt-1">Juliaca, Puno — Perú · Todos los derechos reservados</p>
    </div>
  </div>
</section>

      {/* FOOTER */}
      {/*<footer className="bg-[#1a0000] py-8 text-center border-t border-[#c9a227]/30">
        <Image src="/logos/logo_cip.png" alt="CIP" width={50} height={50} className="rounded-full mx-auto mb-3" />
        <p className="text-white font-black text-lg">CAMPEONATO INTERCOLEGIOS PROFESIONALES 2026</p>
        <p className="text-gray-500 text-sm mt-1">Juliaca, Puno — Perú · Todos los derechos reservados</p>
      </footer>*/}

      {/* WHATSAPP FLOTANTE */}
      <a href="https://wa.me/51942157266" target="_blank"
        className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-400 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition z-50 text-2xl">
        💬
      </a>

    </main>
  )
}