'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import AuthorForm from '@/app/components/AuthorForm'
import Modal from '@/app/components/Modal'
import Notice, { useNotice } from '@/app/components/Notice'
import Spinner from '@/app/components/Spinner'
import { apiRequest, getErrorMessage, useFetch } from '@/app/lib/api'
import type { Author } from '@/app/lib/types'
import { badge, btnPrimary, btnSmall, btnSmallDanger, card, muted } from '@/app/lib/ui'

export default function Home() {
  const [reloadKey, setReloadKey] = useState(0)
  const [editing, setEditing] = useState<Author | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { notice, showNotice } = useNotice()

  const { data: authors, error, loading } = useFetch<Author[]>('/api/authors', reloadKey)
  const refresh = () => setReloadKey((key) => key + 1)
  const closeEdit = useCallback(() => setEditing(null), [])

  // Estadísticas generales calculadas con los datos de GET /api/authors
  const stats = useMemo(() => {
    const list = authors ?? []
    const books = list.flatMap((author) => author.books ?? [])
    const booksWithPages = books.filter((book) => book.pages !== null)
    const genres = new Set(
      books.map((book) => book.genre?.trim()).filter((genre): genre is string => Boolean(genre))
    )
    return {
      totalAuthors: list.length,
      totalBooks: books.length,
      totalGenres: genres.size,
      averagePages:
        booksWithPages.length > 0
          ? Math.round(
              booksWithPages.reduce((sum, book) => sum + (book.pages ?? 0), 0) /
                booksWithPages.length
            )
          : null,
    }
  }, [authors])

  const handleDelete = async (author: Author) => {
    const totalBooks = author._count?.books ?? author.books?.length ?? 0
    const warning =
      totalBooks > 0
        ? `\n\nTambién se eliminará${totalBooks === 1 ? ' su libro' : `n sus ${totalBooks} libros`}.`
        : ''
    if (!window.confirm(`¿Eliminar al autor "${author.name}"?${warning}\n\nEsta acción no se puede deshacer.`)) {
      return
    }

    setDeletingId(author.id)
    try {
      await apiRequest(`/api/authors/${author.id}`, { method: 'DELETE' })
      showNotice('success', `Autor "${author.name}" eliminado correctamente`)
      refresh()
    } catch (err) {
      showNotice('error', getErrorMessage(err))
    } finally {
      setDeletingId(null)
    }
  }

  const statCards = [
    { label: 'Autores', value: stats.totalAuthors },
    { label: 'Libros', value: stats.totalBooks },
    { label: 'Géneros', value: stats.totalGenres },
    { label: 'Promedio de páginas', value: stats.averagePages ?? '—' },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className={`mt-1 ${muted}`}>Administra los autores de la biblioteca.</p>
        </div>
        <Link href="/books" className={btnPrimary}>
          Buscar libros
        </Link>
      </div>

      {/* Estadísticas generales */}
      <section aria-label="Estadísticas generales" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.label} className={card}>
            <p className={`text-sm ${muted}`}>{stat.label}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">
              {authors === null && loading ? '…' : stat.value}
            </p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr] lg:items-start">
        {/* Crear autor */}
        <section className={card}>
          <h2 className="mb-4 text-lg font-semibold">Nuevo autor</h2>
          <AuthorForm
            onSaved={(author) => {
              showNotice('success', `Autor "${author.name}" creado correctamente`)
              refresh()
            }}
          />
        </section>

        {/* Listado de autores */}
        <section className={card}>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Autores</h2>
            {loading && authors !== null && <Spinner label="Actualizando…" />}
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}

          {authors === null && loading && (
            <div className="py-10 text-center">
              <Spinner label="Cargando autores…" />
            </div>
          )}

          {authors && authors.length === 0 && (
            <p className={`py-10 text-center ${muted}`}>
              Aún no hay autores. Crea el primero con el formulario.
            </p>
          )}

          {authors && authors.length > 0 && (
            <ul className="divide-y divide-black/[.08] dark:divide-white/[.145]">
              {authors.map((author) => {
                const totalBooks = author._count?.books ?? author.books?.length ?? 0
                return (
                  <li
                    key={author.id}
                    className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/authors/${author.id}`}
                          className="font-medium hover:underline"
                        >
                          {author.name}
                        </Link>
                        <span className={badge}>
                          {totalBooks} libro{totalBooks === 1 ? '' : 's'}
                        </span>
                      </div>
                      <p className={`truncate text-sm ${muted}`}>{author.email}</p>
                      {(author.nationality || author.birthYear) && (
                        <p className={`text-xs ${muted}`}>
                          {[author.nationality, author.birthYear && `Año de nacimiento: ${author.birthYear}`]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Link href={`/authors/${author.id}`} className={btnSmall}>
                        Ver libros
                      </Link>
                      <button type="button" className={btnSmall} onClick={() => setEditing(author)}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className={btnSmallDanger}
                        onClick={() => handleDelete(author)}
                        disabled={deletingId === author.id}
                      >
                        {deletingId === author.id ? 'Eliminando…' : 'Eliminar'}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      {editing && (
        <Modal title="Editar autor" onClose={closeEdit}>
          <AuthorForm
            author={editing}
            onCancel={closeEdit}
            onSaved={(author) => {
              setEditing(null)
              showNotice('success', `Autor "${author.name}" actualizado correctamente`)
              refresh()
            }}
          />
        </Modal>
      )}

      <Notice notice={notice} />
    </div>
  )
}
