'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Library, Plus, Trash2, BookOpen, MoreVertical, Edit, Eye, EyeOff, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { CustomShelf, Book } from '@/lib/types'

interface CustomShelvesProps {
  onSelectShelf?: (shelfId: string) => void
}

interface ShelfWithBooks extends CustomShelf {
  book_count: number
}

const EMOJI_OPTIONS = ['📚', '📖', '📕', '📗', '📘', '📙', '🔖', '📑', '✨', '❤️', '⭐', '🌙', '🔮', '🎭', '🎨', '🌈', '🔥', '💀', '👻', '🧙', '🚀', '🌍', '💡', '🎯']

export function CustomShelves({ onSelectShelf }: CustomShelvesProps) {
  const [shelves, setShelves] = useState<ShelfWithBooks[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedShelf, setSelectedShelf] = useState<ShelfWithBooks | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('📚')
  const [isPublic, setIsPublic] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchShelves()
  }, [])

  const fetchShelves = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: shelvesData } = await supabase
      .from('leitura_custom_shelves')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (shelvesData) {
      // Get book counts for each shelf
      const shelvesWithCounts = await Promise.all(
        shelvesData.map(async (shelf) => {
          const { count } = await supabase
            .from('leitura_custom_shelf_books')
            .select('*', { count: 'exact', head: true })
            .eq('shelf_id', shelf.id)

          return {
            ...shelf,
            book_count: count || 0,
          }
        })
      )

      setShelves(shelvesWithCounts)
    }
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Digite um nome para a estante')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('leitura_custom_shelves')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        emoji,
        is_public: isPublic,
      })
      .select()
      .single()

    if (error) {
      toast.error('Erro ao criar estante')
    } else {
      toast.success('Estante criada!')
      setShelves(prev => [{ ...data, book_count: 0 }, ...prev])
      resetForm()
      setCreateOpen(false)
    }
  }

  const handleUpdate = async () => {
    if (!selectedShelf || !name.trim()) return

    const { error } = await supabase
      .from('leitura_custom_shelves')
      .update({
        name: name.trim(),
        description: description.trim() || null,
        emoji,
        is_public: isPublic,
      })
      .eq('id', selectedShelf.id)

    if (error) {
      toast.error('Erro ao atualizar estante')
    } else {
      toast.success('Estante atualizada!')
      setShelves(prev =>
        prev.map(s =>
          s.id === selectedShelf.id
            ? { ...s, name: name.trim(), description: description.trim() || null, emoji, is_public: isPublic }
            : s
        )
      )
      resetForm()
      setEditOpen(false)
    }
  }

  const handleDelete = async (shelfId: string) => {
    const { error } = await supabase
      .from('leitura_custom_shelves')
      .delete()
      .eq('id', shelfId)

    if (error) {
      toast.error('Erro ao excluir estante')
    } else {
      toast.success('Estante excluída!')
      setShelves(prev => prev.filter(s => s.id !== shelfId))
    }
  }

  const openEdit = (shelf: ShelfWithBooks) => {
    setSelectedShelf(shelf)
    setName(shelf.name)
    setDescription(shelf.description || '')
    setEmoji(shelf.emoji || '📚')
    setIsPublic(shelf.is_public)
    setEditOpen(true)
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setEmoji('📚')
    setIsPublic(false)
    setSelectedShelf(null)
  }

  if (loading) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Library className="h-5 w-5 text-amber-500" />
            Minhas Estantes
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar nova estante</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-12 h-10 text-xl">
                        {emoji}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64">
                      <div className="grid grid-cols-6 gap-2">
                        {EMOJI_OPTIONS.map((e) => (
                          <button
                            key={e}
                            onClick={() => setEmoji(e)}
                            className={cn(
                              'text-xl p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800',
                              emoji === e && 'bg-amber-100 dark:bg-amber-900/30'
                            )}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome da estante"
                    className="flex-1"
                  />
                </div>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição (opcional)"
                  rows={2}
                />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500">Estante pública</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsPublic(!isPublic)}
                    className={cn(isPublic && 'text-amber-500')}
                  >
                    {isPublic ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
                    {isPublic ? 'Sim' : 'Não'}
                  </Button>
                </div>
                <Button onClick={handleCreate} className="w-full bg-amber-500 hover:bg-amber-600">
                  Criar estante
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {shelves.length === 0 ? (
          <div className="text-center py-6">
            <Library className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
            <p className="text-sm text-zinc-500 mb-4">
              Crie estantes personalizadas para organizar seus livros
            </p>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-amber-500 hover:bg-amber-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeira estante
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        ) : (
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {shelves.map((shelf) => (
                <div
                  key={shelf.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 group"
                >
                  <button
                    onClick={() => onSelectShelf?.(shelf.id)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <span className="text-xl">{shelf.emoji || '📚'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{shelf.name}</p>
                      <p className="text-xs text-zinc-500">
                        {shelf.book_count} {shelf.book_count === 1 ? 'livro' : 'livros'}
                      </p>
                    </div>
                    {shelf.is_public && (
                      <Eye className="h-3 w-3 text-zinc-400" />
                    )}
                  </button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-40">
                      <button
                        onClick={() => openEdit(shelf)}
                        className="flex items-center gap-2 w-full p-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
                      >
                        <Edit className="h-4 w-4" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(shelf.id)}
                        className="flex items-center gap-2 w-full p-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </button>
                    </PopoverContent>
                  </Popover>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar estante</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-12 h-10 text-xl">
                    {emoji}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="grid grid-cols-6 gap-2">
                    {EMOJI_OPTIONS.map((e) => (
                      <button
                        key={e}
                        onClick={() => setEmoji(e)}
                        className={cn(
                          'text-xl p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800',
                          emoji === e && 'bg-amber-100 dark:bg-amber-900/30'
                        )}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome da estante"
                className="flex-1"
              />
            </div>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição (opcional)"
              rows={2}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">Estante pública</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPublic(!isPublic)}
                className={cn(isPublic && 'text-amber-500')}
              >
                {isPublic ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
                {isPublic ? 'Sim' : 'Não'}
              </Button>
            </div>
            <Button onClick={handleUpdate} className="w-full bg-amber-500 hover:bg-amber-600">
              Salvar alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// Component to add books to custom shelves
interface AddToShelfProps {
  bookId: string
}

export function AddToShelf({ bookId }: AddToShelfProps) {
  const [shelves, setShelves] = useState<CustomShelf[]>([])
  const [bookShelves, setBookShelves] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open, bookId])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [shelvesResult, bookShelvesResult] = await Promise.all([
      supabase
        .from('leitura_custom_shelves')
        .select('*')
        .eq('user_id', user.id)
        .order('name'),
      supabase
        .from('leitura_custom_shelf_books')
        .select('shelf_id')
        .eq('book_id', bookId),
    ])

    if (shelvesResult.data) {
      setShelves(shelvesResult.data)
    }
    if (bookShelvesResult.data) {
      setBookShelves(bookShelvesResult.data.map(bs => bs.shelf_id))
    }
    setLoading(false)
  }

  const toggleShelf = async (shelfId: string) => {
    const isInShelf = bookShelves.includes(shelfId)

    if (isInShelf) {
      await supabase
        .from('leitura_custom_shelf_books')
        .delete()
        .eq('shelf_id', shelfId)
        .eq('book_id', bookId)

      setBookShelves(prev => prev.filter(id => id !== shelfId))
      toast.success('Livro removido da estante')
    } else {
      await supabase
        .from('leitura_custom_shelf_books')
        .insert({
          shelf_id: shelfId,
          book_id: bookId,
        })

      setBookShelves(prev => [...prev, shelfId])
      toast.success('Livro adicionado à estante')
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <Library className="h-4 w-4 mr-1" />
          Estantes
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56">
        {loading ? (
          <p className="text-sm text-zinc-500 text-center py-2">Carregando...</p>
        ) : shelves.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-2">
            Nenhuma estante criada
          </p>
        ) : (
          <div className="space-y-1">
            {shelves.map((shelf) => (
              <button
                key={shelf.id}
                onClick={() => toggleShelf(shelf.id)}
                className={cn(
                  'flex items-center gap-2 w-full p-2 text-sm rounded hover:bg-zinc-100 dark:hover:bg-zinc-800',
                  bookShelves.includes(shelf.id) && 'bg-amber-50 dark:bg-amber-900/20'
                )}
              >
                <span>{shelf.emoji || '📚'}</span>
                <span className="flex-1 text-left truncate">{shelf.name}</span>
                {bookShelves.includes(shelf.id) && (
                  <span className="text-amber-500 text-xs">✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
