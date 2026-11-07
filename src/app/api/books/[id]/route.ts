import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET - Obtener un libro específico por ID
export async function GET(
    request: Request,
    { params }: RouteParams
) {
    try {
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
        console.error('Error en GET /api/books/[id]:', error)
        return NextResponse.json(
            { error: 'Error al obtener libro' },
            { status: 500 }
        )
    }
}

// PUT - Actualizar un libro
export async function PUT(
    request: Request,
    { params }: RouteParams
) {
    try {
        const { id } = await params
        const body = await request.json()
        const {
            title,
            description,
            isbn,
            publishedYear,
            genre,
            pages,
            authorId,
        } = body

        // Validaciones básicas
        if (title !== undefined && title.trim().length < 3) {
            return NextResponse.json(
                { error: 'El título debe tener al menos 3 caracteres' },
                { status: 400 }
            )
        }

        if (pages !== undefined && pages !== null && Number(pages) < 1) {
            return NextResponse.json(
                { error: 'El número de páginas debe ser mayor a 0' },
                { status: 400 }
            )
        }

        // Si se envía un authorId, verificar que exista
        if (authorId) {
            const authorExists = await prisma.author.findUnique({
                where: { id: authorId },
                select: { id: true },
            })

            if (!authorExists) {
                return NextResponse.json(
                    { error: 'El autor especificado no existe' },
                    { status: 404 }
                )
            }
        }

        // Parseo seguro de números
        const parsedPages = pages !== undefined && pages !== null ? Number(pages) : undefined
        const parsedYear = publishedYear !== undefined && publishedYear !== null ? Number(publishedYear) : undefined

        const book = await prisma.book.update({
            where: { id },
            data: {
                ...(title !== undefined && { title: title.trim() }),
                ...(description !== undefined && { description }),
                ...(isbn !== undefined && { isbn }),
                ...(parsedYear !== undefined && { publishedYear: parsedYear }),
                ...(genre !== undefined && { genre }),
                ...(parsedPages !== undefined && { pages: parsedPages }),
                ...(authorId !== undefined && { authorId }),
            },
            include: {
                author: true,
            },
        })

        return NextResponse.json(book)
    } catch (error: any) {
        console.error('Error en PUT /api/books/[id]:', error)

        if (error.code === 'P2025') {
            return NextResponse.json(
                { error: 'Libro no encontrado' },
                { status: 404 }
            )
        }
        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: 'El ISBN ya existe' },
                { status: 409 }
            )
        }
        return NextResponse.json(
            { error: 'Error al actualizar libro' },
            { status: 500 }
        )
    }
}

// DELETE - Eliminar un libro
export async function DELETE(
    request: Request,
    { params }: RouteParams
) {
    try {
        const { id } = await params

        await prisma.book.delete({
            where: { id },
        })

        return NextResponse.json({
            message: 'Libro eliminado correctamente',
        })
    } catch (error: any) {
        console.error('Error en DELETE /api/books/[id]:', error)

        if (error.code === 'P2025') {
            return NextResponse.json(
                { error: 'Libro no encontrado' },
                { status: 404 }
            )
        }
        return NextResponse.json(
            { error: 'Error al eliminar libro' },
            { status: 500 }
        )
    }
}