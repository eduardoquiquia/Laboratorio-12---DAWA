'use client'

import type { Pagination as PaginationData } from '@/app/lib/types'

interface PaginationProps {
  pagination: PaginationData
  disabled?: boolean
  onPageChange: (page: number) => void
}

// Calcula hasta 5 números de página alrededor de la página actual
function getPageNumbers(page: number, totalPages: number): number[] {
  const size = Math.min(5, totalPages)
  let start = Math.max(1, page - 2)
  start = Math.min(start, totalPages - size + 1)
  return Array.from({ length: size }, (_, index) => start + index)
}

export default function Pagination({ pagination, disabled, onPageChange }: PaginationProps) {
  const { page, totalPages, hasNext, hasPrev } = pagination
  if (totalPages <= 1) return null

  const baseButton =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <nav aria-label="Paginación" className="flex flex-wrap items-center justify-center gap-1">
      <button
        type="button"
        className={`${baseButton} hover:bg-black/[.05] dark:hover:bg-white/[.08]`}
        onClick={() => onPageChange(page - 1)}
        disabled={!hasPrev || disabled}
      >
        ← Anterior
      </button>
      {getPageNumbers(Math.min(page, totalPages), totalPages).map((number) => (
        <button
          key={number}
          type="button"
          aria-current={number === page ? 'page' : undefined}
          className={`${baseButton} ${
            number === page
              ? 'bg-foreground text-background'
              : 'hover:bg-black/[.05] dark:hover:bg-white/[.08]'
          }`}
          onClick={() => {
            if (number !== page) onPageChange(number)
          }}
          disabled={disabled}
        >
          {number}
        </button>
      ))}
      <button
        type="button"
        className={`${baseButton} hover:bg-black/[.05] dark:hover:bg-white/[.08]`}
        onClick={() => onPageChange(page + 1)}
        disabled={!hasNext || disabled}
      >
        Siguiente →
      </button>
    </nav>
  )
}
