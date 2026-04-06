import { getPlayersForUser, getDivisionsForUser } from '@/lib/queries/players'
import { TutorasPlayersTable } from '@/components/tutoras/TutorasPlayersTable'

export default async function TutorasPlayersPage() {
  const [players, divisions] = await Promise.all([
    getPlayersForUser(),
    getDivisionsForUser(),
  ])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Jugadores</h1>
        <p className="text-sm text-gray-500 mt-1">{players.length} jugadores activos</p>
      </div>

      <TutorasPlayersTable players={players} divisions={divisions} />
    </div>
  )
}
