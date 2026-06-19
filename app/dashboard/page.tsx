'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { generarCarnet, generarFicha } from '../lib/generarPDF'

interface Jugador {
  id: string
  dni: string
  nombres: string
  apellidos: string
  fecha_nacimiento: string
  direccion: string
  telefono: string
  correo: string
  nro_colegiatura: string
  foto_url: string
  foto_dni_url: string
  foto_dni2_url: string
  foto_titulo_url: string
  foto_colegiatura_url: string
}

const formVacio = {
  dni: '', nombres: '', apellidos: '', fecha_nacimiento: '',
  direccion: '', telefono: '', correo: '', nro_colegiatura: '',
}

export default function DashboardPage() {
  const router = useRouter()
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Jugador | null>(null)
  const [form, setForm] = useState(formVacio)
  const [foto, setFoto] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState('')
  const [fotoDni, setFotoDni] = useState<File | null>(null)
  const [fotoDniPreview, setFotoDniPreview] = useState('')
  const [fotoDni2, setFotoDni2] = useState<File | null>(null)
  const [fotoDni2Preview, setFotoDni2Preview] = useState('')
  const [fotoTitulo, setFotoTitulo] = useState<File | null>(null)
  const [fotoTituloPreview, setFotoTituloPreview] = useState('')
  const [fotoColegiatura, setFotoColegiatura] = useState<File | null>(null)
  const [fotoColegiaturaPreview, setFotoColegiaturaPreview] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [descargandoMasivo, setDescargandoMasivo] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [equipoNombre, setEquipoNombre] = useState('')
  const [equipoCategoria, setEquipoCategoria] = useState('')
  const [equipoId, setEquipoId] = useState('')
  const [errores, setErrores] = useState<{[key: string]: string}>({})
  const [jugadorDetalle, setJugadorDetalle] = useState<Jugador | null>(null)

  const refDni = useRef<HTMLInputElement>(null)
  const refNombres = useRef<HTMLInputElement>(null)
  const refApellidos = useRef<HTMLInputElement>(null)
  const refFechaNac = useRef<HTMLInputElement>(null)
  const refDireccion = useRef<HTMLInputElement>(null)
  const refTelefono = useRef<HTMLInputElement>(null)
  const refColegiatura = useRef<HTMLInputElement>(null)
  const refFoto = useRef<HTMLLabelElement>(null)

  useEffect(() => {
    const rol = localStorage.getItem('rol')
    if (rol !== 'delegado') { router.push('/login'); return }
    setEquipoNombre(localStorage.getItem('equipo_nombre') || '')
    setEquipoCategoria(localStorage.getItem('equipo_categoria') || '')
    setEquipoId(localStorage.getItem('equipo_id') || '')
    cargarJugadores()
  }, [])

  const cargarJugadores = async () => {
    const id = localStorage.getItem('equipo_id')
    const { data } = await supabase.from('jugadores').select('*').eq('equipo_id', id).order('apellidos')
    setJugadores(data || [])
    setLoading(false)
  }

  const comprimirImagen = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const MAX = 800
          let w = img.width, h = img.height
          if (w > h && w > MAX) { h = (h * MAX) / w; w = MAX }
          else if (h > MAX) { w = (w * MAX) / h; h = MAX }
          canvas.width = w; canvas.height = h
          canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
          canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.7)
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  const subirFoto = async (file: File, carpeta: string): Promise<string> => {
    const blob = await comprimirImagen(file)
    const nombre = `${carpeta}/${Date.now()}.jpg`
    const { data } = await supabase.storage.from('fotos').upload(nombre, blob, { contentType: 'image/jpeg' })
    if (!data) return ''
    const { data: urlData } = supabase.storage.from('fotos').getPublicUrl(nombre)
    return urlData.publicUrl
  }

  const handleFotoChange = (file: File | null, setter: (f: File | null) => void, isMain?: boolean, previewSetter?: (s: string) => void) => {
    setter(file)
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        if (isMain) setFotoPreview(result)
        if (previewSetter) previewSetter(result)
      }
      reader.readAsDataURL(file)
    }
  }

  const validar = () => {
    const nuevosErrores: {[key: string]: string} = {}
    if (!form.dni) nuevosErrores.dni = 'El DNI es obligatorio'
    if (!form.nombres) nuevosErrores.nombres = 'Los nombres son obligatorios'
    if (!form.apellidos) nuevosErrores.apellidos = 'Los apellidos son obligatorios'
    if (!form.fecha_nacimiento) nuevosErrores.fecha_nacimiento = 'La fecha de nacimiento es obligatoria'
    if (!form.direccion) nuevosErrores.direccion = 'La dirección es obligatoria'
    if (!form.telefono) nuevosErrores.telefono = 'El teléfono es obligatorio'
    if (!form.nro_colegiatura) nuevosErrores.nro_colegiatura = 'El Nro de colegiatura es obligatorio'
    if (!foto && !editando?.foto_url) nuevosErrores.foto = 'La foto del jugador es obligatoria'
    if (!fotoDni && !editando?.foto_dni_url) nuevosErrores.fotoDni = 'La foto del DNI (frente) es obligatoria'
    if (!fotoDni2 && !editando?.foto_dni2_url) nuevosErrores.fotoDni2 = 'La foto del DNI (reverso) es obligatoria'
    if (!fotoTitulo && !editando?.foto_titulo_url) nuevosErrores.fotoTitulo = 'La foto del título es obligatoria'
    if (!fotoColegiatura && !editando?.foto_colegiatura_url) nuevosErrores.fotoColegiatura = 'La foto de colegiatura es obligatoria'
    setErrores(nuevosErrores)

    if (!form.dni) { refDni.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); refDni.current?.focus() }
    else if (!form.nombres) { refNombres.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); refNombres.current?.focus() }
    else if (!form.apellidos) { refApellidos.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); refApellidos.current?.focus() }
    else if (!form.fecha_nacimiento) { refFechaNac.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); refFechaNac.current?.focus() }
    else if (!form.direccion) { refDireccion.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); refDireccion.current?.focus() }
    else if (!form.telefono) { refTelefono.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); refTelefono.current?.focus() }
    else if (!form.nro_colegiatura) { refColegiatura.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); refColegiatura.current?.focus() }
    else if (!foto && !editando?.foto_url) { refFoto.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }

    return Object.keys(nuevosErrores).length === 0
  }

  const handleGuardar = async () => {
    if (!validar()) return
    setGuardando(true)
    let foto_url = editando?.foto_url || ''
    let foto_dni_url = editando?.foto_dni_url || ''
    let foto_dni2_url = editando?.foto_dni2_url || ''
    let foto_titulo_url = editando?.foto_titulo_url || ''
    let foto_colegiatura_url = editando?.foto_colegiatura_url || ''
    if (foto) foto_url = await subirFoto(foto, `equipos/${equipoId}/fotos`)
    if (fotoDni) foto_dni_url = await subirFoto(fotoDni, `equipos/${equipoId}/dni`)
    if (fotoDni2) foto_dni2_url = await subirFoto(fotoDni2, `equipos/${equipoId}/dni2`)
    if (fotoTitulo) foto_titulo_url = await subirFoto(fotoTitulo, `equipos/${equipoId}/titulo`)
    if (fotoColegiatura) foto_colegiatura_url = await subirFoto(fotoColegiatura, `equipos/${equipoId}/colegiatura`)
    const datos = { ...form, equipo_id: equipoId, foto_url, foto_dni_url, foto_dni2_url, foto_titulo_url, foto_colegiatura_url, updated_at: new Date().toISOString() }
    if (editando) {
      await supabase.from('jugadores').update(datos).eq('id', editando.id)
    } else {
      await supabase.from('jugadores').insert(datos)
    }
    setForm(formVacio)
    setFoto(null); setFotoPreview('')
    setFotoDni(null); setFotoDniPreview('')
    setFotoDni2(null); setFotoDni2Preview('')
    setFotoTitulo(null); setFotoTituloPreview('')
    setFotoColegiatura(null); setFotoColegiaturaPreview('')
    setShowForm(false); setEditando(null); setErrores({})
    setGuardando(false)
    cargarJugadores()
  }

  const handleEditar = (j: Jugador) => {
    setEditando(j)
    setForm({ dni: j.dni, nombres: j.nombres, apellidos: j.apellidos, fecha_nacimiento: j.fecha_nacimiento, direccion: j.direccion, telefono: j.telefono, correo: j.correo, nro_colegiatura: j.nro_colegiatura })
    setFotoPreview(j.foto_url || '')
    setFotoDniPreview(j.foto_dni_url || '')
    setFotoDni2Preview(j.foto_dni2_url || '')
    setFotoTituloPreview(j.foto_titulo_url || '')
    setFotoColegiaturaPreview(j.foto_colegiatura_url || '')
    setShowForm(true)
    setJugadorDetalle(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Eliminar este jugador?')) return
    await supabase.from('jugadores').delete().eq('id', id)
    cargarJugadores()
  }

  const calcularEdad = (fecha: string) => {
    if (!fecha) return ''
    const hoy = new Date()
    const nac = new Date(fecha)
    let edad = hoy.getFullYear() - nac.getFullYear()
    const m = hoy.getMonth() - nac.getMonth()
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
    return `${edad} años`
  }

  const documentosCompletos = (j: Jugador) => {
    return !!(j.foto_url && j.foto_dni_url && j.foto_dni2_url && j.foto_titulo_url && j.foto_colegiatura_url)
  }

  const handleDescargaMasiva = async () => {
    if (jugadores.length === 0) { alert('No hay jugadores registrados'); return }
    setDescargandoMasivo(true)
    const { default: jsPDF } = await import('jspdf')
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85.6, 54] })
    for (let i = 0; i < jugadores.length; i++) {
      const j = jugadores[i]
      if (i > 0) pdf.addPage([85.6, 54], 'landscape')
      await generarCarnet({
        id: j.id, dni: j.dni, nombres: j.nombres, apellidos: j.apellidos,
        fecha_nacimiento: j.fecha_nacimiento, direccion: j.direccion,
        correo: j.correo, telefono: j.telefono, nro_colegiatura: j.nro_colegiatura,
        foto_url: j.foto_url, equipo_nombre: equipoNombre,
        equipo_categoria: equipoCategoria, baseUrl: window.location.origin
      })
    }
    setDescargandoMasivo(false)
  }

  const jugadoresFiltrados = jugadores.filter(j =>
    j.nombres?.toLowerCase().includes(busqueda.toLowerCase()) ||
    j.apellidos?.toLowerCase().includes(busqueda.toLowerCase()) ||
    j.dni?.includes(busqueda)
  )

  const MAX_JUGADORES = 30
  const porcentaje = Math.round((jugadores.length / MAX_JUGADORES) * 100)
  const completos = jugadores.filter(j => documentosCompletos(j)).length

  const FotoUpload = ({ label, file, onFile, preview, obligatorio, error, id }: {
    label: string, file: File | null, onFile: (f: File | null) => void,
    preview?: string, obligatorio?: boolean, error?: string, id: string
  }) => (
    <div>
      <label className="text-sm font-semibold text-gray-600 mb-1 block">
        {label} {obligatorio && <span className="text-red-500">*</span>}
      </label>
      <div className={`border-2 border-dashed rounded-lg p-3 text-center hover:border-[#7b0a0a] transition ${error ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}>
        {preview ? (
          <img src={preview} alt="preview" className="h-20 mx-auto object-cover rounded mb-1" />
        ) : file ? (
          <div className="text-green-600 text-sm font-semibold">✅ {file.name}</div>
        ) : (
          <p className="text-gray-400 text-sm">📁 Clic para subir (JPEG/PNG)</p>
        )}
        <input type="file" accept="image/jpeg,image/png" className="hidden"
          onChange={e => onFile(e.target.files?.[0] || null)} id={id} />
        <label ref={label.includes('Jugador') ? refFoto : undefined} htmlFor={id}
          className="cursor-pointer text-xs text-[#7b0a0a] underline mt-1 block">
          {file || preview ? 'Cambiar foto' : 'Seleccionar archivo'}
        </label>
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50">
      {/* NAVBAR */}
      <nav className="bg-[#7b0a0a] text-white px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src="/logos/logo_cip.png" alt="CIP" className="w-10 h-10 rounded-full object-cover border-2 border-[#c9a227]" />
          <div>
            <p className="font-black text-xl leading-none tracking-wide">{equipoNombre}</p>
            <p className="text-[#c9a227] text-xs font-semibold tracking-widest uppercase">Categoría {equipoCategoria} · INTERCOLEGIOS PROFESIONALES 2026</p>
          </div>
        </div>
        <div className="flex gap-2">
          <a href="/" className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg text-sm font-semibold transition">
            Volver al inicio
          </a>
          <button onClick={() => { localStorage.clear(); router.push('/') }}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-semibold transition">
            Cerrar Sesión
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#7b0a0a] text-white rounded-xl p-4 text-center shadow">
            <p className="text-3xl font-black">{jugadores.length}</p>
            <p className="text-xs opacity-80 mt-1">Jugadores registrados</p>
          </div>
          <div className="bg-[#c9a227] text-black rounded-xl p-4 text-center shadow">
            <p className="text-3xl font-black">{MAX_JUGADORES - jugadores.length}</p>
            <p className="text-xs mt-1 font-semibold">Cupos disponibles</p>
          </div>
          <div className="bg-green-700 text-white rounded-xl p-4 text-center shadow">
            <p className="text-3xl font-black">{completos}</p>
            <p className="text-xs opacity-80 mt-1">Documentos completos</p>
          </div>
          <div className="bg-orange-600 text-white rounded-xl p-4 text-center shadow">
            <p className="text-3xl font-black">{jugadores.length - completos}</p>
            <p className="text-xs opacity-80 mt-1">Documentos incompletos</p>
          </div>
        </div>

        {/* BARRA DE PROGRESO */}
        <div className="bg-white rounded-xl shadow p-4 mb-6 border-l-4 border-[#c9a227]">
          <div className="flex justify-between items-center mb-2">
            <p className="font-bold text-gray-700 text-sm">Progreso de inscripción</p>
            <p className="font-black text-[#7b0a0a]">{jugadores.length}/{MAX_JUGADORES} jugadores</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className="bg-[#7b0a0a] h-3 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(porcentaje, 100)}%` }}></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">{porcentaje}% del cupo utilizado</p>
        </div>

        {/* CONTROLES */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <input type="text" placeholder="🔍 Buscar por nombre o DNI..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7b0a0a]" />
          <button onClick={handleDescargaMasiva} disabled={descargandoMasivo || jugadores.length === 0}
            className="bg-[#c9a227] text-black font-bold px-4 py-2 rounded-lg hover:bg-yellow-400 transition disabled:opacity-50 text-sm">
            {descargandoMasivo ? '⏳ Generando...' : 'Descargar Todos los Carnets'}
          </button>
          <button onClick={() => { setShowForm(true); setEditando(null); setForm(formVacio); setFotoPreview(''); setErrores({}) }}
            className="bg-[#7b0a0a] text-white font-bold px-5 py-2 rounded-lg hover:bg-[#5a0808] transition">
            + Agregar Jugador
          </button>
        </div>

        {/* FORMULARIO */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-l-4 border-[#c9a227]">
            <h2 className="font-black text-gray-800 text-lg mb-4">
              {editando ? 'Editar Datos del Jugador' : '➕ Nuevo Jugador'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block">DNI <span className="text-red-500">*</span></label>
                <input ref={refDni} type="text" value={form.dni}
                  onChange={e => { setForm({ ...form, dni: e.target.value }); setErrores({ ...errores, dni: '' }) }}
                  className={`w-full border rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7b0a0a] ${errores.dni ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} />
                {errores.dni && <p className="text-red-500 text-xs mt-1">{errores.dni}</p>}
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Nombres <span className="text-red-500">*</span></label>
                <input ref={refNombres} type="text" value={form.nombres}
                  onChange={e => { setForm({ ...form, nombres: e.target.value }); setErrores({ ...errores, nombres: '' }) }}
                  className={`w-full border rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7b0a0a] ${errores.nombres ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} />
                {errores.nombres && <p className="text-red-500 text-xs mt-1">{errores.nombres}</p>}
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Apellidos <span className="text-red-500">*</span></label>
                <input ref={refApellidos} type="text" value={form.apellidos}
                  onChange={e => { setForm({ ...form, apellidos: e.target.value }); setErrores({ ...errores, apellidos: '' }) }}
                  className={`w-full border rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7b0a0a] ${errores.apellidos ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} />
                {errores.apellidos && <p className="text-red-500 text-xs mt-1">{errores.apellidos}</p>}
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Fecha de Nacimiento <span className="text-red-500">*</span></label>
                <input ref={refFechaNac} type="date" value={form.fecha_nacimiento}
                  onChange={e => { setForm({ ...form, fecha_nacimiento: e.target.value }); setErrores({ ...errores, fecha_nacimiento: '' }) }}
                  className={`w-full border rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7b0a0a] ${errores.fecha_nacimiento ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} />
                {errores.fecha_nacimiento && <p className="text-red-500 text-xs mt-1">{errores.fecha_nacimiento}</p>}
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Dirección <span className="text-red-500">*</span></label>
                <input ref={refDireccion} type="text" value={form.direccion}
                  onChange={e => { setForm({ ...form, direccion: e.target.value }); setErrores({ ...errores, direccion: '' }) }}
                  className={`w-full border rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7b0a0a] ${errores.direccion ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} />
                {errores.direccion && <p className="text-red-500 text-xs mt-1">{errores.direccion}</p>}
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Teléfono <span className="text-red-500">*</span></label>
                <input ref={refTelefono} type="text" value={form.telefono}
                  onChange={e => { setForm({ ...form, telefono: e.target.value }); setErrores({ ...errores, telefono: '' }) }}
                  className={`w-full border rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7b0a0a] ${errores.telefono ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} />
                {errores.telefono && <p className="text-red-500 text-xs mt-1">{errores.telefono}</p>}
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Correo Electrónico</label>
                <input type="email" value={form.correo}
                  onChange={e => setForm({ ...form, correo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7b0a0a]" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Nro Colegiatura <span className="text-red-500">*</span></label>
                <input ref={refColegiatura} type="text" value={form.nro_colegiatura}
                  onChange={e => { setForm({ ...form, nro_colegiatura: e.target.value }); setErrores({ ...errores, nro_colegiatura: '' }) }}
                  className={`w-full border rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7b0a0a] ${errores.nro_colegiatura ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} />
                {errores.nro_colegiatura && <p className="text-red-500 text-xs mt-1">{errores.nro_colegiatura}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              <FotoUpload label="Foto del Jugador" file={foto} id="foto-jugador"
                onFile={(f) => handleFotoChange(f, setFoto, true)}
                preview={fotoPreview} obligatorio error={errores.foto} />
              <FotoUpload label="Foto DNI (frente)" file={fotoDni} id="foto-dni"
                onFile={(f) => handleFotoChange(f, setFotoDni, false, setFotoDniPreview)}
                preview={fotoDniPreview || editando?.foto_dni_url || ''} obligatorio error={errores.fotoDni} />
              <FotoUpload label="Foto DNI (reverso)" file={fotoDni2} id="foto-dni2"
                onFile={(f) => handleFotoChange(f, setFotoDni2, false, setFotoDni2Preview)}
                preview={fotoDni2Preview || editando?.foto_dni2_url || ''} obligatorio error={errores.fotoDni2} />
              <FotoUpload label="Foto de su Título Profesional" file={fotoTitulo} id="foto-titulo"
                onFile={(f) => handleFotoChange(f, setFotoTitulo, false, setFotoTituloPreview)}
                preview={fotoTituloPreview || editando?.foto_titulo_url || ''} obligatorio error={errores.fotoTitulo} />
              <FotoUpload label="Foto Colegiatura" file={fotoColegiatura} id="foto-colegiatura"
                onFile={(f) => handleFotoChange(f, setFotoColegiatura, false, setFotoColegiaturaPreview)}
                preview={fotoColegiaturaPreview || editando?.foto_colegiatura_url || ''} obligatorio error={errores.fotoColegiatura} />
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleGuardar} disabled={guardando}
                className="bg-[#7b0a0a] text-white font-bold px-6 py-2 rounded-lg hover:bg-[#5a0808] transition disabled:opacity-50">
                {guardando ? '⏳ Guardando...' : editando ? 'Guardar Cambios' : 'Registrar Jugador'}
              </button>
              <button onClick={() => { setShowForm(false); setEditando(null); setErrores({}) }}
                className="bg-gray-200 text-gray-700 font-bold px-6 py-2 rounded-lg hover:bg-gray-300 transition">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* MODAL DETALLE JUGADOR */}
        {jugadorDetalle && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setJugadorDetalle(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-4">
                <h2 className="font-black text-gray-800 text-xl">{jugadorDetalle.nombres} {jugadorDetalle.apellidos}</h2>
                <button onClick={() => setJugadorDetalle(null)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
              </div>
              <div className="flex gap-4 mb-6">
                {jugadorDetalle.foto_url ? (
                  <img src={jugadorDetalle.foto_url} alt="foto" className="w-28 h-32 object-cover rounded-xl border-4 border-[#c9a227] shadow" />
                ) : (
                  <div className="w-28 h-32 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-sm">Sin foto</div>
                )}
                <div className="flex-1 space-y-2 text-sm">
                  {[
                    { label: 'DNI', valor: jugadorDetalle.dni },
                    { label: 'Fecha Nac.', valor: jugadorDetalle.fecha_nacimiento ? new Date(jugadorDetalle.fecha_nacimiento).toLocaleDateString('es-PE') : '-' },
                    { label: 'Edad', valor: calcularEdad(jugadorDetalle.fecha_nacimiento) },
                    { label: 'Colegiatura', valor: jugadorDetalle.nro_colegiatura },
                    { label: 'Teléfono', valor: jugadorDetalle.telefono },
                    { label: 'Correo', valor: jugadorDetalle.correo },
                    { label: 'Dirección', valor: jugadorDetalle.direccion },
                  ].map(item => (
                    <div key={item.label} className="flex gap-2">
                      <span className="text-gray-500 w-24 flex-shrink-0">{item.label}:</span>
                      <span className="font-semibold text-gray-800">{item.valor || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'DNI Frente', url: jugadorDetalle.foto_dni_url },
                  { label: 'DNI Reverso', url: jugadorDetalle.foto_dni2_url },
                  { label: 'Título', url: jugadorDetalle.foto_titulo_url },
                  { label: 'Colegiatura', url: jugadorDetalle.foto_colegiatura_url },
                ].map(doc => (
                  <div key={doc.label} className="text-center">
                    {doc.url ? (
                      <a href={doc.url} target="_blank">
                        <img src={doc.url} alt={doc.label} className="w-full h-20 object-cover rounded-lg border-2 border-green-400 hover:opacity-80 transition" />
                      </a>
                    ) : (
                      <div className="w-full h-20 bg-red-50 border-2 border-red-300 rounded-lg flex items-center justify-center">
                        <span className="text-red-400 text-xs">Sin foto</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">{doc.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => { handleEditar(jugadorDetalle); setJugadorDetalle(null) }}
                  className="bg-[#c9a227] text-black font-bold px-4 py-2 rounded-lg text-sm hover:bg-yellow-400 transition">
                  Editar Datos
                </button>
                <button onClick={() => generarCarnet({
                  id: jugadorDetalle.id, dni: jugadorDetalle.dni, nombres: jugadorDetalle.nombres,
                  apellidos: jugadorDetalle.apellidos, fecha_nacimiento: jugadorDetalle.fecha_nacimiento,
                  direccion: jugadorDetalle.direccion, correo: jugadorDetalle.correo,
                  telefono: jugadorDetalle.telefono, nro_colegiatura: jugadorDetalle.nro_colegiatura,
                  foto_url: jugadorDetalle.foto_url, equipo_nombre: equipoNombre,
                  equipo_categoria: equipoCategoria, baseUrl: window.location.origin
                })}
                  className="bg-blue-600 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition">
                  Descargar Carnet
                </button>
                <button onClick={() => generarFicha({
                  id: jugadorDetalle.id, dni: jugadorDetalle.dni, nombres: jugadorDetalle.nombres,
                  apellidos: jugadorDetalle.apellidos, fecha_nacimiento: jugadorDetalle.fecha_nacimiento,
                  direccion: jugadorDetalle.direccion, correo: jugadorDetalle.correo,
                  telefono: jugadorDetalle.telefono, nro_colegiatura: jugadorDetalle.nro_colegiatura,
                  foto_url: jugadorDetalle.foto_url, equipo_nombre: equipoNombre,
                  equipo_categoria: equipoCategoria, baseUrl: window.location.origin
                })}
                  className="bg-green-600 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition">
                  Descargar Ficha
                </button>
                <button onClick={() => { if (confirm('¿Eliminar este jugador?')) { handleEliminar(jugadorDetalle.id); setJugadorDetalle(null) } }}
                  className="bg-red-500 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-red-600 transition">
                  Eliminar Jugador
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TABLA DE JUGADORES */}
        {loading ? (
          <div className="text-center py-20 text-gray-500">Cargando jugadores...</div>
        ) : jugadoresFiltrados.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-4">👥</p>
            <p className="font-semibold text-lg">No hay jugadores registrados aún</p>
            <p className="text-sm">Haz clic en &quot;+ Agregar Jugador&quot; para comenzar</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-x-auto border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#7b0a0a] text-white">
                  <th className="px-4 py-3 text-left font-black">#</th>
                  <th className="px-4 py-3 text-left font-black">Foto</th>
                  <th className="px-4 py-3 text-left font-black">DNI</th>
                  <th className="px-4 py-3 text-left font-black">Nombres y Apellidos</th>
                  <th className="px-4 py-3 text-left font-black">Fecha Nac.</th>
                  <th className="px-4 py-3 text-left font-black">Edad</th>
                  <th className="px-4 py-3 text-left font-black">Colegiatura</th>
                  <th className="px-4 py-3 text-center font-black">Documentos</th>
                  <th className="px-4 py-3 text-center font-black">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {jugadoresFiltrados.map((j, i) => (
                  <tr key={j.id}
                    className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-[#fff3dc] transition cursor-pointer`}
                    onClick={() => setJugadorDetalle(j)}>
                    <td className="px-4 py-3 text-[#7b0a0a] font-bold">{i + 1}</td>
                    <td className="px-4 py-3">
                      {j.foto_url ? (
                        <img src={j.foto_url} alt="foto" className="w-12 h-12 rounded-full object-cover border-2 border-[#c9a227] shadow" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">Sin foto</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-800 font-semibold">{j.dni}</td>
                    <td className="px-4 py-3 font-bold text-gray-800">{j.nombres} {j.apellidos}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{j.fecha_nacimiento ? new Date(j.fecha_nacimiento).toLocaleDateString('es-PE') : '-'}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{calcularEdad(j.fecha_nacimiento)}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{j.nro_colegiatura}</td>
                    <td className="px-4 py-3 text-center">
                      {documentosCompletos(j) ? (
                        <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full border border-green-300">Completo</span>
                      ) : (
                        <span className="bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-full border border-red-300">Incompleto</span>
                      )}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1 justify-center">
                    <button onClick={() => handleEditar(j)}
                        className="bg-[#c9a227] hover:bg-yellow-500 text-black px-3 py-1.5 rounded-lg text-xs font-black transition shadow-sm">
                        Editar
                    </button>
                    <button onClick={() => handleEliminar(j.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-black transition shadow-sm">
                        Eliminar
                    </button>
                    <button onClick={() => generarCarnet({
                        id: j.id, dni: j.dni, nombres: j.nombres, apellidos: j.apellidos,
                        fecha_nacimiento: j.fecha_nacimiento, direccion: j.direccion,
                        correo: j.correo, telefono: j.telefono, nro_colegiatura: j.nro_colegiatura,
                        foto_url: j.foto_url, equipo_nombre: equipoNombre,
                        equipo_categoria: equipoCategoria, baseUrl: window.location.origin
                    })}
                        className="bg-[#1a237e] hover:bg-blue-900 text-white px-3 py-1.5 rounded-lg text-xs font-black transition shadow-sm">
                        Carnet
                    </button>
                    <button onClick={() => generarFicha({
                        id: j.id, dni: j.dni, nombres: j.nombres, apellidos: j.apellidos,
                        fecha_nacimiento: j.fecha_nacimiento, direccion: j.direccion,
                        correo: j.correo, telefono: j.telefono, nro_colegiatura: j.nro_colegiatura,
                        foto_url: j.foto_url, equipo_nombre: equipoNombre,
                        equipo_categoria: equipoCategoria, baseUrl: window.location.origin
                    })}
                        className="bg-[#7b0a0a] hover:bg-[#5a0808] text-white px-3 py-1.5 rounded-lg text-xs font-black transition shadow-sm">
                        Ficha
                    </button>
                    </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}