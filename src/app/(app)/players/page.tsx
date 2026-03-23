import Link from 'next/link'
import { getPlayersForUser, getDivisionsForUser } from '@/lib/queries/players'
import { PlayerList } from '@/components/players/PlayerList'

export default async function PlayersPage() {
  const [players, divisions] = await Promise.all([
    getPlayersForUser(),
    getDivisionsForUser(),
  ])

  return (
    <div>
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Jugadores</h1>
          <p className="text-sm text-gray-500">{players.length} activos</p>
        </div>
        <Link
          href="/players/new"
          className="w-10 h-10 bg-green-700 hover:bg-green-800 text-white rounded-full flex items-center justify-center text-2xl leading-none transition-colors"
          aria-label="Agregar jugador"
        >
          +
        </Link>
      </div>

      <PlayerList players={players} divisions={divisions} />
    </div>
  )
}
