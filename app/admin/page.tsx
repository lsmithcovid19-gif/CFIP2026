'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

interface Equipo {
  id: string
  nombre: string
  colegio: string
  categoria: string
  usuario: string
  password: string
}

interface FichaFixture {
  id: string
  fecha_numero: number
  descripcion: string
  url: string
}

interface PuntajeEquipo {
  id?: string
  equipo_id: string
  equipo_nombre: string
  categoria: string
  pj: number
  pg: number
  pe: number
  pp: number
  gf: number
  gc: number
  puntos: number
}

export default function AdminPage() {
  const router = useRouter()
  const [seccionActiva, setSeccionActiva] = useState('equipos')
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [fixture, setFixture] = useState<FichaFixture[]>([])
  const [tabla, setTabla] = useState<PuntajeEquipo[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Equipo | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('TODOS')
  const [categoriaTabla, setCategoriaTabla] = useState('LIBRE')
  const [form, setForm] = useState({ nombre: '', colegio: '', categoria: 'LIBRE' })
  const [subiendoPDF, setSubiendoPDF] = useState(false)
  const [subiendoFixture, setSubiendoFixture] = useState(false)
  const [descripcionFixture, setDescripcionFixture] = useState('')
  const [numeroFecha, setNumeroFecha] = useState(1)
  const [basesUrl, setBasesUrl] = useState('')
  const [basesId, setBasesId] = useState('')
  const [editandoPuntaje, setEditandoPuntaje] = useState<PuntajeEquipo | null>(null)
  const [goleadores, setGoleadores] = useState<any[]>([])
  const [categoriaGoleadores, setCategoriaGoleadores] = useState('LIBRE')
  const [showFormGoleador, setShowFormGoleador] = useState(false)
  const [editandoGoleador, setEditandoGoleador] = useState<any>(null)
  const [busquedaGoleador, setBusquedaGoleador] = useState('')
  const [formGoleador, setFormGoleador] = useState({ jugador_id: '', equipo_id: '', goles: 0, categoria: 'LIBRE' })
  const [jugadoresEquipoSeleccionado, setJugadoresEquipoSeleccionado] = useState<any[]>([])

  useEffect(() => {
    const rol = localStorage.getItem('rol')
    if (rol !== 'admin') { router.push('/login'); return }
    cargarTodo()
  }, [])

  const cargarTodo = async () => {
  await Promise.all([cargarEquipos(), cargarFixture(), cargarTabla(), cargarBases(), cargarGoleadores()])
  setLoading(false)
  }

  const cargarEquipos = async () => {
    const { data } = await supabase.from('equipos').select('*').order('categoria').order('nombre')
    setEquipos(data || [])
  }

  const cargarFixture = async () => {
    const { data } = await supabase.from('fixture').select('*').order('fecha_numero')
    setFixture(data || [])
  }

  const cargarTabla = async () => {
    const { data } = await supabase.from('tabla_puntajes').select('*, equipos(nombre)').order('puntos', { ascending: false })
    if (data) {
        const conNombres = data.map((p: any) => ({
        ...p,
        equipo_nombre: p.equipos?.nombre || 'Equipo eliminado'
        }))
        setTabla(conNombres)
    }
  }

  const cargarGoleadores = async () => {
  const { data } = await supabase
    .from('goleadores')
    .select('*, jugadores(nombres, apellidos), equipos(nombre)')
    .order('goles', { ascending: false })
  setGoleadores(data || [])
  }

  const cargarJugadoresEquipo = async (equipoId: string) => {
    const { data } = await supabase.from('jugadores').select('*').eq('equipo_id', equipoId).order('apellidos')
    setJugadoresEquipoSeleccionado(data || [])
  }

  const handleGuardarGoleador = async () => {
    if (!formGoleador.jugador_id || !formGoleador.equipo_id) { alert('Selecciona equipo y jugador'); return }
    const datos = { ...formGoleador }
    if (editandoGoleador) {
      await supabase.from('goleadores').update(datos).eq('id', editandoGoleador.id)
    } else {
      await supabase.from('goleadores').insert(datos)
    }
    setFormGoleador({ jugador_id: '', equipo_id: '', goles: 0, categoria: 'LIBRE' })
    setShowFormGoleador(false); setEditandoGoleador(null)
    cargarGoleadores()
  }

  const handleEliminarGoleador = async (id: string) => {
    if (!confirm('¿Eliminar este goleador?')) return
    await supabase.from('goleadores').delete().eq('id', id)
    cargarGoleadores()
  }

  const cargarBases = async () => {
    const { data } = await supabase.from('bases').select('*').order('created_at', { ascending: false }).limit(1)
    if (data && data.length > 0) { setBasesUrl(data[0].url); setBasesId(data[0].id) }
    else { setBasesUrl(''); setBasesId('') }
  }

  const generarCredenciales = (nombre: string, categoria: string) => {
    let base = nombre.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
    let baseCorta = base.substring(0, 8).replace(/_$/, '')
    const cat = categoria === 'LIBRE' ? 'lib' : 'mas'
    return {
      usuario: `${base}_${cat}`,
      password: `${cat}2026${baseCorta}`
    }
  }

  const handleGuardarEquipo = async () => {
    if (!form.nombre || !form.colegio) return
    const { usuario, password } = generarCredenciales(form.nombre, form.categoria)
    if (editando) {
      const { error } = await supabase.from('equipos').update({ ...form, usuario, password }).eq('id', editando.id)
      if (error) { alert('Error al actualizar: ' + error.message); return }
    } else {
      const { error } = await supabase.from('equipos').insert({ ...form, usuario, password })
      if (error) { alert('Error al crear equipo: ' + error.message); return }
    }
    setForm({ nombre: '', colegio: '', categoria: 'LIBRE' })
    setShowForm(false); setEditando(null)
    cargarEquipos()
  }

  const handleEliminarEquipo = async (id: string) => {
    if (!confirm('¿Eliminar este equipo y todos sus jugadores?')) return
    await supabase.from('equipos').delete().eq('id', id)
    cargarEquipos()
  }

  const handleSubirBases = async (file: File) => {
    setSubiendoPDF(true)
    const nombre = `bases/bases_${Date.now()}.pdf`
    const { data } = await supabase.storage.from('documentos').upload(nombre, file, { contentType: 'application/pdf', upsert: true })
    if (data) {
      const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(nombre)
      await supabase.from('bases').insert({ nombre: 'Bases del Campeonato', url: urlData.publicUrl })
      setBasesUrl(urlData.publicUrl)
    }
    setSubiendoPDF(false)
  }

  const handleEliminarBases = async () => {
    if (!confirm('¿Eliminar el PDF de bases?')) return
    if (basesId) await supabase.from('bases').delete().eq('id', basesId)
    setBasesUrl(''); setBasesId('')
 }

  const handleSubirFixture = async (file: File) => {
    setSubiendoFixture(true)
    const nombre = `fixture/fecha_${numeroFecha}_${Date.now()}.pdf`
    const { data } = await supabase.storage.from('documentos').upload(nombre, file, { contentType: 'application/pdf' })
    if (data) {
      const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(nombre)
      await supabase.from('fixture').insert({
        fecha_numero: numeroFecha,
        descripcion: descripcionFixture || `Fecha ${numeroFecha}`,
        url: urlData.publicUrl
      })
      setDescripcionFixture(''); setNumeroFecha(prev => prev + 1)
      cargarFixture()
    }
    setSubiendoFixture(false)
  }

  const handleEliminarFixture = async (id: string) => {
    if (!confirm('¿Eliminar esta fecha?')) return
    await supabase.from('fixture').delete().eq('id', id)
    cargarFixture()
  }

  const handleGuardarPuntaje = async () => {
  if (!editandoPuntaje) return
  const puntos = editandoPuntaje.pg * 3 + editandoPuntaje.pe * 2 + editandoPuntaje.pp * 1

  const datos = {
    equipo_id: editandoPuntaje.equipo_id,
    categoria: editandoPuntaje.categoria,
    pj: editandoPuntaje.pj,
    pg: editandoPuntaje.pg,
    pe: editandoPuntaje.pe,
    pp: editandoPuntaje.pp,
    gf: editandoPuntaje.gf,
    gc: editandoPuntaje.gc,
    puntos,
  }

  if (editandoPuntaje.id) {
    const { error } = await supabase.from('tabla_puntajes').update(datos).eq('id', editandoPuntaje.id)
    if (error) { alert('Error: ' + error.message); return }
  } else {
    const { error } = await supabase.from('tabla_puntajes').insert(datos)
    if (error) { alert('Error: ' + error.message); return }
  }
  setEditandoPuntaje(null)
  await cargarTabla()
}

  const handleEliminarPuntaje = async (id: string) => {
  if (!confirm('¿Eliminar este equipo de la tabla?')) return
  await supabase.from('tabla_puntajes').delete().eq('id', id)
  cargarTabla()
  }

  const handleAgregarEquipoTabla = async (equipo: Equipo) => {
    const existe = tabla.find(t => t.equipo_id === equipo.id)
    if (existe) { alert('Este equipo ya está en la tabla'); return }
    await supabase.from('tabla_puntajes').insert({
      equipo_id: equipo.id, categoria: equipo.categoria,
      pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, puntos: 0
    })
    cargarTabla()
  }

  const equiposFiltrados = equipos.filter(e => {
    const coincideBusqueda = e.nombre.toLowerCase().includes(busqueda.toLowerCase()) || e.colegio.toLowerCase().includes(busqueda.toLowerCase())
    const coincideCategoria = categoriaFiltro === 'TODOS' || e.categoria === categoriaFiltro
    return coincideBusqueda && coincideCategoria
  })

  const tablaFiltrada = tabla.filter(t => t.categoria === categoriaTabla).sort((a, b) => b.puntos - a.puntos || (b.gf - b.gc) - (a.gf - a.gc))

  const secciones = [
    { id: 'equipos', label: '🏅 Equipos', count: equipos.length },
    { id: 'fixture', label: '📅 Fixture', count: fixture.length },
    { id: 'tabla', label: '🏆 Tabla', count: tabla.length },
    { id: 'bases', label: '📋 Bases', count: basesUrl ? 1 : 0 },
    { id: 'goleadores', label: '⚽ Goleadores', count: goleadores.length },
  ]

  return (
    <main className="min-h-screen bg-gray-100">
      {/* NAVBAR */}
      <nav className="bg-[#7b0a0a] text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#c9a227] rounded-full flex items-center justify-center font-black text-black text-sm">CIP</div>
          <div>
            <p className="font-black text-lg">Panel Administrador</p>
            <p className="text-[#c9a227] text-xs">INTERCOLEGIOS 2026</p>
          </div>
        </div>
        <div className="flex gap-2">
          <a href="/" className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
            Volver al inicio
          </a>
          <button onClick={() => { localStorage.clear(); router.push('/') }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
            Cerrar Sesión
          </button>
        </div>
      </nav>

      {/* STATS */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Equipos', valor: equipos.length, color: 'bg-[#7b0a0a]' },
            { label: 'Categoría Libre', valor: equipos.filter(e => e.categoria === 'LIBRE').length, color: 'bg-[#c9a227]', text: 'text-black' },
            { label: 'Categoría Máster', valor: equipos.filter(e => e.categoria === 'MASTER').length, color: 'bg-[#3d0000]' },
            { label: 'Total Jugadores', valor: '—', color: 'bg-gray-700' },
          ].map(stat => (
            <div key={stat.label} className={`${stat.color} ${stat.text || 'text-white'} rounded-xl p-4 text-center shadow`}>
              <p className="text-3xl font-black">{stat.valor}</p>
              <p className="text-xs opacity-80 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {secciones.map(s => (
            <button key={s.id} onClick={() => setSeccionActiva(s.id)}
              className={`px-5 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition ${seccionActiva === s.id ? 'bg-[#7b0a0a] text-white shadow' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
              {s.label} {s.count > 0 && <span className="ml-1 bg-[#c9a227] text-black text-xs px-1.5 py-0.5 rounded-full">{s.count}</span>}
            </button>
          ))}
        </div>

        {/* ===== EQUIPOS ===== */}
        {seccionActiva === 'equipos' && (
          <div>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <input type="text" placeholder="🔍 Buscar equipo o colegio..."
                value={busqueda} onChange={e => setBusqueda(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7b0a0a]" />
              <select value={categoriaFiltro} onChange={e => setCategoriaFiltro(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7b0a0a]">
                <option value="TODOS">Todas las categorías</option>
                <option value="LIBRE">Libre</option>
                <option value="MASTER">Máster</option>
              </select>
              <button onClick={() => { setShowForm(true); setEditando(null); setForm({ nombre: '', colegio: '', categoria: 'LIBRE' }) }}
                className="bg-[#7b0a0a] text-white font-bold px-6 py-2 rounded-lg hover:bg-[#5a0808] transition">
                + Agregar Equipo
              </button>
            </div>

            {showForm && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-l-4 border-[#c9a227]">
                <h2 className="font-black text-gray-800 text-lg mb-4">{editando ? 'Editar Equipo' : '➕ Nuevo Equipo'}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600 mb-1 block">Nombre del Equipo</label>
                    <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                      placeholder='Ej: INGENIEROS "A"'
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7b0a0a]" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 mb-1 block">Colegio Profesional</label>
                    <input type="text" value={form.colegio} onChange={e => setForm({ ...form, colegio: e.target.value })}
                      placeholder="Ej: Colegio de Ingenieros"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7b0a0a]" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 mb-1 block">Categoría</label>
                    <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7b0a0a]">
                      <option value="LIBRE">Libre</option>
                      <option value="MASTER">Máster</option>
                    </select>
                  </div>
                </div>
                {form.nombre && (
                  <div className="mt-4 bg-gray-50 rounded-lg p-3 text-sm">
                    <p className="text-gray-500 mb-1">Credenciales que se generarán:</p>
                    <p><span className="font-semibold">Usuario:</span> {generarCredenciales(form.nombre, form.categoria).usuario}</p>
                    <p><span className="font-semibold">Contraseña:</span> {generarCredenciales(form.nombre, form.categoria).password}</p>
                  </div>
                )}
                <div className="flex gap-3 mt-4">
                  <button onClick={handleGuardarEquipo}
                    className="bg-[#7b0a0a] text-white font-bold px-6 py-2 rounded-lg hover:bg-[#5a0808] transition">
                    {editando ? 'Guardar Cambios' : 'Crear Equipo'}
                  </button>
                  <button onClick={() => { setShowForm(false); setEditando(null) }}
                    className="bg-gray-200 text-gray-700 font-bold px-6 py-2 rounded-lg hover:bg-gray-300 transition">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {equiposFiltrados.map(equipo => (
                <div key={equipo.id} className="bg-white rounded-xl shadow p-5 border-l-4 border-[#c9a227]">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${equipo.categoria === 'LIBRE' ? 'bg-[#fff3dc] text-[#7b0a0a]' : 'bg-[#3d0000] text-[#c9a227]'}`}>
                        {equipo.categoria}
                      </span>
                      <h3 className="font-black text-gray-800 text-lg mt-1">{equipo.nombre}</h3>
                      <p className="text-gray-500 text-sm">{equipo.colegio}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditando(equipo); setForm({ nombre: equipo.nombre, colegio: equipo.colegio, categoria: equipo.categoria }); setShowForm(true) }}
                        className="bg-[#c9a227] hover:bg-yellow-500 text-black px-3 py-1 rounded-lg text-sm font-semibold transition">Editar</button>
                      <button onClick={() => handleEliminarEquipo(equipo.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-semibold transition">Eliminar</button>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-500">Usuario:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-gray-800">{equipo.usuario}</span>
                        <button onClick={() => { navigator.clipboard.writeText(equipo.usuario); alert('¡Copiado!') }}
                          className="text-[#7b0a0a] text-xs">📋</button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Contraseña:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-gray-800">{equipo.password}</span>
                        <button onClick={() => { navigator.clipboard.writeText(equipo.password); alert('¡Copiado!') }}
                          className="text-[#7b0a0a] text-xs">📋</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== FIXTURE ===== */}
        {seccionActiva === 'fixture' && (
          <div>
            <div className="bg-white rounded-xl shadow p-6 mb-6 border-l-4 border-[#c9a227]">
              <h2 className="font-black text-gray-800 text-lg mb-4">Subir nueva fecha</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-sm font-semibold text-gray-600 mb-1 block">Número de Fecha</label>
                  <input type="number" value={numeroFecha} onChange={e => setNumeroFecha(parseInt(e.target.value))}
                    min={1} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7b0a0a]" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-gray-600 mb-1 block">Descripción (opcional)</label>
                  <input type="text" value={descripcionFixture} onChange={e => setDescripcionFixture(e.target.value)}
                    placeholder="Ej: Fecha 1 - Grupo A"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7b0a0a]" />
                </div>
              </div>
              <div className={`border-2 border-dashed rounded-lg p-6 text-center ${subiendoFixture ? 'border-[#c9a227] bg-yellow-50' : 'border-gray-300'}`}>
                {subiendoFixture ? (
                  <p className="text-[#7b0a0a] font-semibold">Subiendo PDF...</p>
                ) : (
                  <>
                    <p className="text-gray-500 mb-3">📄 Selecciona el PDF del fixture</p>
                    <input type="file" accept="application/pdf"
                      onChange={e => e.target.files?.[0] && handleSubirFixture(e.target.files[0])}
                      className="hidden" id="fixture-upload" />
                    <label htmlFor="fixture-upload"
                      className="bg-[#7b0a0a] text-white font-bold px-6 py-2 rounded-lg cursor-pointer hover:bg-[#5a0808] transition">
                      Seleccionar PDF
                    </label>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {fixture.map(f => (
                <div key={f.id} className="bg-white rounded-xl shadow p-4 flex items-center justify-between border-l-4 border-[#7b0a0a]">
                  <div>
                    <p className="font-black text-gray-800">📅 Fecha {f.fecha_numero}</p>
                    <p className="text-gray-500 text-sm">{f.descripcion}</p>
                  </div>
                  <div className="flex gap-2">
                    <a href={f.url} target="_blank"
                      className="bg-[#c9a227] text-black font-bold px-4 py-2 rounded-lg text-sm hover:bg-yellow-400 transition">
                      Ver PDF
                    </a>
                    <button onClick={() => handleEliminarFixture(f.id)}
                      className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-600 transition">
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
              {fixture.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-3">📅</p>
                  <p>No hay fechas subidas aún</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== TABLA DE PUNTAJES ===== */}
        {seccionActiva === 'tabla' && (
          <div>
            <div className="flex gap-3 mb-6">
              {['LIBRE', 'MASTER'].map(cat => (
                <button key={cat} onClick={() => setCategoriaTabla(cat)}
                  className={`px-5 py-2 rounded-xl font-bold text-sm transition ${categoriaTabla === cat ? 'bg-[#7b0a0a] text-white' : 'bg-white text-gray-700'}`}>
                  {cat === 'MASTER' ? 'MÁSTER' : cat}
                </button>
              ))}
            </div>

            {/* Agregar equipo a tabla */}
            <div className="bg-white rounded-xl shadow p-4 mb-4 border-l-4 border-[#c9a227]">
              <p className="font-bold text-gray-700 mb-3 text-sm">Agregar equipo a la tabla:</p>
              <div className="flex flex-wrap gap-2">
                {equipos.filter(e => e.categoria === categoriaTabla && !tabla.find(t => t.equipo_id === e.id)).map(e => (
                  <button key={e.id} onClick={() => handleAgregarEquipoTabla(e)}
                    className="bg-gray-100 hover:bg-[#c9a227] text-gray-700 hover:text-black px-3 py-1 rounded-lg text-sm font-semibold transition">
                    + {e.nombre}
                  </button>
                ))}
              </div>
            </div>

            {editandoPuntaje && (
              <div className="bg-white rounded-xl shadow p-6 mb-4 border-l-4 border-[#7b0a0a]">
                <h3 className="font-black text-gray-800 mb-4">Editar: {editandoPuntaje.equipo_nombre}</h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {[
                    { label: 'PJ', key: 'pj' },
                    { label: 'PG', key: 'pg' },
                    { label: 'PE', key: 'pe' },
                    { label: 'PP', key: 'pp' },
                    { label: 'GF', key: 'gf' },
                    { label: 'GC', key: 'gc' },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label className="text-xs font-bold text-gray-500 mb-1 block">{label}</label>
                      <input type="number" min={0}
                        value={(editandoPuntaje as any)[key]}
                        onChange={e => setEditandoPuntaje({ ...editandoPuntaje, [key]: parseInt(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-2 py-2 text-center font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7b0a0a]" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={handleGuardarPuntaje}
                    className="bg-[#7b0a0a] text-white font-bold px-6 py-2 rounded-lg hover:bg-[#5a0808] transition">
                    Guardar
                  </button>
                  <button onClick={() => setEditandoPuntaje(null)}
                    className="bg-gray-200 text-gray-700 font-bold px-6 py-2 rounded-lg hover:bg-gray-300 transition">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#7b0a0a] text-white">
                  <tr>
                    {['#', 'Equipo', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG', 'Pts', ''].map(h => (
                      <th key={h} className="px-3 py-3 text-center font-black">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tablaFiltrada.length === 0 ? (
                    <tr><td colSpan={11} className="text-center py-10 text-gray-400">No hay equipos en la tabla aún</td></tr>
                  ) : (
                    tablaFiltrada.map((t, i) => (
                      <tr key={t.equipo_id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-3 text-center font-bold text-[#7b0a0a]">{i + 1}</td>
                        <td className="px-3 py-3 font-bold text-gray-800">{t.equipo_nombre}</td>
                        <td className="px-3 py-3 text-center text-gray-800 font-semibold">{t.pj}</td>
                        <td className="px-3 py-3 text-center text-green-600 font-semibold">{t.pg}</td>
                        <td className="px-3 py-3 text-center text-yellow-600 font-semibold">{t.pe}</td>
                        <td className="px-3 py-3 text-center text-red-600 font-semibold">{t.pp}</td>
                        <td className="px-3 py-3 text-center text-gray-800 font-semibold">{t.gf}</td>
                        <td className="px-3 py-3 text-center text-gray-800 font-semibold">{t.gc}</td>
                        <td className="px-3 py-3 text-center text-gray-800 font-semibold">{t.gf - t.gc}</td>
                        <td className="px-3 py-3 text-center font-black text-[#7b0a0a] text-base">{t.puntos}</td>
                        <td className="px-3 py-3 text-center">
                            <div className="flex gap-1 justify-center">
                                <button onClick={() => setEditandoPuntaje(t)}
                                className="bg-[#c9a227] text-black px-2 py-1 rounded text-xs font-bold hover:bg-yellow-400 transition">
                                Editar
                                </button>
                                <button onClick={() => handleEliminarPuntaje(t.id!)}
                                className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold hover:bg-red-600 transition">
                                Eliminar
                                </button>
                            </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== BASES ===== */}
        {seccionActiva === 'bases' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-[#c9a227]">
              <h2 className="font-black text-gray-800 text-lg mb-4">📋 Bases del Campeonato</h2>
              {basesUrl && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 flex items-center justify-between">
                    <div>
                    <p className="text-green-700 font-semibold text-sm">✅ PDF de bases subido</p>
                    <p className="text-green-600 text-xs mt-1">Disponible para descarga pública</p>
                    </div>
                    <div className="flex gap-2">
                    <a href={basesUrl} target="_blank"
                        className="bg-[#c9a227] text-black font-bold px-4 py-2 rounded-lg text-sm hover:bg-yellow-400 transition">
                        Ver PDF
                    </a>
                    <button onClick={handleEliminarBases}
                        className="bg-red-500 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-red-600 transition">
                        Eliminar
                    </button>
                    </div>
                </div>
            )}
              <div className={`border-2 border-dashed rounded-lg p-8 text-center ${subiendoPDF ? 'border-[#c9a227] bg-yellow-50' : 'border-gray-300'}`}>
                {subiendoPDF ? (
                  <p className="text-[#7b0a0a] font-semibold">Subiendo PDF...</p>
                ) : (
                  <>
                    <p className="text-4xl mb-3">📄</p>
                    <p className="text-gray-500 mb-4">{basesUrl ? 'Reemplazar PDF de bases' : 'Subir PDF de bases'}</p>
                    <input type="file" accept="application/pdf"
                      onChange={e => e.target.files?.[0] && handleSubirBases(e.target.files[0])}
                      className="hidden" id="bases-upload" />
                    <label htmlFor="bases-upload"
                      className="bg-[#7b0a0a] text-white font-bold px-6 py-3 rounded-lg cursor-pointer hover:bg-[#5a0808] transition">
                      Seleccionar PDF
                    </label>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

      {/* ===== GOLEADORES ===== */}
{seccionActiva === 'goleadores' && (
  <div>
    <div className="flex gap-3 mb-6">
      {['LIBRE', 'MASTER'].map(cat => (
        <button key={cat} onClick={() => setCategoriaGoleadores(cat)}
          className={`px-5 py-2 rounded-xl font-bold text-sm transition ${categoriaGoleadores === cat ? 'bg-[#7b0a0a] text-white' : 'bg-white text-gray-700'}`}>
          {cat === 'MASTER' ? 'MÁSTER' : cat}
        </button>
      ))}
      <button onClick={() => { setShowFormGoleador(true); setEditandoGoleador(null); setFormGoleador({ jugador_id: '', equipo_id: '', goles: 0, categoria: categoriaGoleadores }) }}
        className="ml-auto bg-[#7b0a0a] text-white font-bold px-5 py-2 rounded-xl hover:bg-[#5a0808] transition">
        + Agregar Goleador
      </button>
    </div>

    {showFormGoleador && (
      <div className="bg-white rounded-xl shadow p-6 mb-6 border-l-4 border-[#c9a227]">
        <h2 className="font-black text-gray-800 text-lg mb-4">{editandoGoleador ? '✏️ Editar Goleador' : '➕ Nuevo Goleador'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-600 mb-1 block">Categoría</label>
            <select value={formGoleador.categoria}
              onChange={e => setFormGoleador({ ...formGoleador, categoria: e.target.value, equipo_id: '', jugador_id: '' })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7b0a0a]">
              <option value="LIBRE">Libre</option>
              <option value="MASTER">Máster</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600 mb-1 block">Equipo</label>
            <select value={formGoleador.equipo_id}
              onChange={e => { setFormGoleador({ ...formGoleador, equipo_id: e.target.value, jugador_id: '' }); cargarJugadoresEquipo(e.target.value) }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7b0a0a]">
              <option value="">Selecciona equipo</option>
              {equipos.filter(e => e.categoria === formGoleador.categoria).map(e => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600 mb-1 block">Jugador</label>
            <select value={formGoleador.jugador_id}
              onChange={e => setFormGoleador({ ...formGoleador, jugador_id: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7b0a0a]"
              disabled={!formGoleador.equipo_id}>
              <option value="">Selecciona jugador</option>
              {jugadoresEquipoSeleccionado.map(j => (
                <option key={j.id} value={j.id}>{j.nombres} {j.apellidos}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600 mb-1 block">Número de Goles</label>
            <input type="number" min={0} value={formGoleador.goles}
              onChange={e => setFormGoleador({ ...formGoleador, goles: parseInt(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7b0a0a]" />
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={handleGuardarGoleador}
            className="bg-[#7b0a0a] text-white font-bold px-6 py-2 rounded-lg hover:bg-[#5a0808] transition">
            {editandoGoleador ? 'Guardar Cambios' : 'Agregar Goleador'}
          </button>
          <button onClick={() => { setShowFormGoleador(false); setEditandoGoleador(null) }}
            className="bg-gray-200 text-gray-700 font-bold px-6 py-2 rounded-lg hover:bg-gray-300 transition">
            Cancelar
          </button>
        </div>
      </div>
    )}

    <div className="bg-white rounded-xl shadow overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-[#7b0a0a] text-white">
          <tr>
            <th className="px-4 py-3 text-center font-black">#</th>
            <th className="px-4 py-3 text-left font-black">Jugador</th>
            <th className="px-4 py-3 text-left font-black">Equipo</th>
            <th className="px-4 py-3 text-center font-black">⚽ Goles</th>
            <th className="px-4 py-3 text-center font-black">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {goleadores.filter(g => g.categoria === categoriaGoleadores).length === 0 ? (
            <tr><td colSpan={5} className="text-center py-10 text-gray-400">No hay goleadores registrados aún</td></tr>
          ) : (
            goleadores
              .filter(g => g.categoria === categoriaGoleadores)
              .map((g, i) => (
                <tr key={g.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 text-center font-bold text-[#7b0a0a]">{i + 1}</td>
                  <td className="px-4 py-3 font-bold text-gray-800">{g.jugadores?.nombres} {g.jugadores?.apellidos}</td>
                  <td className="px-4 py-3 text-gray-600">{g.equipos?.nombre}</td>
                  <td className="px-4 py-3 text-center font-black text-[#7b0a0a] text-lg">{g.goles}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => {
                        setEditandoGoleador(g)
                        setFormGoleador({ jugador_id: g.jugador_id, equipo_id: g.equipo_id, goles: g.goles, categoria: g.categoria })
                        cargarJugadoresEquipo(g.equipo_id)
                        setShowFormGoleador(true)
                      }}
                        className="bg-[#c9a227] text-black px-3 py-1 rounded text-xs font-bold hover:bg-yellow-400 transition">
                        Editar
                      </button>
                      <button onClick={() => handleEliminarGoleador(g.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded text-xs font-bold hover:bg-red-600 transition">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
          )}
        </tbody>
      </table>
    </div>
  </div>
)}
    </div>
      <div className="pb-10"></div>
    </main>
  )
}