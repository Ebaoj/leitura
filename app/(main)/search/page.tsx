'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BookCard } from '@/components/book-card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Search as SearchIcon } from 'lucide-react'
import { searchBooks, formatBookFromGoogle } from '@/lib/google-books'
import type { Book } from '@/lib/types'
import { toast } from 'sonner'

type SearchResult = ReturnType<typeof formatBookFromGoogle>

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [addingBook, setAddingBook] = useState<string | null>(null)
  const supabase = createClient()

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)

    try {
      const books = await searchBooks(query, 20)
      setResults(books.map(formatBookFromGoogle))
    } catch {
      toast.error('Erro ao buscar livros')
    }
    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleAddToShelf = async (bookData: SearchResult) => {
    setAddingBook(bookData.google_books_id)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Check if book exists by google_books_id or title+author
    let book: Book | null = null
    const { data: existingBook } = await supabase
      .from('leitura_books')
      .select('*')
      .or(`google_books_id.eq.${bookData.google_books_id},and(title.eq.${bookData.title},author.eq.${bookData.author})`)
      .limit(1)
      .single()

    if (existingBook) {
      book = existingBook
    } else {
      // Insert only the fields that exist in the database
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
    }
    setAddingBook(null)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Buscar Livros</h1>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar por título ou autor..."
            className="pl-10"
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="bg-amber-500 hover:bg-amber-600"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Buscar'
          )}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : searched && results.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-500">Nenhum livro encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {results.map((book) => (
            <div key={book.google_books_id} className="relative group">
              <BookCard
                book={{
                  id: book.google_books_id || '',
                  ...book,
                }}
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <Button
                  size="sm"
                  onClick={() => handleAddToShelf(book)}
                  disabled={addingBook === book.google_books_id}
                  className="bg-amber-500 hover:bg-amber-600"
                >
                  {addingBook === book.google_books_id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Adicionar'
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
