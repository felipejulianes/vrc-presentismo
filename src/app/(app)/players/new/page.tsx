import { getDivisionsForUser } from '@/lib/queries/players'
import { PlayerForm } from '@/components/players/PlayerForm'

export default async function NewPlayerPage({
  searchParams,
}: {
  searchParams: { division?: string }
}) {
  const divisions = await getDivisionsForUser()

  return (
    <div>
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900">Nuevo jugador</h1>
      </div>
      <PlayerForm divisions={divisions} defaultDivisionId={searchParams.division} />
    </div>
  )
}
