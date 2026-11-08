import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/app/lib/prisma'

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 10
const MAX_LIMIT = 50
const SORT_FIELDS = ['title', 'publishedYear', 'createdAt'] as const
const SORT_ORDERS = ['asc', 'desc'] as const

type SortField = (typeof SORT_FIELDS)[number]
type SortOrder = (typeof SORT_ORDERS)[number]

// Convierte un parámetro numérico; devuelve null si no es un entero >= 1
function parsePositiveInt(value: string): number | null {
    if (!/^\d+$/.test(value)) return null
    const number = Number(value)
    return Number.isSafeInteger(number) && number >= 1 ? number : null
}

// GET - Buscar libros con filtros, ordenamiento y paginación
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)

        const search = searchParams.get('search')?.trim()
        const genre = searchParams.get('genre')?.trim()
        const authorName = searchParams.get('authorName')?.trim()
        const pageParam = searchParams.get('page')
        const limitParam = searchParams.get('limit')
        const sortByParam = searchParams.get('sortBy')
        const orderParam = searchParams.get('order')

        // Validar page
        let page = DEFAULT_PAGE
        if (pageParam !== null) {
            const parsed = parsePositiveInt(pageParam)
            if (parsed === null) {
                return NextResponse.json(
                    { error: 'El parámetro page debe ser un número entero mayor o igual a 1' },
                    { status: 400 }
                )
            }
            page = parsed
        }

        // Validar limit (máximo 50)
        let limit = DEFAULT_LIMIT
        if (limitParam !== null) {
            const parsed = parsePositiveInt(limitParam)
            if (parsed === null) {
                return NextResponse.json(
                    { error: 'El parámetro limit debe ser un número entero mayor o igual a 1' },
                    { status: 400 }
                )
            }
            limit = Math.min(parsed, MAX_LIMIT)
        }

        // Validar sortBy
        let sortBy: SortField = 'createdAt'
        if (sortByParam !== null) {
            if (!SORT_FIELDS.includes(sortByParam as SortField)) {
                return NextResponse.json(
                    { error: `El parámetro sortBy debe ser uno de: ${SORT_FIELDS.join(', ')}` },
                    { status: 400 }
                )
            }
            sortBy = sortByParam as SortField
        }

        // Validar order
        let order: SortOrder = 'desc'
        if (orderParam !== null) {
            if (!SORT_ORDERS.includes(orderParam as SortOrder)) {
                return NextResponse.json(
                    { error: `El parámetro order debe ser uno de: ${SORT_ORDERS.join(', ')}` },
                    { status: 400 }
                )
            }
            order = orderParam as SortOrder
        }

        // Combinar filtros (solo se aplican los que tienen valor)
        const where: Prisma.BookWhereInput = {
            ...(search && { title: { contains: search, mode: 'insensitive' } }),
            ...(genre && { genre }),
            ...(authorName && {
                author: { name: { contains: authorName, mode: 'insensitive' } },
            }),
        }

        // publishedYear es opcional: los libros sin año se ubican al final
        const primaryOrder: Prisma.BookOrderByWithRelationInput =
            sortBy === 'publishedYear'
                ? { publishedYear: { sort: order, nulls: 'last' } }
                : { [sortBy]: order }

        // Paginación real en la base de datos
        const [total, books] = await prisma.$transaction([
            prisma.book.count({ where }),
            prisma.book.findMany({
                where,
                include: {
                    author: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
                // El id como segundo criterio mantiene un orden estable entre páginas
                orderBy: [primaryOrder, { id: 'asc' }],
                skip: (page - 1) * limit,
                take: limit,
            }),
        ])

        const totalPages = Math.ceil(total / limit)

        return NextResponse.json({
            data: books,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        })
    } catch (error) {
        console.error('Error en GET /api/books/search:', error)
        return NextResponse.json(
            { error: 'Error al buscar libros' },
            { status: 500 }
        )
    }
}
