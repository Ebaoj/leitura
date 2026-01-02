'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Loader2, Sparkles, Plus, ChevronRight } from 'lucide-react'
import { searchBooksByAuthor, formatBookFromGoogle, getCoverUrl, type GoogleBook } from '@/lib/google-books'
import Image from 'next/image'
import { toast } from 'sonner'
import type { Book } from '@/lib/types'

type FormattedBook = ReturnType<typeof formatBookFromGoogle>

export function BookRecommendations() {
  const [recommendations, setRecommendations] = useState<FormattedBook[]>([])
  const [loading, setLoading] = useState(true)
  const [addingBook, setAddingBook] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchRecommendations() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Get user's books with their details
      const { data: userBooks } = await supabase
        .from('leitura_user_books')
        .select('book:leitura_books(*)')
        .eq('user_id', user.id)
        .limit(10)

      if (!userBooks || userBooks.length === 0) {
        setLoading(false)
        return
      }

      // Extract unique authors from user's books
      const authors = new Set<string>()
      const existingGoogleIds = new Set<string>()

      for (const ub of userBooks) {
        const book = ub.book as Book
        if (book?.author) {
          // Split in case of multiple authors
          book.author.split(',').forEach(a => authors.add(a.trim()))
        }
        if (book?.google_books_id) {
          existingGoogleIds.add(book.google_books_id)
        }
      }

      // Search for books by the same authors
      const allRecommendations: GoogleBook[] = []
      const seenIds = new Set<string>()

      for (const author of Array.from(authors).slice(0, 3)) {
        try {
          const books = await searchBooksByAuthor(author, 8)
          for (const book of books) {
            if (!existingGoogleIds.has(book.id) && !seenIds.has(book.id)) {
              seenIds.add(book.id)
              allRecommendations.push(book)
            }
          }
        } catch (error) {
          console.error('Error fetching recommendations:', error)
        }
      }

      // Shuffle and limit
      const shuffled = allRecommendations.sort(() => Math.random() - 0.5)
      setRecommendations(shuffled.slice(0, 10).map(formatBookFromGoogle))
      setLoading(false)
    }

    fetchRecommendations()
  }, [supabase])

  const handleAddToShelf = async (bookData: FormattedBook) => {
    if (!bookData.google_books_id) return
    setAddingBook(bookData.google_books_id)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Check if book exists
    let book: Book | null = null
    const { data: existingBook } = await supabase
      .from('leitura_books')
      .select('*')
      .eq('google_books_id', bookData.google_books_id)
      .single()

    if (existingBook) {
      book = existingBook
    } else {
      const { data: newBook } = await supabase
        .from('leitura_books')
        .insert({
          google_books_id: bookData.google_books_id,
          title: bookData.title,
          author: bookData.author,
          cover_url: bookData.cover_url,
          year_published: bookData.year_published,
          pages: bookData.pages,
        })
        .select()
        .single()
      book = newBook
    }

    if (!book) {
      toast.error('Erro ao adicionar livro')
      setAddingBook(null)
      return
    }

    // Check if already in shelf
    const { data: existing } = await supabase
      .from('leitura_user_books')
      .select('id')
      .eq('user_id', user.id)
      .eq('book_id', book.id)
      .single()

    if (existing) {
      toast.error('Livro já está na sua estante')
      setAddingBook(null)
      return
    }

    // Add to shelf
    const { error } = await supabase
      .from('leitura_user_books')
      .insert({
        user_id: user.id,
        book_id: book.id,
        status: 'want',
      })

    if (error) {
      toast.error('Erro ao adicionar livro')
    } else {
      toast.success('Livro adicionado à estante!')
      // Remove from recommendations
      setRecommendations(prev => prev.filter(r => r.google_books_id !== bookData.google_books_id))
    }
    setAddingBook(null)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Recomendações para você
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (recommendations.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          Recomendações para você
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-3 p-4 pt-0">
            {recommendations.map((book) => (
              <div
                key={book.google_books_id}
                className="shrink-0 w-32 group"
              >
                <div className="relative aspect-[2/3] bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden mb-2">
                  {book.cover_url ? (
                    <Image
                      src={book.cover_url}
                      alt={book.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-zinc-400 text-xs text-center p-2">
                      {book.title}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      size="sm"
                      className="bg-amber-500 hover:bg-amber-600"
                      onClick={() => handleAddToShelf(book)}
                      disabled={addingBook === book.google_books_id}
                    >
                      {addingBook === book.google_books_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-sm font-medium line-clamp-2 whitespace-normal leading-tight">
                  {book.title}
                </p>
                <p className="text-xs text-zinc-500 line-clamp-1 whitespace-normal">
                  {book.author}
                </p>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
