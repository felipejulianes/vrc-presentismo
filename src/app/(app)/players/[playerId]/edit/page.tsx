import { notFound } from 'next/navigation'
import { getPlayerById, getDivisionsForUser } from '@/lib/queries/players'
import { getSchools } from '@/lib/queries/schools'
import { PlayerForm } from '@/components/players/PlayerForm'

interface PageProps {
  params: { playerId: string }
}

export default async function EditPlayerPage({ params }: PageProps) {
  const [player, divisions, schools] = await Promise.all([
    getPlayerById(params.playerId),
    getDivisionsForUser(),
    getSchools(),
  ])

  if (!player) notFound()

  return (
    <div>
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900">
          {player.first_name} {player.last_name}
        </h1>
        <p className="text-sm text-gray-500">Editar jugador</p>
      </div>
      <PlayerForm divisions={divisions} player={player} schools={schools} />
    </div>
  )
}
