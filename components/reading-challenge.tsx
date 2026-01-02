'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Trophy, Plus, Check, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Challenge, Book } from '@/lib/types'

interface ReadingChallengeProps {
  clubId?: string
}

interface BingoCell {
  id: string
  label: string
  completed: boolean
  bookId?: string
  bookTitle?: string
}

const DEFAULT_BINGO_CELLS = [
  'Livro com capa azul',
  'Autor(a) brasileiro(a)',
  'Mais de 400 páginas',
  'Publicado este ano',
  'Recomendado por amigo',
  'Gênero novo para você',
  'Autor(a) estreante',
  'Clássico da literatura',
  'Livro de poesia',
  'Biografia ou memórias',
  'Livro de fantasia',
  'Capa com animais',
  'FREE SPACE',
  'Título com número',
  'Livro de mistério',
  'Autor(a) asiático(a)',
  'Menos de 200 páginas',
  'Livro de não-ficção',
  'Indicação de clube',
  'Livro relido',
  'Título de uma palavra',
  'Autor(a) africano(a)',
  'Livro de ficção científica',
  'Publicado antes de 1950',
  'Seu autor(a) favorito(a)',
]

export function ReadingChallenge({ clubId }: ReadingChallengeProps) {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null)
  const [bingoProgress, setBingoProgress] = useState<BingoCell[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [userBooks, setUserBooks] = useState<Book[]>([])
  const [selectingCell, setSelectingCell] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchChallenges()
    fetchUserBooks()
  }, [clubId])

  const fetchChallenges = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let query = supabase
      .from('leitura_challenges')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (clubId) {
      query = query.eq('club_id', clubId)
    } else {
      query = query.is('club_id', null).eq('created_by', user.id)
    }

    const { data } = await query

    if (data && data.length > 0) {
      setChallenges(data)
      setSelectedChallenge(data[0])
      loadBingoProgress(data[0], user.id)
    }
    setLoading(false)
  }

  const fetchUserBooks = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('leitura_user_books')
      .select('*, book:leitura_books(*)')
      .eq('user_id', user.id)
      .eq('status', 'read')

    if (data) {
      setUserBooks(data.map(ub => ub.book as Book))
    }
  }

  const loadBingoProgress = async (challenge: Challenge, userId: string) => {
    const { data: progressData } = await supabase
      .from('leitura_challenge_progress')
      .select('*')
      .eq('challenge_id', challenge.id)
      .eq('user_id', userId)
      .single()

    const config = challenge.config as { cells?: BingoCell[] }
    const cells = config.cells || DEFAULT_BINGO_CELLS.map((label, i) => ({
      id: `cell-${i}`,
      label,
      completed: false,
    }))

    if (progressData?.progress) {
      const savedProgress = progressData.progress as { cells?: BingoCell[] }
      if (savedProgress.cells) {
        setBingoProgress(savedProgress.cells)
        return
      }
    }

    setBingoProgress(cells)
  }

  const handleCreateChallenge = async () => {
    if (!newName.trim()) {
      toast.error('Digite um nome para o desafio')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const cells = DEFAULT_BINGO_CELLS.map((label, i) => ({
      id: `cell-${i}`,
      label,
      completed: false,
    }))

    const { data, error } = await supabase
      .from('leitura_challenges')
      .insert({
        club_id: clubId || null,
        created_by: user.id,
        name: newName,
        description: newDescription || null,
        type: 'bingo',
        config: { cells },
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      toast.error('Erro ao criar desafio')
    } else {
      toast.success('Desafio criado!')
      setNewName('')
      setNewDescription('')
      setCreateOpen(false)
      setChallenges(prev => [data, ...prev])
      setSelectedChallenge(data)
      setBingoProgress(cells)
    }
  }

  const handleCellClick = (cellId: string) => {
    const cell = bingoProgress.find(c => c.id === cellId)
    if (cell?.completed) {
      // Toggle off
      toggleCellCompletion(cellId, false)
    } else {
      // Select book
      setSelectingCell(cellId)
    }
  }

  const toggleCellCompletion = async (cellId: string, completed: boolean, book?: Book) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !selectedChallenge) return

    const updatedCells = bingoProgress.map(cell => {
      if (cell.id === cellId) {
        return {
          ...cell,
          completed,
          bookId: book?.id,
          bookTitle: book?.title,
        }
      }
      return cell
    })

    setBingoProgress(updatedCells)
    setSelectingCell(null)

    // Check for bingo
    const hasBingo = checkForBingo(updatedCells)

    // Save progress
    await supabase
      .from('leitura_challenge_progress')
      .upsert({
        challenge_id: selectedChallenge.id,
        user_id: user.id,
        progress: { cells: updatedCells },
        completed: hasBingo,
        completed_at: hasBingo ? new Date().toISOString() : null,
      })

    if (hasBingo && !checkForBingo(bingoProgress)) {
      toast.success('BINGO! Parabéns, você completou uma linha!')
    }
  }

  const checkForBingo = (cells: BingoCell[]): boolean => {
    const grid = []
    for (let i = 0; i < 5; i++) {
      grid.push(cells.slice(i * 5, (i + 1) * 5))
    }

    // Check rows
    for (let i = 0; i < 5; i++) {
      if (grid[i].every(cell => cell.completed || cell.label === 'FREE SPACE')) {
        return true
      }
    }

    // Check columns
    for (let j = 0; j < 5; j++) {
      if (grid.every(row => row[j].completed || row[j].label === 'FREE SPACE')) {
        return true
      }
    }

    // Check diagonals
    const diagonal1 = [grid[0][0], grid[1][1], grid[2][2], grid[3][3], grid[4][4]]
    const diagonal2 = [grid[0][4], grid[1][3], grid[2][2], grid[3][1], grid[4][0]]

    if (diagonal1.every(cell => cell.completed || cell.label === 'FREE SPACE')) {
      return true
    }
    if (diagonal2.every(cell => cell.completed || cell.label === 'FREE SPACE')) {
      return true
    }

    return false
  }

  const completedCount = bingoProgress.filter(c => c.completed || c.label === 'FREE SPACE').length

  if (loading) return null

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Bingo Literário
            </div>
            {!selectedChallenge && (
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar novo desafio</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-zinc-500">Nome do desafio</label>
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Ex: Bingo 2024"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-zinc-500">Descrição (opcional)</label>
                      <Textarea
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="Descreva o desafio..."
                        rows={3}
                      />
                    </div>
                    <Button onClick={handleCreateChallenge} className="w-full bg-amber-500 hover:bg-amber-600">
                      Criar desafio
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedChallenge ? (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
              <p className="text-sm text-zinc-500 mb-4">
                Crie um desafio de bingo literário para tornar sua leitura mais divertida!
              </p>
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-amber-500 hover:bg-amber-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar meu Bingo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar novo desafio</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-zinc-500">Nome do desafio</label>
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Ex: Bingo 2024"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-zinc-500">Descrição (opcional)</label>
                      <Textarea
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="Descreva o desafio..."
                        rows={3}
                      />
                    </div>
                    <Button onClick={handleCreateChallenge} className="w-full bg-amber-500 hover:bg-amber-600">
                      Criar desafio
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{selectedChallenge.name}</p>
                <span className="text-xs text-zinc-500">{completedCount}/25 células</span>
              </div>

              {/* Bingo Grid */}
              <div className="grid grid-cols-5 gap-1">
                {bingoProgress.map((cell) => (
                  <button
                    key={cell.id}
                    onClick={() => handleCellClick(cell.id)}
                    className={cn(
                      'aspect-square p-1 rounded text-[10px] leading-tight flex items-center justify-center text-center transition-all',
                      cell.completed || cell.label === 'FREE SPACE'
                        ? 'bg-amber-500 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    )}
                    title={cell.bookTitle || cell.label}
                  >
                    {cell.completed ? (
                      <Check className="h-4 w-4" />
                    ) : cell.label === 'FREE SPACE' ? (
                      <span className="text-[8px]">FREE</span>
                    ) : (
                      <span className="line-clamp-3">{cell.label}</span>
                    )}
                  </button>
                ))}
              </div>

              {checkForBingo(bingoProgress) && (
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg p-3 text-center">
                  <p className="font-bold">BINGO!</p>
                  <p className="text-xs">Você completou uma linha!</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Book Selection Dialog */}
      <Dialog open={!!selectingCell} onOpenChange={() => setSelectingCell(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecionar livro</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-500 mb-4">
            {selectingCell && bingoProgress.find(c => c.id === selectingCell)?.label}
          </p>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {userBooks.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-4">
                  Você ainda não leu nenhum livro. Marque livros como lidos na sua estante!
                </p>
              ) : (
                userBooks.map((book) => (
                  <button
                    key={book.id}
                    onClick={() => selectingCell && toggleCellCompletion(selectingCell, true, book)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left"
                  >
                    {book.cover_url ? (
                      <img src={book.cover_url} alt="" className="w-10 h-14 object-cover rounded" />
                    ) : (
                      <div className="w-10 h-14 bg-zinc-200 dark:bg-zinc-700 rounded flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-zinc-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{book.title}</p>
                      <p className="text-xs text-zinc-500 truncate">{book.author}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}
