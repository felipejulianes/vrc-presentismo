import { createClient } from '@/lib/supabase/server'
import { ProgressionPreview } from '@/components/admin/ProgressionPreview'

export default async function ProgressionPage() {
  const supabase = await createClient()
  const { data: preview, error } = await supabase.rpc('preview_annual_progression')

  return (
    <div>
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900">Avance de categoría</h1>
        <p className="text-sm text-gray-500">Inicio de temporada — todos avanzan una división</p>
      </div>

      {error ? (
        <p className="p-4 text-sm text-red-600">Error al cargar preview: {error.message}</p>
      ) : (
        <ProgressionPreview preview={preview ?? []} />
      )}
    </div>
  )
}
