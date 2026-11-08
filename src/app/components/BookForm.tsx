'use client'

import Link from 'next/link'
import { useId, useState, type FormEvent } from 'react'
import Field from '@/app/components/Field'
import { apiRequest, getErrorMessage } from '@/app/lib/api'
import type { Book } from '@/app/lib/types'
import { btnPrimary, btnSecondary, input, inputError, textarea } from '@/app/lib/ui'

interface AuthorOption {
  id: string
  name: string
}

interface BookFormProps {
  /** Si se envía, el formulario edita este libro; si no, crea uno nuevo */
  book?: Book
  /** Autores disponibles para el selector */
  authors?: AuthorOption[]
  /** Autor fijo (por ejemplo, desde la página de detalle del autor) */
  fixedAuthor?: AuthorOption
  /** Géneros existentes, usados como sugerencias */
  genres?: string[]
  onSaved: (book: Book) => void
  onCancel?: () => void
}

interface Values {
  title: string
  authorId: string
  genre: string
  publishedYear: string
  pages: string
  isbn: string
  description: string
}

type Errors = Partial<Record<keyof Values, string>>

function toValues(book?: Book, fixedAuthor?: AuthorOption): Values {
  return {
    title: book?.title ?? '',
    authorId: book?.authorId ?? fixedAuthor?.id ?? '',
    genre: book?.genre ?? '',
    publishedYear: book?.publishedYear != null ? String(book.publishedYear) : '',
    pages: book?.pages != null ? String(book.pages) : '',
    isbn: book?.isbn ?? '',
    description: book?.description ?? '',
  }
}

function validate(values: Values): Errors {
  const errors: Errors = {}
  const currentYear = new Date().getFullYear()

  if (values.title.trim().length < 3) errors.title = 'El título debe tener al menos 3 caracteres'
  if (!values.authorId) errors.authorId = 'Selecciona un autor'

  const year = values.publishedYear.trim()
  if (year && (!/^\d+$/.test(year) || Number(year) < 1 || Number(year) > currentYear)) {
    errors.publishedYear = `Ingresa un año entre 1 y ${currentYear}`
  }

  const pages = values.pages.trim()
  if (pages && (!/^\d+$/.test(pages) || Number(pages) < 1)) {
    errors.pages = 'Ingresa un número entero mayor a 0'
  }

  return errors
}

export default function BookForm({
  book,
  authors = [],
  fixedAuthor,
  genres = [],
  onSaved,
  onCancel,
}: BookFormProps) {
  const id = useId()
  const [values, setValues] = useState<Values>(() => toValues(book, fixedAuthor))
  const [errors, setErrors] = useState<Errors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(book)

  const update = (field: keyof Values, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setServerError(null)

    const validation = validate(values)
    setErrors(validation)
    if (Object.keys(validation).length > 0) return

    const payload = {
      title: values.title.trim(),
      authorId: values.authorId,
      genre: values.genre.trim() || null,
      publishedYear: values.publishedYear.trim() ? Number(values.publishedYear) : null,
      pages: values.pages.trim() ? Number(values.pages) : null,
      isbn: values.isbn.trim() || null,
      description: values.description.trim() || null,
    }

    setSaving(true)
    try {
      const saved = await apiRequest<Book>(isEdit ? `/api/books/${book!.id}` : '/api/books', {
        method: isEdit ? 'PUT' : 'POST',
        body: payload,
      })
      if (!isEdit) setValues(toValues(undefined, fixedAuthor))
      onSaved(saved)
    } catch (error) {
      setServerError(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const noAuthors = !fixedAuthor && authors.length === 0

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Field label="Título" htmlFor={`${id}-title`} error={errors.title} required>
        <input
          id={`${id}-title`}
          className={`${input} ${errors.title ? inputError : ''}`}
          value={values.title}
          onChange={(event) => update('title', event.target.value)}
          placeholder="Ej. Cien años de soledad"
          aria-invalid={Boolean(errors.title)}
        />
      </Field>

      <Field label="Autor" htmlFor={`${id}-author`} error={errors.authorId} required>
        {fixedAuthor ? (
          <input id={`${id}-author`} className={`${input} opacity-70`} value={fixedAuthor.name} disabled />
        ) : (
          <select
            id={`${id}-author`}
            className={`${input} ${errors.authorId ? inputError : ''}`}
            value={values.authorId}
            onChange={(event) => update('authorId', event.target.value)}
            aria-invalid={Boolean(errors.authorId)}
          >
            <option value="">Selecciona un autor</option>
            {authors.map((author) => (
              <option key={author.id} value={author.id}>
                {author.name}
              </option>
            ))}
          </select>
        )}
        {noAuthors && (
          <p className="mt-1 text-xs text-zinc-500">
            No hay autores registrados.{' '}
            <Link href="/" className="font-medium underline">
              Crea uno en el dashboard
            </Link>
            .
          </p>
        )}
      </Field>

      <Field label="Género" htmlFor={`${id}-genre`}>
        <input
          id={`${id}-genre`}
          className={input}
          value={values.genre}
          onChange={(event) => update('genre', event.target.value)}
          list={`${id}-genres`}
          placeholder="Ej. Novela"
        />
        <datalist id={`${id}-genres`}>
          {genres.map((genre) => (
            <option key={genre} value={genre} />
          ))}
        </datalist>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Año" htmlFor={`${id}-year`} error={errors.publishedYear}>
          <input
            id={`${id}-year`}
            type="number"
            inputMode="numeric"
            className={`${input} ${errors.publishedYear ? inputError : ''}`}
            value={values.publishedYear}
            onChange={(event) => update('publishedYear', event.target.value)}
            placeholder="Ej. 1967"
            aria-invalid={Boolean(errors.publishedYear)}
          />
        </Field>

        <Field label="Páginas" htmlFor={`${id}-pages`} error={errors.pages}>
          <input
            id={`${id}-pages`}
            type="number"
            inputMode="numeric"
            className={`${input} ${errors.pages ? inputError : ''}`}
            value={values.pages}
            onChange={(event) => update('pages', event.target.value)}
            placeholder="Ej. 417"
            aria-invalid={Boolean(errors.pages)}
          />
        </Field>
      </div>

      <Field label="ISBN" htmlFor={`${id}-isbn`}>
        <input
          id={`${id}-isbn`}
          className={input}
          value={values.isbn}
          onChange={(event) => update('isbn', event.target.value)}
          placeholder="Ej. 978-0307474728"
        />
      </Field>

      <Field label="Descripción" htmlFor={`${id}-description`}>
        <textarea
          id={`${id}-description`}
          className={textarea}
          value={values.description}
          onChange={(event) => update('description', event.target.value)}
          placeholder="Breve descripción del libro"
        />
      </Field>

      {serverError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {serverError}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && (
          <button type="button" className={btnSecondary} onClick={onCancel} disabled={saving}>
            Cancelar
          </button>
        )}
        <button type="submit" className={btnPrimary} disabled={saving || noAuthors}>
          {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear libro'}
        </button>
      </div>
    </form>
  )
}
