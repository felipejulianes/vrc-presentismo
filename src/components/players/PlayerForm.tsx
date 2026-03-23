'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CameraCapture } from './CameraCapture'
import type { Player, Division } from '@/types'

interface PlayerFormProps {
  divisions: Division[]
  player?: Player
  defaultDivisionId?: string
}

export function PlayerForm({ divisions, player, defaultDivisionId }: PlayerFormProps) {
  const router = useRouter()
  const isEdit = !!player

  const todayStr = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    first_name: player?.first_name ?? '',
    last_name: player?.last_name ?? '',
    sobrenombre: player?.sobrenombre ?? '',
    dni: player?.dni ?? '',
    birth_date: player?.birth_date ?? '',
    parent_name: player?.parent_name ?? '',
    parent_phone: player?.parent_phone ?? '',
    division_id: player?.division_id ?? defaultDivisionId ?? divisions[0]?.id ?? '',
    fecha_alta: player?.fecha_alta ?? todayStr,
    colegio: player?.colegio ?? '',
    inactivo: player?.inactivo ?? false,
  })
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(player?.photo_url ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleCapture = (blob: Blob) => {
    setPhotoBlob(blob)
    setPhotoPreview(URL.createObjectURL(blob))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const supabase = createClient()

    try {
      let photo_url = player?.photo_url ?? null

      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        sobrenombre: form.sobrenombre.trim() || null,
        dni: form.dni.trim() || null,
        birth_date: form.birth_date || null,
        parent_name: form.parent_name.trim() || null,
        parent_phone: form.parent_phone.trim() || null,
        division_id: form.division_id,
        fecha_alta: form.fecha_alta,
        colegio: form.colegio.trim() || null,
        inactivo: form.inactivo,
      }

      if (isEdit) {
        const { error: err } = await supabase
          .from('players')
          .update(payload)
          .eq('id', player.id)
        if (err) throw err

        if (photoBlob) {
          const path = `${player.id}/avatar.jpg`
          const { error: uploadErr } = await supabase.storage
            .from('player-photos')
            .upload(path, photoBlob, { upsert: true, contentType: 'image/jpeg' })
          if (uploadErr) throw uploadErr

          const { data: urlData } = supabase.storage.from('player-photos').getPublicUrl(path)
          photo_url = urlData.publicUrl + '?t=' + Date.now()

          await supabase.from('players').update({ photo_url }).eq('id', player.id)
        }
      } else {
        const { data: created, error: err } = await supabase
          .from('players')
          .insert(payload)
          .select('id')
          .single()
        if (err) throw err

        if (photoBlob && created) {
          const path = `${created.id}/avatar.jpg`
          const { error: uploadErr } = await supabase.storage
            .from('player-photos')
            .upload(path, photoBlob, { contentType: 'image/jpeg' })
          if (!uploadErr) {
            const { data: urlData } = supabase.storage.from('player-photos').getPublicUrl(path)
            await supabase.from('players').update({ photo_url: urlData.publicUrl }).eq('id', created.id)
          }
        }
      }

      router.push(isEdit ? `/players/${player!.id}` : '/players')
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      if (msg.includes('duplicate') || msg.includes('unique')) {
        setError('Ya existe un jugador con ese DNI.')
      } else {
        setError(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async () => {
    if (!player) return
    if (!confirm(`¿Dar de baja a ${player.first_name} ${player.last_name}?`)) return
    const supabase = createClient()
    await supabase.from('players').update({ active: false }).eq('id', player.id)
    router.push(`/players/${player.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-4">

      {/* Foto */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Foto</label>
        <CameraCapture onCapture={handleCapture} preview={photoPreview} />
      </div>

      {/* División */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          División <span className="text-red-500">*</span>
        </label>
        <select
          required
          value={form.division_id}
          onChange={e => set('division_id', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
        >
          {divisions.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Nombre y Apellido */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            required
            type="text"
            value={form.first_name}
            onChange={e => set('first_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            placeholder="Juan"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Apellido <span className="text-red-500">*</span>
          </label>
          <input
            required
            type="text"
            value={form.last_name}
            onChange={e => set('last_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            placeholder="González"
          />
        </div>
      </div>

      {/* Sobrenombre */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Sobrenombre / Apodo</label>
        <input
          type="text"
          value={form.sobrenombre}
          onChange={e => set('sobrenombre', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          placeholder="El Toro"
        />
      </div>

      {/* DNI y Fecha de nacimiento */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">DNI</label>
          <input
            type="text"
            value={form.dni}
            onChange={e => set('dni', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            placeholder="12345678"
            inputMode="numeric"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nac.</label>
          <input
            type="date"
            value={form.birth_date}
            onChange={e => set('birth_date', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </div>
      </div>

      {/* Colegio y Fecha de alta */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Colegio</label>
          <input
            type="text"
            value={form.colegio}
            onChange={e => set('colegio', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            placeholder="San Ignacio"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de alta</label>
          <input
            type="date"
            value={form.fecha_alta}
            onChange={e => set('fecha_alta', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </div>
      </div>

      {/* Padre/Madre y Teléfono */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del padre/madre</label>
        <input
          type="text"
          value={form.parent_name}
          onChange={e => set('parent_name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          placeholder="María González"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (WhatsApp)</label>
        <input
          type="tel"
          value={form.parent_phone}
          onChange={e => set('parent_phone', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          placeholder="1123456789"
          inputMode="numeric"
        />
      </div>

      {/* Inactivo toggle */}
      {isEdit && (
        <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl border border-gray-200">
          <div>
            <p className="text-sm font-medium text-gray-700">Marcar como inactivo</p>
            <p className="text-xs text-gray-400">Aparece al final de las listas</p>
          </div>
          <button
            type="button"
            onClick={() => set('inactivo', !form.inactivo)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.inactivo ? 'bg-amber-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.inactivo ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Acciones */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 py-3 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-3 bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Agregar jugador'}
        </button>
      </div>

      {/* Dar de baja (solo en edición) */}
      {isEdit && (
        <div className="pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={handleDeactivate}
            className="w-full py-2.5 text-sm text-red-500 hover:text-red-700 font-medium"
          >
            Dar de baja al jugador
          </button>
        </div>
      )}
    </form>
  )
}
