import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getStatsByYear,
  getStatsByDays,
  getStatsSinceAlta,
  getSessionTrend,
  getDivisionKpis,
} from '@/lib/queries/stats'
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

  const [kpis, statsByYear, statsByDays, statsSinceAlta, sessionTrend] = await Promise.all([
    getDivisionKpis(divisionId),
    getStatsByYear(divisionId, currentYear),
    getStatsByDays(divisionId, 60),
    getStatsSinceAlta(divisionId),
    getSessionTrend(divisionId, 50),
  ])

  return (
    <StatsView
      divisionName={division.name}
      kpis={kpis}
      statsByYear={statsByYear}
      statsByDays={statsByDays}
      statsSinceAlta={statsSinceAlta}
      sessionTrend={sessionTrend}
      currentYear={currentYear}
    />
  )
}
