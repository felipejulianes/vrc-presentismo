import { getBirthdays } from '@/lib/queries/birthdays'
import { BirthdaysView } from '@/components/birthdays/BirthdaysView'

export default async function CumpleanosPage() {
  const { isAdmin, entries } = await getBirthdays()
  return <BirthdaysView isAdmin={isAdmin} entries={entries} />
}
