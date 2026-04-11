import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface GeocodeResult {
  display_name: string
  lat: number
  lng: number
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q || q.length < 3) return NextResponse.json([])

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('format', 'json')
    url.searchParams.set('q', q)
    url.searchParams.set('countrycodes', 'ar')
    url.searchParams.set('limit', '6')
    url.searchParams.set('addressdetails', '0')

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'VRC-Presentismo/1.0 (virreyes-rugby-club)',
        'Accept-Language': 'es',
        'Referer': 'https://vrc-presentismo.vercel.app',
      },
      // Cache identical queries for 1 hour — same address always returns same results
      next: { revalidate: 3600 },
    })

    if (!res.ok) return NextResponse.json([])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any[] = await res.json()

    const results: GeocodeResult[] = raw.map(r => ({
      display_name: r.display_name as string,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
    }))

    return NextResponse.json(results)
  } catch {
    return NextResponse.json([])
  }
}
