'use client'

import { useState, useTransition } from 'react'
import { saveWikiPage, deleteWikiPage } from '@/app/(app)/wiki/actions'
import type { WikiPage } from '@/lib/queries/wiki'

const CATEGORIES: { key: string; label: string; emoji: string }[] = [
  { key: 'reglamento', label: 'Reglamento', emoji: '📋' },
  { key: 'ejercicios', label: 'Ejercicios', emoji: '🏉' },
  { key: 'general', label: 'General', emoji: '📖' },
]

interface Props {
  pages: WikiPage[]
  isAdmin: boolean
}

export function WikiPageList({ pages: initialPages, isAdmin }: Props) {
  const [pages, setPages] = useState(initialPages)
  const [viewing, setViewing] = useState<WikiPage | null>(null)
  const [editing, setEditing] = useState<WikiPage | 'new' | null>(null)
  const [, startTransition] = useTransition()

  function handleSaved(updatedPage: Partial<WikiPage>) {
    if (editing === 'new') {
      // Optimistically add — page will be there after revalidation
      setPages(prev => [...prev, updatedPage as WikiPage])
    } else if (editing) {
      setPages(prev => prev.map(p => p.id === updatedPage.id ? { ...p, ...updatedPage } : p))
    }
    setEditing(null)
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteWikiPage(id)
      setPages(prev => prev.filter(p => p.id !== id))
      setViewing(null)
    })
  }

  // ── View a page ──────────────────────────────────────────
  if (viewing) {
    return (
      <div className="px-4 space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setViewing(null)} className="p-1 text-gray-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="flex-1 text-lg font-bold text-gray-900">{viewing.title}</h2>
          {isAdmin && (
            <button
              onClick={() => setEditing(viewing)}
              className="text-xs text-vrc-green font-semibold px-2 py-1"
            >
              Editar
            </button>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 px-4 py-4">
          {viewing.content ? (
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
              {viewing.content}
            </pre>
          ) : (
            <p className="text-sm text-gray-400 italic">Sin contenido todavía.</p>
          )}
        </div>
        {isAdmin && (
          <button
            onClick={() => { if (confirm('¿Eliminar esta página?')) handleDelete(viewing.id) }}
            className="text-xs text-red-400 hover:text-red-600"
          >
            Eliminar página
          </button>
        )}
      </div>
    )
  }

  // ── Edit / New form ──────────────────────────────────────
  if (editing) {
    const page = editing === 'new' ? null : editing
    return <WikiEditForm page={page} onCancel={() => setEditing(null)} onSaved={handleSaved} />
  }

  // ── List ─────────────────────────────────────────────────
  const categoriesWithPages = CATEGORIES.filter(cat =>
    pages.some(p => p.category === cat.key)
  )
  const uncategorized = pages.filter(p => !CATEGORIES.some(c => c.key === p.category))

  return (
    <div className="px-4 space-y-5">
      {pages.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-sm">No hay páginas todavía.</p>
          {isAdmin && (
            <button onClick={() => setEditing('new')} className="mt-3 text-sm text-vrc-green font-semibold">
              Crear primera página
            </button>
          )}
        </div>
      )}

      {categoriesWithPages.map(cat => (
        <div key={cat.key}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {cat.emoji} {cat.label}
          </p>
          <div className="space-y-2">
            {pages
              .filter(p => p.category === cat.key)
              .map(page => (
                <button
                  key={page.id}
                  onClick={() => setViewing(page)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 active:bg-gray-100"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{page.title}</p>
                    {page.content && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {page.content.slice(0, 80)}...
                      </p>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
          </div>
        </div>
      ))}

      {uncategorized.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">📖 General</p>
          <div className="space-y-2">
            {uncategorized.map(page => (
              <button key={page.id} onClick={() => setViewing(page)}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-left flex items-center gap-3">
                <p className="flex-1 text-sm font-semibold text-gray-800">{page.title}</p>
                <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {isAdmin && pages.length > 0 && (
        <button
          onClick={() => setEditing('new')}
          className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm font-semibold text-gray-400 hover:border-vrc-green hover:text-vrc-green"
        >
          + Nueva página
        </button>
      )}
    </div>
  )
}

// ── Edit form ────────────────────────────────────────────────

function WikiEditForm({
  page,
  onCancel,
  onSaved,
}: {
  page: WikiPage | null
  onCancel: () => void
  onSaved: (p: Partial<WikiPage>) => void
}) {
  const [title, setTitle] = useState(page?.title ?? '')
  const [content, setContent] = useState(page?.content ?? '')
  const [category, setCategory] = useState(page?.category ?? 'reglamento')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError(null)
    const fd = new FormData()
    if (page?.id) fd.append('id', page.id)
    fd.append('title', title)
    fd.append('content', content)
    fd.append('category', category)

    startTransition(async () => {
      const res = await saveWikiPage(fd)
      if (res.error) { setError(res.error); return }
      onSaved({ id: page?.id ?? '', title, content, category, updated_at: new Date().toISOString(), slug: page?.slug ?? '', sort_order: page?.sort_order ?? 0, published: true })
    })
  }

  return (
    <div className="px-4 space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onCancel} className="p-1 text-gray-500">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-bold text-gray-900">{page ? 'Editar página' : 'Nueva página'}</h2>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Título</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Título de la página"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Categoría</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
          >
            {CATEGORIES.map(c => (
              <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Contenido</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Pegá el texto del reglamento aquí..."
            rows={20}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green font-mono"
          />
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={isPending || !title.trim()}
          className="w-full py-3 bg-vrc-green text-white rounded-xl text-sm font-bold disabled:opacity-50"
        >
          {isPending ? 'Guardando...' : 'Guardar página'}
        </button>
      </div>
    </div>
  )
}
