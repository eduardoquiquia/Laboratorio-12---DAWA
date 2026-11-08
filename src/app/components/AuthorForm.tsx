'use client'

import { useId, useState, type FormEvent } from 'react'
import Field from '@/app/components/Field'
import { apiRequest, getErrorMessage } from '@/app/lib/api'
import type { Author } from '@/app/lib/types'
import { btnPrimary, btnSecondary, input, inputError, textarea } from '@/app/lib/ui'

interface AuthorFormProps {
  /** Si se envía, el formulario edita este autor; si no, crea uno nuevo */
  author?: Author
  onSaved: (author: Author) => void
  onCancel?: () => void
}

interface Values {
  name: string
  email: string
  nationality: string
  birthYear: string
  bio: string
}

type Errors = Partial<Record<keyof Values, string>>

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function toValues(author?: Author): Values {
  return {
    name: author?.name ?? '',
    email: author?.email ?? '',
    nationality: author?.nationality ?? '',
    birthYear: author?.birthYear != null ? String(author.birthYear) : '',
    bio: author?.bio ?? '',
  }
}

function validate(values: Values): Errors {
  const errors: Errors = {}
  const currentYear = new Date().getFullYear()

  if (!values.name.trim()) errors.name = 'El nombre es obligatorio'

  if (!values.email.trim()) errors.email = 'El email es obligatorio'
  else if (!EMAIL_REGEX.test(values.email.trim())) errors.email = 'Ingresa un email válido'

  const birthYear = values.birthYear.trim()
  if (birthYear) {
    const year = Number(birthYear)
    if (!/^\d+$/.test(birthYear) || year < 1 || year > currentYear) {
      errors.birthYear = `Ingresa un año entre 1 y ${currentYear}`
    }
  }

  return errors
}

export default function AuthorForm({ author, onSaved, onCancel }: AuthorFormProps) {
  const id = useId()
  const [values, setValues] = useState<Values>(() => toValues(author))
  const [errors, setErrors] = useState<Errors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(author)

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
      name: values.name.trim(),
      email: values.email.trim(),
      nationality: values.nationality.trim() || null,
      birthYear: values.birthYear.trim() ? Number(values.birthYear) : null,
      bio: values.bio.trim() || null,
    }

    setSaving(true)
    try {
      const saved = await apiRequest<Author>(
        isEdit ? `/api/authors/${author!.id}` : '/api/authors',
        { method: isEdit ? 'PUT' : 'POST', body: payload }
      )
      if (!isEdit) setValues(toValues())
      onSaved(saved)
    } catch (error) {
      setServerError(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Field label="Nombre" htmlFor={`${id}-name`} error={errors.name} required>
        <input
          id={`${id}-name`}
          className={`${input} ${errors.name ? inputError : ''}`}
          value={values.name}
          onChange={(event) => update('name', event.target.value)}
          placeholder="Ej. Gabriel García Márquez"
          aria-invalid={Boolean(errors.name)}
        />
      </Field>

      <Field label="Email" htmlFor={`${id}-email`} error={errors.email} required>
        <input
          id={`${id}-email`}
          type="email"
          className={`${input} ${errors.email ? inputError : ''}`}
          value={values.email}
          onChange={(event) => update('email', event.target.value)}
          placeholder="autor@example.com"
          aria-invalid={Boolean(errors.email)}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nacionalidad" htmlFor={`${id}-nationality`}>
          <input
            id={`${id}-nationality`}
            className={input}
            value={values.nationality}
            onChange={(event) => update('nationality', event.target.value)}
            placeholder="Ej. Colombia"
          />
        </Field>

        <Field label="Año de nacimiento" htmlFor={`${id}-birthYear`} error={errors.birthYear}>
          <input
            id={`${id}-birthYear`}
            type="number"
            inputMode="numeric"
            className={`${input} ${errors.birthYear ? inputError : ''}`}
            value={values.birthYear}
            onChange={(event) => update('birthYear', event.target.value)}
            placeholder="Ej. 1927"
            aria-invalid={Boolean(errors.birthYear)}
          />
        </Field>
      </div>

      <Field label="Biografía" htmlFor={`${id}-bio`}>
        <textarea
          id={`${id}-bio`}
          className={textarea}
          value={values.bio}
          onChange={(event) => update('bio', event.target.value)}
          placeholder="Breve biografía del autor"
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
        <button type="submit" className={btnPrimary} disabled={saving}>
          {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear autor'}
        </button>
      </div>
    </form>
  )
}
