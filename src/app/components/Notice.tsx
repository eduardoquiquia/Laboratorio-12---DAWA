'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface NoticeMessage {
  type: 'success' | 'error'
  text: string
}

// Mensaje temporal para confirmar operaciones o informar errores
export function useNotice() {
  const [notice, setNotice] = useState<NoticeMessage | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showNotice = useCallback((type: NoticeMessage['type'], text: string) => {
    if (timer.current) clearTimeout(timer.current)
    setNotice({ type, text })
    timer.current = setTimeout(() => setNotice(null), 4000)
  }, [])

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  return { notice, showNotice }
}

export default function Notice({ notice }: { notice: NoticeMessage | null }) {
  if (!notice) return null

  const styles =
    notice.type === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
      : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200'

  return (
    <div
      role={notice.type === 'error' ? 'alert' : 'status'}
      className={`fixed inset-x-4 bottom-4 z-[60] rounded-xl border px-4 py-3 text-sm shadow-lg sm:left-auto sm:right-6 sm:max-w-sm ${styles}`}
    >
      {notice.text}
    </div>
  )
}
