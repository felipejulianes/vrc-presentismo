import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPlayersBySchool, getVisitsBySchool } from '@/lib/queries/schoolVisits'
import { SchoolDetailView } from '@/components/tutoras/SchoolDetailView'

interface PageProps {
  params: { schoolId: string }
}

export default async function SchoolDetailPage({ params }: PageProps) {
  const supabase = await createClient()

  const [{ data: school }, players, visits, { data: divisions }] = await Promise.all([
    supabase.from('schools').select('id, name').eq('id', params.schoolId).single(),
    getPlayersBySchool(params.schoolId),
    getVisitsBySchool(params.schoolId),
    supabase.from('divisions').select('id, name, sort_order').eq('is_juvenile', false).order('sort_order'),
  ])

  if (!school) notFound()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/tutoras/schools" className="p-1 text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{school.name}</h1>
          <p className="text-sm text-gray-500">{players.length} jugadores activos</p>
        </div>
      </div>

      <SchoolDetailView
        schoolId={params.schoolId}
        schoolName={school.name}
        players={players}
        visits={visits}
        divisions={divisions ?? []}
      />
    </div>
  )
}
