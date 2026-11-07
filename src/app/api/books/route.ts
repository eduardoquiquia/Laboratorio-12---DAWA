import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET - Obtener todos los libros
export async function GET(
    request: Request,
    { params }: RouteParams
) {
    try {
        // Desenvolver la promesa de params con await
        const { id } = await params

        const book = await prisma.book.findUnique({
            where: { id },
            include: {
                author: true,
            },
        })

        if (!book) {
            return NextResponse.json(
                { error: 'Libro no encontrado' },
                { status: 404 }
            )
        }

        return NextResponse.json(book)
    } catch (error) {
        console.error('Error al obtener el libro:', error)
        return NextResponse.json(
            { error: 'Error al obtener el libro' },
            { status: 500 }
        )
    }
}

// POST - Crear un nuevo libro
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const {
            title,
            description,
            isbn,
            publishedYear,
            genre,
            pages,
            authorId
        } = body

        // Validaciones
        if (!title || !authorId) {
            return NextResponse.json(
                { error: 'Título y autor son requeridos' },
                { status: 400 }
            )
        }

        if (title.length < 3) {
            return NextResponse.json(
                { error: 'El título debe tener al menos 3 caracteres' },
                { status: 400 }
            )
        }

        if (pages && pages < 1) {
            return NextResponse.json(
                { error: 'El número de páginas debe ser mayor a 0' },
                { status: 400 }
            )
        }

        // Verificar que el autor existe
        const authorExists = await prisma.author.findUnique({
            where: { id: authorId }
        })

        if (!authorExists) {
            return NextResponse.json(
                { error: 'El autor especificado no existe' },
                { status: 404 }
            )
        }

        const book = await prisma.book.create({
            data: {
                title,
                description,
                isbn,
                publishedYear,
                genre,
                pages,
                authorId
            }
        })

        return NextResponse.json(book, { status: 201 })
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: 'El ISBN ya existe' },
                { status: 409 }
            )
        }
        return NextResponse.json(
            { error: 'Error al crear libro' },
            { status: 500 }
        )
    }
}