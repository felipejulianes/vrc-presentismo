import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStatsByYear, getStatsByDays, getStatsSinceAlta } from '@/lib/queries/stats'
import { StatsView } from '@/components/stats/StatsView'

interface PageProps {
  params: { divisionId: string }
}

export default async function StatsDivisionPage({ params }: PageProps) {
  const { divisionId } = params
  const supabase = await createClient()

  const { data: division } = await supabase
    .from('divisions')
    .select('id, name')
    .eq('id', divisionId)
    .single()

  if (!division) notFound()

  const currentYear = new Date().getFullYear()

  const [statsByYear, statsByDays, statsSinceAlta] = await Promise.all([
    getStatsByYear(divisionId, currentYear),
    getStatsByDays(divisionId, 60),
    getStatsSinceAlta(divisionId),
  ])

  return (
    <StatsView
      divisionName={division.name}
      statsByYear={statsByYear}
      statsByDays={statsByDays}
      statsSinceAlta={statsSinceAlta}
      currentYear={currentYear}
    />
  )
}
