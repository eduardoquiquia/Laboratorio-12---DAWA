'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import BookForm from '@/app/components/BookForm'
import Field from '@/app/components/Field'
import Modal from '@/app/components/Modal'
import Notice, { useNotice } from '@/app/components/Notice'
import Pagination from '@/app/components/Pagination'
import Spinner from '@/app/components/Spinner'
import { apiRequest, getErrorMessage, useFetch } from '@/app/lib/api'
import type { Author, Book, BookSearchResponse } from '@/app/lib/types'
import { badge, btnSmall, btnSmallDanger, card, input, muted } from '@/app/lib/ui'

const LIMIT = 10
const SEARCH_DELAY = 350

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Fecha de creación' },
  { value: 'title', label: 'Título' },
  { value: 'publishedYear', label: 'Año de publicación' },
] as const

type SortBy = (typeof SORT_OPTIONS)[number]['value']
type Order = 'asc' | 'desc'

export default function BooksPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('createdAt')
  const [order, setOrder] = useState<Order>('desc')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [editing, setEditing] = useState<Book | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { notice, showNotice } = useNotice()

  // Búsqueda en tiempo real: espera a que el usuario deje de escribir
  useEffect(() => {
    const value = searchInput.trim()
    if (value === search) return
    const timer = setTimeout(() => {
      setSearch(value)
      setPage(1)
    }, SEARCH_DELAY)
    return () => clearTimeout(timer)
  }, [searchInput, search])

  // URL del endpoint de búsqueda con los filtros actuales
  const searchUrl = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(LIMIT),
      sortBy,
      order,
    })
    if (search) params.set('search', search)
    if (genre) params.set('genre', genre)
    if (authorName) params.set('authorName', authorName)
    return `/api/books/search?${params.toString()}`
  }, [search, genre, authorName, sortBy, order, page])

  const results = useFetch<BookSearchResponse>(searchUrl, reloadKey)
  const authorsFetch = useFetch<Author[]>('/api/authors', reloadKey)
  const booksFetch = useFetch<Book[]>('/api/books', reloadKey)

  const authors = useMemo(
    () => (authorsFetch.data ?? []).map((author) => ({ id: author.id, name: author.name })),
    [authorsFetch.data]
  )

  // Géneros disponibles obtenidos de los libros registrados
  const genres = useMemo(() => {
    const unique = new Set(
      (booksFetch.data ?? [])
        .map((book) => book.genre?.trim())
        .filter((value): value is string => Boolean(value))
    )
    return [...unique].sort((a, b) => a.localeCompare(b))
  }, [booksFetch.data])

  const refresh = () => setReloadKey((key) => key + 1)
  const closeEdit = useCallback(() => setEditing(null), [])

  const changeFilter = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value)
    setPage(1)
  }

  const handleDelete = async (book: Book) => {
    if (!window.confirm(`¿Eliminar el libro "${book.title}"?\n\nEsta acción no se puede deshacer.`)) {
      return
    }

    setDeletingId(book.id)
    try {
      await apiRequest(`/api/books/${book.id}`, { method: 'DELETE' })
      showNotice('success', `Libro "${book.title}" eliminado correctamente`)
      // Si era el último libro de la página, volver a la anterior
      if (results.data && results.data.data.length === 1 && page > 1) setPage(page - 1)
      refresh()
    } catch (error) {
      showNotice('error', getErrorMessage(error))
    } finally {
      setDeletingId(null)
    }
  }

  const pagination = results.data?.pagination
  const books = results.data?.data ?? []
  const total = pagination?.total ?? 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Libros</h1>
        <p className={`mt-1 ${muted}`}>Busca, filtra y administra los libros de la biblioteca.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr] lg:items-start">
        {/* Crear libro */}
        <section className={card}>
          <h2 className="mb-4 text-lg font-semibold">Nuevo libro</h2>
          <BookForm
            authors={authors}
            genres={genres}
            onSaved={(book) => {
              showNotice('success', `Libro "${book.title}" creado correctamente`)
              refresh()
            }}
          />
        </section>

        <section className="space-y-4">
          {/* Búsqueda y filtros */}
          <div className={`${card} space-y-4`}>
            <div className="relative">
              <label htmlFor="book-search" className="sr-only">
                Buscar por título
              </label>
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              >
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.45 4.39l3.08 3.08a.75.75 0 1 1-1.06 1.06l-3.08-3.08A7 7 0 0 1 2 9Z"
                  clipRule="evenodd"
                />
              </svg>
              <input
                id="book-search"
                type="search"
                className={`${input} pl-9`}
                placeholder="Buscar por título…"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Género" htmlFor="filter-genre">
                <select
                  id="filter-genre"
                  className={input}
                  value={genre}
                  onChange={(event) => changeFilter(setGenre)(event.target.value)}
                >
                  <option value="">Todos los géneros</option>
                  {genres.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Autor" htmlFor="filter-author">
                <select
                  id="filter-author"
                  className={input}
                  value={authorName}
                  onChange={(event) => changeFilter(setAuthorName)(event.target.value)}
                >
                  <option value="">Todos los autores</option>
                  {authors.map((author) => (
                    <option key={author.id} value={author.name}>
                      {author.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Ordenar por" htmlFor="filter-sort">
                <select
                  id="filter-sort"
                  className={input}
                  value={sortBy}
                  onChange={(event) => changeFilter(setSortBy)(event.target.value as SortBy)}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Orden" htmlFor="filter-order">
                <select
                  id="filter-order"
                  className={input}
                  value={order}
                  onChange={(event) => changeFilter(setOrder)(event.target.value as Order)}
                >
                  <option value="desc">Descendente</option>
                  <option value="asc">Ascendente</option>
                </select>
              </Field>
            </div>
          </div>

          {/* Resultados */}
          <div className={card}>
            <div className="mb-4 flex min-h-6 flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium" aria-live="polite">
                {pagination
                  ? `${total} resultado${total === 1 ? '' : 's'} encontrado${total === 1 ? '' : 's'}`
                  : ' '}
              </p>
              {results.loading && <Spinner label="Buscando…" />}
            </div>

            {results.error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                {results.error}
              </p>
            )}

            {!results.data && results.loading && (
              <div className="py-10 text-center">
                <Spinner label="Cargando libros…" />
              </div>
            )}

            {results.data && books.length === 0 && (
              <p className={`py-10 text-center ${muted}`}>
                No se encontraron libros con los filtros seleccionados.
              </p>
            )}

            {books.length > 0 && (
              <ul
                className={`divide-y divide-black/[.08] transition-opacity dark:divide-white/[.145] ${
                  results.loading ? 'opacity-50' : ''
                }`}
              >
                {books.map((book) => (
                  <li
                    key={book.id}
                    className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium">{book.title}</p>
                      {book.author && (
                        <p className={`text-sm ${muted}`}>
                          por{' '}
                          <Link href={`/authors/${book.author.id}`} className="hover:underline">
                            {book.author.name}
                          </Link>
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {book.genre && <span className={badge}>{book.genre}</span>}
                        <span className={badge}>{book.publishedYear ?? 'Año —'}</span>
                        <span className={badge}>
                          {book.pages !== null ? `${book.pages} págs.` : 'Págs. —'}
                        </span>
                        {book.isbn && <span className={badge}>ISBN {book.isbn}</span>}
                      </div>
                      {book.description && (
                        <p className={`line-clamp-2 pt-1 text-sm ${muted}`}>{book.description}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button type="button" className={btnSmall} onClick={() => setEditing(book)}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className={btnSmallDanger}
                        onClick={() => handleDelete(book)}
                        disabled={deletingId === book.id}
                      >
                        {deletingId === book.id ? 'Eliminando…' : 'Eliminar'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {pagination && pagination.totalPages > 1 && (
              <div className="mt-6 space-y-2 border-t border-black/[.08] pt-4 dark:border-white/[.145]">
                <Pagination
                  pagination={pagination}
                  disabled={results.loading}
                  onPageChange={setPage}
                />
                <p className={`text-center text-xs ${muted}`}>
                  Página {pagination.page} de {pagination.totalPages}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {editing && (
        <Modal title="Editar libro" onClose={closeEdit}>
          <BookForm
            book={editing}
            authors={authors}
            genres={genres}
            onCancel={closeEdit}
            onSaved={(book) => {
              setEditing(null)
              showNotice('success', `Libro "${book.title}" actualizado correctamente`)
              refresh()
            }}
          />
        </Modal>
      )}

      <Notice notice={notice} />
    </div>
  )
}
