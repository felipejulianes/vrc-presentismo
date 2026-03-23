import { getDocsStatusForUser } from '@/lib/queries/docs'
import { getDivisionsForUser } from '@/lib/queries/players'
import { DocsView } from '@/components/docs/DocsView'

export default async function DocsPage() {
  const [players, divisions] = await Promise.all([
    getDocsStatusForUser(),
    getDivisionsForUser(),
  ])

  return (
    <div>
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900">Documentación</h1>
        <p className="text-sm text-gray-500">DNI · Apto médico · Ficha de jugador</p>
      </div>
      <DocsView players={players} divisions={divisions} />
    </div>
  )
}
