'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Upload, FileText, Check, AlertCircle, BookOpen, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface GoodreadsBook {
  title: string
  author: string
  isbn: string
  isbn13: string
  rating: string
  dateRead: string
  dateAdded: string
  shelf: string
  numberOfPages: string
}

export function GoodreadsImport() {
  const [open, setOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [imported, setImported] = useState(0)
  const [failed, setFailed] = useState(0)
  const [total, setTotal] = useState(0)
  const [done, setDone] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const parseCSV = (text: string): GoodreadsBook[] => {
    const lines = text.split('\n')
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))

    const books: GoodreadsBook[] = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line.trim()) continue

      // Parse CSV line handling quoted fields
      const values: string[] = []
      let current = ''
      let inQuotes = false

      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      values.push(current.trim())

      const book: Record<string, string> = {}
      headers.forEach((header, index) => {
        book[header] = values[index] || ''
      })

      books.push({
        title: book['Title'] || '',
        author: book['Author'] || book['Author l-f'] || '',
        isbn: book['ISBN'] || '',
        isbn13: book['ISBN13'] || '',
        rating: book['My Rating'] || '',
        dateRead: book['Date Read'] || '',
        dateAdded: book['Date Added'] || '',
        shelf: book['Exclusive Shelf'] || book['Bookshelves'] || '',
        numberOfPages: book['Number of Pages'] || '',
      })
    }

    return books.filter(b => b.title)
  }

  const searchBookOnGoogle = async (title: string, author: string): Promise<{
    google_books_id: string
    cover_url: string
    description: string
    categories: string[]
    published_date: string
    page_count: number
  } | null> => {
    try {
      const query = encodeURIComponent(`${title} ${author}`)
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`
      )
      const data = await response.json()

      if (data.items && data.items.length > 0) {
        const volume = data.items[0]
        const info = volume.volumeInfo

        return {
          google_books_id: volume.id,
          cover_url: info.imageLinks?.thumbnail?.replace('http:', 'https:') || '',
          description: info.description || '',
          categories: info.categories || [],
          published_date: info.publishedDate || '',
          page_count: info.pageCount || 0,
        }
      }
    } catch {
      // Ignore errors
    }
    return null
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const books = parseCSV(text)

    if (books.length === 0) {
      toast.error('Nenhum livro encontrado no arquivo')
      return
    }

    setTotal(books.length)
    setImporting(true)
    setProgress(0)
    setImported(0)
    setFailed(0)
    setDone(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Usuário não autenticado')
      setImporting(false)
      return
    }

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < books.length; i++) {
      const grBook = books[i]

      try {
        // Search for book on Google Books
        const googleData = await searchBookOnGoogle(grBook.title, grBook.author)

        // Check if book already exists
        let bookId: string

        const { data: existingBook } = await supabase
          .from('leitura_books')
          .select('id')
          .eq('title', grBook.title)
          .eq('author', grBook.author)
          .single()

        if (existingBook) {
          bookId = existingBook.id
        } else {
          // Create book
          const { data: newBook, error: bookError } = await supabase
            .from('leitura_books')
            .insert({
              title: grBook.title,
              author: grBook.author,
              google_books_id: googleData?.google_books_id || null,
              cover_url: googleData?.cover_url || null,
              description: googleData?.description || null,
              categories: googleData?.categories || [],
              published_date: googleData?.published_date || null,
              page_count: googleData?.page_count || (grBook.numberOfPages ? parseInt(grBook.numberOfPages) : null),
            })
            .select('id')
            .single()

          if (bookError || !newBook) {
            failCount++
            continue
          }

          bookId = newBook.id
        }

        // Map Goodreads shelf to our status
        let status: 'want_to_read' | 'reading' | 'read' = 'want_to_read'
        if (grBook.shelf.includes('read') && !grBook.shelf.includes('to-read')) {
          status = 'read'
        } else if (grBook.shelf.includes('currently-reading')) {
          status = 'reading'
        }

        // Check if user already has this book
        const { data: existingUserBook } = await supabase
          .from('leitura_user_books')
          .select('id')
          .eq('user_id', user.id)
          .eq('book_id', bookId)
          .single()

        if (!existingUserBook) {
          // Add to user's shelf
          const rating = grBook.rating ? parseInt(grBook.rating) : null

          await supabase
            .from('leitura_user_books')
            .insert({
              user_id: user.id,
              book_id: bookId,
              status,
              rating: rating && rating > 0 ? rating : null,
              started_at: grBook.dateAdded ? new Date(grBook.dateAdded).toISOString() : null,
              finished_at: grBook.dateRead ? new Date(grBook.dateRead).toISOString() : null,
            })
        }

        successCount++
      } catch {
        failCount++
      }

      setProgress(Math.round(((i + 1) / books.length) * 100))
      setImported(successCount)
      setFailed(failCount)

      // Small delay to avoid rate limiting
      if (i < books.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    setDone(true)
    setImporting(false)
    toast.success(`Importação concluída! ${successCount} livros importados.`)
  }

  const handleReset = () => {
    setProgress(0)
    setImported(0)
    setFailed(0)
    setTotal(0)
    setDone(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Importar do Goodreads
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar do Goodreads</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!importing && !done ? (
            <>
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Como exportar do Goodreads:</h4>
                <ol className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1 list-decimal list-inside">
                  <li>Acesse goodreads.com e faça login</li>
                  <li>Vá em My Books → Import and export</li>
                  <li>Clique em "Export Library"</li>
                  <li>Baixe o arquivo CSV</li>
                  <li>Selecione o arquivo aqui</li>
                </ol>
              </div>

              <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg p-8 text-center">
                <FileText className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
                <p className="text-sm text-zinc-500 mb-4">
                  Selecione o arquivo CSV exportado do Goodreads
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload">
                  <Button asChild className="bg-amber-500 hover:bg-amber-600 cursor-pointer">
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Selecionar arquivo
                    </span>
                  </Button>
                </label>
              </div>
            </>
          ) : importing ? (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
              </div>
              <p className="text-center text-sm text-zinc-500">
                Importando {total} livros...
              </p>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-center gap-6 text-sm">
                <span className="flex items-center gap-1 text-green-600">
                  <Check className="h-4 w-4" />
                  {imported} importados
                </span>
                {failed > 0 && (
                  <span className="flex items-center gap-1 text-red-500">
                    <AlertCircle className="h-4 w-4" />
                    {failed} erros
                  </span>
                )}
              </div>
            </div>
          ) : done ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Importação concluída!</p>
                <p className="text-sm text-zinc-500">
                  {imported} livros foram adicionados à sua estante
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button onClick={handleReset} variant="outline">
                  Importar outro arquivo
                </Button>
                <Button onClick={() => setOpen(false)} className="bg-amber-500 hover:bg-amber-600">
                  Fechar
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
