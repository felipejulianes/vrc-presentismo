'use client'

type CellValue = 'E' | 'L' | 'V'

interface Props {
  divisions: { id: string; name: string }[]
  dates: string[]
  todayISO: string
  cells: Record<string, Record<string, CellValue>>
  locations: Record<string, Record<string, string>>
  counts: Record<string, {
    ePast: number
    eFuture: number
    lPast: number
    lFuture: number
    vPast: number
    vFuture: number
  }>
}

function formatDateShort(iso: string): string {
  const [y, m, d] = iso.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d))
    .toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

export function FixtureTable({ divisions, dates, todayISO, cells, locations, counts }: Props) {
  function downloadCSV() {
    const headers = [
      'División',
      'E pasados',
      'E próximos',
      'L pasados',
      'L próximos',
      'V pasados',
      'V próximos',
      ...dates.map(formatDateShort),
    ]
    const rows = divisions.map(div => {
      const c = counts[div.id] ?? { ePast: 0, eFuture: 0, lPast: 0, lFuture: 0, vPast: 0, vFuture: 0 }
      return [
        div.name,
        c.ePast,
        c.eFuture,
        c.lPast,
        c.lFuture,
        c.vPast,
        c.vFuture,
        ...dates.map(d => cells[div.id]?.[d] ?? ''),
      ]
    })
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fixture-${new Date().getFullYear()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="px-4 pt-3">
      {/* Download button */}
      <div className="flex justify-end mb-2">
        <button
          onClick={downloadCSV}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 active:bg-gray-100"
        >
          ⬇ Descargar Excel
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="text-xs whitespace-nowrap border-collapse">
          <thead>
            <tr className="bg-gray-50">
              {/* Division header */}
              <th className="sticky left-0 bg-gray-50 z-10 text-left px-2 py-2 text-gray-700 font-semibold border border-gray-200">
                División
              </th>
              {/* E/L/V count headers */}
              <th className="px-2 py-2 text-center font-semibold text-gray-700 bg-green-100 border border-gray-200">E</th>
              <th className="px-2 py-2 text-center font-semibold text-gray-700 bg-blue-100 border border-gray-200">L</th>
              <th className="px-2 py-2 text-center font-semibold text-gray-700 bg-orange-100 border border-gray-200">V</th>
              {/* Date headers */}
              {dates.map(d => {
                const isToday = d === todayISO
                return (
                  <th
                    key={d}
                    className={`px-2 py-2 text-center font-medium border border-gray-200 ${isToday ? 'text-red-600 bg-red-50' : 'text-gray-600'}`}
                  >
                    {formatDateShort(d)}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {divisions.map(div => {
              const c = counts[div.id] ?? { ePast: 0, eFuture: 0, lPast: 0, lFuture: 0, vPast: 0, vFuture: 0 }
              return (
                <tr key={div.id} className="hover:bg-gray-50">
                  {/* Division name */}
                  <td className="sticky left-0 bg-white z-10 font-semibold text-gray-800 px-2 py-2 border border-gray-200">
                    {div.name}
                  </td>
                  {/* E count */}
                  <td className="px-2 py-2 text-center border border-gray-200 bg-green-50">
                    <span className="text-gray-900">{c.ePast}</span>
                    <span className="text-gray-400">/{c.eFuture}</span>
                  </td>
                  {/* L count */}
                  <td className="px-2 py-2 text-center border border-gray-200 bg-blue-50">
                    <span className="text-gray-900">{c.lPast}</span>
                    <span className="text-gray-400">/{c.lFuture}</span>
                  </td>
                  {/* V count */}
                  <td className="px-2 py-2 text-center border border-gray-200 bg-orange-50">
                    <span className="text-gray-900">{c.vPast}</span>
                    <span className="text-gray-400">/{c.vFuture}</span>
                  </td>
                  {/* Date cells */}
                  {dates.map(d => {
                    const isToday = d === todayISO
                    const val = cells[div.id]?.[d]
                    const loc = locations[div.id]?.[d]
                    return (
                      <td
                        key={d}
                        className={`px-1 py-2 text-center border border-gray-200 ${isToday ? 'bg-red-50' : ''}`}
                      >
                        {val === 'E' && (
                          <span className="bg-green-100 text-green-800 rounded px-1">E</span>
                        )}
                        {val === 'L' && (
                          <span className="bg-blue-100 text-blue-800 rounded px-1">L</span>
                        )}
                        {val === 'V' && (
                          <span className="bg-orange-100 text-orange-800 rounded px-1">
                            V{loc ? ` ${loc.slice(0, 4)}` : ''}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
