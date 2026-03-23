'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { DocType } from '@/lib/docs/constants'

export async function receiveDocuments(playerId: string, docTypes: DocType[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  if (docTypes.length === 0) return { error: 'Seleccioná al menos un documento' }

  const rows = docTypes.map(doc_type => ({
    player_id: playerId,
    doc_type,
    received_by: user.id,
  }))

  const { error } = await supabase
    .from('player_documents')
    .upsert(rows, { onConflict: 'player_id,doc_type', ignoreDuplicates: true })

  if (error) return { error: error.message }

  revalidatePath('/docs')
  return { success: true }
}

export async function removeDocument(playerId: string, docType: DocType) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('player_documents')
    .delete()
    .eq('player_id', playerId)
    .eq('doc_type', docType)

  if (error) return { error: error.message }

  revalidatePath('/docs')
  return { success: true }
}
