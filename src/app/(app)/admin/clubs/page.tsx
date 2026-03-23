import Link from 'next/link'
import { getAllOpponentClubs } from '@/lib/queries/sabados'
import { ClubsManager } from '@/components/admin/ClubsManager'

export default async function ClubsPage() {
  const clubs = await getAllOpponentClubs()

  return (
    <div className="pb-8">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2">
        <Link href="/admin" className="p-1 text-gray-500">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Clubes rivales</h1>
          <p className="text-sm text-gray-500">{clubs.filter(c => c.active).length} activos</p>
        </div>
      </div>

      <div className="px-4">
        <ClubsManager initialClubs={clubs} />
      </div>
    </div>
  )
}
