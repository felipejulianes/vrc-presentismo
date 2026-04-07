import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getStatsByYear,
  getStatsByDays,
  getStatsSinceAlta,
  getSessionTrend,
  getDivisionKpis,
  type SessionType,
} from '@/lib/queries/stats'
import { StatsView } from '@/components/stats/StatsView'

interface PageProps {
  params: { divisionId: string }
  searchParams: Promise<{ type?: string }>
}

export default async function StatsDivisionPage({ params, searchParams }: PageProps) {
  const { divisionId } = params
  const { type: rawType } = await searchParams
  const sessionType: SessionType =
    rawType === 'miercoles' || rawType === 'todo' ? rawType : 'sabado'

  const supabase = await createClient()

  const { data: division } = await supabase
    .from('divisions')
    .select('id, name')
    .eq('id', divisionId)
    .single()

  if (!division) notFound()

  const currentYear = new Date().getFullYear()

  const [kpis, statsByYear, statsByDays, statsSinceAlta, sessionTrend] = await Promise.all([
    getDivisionKpis(divisionId, sessionType),
    getStatsByYear(divisionId, currentYear, sessionType),
    getStatsByDays(divisionId, 30, sessionType),
    getStatsSinceAlta(divisionId, sessionType),
    getSessionTrend(divisionId, 50, sessionType),
  ])

  return (
    <StatsView
      divisionId={divisionId}
      divisionName={division.name}
      sessionType={sessionType}
      kpis={kpis}
      statsByYear={statsByYear}
      statsByDays={statsByDays}
      statsSinceAlta={statsSinceAlta}
      sessionTrend={sessionTrend}
      currentYear={currentYear}
    />
  )
}
