'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/books', label: 'Libros' },
]

export default function NavLinks() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1">
      {links.map((link) => {
        const active =
          link.href === '/'
            ? pathname === '/' || pathname.startsWith('/authors')
            : pathname.startsWith(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? 'bg-foreground text-background'
                : 'text-zinc-600 hover:bg-black/[.05] hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[.08] dark:hover:text-zinc-100'
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
