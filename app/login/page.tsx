'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Verificar si es admin
    const { data: adminData } = await supabase
      .from('admins')
      .select('*')
      .eq('usuario', usuario)
      .eq('password', password)
      .single()

    if (adminData) {
      localStorage.setItem('rol', 'admin')
      localStorage.setItem('usuario', usuario)
      router.push('/')
      return
    }

    // Verificar si es delegado
    const { data: equipoData } = await supabase
      .from('equipos')
      .select('*')
      .eq('usuario', usuario)
      .eq('password', password)
      .single()

    if (equipoData) {
      localStorage.setItem('rol', 'delegado')
      localStorage.setItem('equipo_id', equipoData.id)
      localStorage.setItem('equipo_nombre', equipoData.nombre)
      localStorage.setItem('equipo_categoria', equipoData.categoria)
      localStorage.setItem('usuario', usuario)
      router.push('/')
      return
    }

    setError('Usuario o contraseña incorrectos')
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-600 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* LOGO */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-black text-xl">CIP</span>
          </div>
          <h1 className="text-2xl font-black text-gray-800">INTERCOLEGIOS 2026</h1>
          <p className="text-gray-500 text-sm mt-1">Portal de Delegados y Administración</p>
        </div>

        {/* FORMULARIO */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">
              Usuario
            </label>
            <input
              type="text"
              value={usuario}
              onChange={e => setUsuario(e.target.value)}
              placeholder="Ingresa tu usuario"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Ingresa tu contraseña"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm">
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-green-700 text-white font-bold py-3 rounded-lg hover:bg-green-600 transition disabled:opacity-50 mt-2"
          >
            {loading ? 'Verificando...' : 'Ingresar →'}
          </button>
        </form>

        <p className="text-center text-gray-400 text-xs mt-6">
          ¿Problemas para ingresar? Contacta al administrador
        </p>

        <div className="text-center mt-4">
          <a href="/" className="text-green-700 text-sm hover:underline">
            ← Volver al inicio
          </a>
        </div>
      </div>
    </main>
  )
}