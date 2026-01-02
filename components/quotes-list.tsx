'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Quote as QuoteIcon, Plus, Trash2, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import type { Quote, Book } from '@/lib/types'

interface QuotesListProps {
  bookId?: string
  book?: Book
  showAddButton?: boolean
}

type QuoteWithBook = Quote & { book: Book }

export function QuotesList({ bookId, book, showAddButton = true }: QuotesListProps) {
  const [quotes, setQuotes] = useState<QuoteWithBook[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [newQuote, setNewQuote] = useState('')
  const [pageNumber, setPageNumber] = useState('')
  const [chapter, setChapter] = useState('')
  const supabase = createClient()

  useEffect(() => {
    fetchQuotes()
  }, [bookId])

  const fetchQuotes = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let query = supabase
      .from('leitura_quotes')
      .select('*, book:leitura_books(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (bookId) {
      query = query.eq('book_id', bookId)
    }

    const { data } = await query.limit(20)

    setQuotes(data as QuoteWithBook[] || [])
    setLoading(false)
  }

  const handleAddQuote = async () => {
    if (!newQuote.trim() || !bookId) {
      toast.error('Digite a citação')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('leitura_quotes')
      .insert({
        user_id: user.id,
        book_id: bookId,
        content: newQuote,
        page_number: pageNumber ? parseInt(pageNumber) : null,
        chapter: chapter || null,
      })

    if (error) {
      toast.error('Erro ao salvar citação')
    } else {
      toast.success('Citação salva!')
      setNewQuote('')
      setPageNumber('')
      setChapter('')
      setAddOpen(false)
      fetchQuotes()
    }
  }

  const handleDeleteQuote = async (quoteId: string) => {
    await supabase
      .from('leitura_quotes')
      .delete()
      .eq('id', quoteId)

    setQuotes(prev => prev.filter(q => q.id !== quoteId))
    toast.success('Citação removida')
  }

  if (loading) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QuoteIcon className="h-5 w-5 text-amber-500" />
            Citações Favoritas
          </div>
          {showAddButton && bookId && (
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar citação</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {book && (
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <BookOpen className="h-4 w-4" />
                      {book.title}
                    </div>
                  )}
                  <Textarea
                    value={newQuote}
                    onChange={(e) => setNewQuote(e.target.value)}
                    placeholder="Digite a citação..."
                    rows={4}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-zinc-500">Página</label>
                      <Input
                        type="number"
                        value={pageNumber}
                        onChange={(e) => setPageNumber(e.target.value)}
                        placeholder="Ex: 42"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-zinc-500">Capítulo</label>
                      <Input
                        value={chapter}
                        onChange={(e) => setChapter(e.target.value)}
                        placeholder="Ex: Cap. 3"
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddQuote} className="w-full bg-amber-500 hover:bg-amber-600">
                    Salvar citação
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {quotes.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-4">
            Nenhuma citação salva ainda
          </p>
        ) : (
          <ScrollArea className="h-64">
            <div className="space-y-4">
              {quotes.map((quote) => (
                <div key={quote.id} className="group relative">
                  <blockquote className="border-l-4 border-amber-500 pl-4 py-2">
                    <p className="text-sm italic">"{quote.content}"</p>
                    <footer className="text-xs text-zinc-500 mt-2">
                      — {quote.book.title}
                      {quote.page_number && `, p. ${quote.page_number}`}
                      {quote.chapter && `, ${quote.chapter}`}
                    </footer>
                  </blockquote>
                  <button
                    onClick={() => handleDeleteQuote(quote.id)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
