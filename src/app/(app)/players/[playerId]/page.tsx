import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getPlayerById, getDivisionsForUser } from '@/lib/queries/players'
import { getStatsByYear } from '@/lib/queries/stats'
import { getSchools } from '@/lib/queries/schools'
import { formatWhatsAppNumber } from '@/lib/utils/whatsapp'
import { createClient } from '@/lib/supabase/server'
import { FollowupLog } from '@/components/players/FollowupLog'
import { PlayerNotes } from '@/components/players/PlayerNotes'
import { PlayerInterviews } from '@/components/players/PlayerInterviews'
import { getInterviewsForPlayer } from '@/lib/queries/interviews'

interface PageProps {
  params: { playerId: string }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function AttendanceBar({ pct }: { pct: number | null }) {
  const value = pct ?? 0
  const color = value >= 75 ? 'bg-green-500' : value >= 50 ? 'bg-yellow-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-sm font-semibold text-gray-700 w-10 text-right">{value}%</span>
    </div>
  )
}

export default async function PlayerDetailPage({ params }: PageProps) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id ?? '')
    .single()

  const [player, divisions] = await Promise.all([
    getPlayerById(params.playerId),
    getDivisionsForUser(),
  ])

  if (!player) notFound()

  const division = divisions.find(d => d.id === player.division_id)
  const currentYear = new Date().getFullYear()
  const currentUserRole = (profileData?.role ?? 'coach') as 'admin' | 'tutora' | 'coach'
  const showInterviews = currentUserRole === 'admin' || currentUserRole === 'tutora'

  const [statsData, { data: followupsData }, { data: notesData }, interviewsData, schools] = await Promise.all([
    getStatsByYear(player.division_id, currentYear).catch(() => []),
    supabase
      .from('player_followups')
      .select('id, contact_date, contact_type, notes, created_by')
      .eq('player_id', params.playerId)
      .order('contact_date', { ascending: false }),
    supabase
      .from('player_notes')
      .select('id, note_date, content, created_by')
      .eq('player_id', params.playerId)
      .order('note_date', { ascending: false }),
    showInterviews ? getInterviewsForPlayer(params.playerId) : Promise.resolve([]),
    showInterviews ? getSchools() : Promise.resolve([]),
  ])

  const stats = (statsData as Awaited<ReturnType<typeof getStatsByYear>>).find(s => s.player_id === player.id) ?? null
  const currentUserId = user?.id ?? ''

  const waUrl = player.parent_phone
    ? `https://wa.me/${formatWhatsAppNumber(player.parent_phone)}?text=${encodeURIComponent(`Hola, soy el entrenador de ${player.first_name}`)}`
    : null
  const telUrl = player.parent_phone ? `tel:${player.parent_phone}` : null

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <Link href="/players" className="p-1 text-gray-500">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-gray-900 flex-1">
          {player.last_name}, {player.first_name}
        </h1>
        <Link
          href={`/players/${player.id}/edit`}
          className="p-2 text-gray-500 hover:text-green-700"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </Link>
      </div>

      {/* Foto grande + info básica */}
      <div className="px-4 pb-4">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-4 p-4">
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
              {player.photo_url ? (
                <Image
                  src={player.photo_url}
                  alt={`${player.first_name} ${player.last_name}`}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-400">
                  {player.first_name[0]}{player.last_name[0]}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-gray-900">
                {player.first_name} {player.last_name}
              </p>
              {player.sobrenombre && (
                <p className="text-sm text-gray-500 italic">&quot;{player.sobrenombre}&quot;</p>
              )}
              <div className="mt-1 flex flex-wrap gap-1.5">
                {division && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
                    {division.name}
                  </span>
                )}
                {player.inactivo && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                    Inactivo
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Estadística del año */}
          {stats && (
            <div className="border-t border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-500 mb-1.5">Asistencia {currentYear}</p>
              <AttendanceBar pct={stats.attendance_pct} />
              <p className="text-xs text-gray-400 mt-1">
                {stats.sessions_present} de {stats.total_sessions} entrenamientos
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Datos personales */}
      <div className="px-4 pb-4">
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {[
            { label: 'DNI', value: player.dni },
            { label: 'Fecha de nacimiento', value: formatDate(player.birth_date) },
            { label: 'Fecha de alta', value: formatDate(player.fecha_alta) },
            { label: 'Colegio', value: player.colegio },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center px-4 py-3 gap-4">
              <span className="text-sm text-gray-500 w-36 flex-shrink-0">{label}</span>
              <span className="text-sm text-gray-900">{value ?? '—'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Contacto referente */}
      <div className="px-4 pb-4">
        <h2 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">Contacto</h2>
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          <div className="flex items-center px-4 py-3 gap-4">
            <span className="text-sm text-gray-500 w-36 flex-shrink-0">Referente</span>
            <span className="text-sm text-gray-900">{player.parent_name ?? '—'}</span>
          </div>
          <div className="flex items-center px-4 py-3 gap-4">
            <span className="text-sm text-gray-500 w-36 flex-shrink-0">Teléfono</span>
            <span className="text-sm text-gray-900 flex-1">{player.parent_phone ?? '—'}</span>
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>
            )}
            {telUrl && (
              <a
                href={telUrl}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Dirección */}
      {player.maps_url && (
        <div className="px-4 pb-4">
          <h2 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">Dirección</h2>
          <div className="bg-white rounded-2xl border border-gray-200">
            <a
              href={player.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
            >
              <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 leading-snug">{player.address}</p>
              </div>
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      )}

      {/* Seguimiento de ausentes */}
      <FollowupLog
        playerId={params.playerId}
        followups={followupsData ?? []}
        currentUserId={currentUserId}
      />

      {/* Bitácora del entrenador */}
      <PlayerNotes
        playerId={params.playerId}
        notes={notesData ?? []}
        currentUserId={currentUserId}
      />

      {/* Entrevistas — solo tutoras y admins */}
      {showInterviews && (
        <PlayerInterviews
          playerId={params.playerId}
          interviews={interviewsData}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          playerColegio={player.colegio}
          playerGrado={player.grado}
          schools={schools}
        />
      )}
    </div>
  )
}
