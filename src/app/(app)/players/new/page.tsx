import { getDivisionsForUser } from '@/lib/queries/players'
import { getSchools } from '@/lib/queries/schools'
import { PlayerForm } from '@/components/players/PlayerForm'

export default async function NewPlayerPage({
  searchParams,
}: {
  searchParams: { division?: string }
}) {
  const [divisions, schools] = await Promise.all([
    getDivisionsForUser(),
    getSchools(),
  ])

  return (
    <div>
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900">Nuevo jugador</h1>
      </div>
      <PlayerForm divisions={divisions} defaultDivisionId={searchParams.division} schools={schools} />
    </div>
  )
}
