'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BookCard } from '@/components/book-card'
import { BookSearch } from '@/components/book-search'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Loader2, Plus, Star, ChevronDown } from 'lucide-react'
import type { UserBook, Book, BookStatus } from '@/lib/types'
import { BOOK_STATUS_LABELS } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Image from 'next/image'
import { CustomShelves, AddToShelf } from '@/components/custom-shelves'
import { GoodreadsImport } from '@/components/goodreads-import'
import { BookEmotions } from '@/components/book-emotions'
import { StoryTemplate } from '@/components/story-template'
import { ReadingTimer } from '@/components/reading-timer'
import { QuotesList } from '@/components/quotes-list'

type UserBookWithBook = UserBook & { book: Book }

export default function ShelfPage() {
  const [books, setBooks] = useState<UserBookWithBook[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [selectedBook, setSelectedBook] = useState<UserBookWithBook | null>(null)
  const [currentTab, setCurrentTab] = useState<BookStatus>('reading')
  const supabase = createClient()

  const fetchBooks = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('leitura_user_books')
      .select('*, book:leitura_books(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    setBooks(data as UserBookWithBook[] || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchBooks()
  }, [supabase])

  const handleAddBook = async (bookData: {
    google_books_id: string | null
    title: string
    author: string
    cover_url: string | null
    year_published: number | null
    pages: number | null
  }) => {
    setAdding(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Check if book exists
    let book: Book | null = null
    if (bookData.google_books_id) {
      const { data: existingBook } = await supabase
        .from('leitura_books')
        .select('*')
        .eq('google_books_id', bookData.google_books_id)
        .single()

      if (existingBook) {
        book = existingBook
      }
    }

    if (!book) {
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
      setAdding(false)
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
      setAdding(false)
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
      fetchBooks()
    }
    setAdding(false)
  }

  const handleStatusChange = async (bookId: string, status: BookStatus) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const updates: Partial<UserBook> = { status }
    if (status === 'reading') {
      updates.started_at = new Date().toISOString().split('T')[0]
    } else if (status === 'read') {
      updates.finished_at = new Date().toISOString().split('T')[0]
    }

    await supabase
      .from('leitura_user_books')
      .update(updates)
      .eq('user_id', user.id)
      .eq('book_id', bookId)

    fetchBooks()
    toast.success('Status atualizado!')
  }

  const handleRatingChange = async (bookId: string, rating: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('leitura_user_books')
      .update({ rating })
      .eq('user_id', user.id)
      .eq('book_id', bookId)

    fetchBooks()
  }

  const handleRemoveBook = async (bookId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('leitura_user_books')
      .delete()
      .eq('user_id', user.id)
      .eq('book_id', bookId)

    setSelectedBook(null)
    fetchBooks()
    toast.success('Livro removido da estante')
  }

  const filteredBooks = books.filter(b => b.status === currentTab)
  const counts = {
    reading: books.filter(b => b.status === 'reading').length,
    want: books.filter(b => b.status === 'want').length,
    read: books.filter(b => b.status === 'read').length,
    abandoned: books.filter(b => b.status === 'abandoned').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Minha Estante</h1>
          <GoodreadsImport />
        </div>

        <BookSearch
          onSelect={handleAddBook}
          placeholder="Buscar livros para adicionar..."
        />

      <Tabs value={currentTab} onValueChange={(v) => setCurrentTab(v as BookStatus)}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="reading">
            Lendo {counts.reading > 0 && `(${counts.reading})`}
          </TabsTrigger>
          <TabsTrigger value="want">
            Quero Ler {counts.want > 0 && `(${counts.want})`}
          </TabsTrigger>
          <TabsTrigger value="read">
            Lidos {counts.read > 0 && `(${counts.read})`}
          </TabsTrigger>
          <TabsTrigger value="abandoned">
            Abandonados {counts.abandoned > 0 && `(${counts.abandoned})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={currentTab} className="mt-6">
          {filteredBooks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-500">
                Nenhum livro em "{BOOK_STATUS_LABELS[currentTab]}"
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredBooks.map((userBook) => (
                <BookCard
                  key={userBook.id}
                  book={userBook.book}
                  rating={userBook.rating}
                  onClick={() => setSelectedBook(userBook)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Book Detail Modal */}
      <Dialog open={!!selectedBook} onOpenChange={() => setSelectedBook(null)}>
        <DialogContent className="max-w-md">
          {selectedBook && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedBook.book.title}</DialogTitle>
                <DialogDescription>
                  {selectedBook.book.author || 'Autor desconhecido'}
                  {selectedBook.book.year_published && ` • ${selectedBook.book.year_published}`}
                </DialogDescription>
              </DialogHeader>

              <div className="flex gap-4">
                <div className="relative w-24 h-36 bg-zinc-100 dark:bg-zinc-800 rounded-lg shrink-0">
                  {selectedBook.book.cover_url && (
                    <Image
                      src={selectedBook.book.cover_url}
                      alt={selectedBook.book.title}
                      fill
                      className="object-cover rounded-lg"
                    />
                  )}
                </div>

                <div className="flex-1 space-y-4">
                  <div>
                    <p className="text-sm text-zinc-500 mb-1">Status</p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          {BOOK_STATUS_LABELS[selectedBook.status]}
                          <ChevronDown className="h-4 w-4 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full">
                        {(Object.keys(BOOK_STATUS_LABELS) as BookStatus[]).map((status) => (
                          <DropdownMenuItem
                            key={status}
                            onClick={() => handleStatusChange(selectedBook.book.id, status)}
                          >
                            {BOOK_STATUS_LABELS[status]}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div>
                    <p className="text-sm text-zinc-500 mb-1">Avaliação</p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => handleRatingChange(selectedBook.book.id, star)}
                          className={cn(
                            'text-2xl transition-colors',
                            star <= (selectedBook.rating || 0)
                              ? 'text-amber-400'
                              : 'text-zinc-300 hover:text-amber-300'
                          )}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Emotions */}
              <div className="border-t pt-4">
                <BookEmotions bookId={selectedBook.book.id} compact />
              </div>

              {/* Timer for books being read */}
              {selectedBook.status === 'reading' && (
                <div className="border-t pt-4">
                  <ReadingTimer book={selectedBook.book} onSessionEnd={fetchBooks} />
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 mt-4">
                <AddToShelf bookId={selectedBook.book.id} />
                <StoryTemplate book={selectedBook.book} userBook={selectedBook} rating={selectedBook.rating || undefined} />
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleRemoveBook(selectedBook.book.id)}
                >
                  Remover
                </Button>
                <Button
                  className="flex-1 bg-amber-500 hover:bg-amber-600"
                  onClick={() => setSelectedBook(null)}
                >
                  Fechar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        <CustomShelves />
        {books.find(b => b.status === 'reading') && (
          <QuotesList bookId={books.find(b => b.status === 'reading')?.book.id} book={books.find(b => b.status === 'reading')?.book} />
        )}
      </div>
    </div>
  )
}
