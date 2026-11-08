'use client'

import { useEffect, useState } from 'react'

export class ApiError extends Error {
  status: number | null

  constructor(message: string, status: number | null) {
    super(message)
    this.status = status
  }
}

// Realiza una petición a las API Routes y lanza un ApiError con el mensaje del servidor
export async function apiRequest<T>(
  url: string,
  options: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown } = {}
): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new ApiError('No se pudo conectar con el servidor', null)
  }

  const data: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : `Error ${response.status}`
    throw new ApiError(message, response.status)
  }

  return data as T
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado'
}

interface FetchState<T> {
  key: string | null
  data: T | null
  error: string | null
  status: number | null
}

// Obtiene datos de una API Route. Cambiar reloadKey vuelve a pedir los datos.
// Mientras carga se conservan los datos anteriores para evitar saltos en la interfaz.
export function useFetch<T>(url: string | null, reloadKey = 0) {
  const key = url ? `${url}#${reloadKey}` : null
  const [state, setState] = useState<FetchState<T>>({
    key: null,
    data: null,
    error: null,
    status: null,
  })

  useEffect(() => {
    if (!url) return
    let cancelled = false

    apiRequest<T>(url)
      .then((data) => {
        if (!cancelled) setState({ key, data, error: null, status: 200 })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setState({
          key,
          data: null,
          error: getErrorMessage(error),
          status: error instanceof ApiError ? error.status : null,
        })
      })

    return () => {
      cancelled = true
    }
  }, [url, key])

  const loading = key !== null && state.key !== key

  return {
    data: state.data,
    error: loading ? null : state.error,
    status: loading ? null : state.status,
    loading,
  }
}
