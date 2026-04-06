import { createClient } from '@/lib/supabase/server'
import { getAllInterviewsForTutoras } from '@/lib/queries/interviews'
import { getPlayersForUser } from '@/lib/queries/players'
import { getSchools } from '@/lib/queries/schools'
import { TutorasInterviewsView } from '@/components/tutoras/TutorasInterviewsView'

export default async function TutorasInterviewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [interviews, players, schools] = await Promise.all([
    getAllInterviewsForTutoras(),
    getPlayersForUser(),
    getSchools(),
  ])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Entrevistas</h1>
        <p className="text-sm text-gray-500 mt-1">{interviews.length} entrevistas registradas</p>
      </div>

      <TutorasInterviewsView
        interviews={interviews}
        players={players}
        schools={schools}
        currentUserId={user?.id ?? ''}
      />
    </div>
  )
}
