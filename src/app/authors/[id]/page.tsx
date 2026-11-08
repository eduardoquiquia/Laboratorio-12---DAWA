'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import AuthorForm from '@/app/components/AuthorForm'
import BookForm from '@/app/components/BookForm'
import Modal from '@/app/components/Modal'
import Notice, { useNotice } from '@/app/components/Notice'
import Spinner from '@/app/components/Spinner'
import { useFetch } from '@/app/lib/api'
import type { Author, AuthorBooksResponse, AuthorStats, Book } from '@/app/lib/types'
import { badge, btnPrimary, btnSecondary, card, muted } from '@/app/lib/ui'

function StatItem({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="rounded-xl bg-black/[.03] p-4 dark:bg-white/[.05]">
      <p className={`text-xs ${muted}`}>{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
      {detail && <p className={`mt-0.5 truncate text-xs ${muted}`} title={detail}>{detail}</p>}
    </div>
  )
}

export default function AuthorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [reloadKey, setReloadKey] = useState(0)
  const [editingAuthor, setEditingAuthor] = useState(false)
  const [addingBook, setAddingBook] = useState(false)
  const { notice, showNotice } = useNotice()

  const authorFetch = useFetch<Author>(`/api/authors/${id}`, reloadKey)
  const statsFetch = useFetch<AuthorStats>(`/api/authors/${id}/stats`, reloadKey)
  const booksFetch = useFetch<AuthorBooksResponse>(`/api/authors/${id}/books`, reloadKey)
  const allBooksFetch = useFetch<Book[]>('/api/books', reloadKey)

  const refresh = () => setReloadKey((key) => key + 1)
  const closeAddBook = useCallback(() => setAddingBook(false), [])

  // Géneros existentes como sugerencias para el formulario de libro
  const genres = useMemo(() => {
    const unique = new Set(
      (allBooksFetch.data ?? [])
        .map((book) => book.genre?.trim())
        .filter((value): value is string => Boolean(value))
    )
    return [...unique].sort((a, b) => a.localeCompare(b))
  }, [allBooksFetch.data])

  const author = authorFetch.data
  const stats = statsFetch.data
  const books = booksFetch.data?.books ?? []

  if (authorFetch.status === 404) {
    return (
      <div className={`${card} mx-auto max-w-md text-center`}>
        <h1 className="text-xl font-semibold">Autor no encontrado</h1>
        <p className={`mt-2 text-sm ${muted}`}>El autor que buscas no existe o fue eliminado.</p>
        <Link href="/" className={`${btnPrimary} mt-6`}>
          Volver al dashboard
        </Link>
      </div>
    )
  }

  if (!author) {
    return (
      <div className="py-20 text-center">
        {authorFetch.error ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {authorFetch.error}
          </p>
        ) : (
          <Spinner label="Cargando autor…" />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/" className={`text-sm ${muted} hover:underline`}>
            ← Volver al dashboard
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{author.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btnSecondary}
            onClick={() => setEditingAuthor((value) => !value)}
          >
            {editingAuthor ? 'Cancelar edición' : 'Editar autor'}
          </button>
          <button type="button" className={btnPrimary} onClick={() => setAddingBook(true)}>
            + Agregar libro
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr] lg:items-start">
        {/* Información del autor / formulario de edición */}
        <section className={card}>
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">
              {editingAuthor ? 'Editar información' : 'Información del autor'}
            </h2>
            {authorFetch.loading && <Spinner label="" />}
          </div>

          {editingAuthor ? (
            <AuthorForm
              key={author.updatedAt}
              author={author}
              onCancel={() => setEditingAuthor(false)}
              onSaved={(saved) => {
                setEditingAuthor(false)
                showNotice('success', `Autor "${saved.name}" actualizado correctamente`)
                refresh()
              }}
            />
          ) : (
            <dl className="space-y-3 text-sm">
              {[
                ['Nombre', author.name],
                ['Email', author.email],
                ['Nacionalidad', author.nationality],
                ['Año de nacimiento', author.birthYear],
                ['Biografía', author.bio],
                ['Registrado el', new Date(author.createdAt).toLocaleDateString('es-PE')],
                ['Última actualización', new Date(author.updatedAt).toLocaleDateString('es-PE')],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <dt className={`text-xs ${muted}`}>{label}</dt>
                  <dd className="mt-0.5 break-words">{value ?? '—'}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        <div className="space-y-6">
          {/* Estadísticas obtenidas de /api/authors/[id]/stats */}
          <section className={card}>
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Estadísticas</h2>
              {statsFetch.loading && <Spinner label="" />}
            </div>

            {statsFetch.error && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {statsFetch.error}
              </p>
            )}

            {stats && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <StatItem label="Total de libros" value={stats.totalBooks} />
                  <StatItem
                    label="Primer libro"
                    value={stats.firstBook?.year ?? '—'}
                    detail={stats.firstBook?.title}
                  />
                  <StatItem
                    label="Último libro"
                    value={stats.latestBook?.year ?? '—'}
                    detail={stats.latestBook?.title}
                  />
                  <StatItem label="Promedio de páginas" value={stats.averagePages ?? '—'} />
                  <StatItem
                    label="Libro más largo"
                    value={stats.longestBook ? `${stats.longestBook.pages} págs.` : '—'}
                    detail={stats.longestBook?.title}
                  />
                  <StatItem
                    label="Libro más corto"
                    value={stats.shortestBook ? `${stats.shortestBook.pages} págs.` : '—'}
                    detail={stats.shortestBook?.title}
                  />
                </div>
                <div>
                  <p className={`mb-2 text-xs ${muted}`}>Géneros</p>
                  {stats.genres.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {stats.genres.map((genre) => (
                        <span key={genre} className={badge}>
                          {genre}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm">—</p>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Libros del autor */}
          <section className={card}>
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">
                Libros{booksFetch.data ? ` (${booksFetch.data.totalBooks})` : ''}
              </h2>
              {booksFetch.loading && <Spinner label="" />}
            </div>

            {booksFetch.error && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {booksFetch.error}
              </p>
            )}

            {booksFetch.data && books.length === 0 && (
              <div className={`py-8 text-center text-sm ${muted}`}>
                <p>Este autor aún no tiene libros registrados.</p>
                <button type="button" className={`${btnSecondary} mt-4`} onClick={() => setAddingBook(true)}>
                  + Agregar el primero
                </button>
              </div>
            )}

            {books.length > 0 && (
              <ul className="divide-y divide-black/[.08] dark:divide-white/[.145]">
                {books.map((book) => (
                  <li key={book.id} className="space-y-1 py-3 first:pt-0 last:pb-0">
                    <p className="font-medium">{book.title}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {book.genre && <span className={badge}>{book.genre}</span>}
                      <span className={badge}>{book.publishedYear ?? 'Año —'}</span>
                      <span className={badge}>
                        {book.pages !== null ? `${book.pages} págs.` : 'Págs. —'}
                      </span>
                      {book.isbn && <span className={badge}>ISBN {book.isbn}</span>}
                    </div>
                    {book.description && (
                      <p className={`line-clamp-2 text-sm ${muted}`}>{book.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {addingBook && (
        <Modal title={`Nuevo libro de ${author.name}`} onClose={closeAddBook}>
          <BookForm
            fixedAuthor={{ id: author.id, name: author.name }}
            genres={genres}
            onCancel={closeAddBook}
            onSaved={(book) => {
              setAddingBook(false)
              showNotice('success', `Libro "${book.title}" agregado correctamente`)
              refresh()
            }}
          />
        </Modal>
      )}

      <Notice notice={notice} />
    </div>
  )
}
