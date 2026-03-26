import { getAllClubsFull } from '@/lib/queries/sabados'
import { ClubsView } from '@/components/clubs/ClubsView'

export default async function ClubsPage() {
  const clubs = await getAllClubsFull()
  const activeClubs = clubs.filter(c => c.active)

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-xl font-bold text-gray-900">Clubes URBA</h1>
        <p className="text-sm text-gray-500">
          {activeClubs.length} clubes · Tocá para ver la sede y dirección
        </p>
      </div>

      <ClubsView clubs={activeClubs} />
    </div>
  )
}
