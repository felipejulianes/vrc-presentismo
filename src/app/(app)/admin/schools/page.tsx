import { getSchoolsWithCount } from '@/lib/queries/schools'
import { SchoolsManager } from '@/components/admin/SchoolsManager'
import Link from 'next/link'

export default async function SchoolsPage() {
  const schools = await getSchoolsWithCount()

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/admin" className="p-1 text-gray-500">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Colegios</h1>
          <p className="text-sm text-gray-500">{schools.filter(s => s.active).length} activos</p>
        </div>
      </div>

      <SchoolsManager schools={schools} />
    </div>
  )
}
