import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

// GET - Obtener estadísticas de un autor
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        const author = await prisma.author.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                books: {
                    select: {
                        title: true,
                        publishedYear: true,
                        pages: true,
                        genre: true,
                    },
                    orderBy: { title: 'asc' },
                },
            },
        })

        if (!author) {
            return NextResponse.json(
                { error: 'Autor no encontrado' },
                { status: 404 }
            )
        }

        const { books } = author

        // Solo se consideran los libros que tienen año registrado
        const booksWithYear = books.filter(
            (book): book is typeof book & { publishedYear: number } =>
                book.publishedYear !== null
        )

        // Solo se consideran los libros que tienen páginas registradas
        const booksWithPages = books.filter(
            (book): book is typeof book & { pages: number } => book.pages !== null
        )

        const firstBook = booksWithYear.reduce<(typeof booksWithYear)[number] | null>(
            (first, book) =>
                first === null || book.publishedYear < first.publishedYear ? book : first,
            null
        )

        const latestBook = booksWithYear.reduce<(typeof booksWithYear)[number] | null>(
            (latest, book) =>
                latest === null || book.publishedYear > latest.publishedYear ? book : latest,
            null
        )

        const longestBook = booksWithPages.reduce<(typeof booksWithPages)[number] | null>(
            (longest, book) =>
                longest === null || book.pages > longest.pages ? book : longest,
            null
        )

        const shortestBook = booksWithPages.reduce<(typeof booksWithPages)[number] | null>(
            (shortest, book) =>
                shortest === null || book.pages < shortest.pages ? book : shortest,
            null
        )

        const averagePages =
            booksWithPages.length > 0
                ? Math.round(
                    booksWithPages.reduce((sum, book) => sum + book.pages, 0) /
                    booksWithPages.length
                )
                : null

        // Géneros únicos, ignorando valores vacíos o nulos
        const genres = [
            ...new Set(
                books
                    .map((book) => book.genre?.trim())
                    .filter((genre): genre is string => Boolean(genre))
            ),
        ].sort((a, b) => a.localeCompare(b))

        return NextResponse.json({
            authorId: author.id,
            authorName: author.name,
            totalBooks: books.length,
            firstBook: firstBook
                ? { title: firstBook.title, year: firstBook.publishedYear }
                : null,
            latestBook: latestBook
                ? { title: latestBook.title, year: latestBook.publishedYear }
                : null,
            averagePages,
            genres,
            longestBook: longestBook
                ? { title: longestBook.title, pages: longestBook.pages }
                : null,
            shortestBook: shortestBook
                ? { title: shortestBook.title, pages: shortestBook.pages }
                : null,
        })
    } catch (error) {
        console.error('Error en GET /api/authors/[id]/stats:', error)
        return NextResponse.json(
            { error: 'Error al obtener estadísticas del autor' },
            { status: 500 }
        )
    }
}
