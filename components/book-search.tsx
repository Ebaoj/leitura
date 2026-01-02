'use client'

import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { searchBooks, formatBookFromOpenLibrary, getCoverUrl, type OpenLibraryBook } from '@/lib/openlib'
import { Loader2, Search } from 'lucide-react'
import Image from 'next/image'

interface BookSearchProps {
  onSelect: (book: ReturnType<typeof formatBookFromOpenLibrary>) => void
  placeholder?: string
}

export function BookSearch({ onSelect, placeholder = 'Buscar livros...' }: BookSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<OpenLibraryBook[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const books = await searchBooks(q)
      setResults(books)
      setOpen(true)
    } catch (error) {
      console.error('Error searching books:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      search(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, search])

  const handleSelect = (book: OpenLibraryBook) => {
    onSelect(formatBookFromOpenLibrary(book))
    setQuery('')
    setResults([])
    setOpen(false)
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-zinc-400" />
        )}
      </div>

      {open && results.length > 0 && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50">
          <ScrollArea className="h-80">
            <CardContent className="p-2">
              {results.map((book) => (
                <button
                  key={book.key}
                  onClick={() => handleSelect(book)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left"
                >
                  <div className="relative w-10 h-14 bg-zinc-200 dark:bg-zinc-700 rounded shrink-0">
                    {book.cover_i && (
                      <Image
                        src={getCoverUrl(book.cover_i, 'S')!}
                        alt={book.title}
                        fill
                        className="object-cover rounded"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-1">{book.title}</p>
                    <p className="text-xs text-zinc-500 line-clamp-1">
                      {book.author_name?.[0] || 'Autor desconhecido'}
                    </p>
                    {book.first_publish_year && (
                      <p className="text-xs text-zinc-400">{book.first_publish_year}</p>
                    )}
                  </div>
                </button>
              ))}
            </CardContent>
          </ScrollArea>
        </Card>
      )}
    </div>
  )
}
