// Tipos de las respuestas de las API Routes (las fechas llegan como string en JSON)

export interface Book {
  id: string
  title: string
  description: string | null
  isbn: string | null
  publishedYear: number | null
  genre: string | null
  pages: number | null
  authorId: string
  createdAt: string
  updatedAt: string
  author?: {
    id: string
    name: string
    email: string
  }
}

export interface Author {
  id: string
  name: string
  email: string
  bio: string | null
  nationality: string | null
  birthYear: number | null
  createdAt: string
  updatedAt: string
  books?: Book[]
  _count?: {
    books: number
  }
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface BookSearchResponse {
  data: Book[]
  pagination: Pagination
}

export interface AuthorBooksResponse {
  author: {
    id: string
    name: string
  }
  totalBooks: number
  books: Book[]
}

export interface AuthorStats {
  authorId: string
  authorName: string
  totalBooks: number
  firstBook: { title: string; year: number } | null
  latestBook: { title: string; year: number } | null
  averagePages: number | null
  genres: string[]
  longestBook: { title: string; pages: number } | null
  shortestBook: { title: string; pages: number } | null
}
