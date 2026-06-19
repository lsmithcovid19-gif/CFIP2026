'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Image from 'next/image'

interface Jugador {
  id: string
  dni: string
  nombres: string
  apellidos: string
  fecha_nacimiento: string
  nro_colegiatura: string
  foto_url: string
  equipo_id: string
}

interface Equipo {
  nombre: string
  categoria: string
  colegio: string
}

export default function VerificarPage() {
  const { id } = useParams()
  const [jugador, setJugador] = useState<Jugador | null>(null)
  const [equipo, setEquipo] = useState<Equipo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const cargar = async () => {
      const { data: j } = await supabase
        .from('jugadores')
        .select('*')
        .eq('id', id)
        .single()

      if (!j) { setError(true); setLoading(false); return }
      setJugador(j)

      const { data: e } = await supabase
        .from('equipos')
        .select('nombre, categoria, colegio')
        .eq('id', j.equipo_id)
        .single()

      setEquipo(e)
      setLoading(false)
    }
    cargar()
  }, [id])

  const calcularEdad = (fecha: string) => {
    if (!fecha) return ''
    const hoy = new Date()
    const nac = new Date(fecha)
    let edad = hoy.getFullYear() - nac.getFullYear()
    const m = hoy.getMonth() - nac.getMonth()
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
    return `${edad} años`
  }

  if (loading) return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 font-semibold">Verificando jugador...</p>
      </div>
    </main>
  )

  if (error) return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
        <div className="text-6xl mb-4">❌</div>
        <h1 className="text-2xl font-black text-red-600 mb-2">Jugador no encontrado</h1>
        <p className="text-gray-500">Este carnet no es válido o no existe en el sistema.</p>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* HEADER */}
        <div className="bg-blue-900 px-6 py-4 flex items-center gap-4">
          <Image src="/logos/logo_cip.png" alt="CIP" width={50} height={50} className="rounded-full" />
          <div>
            <p className="text-yellow-400 font-black text-sm">CAMPEONATO INTERCOLEGIOS 2026</p>
            <p className="text-white text-xs">Verificación Digital de Jugador</p>
          </div>
        </div>

        {/* ESTADO */}
        <div className="bg-green-500 px-6 py-3 flex items-center justify-center gap-2">
          <span className="text-white font-black text-lg">✅ JUGADOR HABILITADO</span>
        </div>

        {/* FOTO Y DATOS */}
        <div className="p-6">
          <div className="flex gap-4 mb-6">
            {jugador?.foto_url ? (
              <img src={jugador.foto_url} alt="foto"
                className="w-24 h-28 object-cover rounded-lg border-4 border-blue-900 shadow" />
            ) : (
              <div className="w-24 h-28 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-xs text-center">Sin foto</div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-black text-gray-800">{jugador?.nombres}</h2>
              <h2 className="text-xl font-black text-gray-800">{jugador?.apellidos}</h2>
              <span className={`text-xs font-bold px-2 py-1 rounded-full mt-1 inline-block ${equipo?.categoria === 'LIBRE' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                {equipo?.categoria}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { label: 'DNI', valor: jugador?.dni },
              { label: 'Equipo', valor: equipo?.nombre },
              { label: 'Categoría', valor: equipo?.categoria },
              { label: 'Nro Colegiatura', valor: jugador?.nro_colegiatura },
              { label: 'Fecha Nacimiento', valor: jugador?.fecha_nacimiento ? new Date(jugador.fecha_nacimiento).toLocaleDateString('es-PE') : '-' },
              { label: 'Edad', valor: calcularEdad(jugador?.fecha_nacimiento || '') },
            ].map(item => (
              <div key={item.label} className="flex justify-between border-b pb-2">
                <span className="text-gray-500 text-sm font-semibold">{item.label}:</span>
                <span className="text-gray-800 font-bold text-sm">{item.valor}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-gray-50 px-6 py-4 text-center">
          <p className="text-gray-400 text-xs">Campeonato Intercolegios Profesionales 2026</p>
          <p className="text-gray-400 text-xs">Juliaca, Perú</p>
        </div>
      </div>
    </main>
  )
}