import { CreateCoachForm } from '@/components/admin/CreateCoachForm'

export default function NewCoachPage() {
  return (
    <div>
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900">Nuevo usuario</h1>
        <p className="text-sm text-gray-500">Entrenador o administrador</p>
      </div>
      <CreateCoachForm />
    </div>
  )
}
