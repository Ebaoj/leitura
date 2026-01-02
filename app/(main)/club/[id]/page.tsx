'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UserAvatar } from '@/components/user-avatar'
import { AnnotationCard } from '@/components/annotation-card'
import { AnnotationForm } from '@/components/annotation-form'
import { BookSearch } from '@/components/book-search'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Loader2, Settings, Copy, BookOpen, Plus, LogOut } from 'lucide-react'
import type { Club, ClubMember, ClubReading, Profile, Book, Annotation, Reaction, Reply } from '@/lib/types'
import { toast } from 'sonner'
import Image from 'next/image'
import { ReadingChallenge } from '@/components/reading-challenge'
import { QuotesList } from '@/components/quotes-list'

type ClubWithDetails = Club & {
  members: (ClubMember & { user: Profile })[]
  current_reading?: ClubReading & { book: Book }
}

type AnnotationWithDetails = Annotation & {
  user: Profile
  reactions: Reaction[]
  replies: (Reply & { user: Profile })[]
  book: Book
}

export default function ClubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [club, setClub] = useState<ClubWithDetails | null>(null)
  const [annotations, setAnnotations] = useState<AnnotationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string>()
  const [isAdmin, setIsAdmin] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [newReadingOpen, setNewReadingOpen] = useState(false)
  const [showAnnotationForm, setShowAnnotationForm] = useState(false)
  const supabase = createClient()

  const fetchClub = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUserId(user.id)

    // Fetch club details
    const { data: clubData } = await supabase
      .from('leitura_clubs')
      .select(`
        *,
        members:leitura_club_members(*, user:leitura_profiles(*))
      `)
      .eq('id', id)
      .single()

    if (!clubData) {
      router.push('/clubs')
      return
    }

    // Check if user is member
    const isMember = clubData.members?.some((m: ClubMember) => m.user_id === user.id)
    if (!isMember) {
      router.push('/clubs')
      return
    }

    setIsAdmin(clubData.members?.some((m: ClubMember) => m.user_id === user.id && m.role === 'admin') || false)

    // Get current reading
    const { data: reading } = await supabase
      .from('leitura_club_readings')
      .select('*, book:leitura_books(*)')
      .eq('club_id', id)
      .eq('status', 'active')
      .single()

    setClub({
      ...clubData,
      current_reading: reading,
    } as ClubWithDetails)

    // Fetch annotations
    if (reading) {
      const { data: annotationsData } = await supabase
        .from('leitura_annotations')
        .select(`
          *,
          user:leitura_profiles(*),
          book:leitura_books(*),
          reactions:leitura_reactions(*),
          replies:leitura_replies(*, user:leitura_profiles(*))
        `)
        .eq('club_id', id)
        .eq('book_id', reading.book_id)
        .order('created_at', { ascending: false })

      setAnnotations(annotationsData as AnnotationWithDetails[] || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchClub()
  }, [id, supabase])

  const handleCopyLink = () => {
    if (club) {
      const inviteUrl = `${window.location.origin}/invite/${club.invite_code}`
      navigator.clipboard.writeText(inviteUrl)
      toast.success('Link de convite copiado!')
    }
  }

  const handleLeaveClub = async () => {
    if (!currentUserId) return

    await supabase
      .from('leitura_club_members')
      .delete()
      .eq('club_id', id)
      .eq('user_id', currentUserId)

    toast.success('Você saiu do clube')
    router.push('/clubs')
  }

  const handleStartReading = async (bookData: {
    google_books_id: string | null
    title: string
    author: string
    cover_url: string | null
    year_published: number | null
    pages: number | null
  }) => {
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
      return
    }

    // Finish current reading if exists
    if (club?.current_reading) {
      await supabase
        .from('leitura_club_readings')
        .update({ status: 'finished' })
        .eq('id', club.current_reading.id)
    }

    // Start new reading
    await supabase
      .from('leitura_club_readings')
      .insert({
        club_id: id,
        book_id: book.id,
        status: 'active',
      })

    toast.success('Nova leitura iniciada!')
    setNewReadingOpen(false)
    fetchClub()
  }

  const handleCreateAnnotation = async (data: {
    content: string
    page_number?: number
    chapter?: string
    is_spoiler: boolean
  }) => {
    if (!currentUserId || !club?.current_reading) return

    await supabase.from('leitura_annotations').insert({
      user_id: currentUserId,
      book_id: club.current_reading.book_id,
      club_id: id,
      ...data,
    })

    toast.success('Anotação publicada!')
    setShowAnnotationForm(false)
    fetchClub()
  }

  const handleReact = async (annotationId: string, emoji: '❤️' | '💡' | '😂' | '🤔') => {
    if (!currentUserId) return

    const annotation = annotations.find(a => a.id === annotationId)
    const existingReaction = annotation?.reactions.find(r => r.user_id === currentUserId)

    if (existingReaction) {
      await supabase
        .from('leitura_reactions')
        .delete()
        .eq('annotation_id', annotationId)
        .eq('user_id', currentUserId)
    } else {
      await supabase
        .from('leitura_reactions')
        .insert({ annotation_id: annotationId, user_id: currentUserId, emoji })
    }

    fetchClub()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  if (!club) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{club.name}</h1>
          {club.description && (
            <p className="text-zinc-500 mt-1">{club.description}</p>
          )}
        </div>
        <Button variant="outline" size="icon" onClick={() => setSettingsOpen(true)}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Members */}
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {club.members.slice(0, 6).map((member) => (
            <UserAvatar
              key={member.user_id}
              src={member.user?.avatar_url}
              name={member.user?.display_name || member.user?.username}
              className="h-8 w-8 border-2 border-white dark:border-zinc-900"
            />
          ))}
        </div>
        <span className="text-sm text-zinc-500">
          {club.members.length} membro{club.members.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Current Reading */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Leitura Atual
          </CardTitle>
        </CardHeader>
        <CardContent>
          {club.current_reading ? (
            <div className="flex gap-4">
              <div className="relative w-20 h-30 bg-zinc-100 dark:bg-zinc-800 rounded-lg shrink-0">
                {club.current_reading.book.cover_url && (
                  <Image
                    src={club.current_reading.book.cover_url}
                    alt={club.current_reading.book.title}
                    fill
                    className="object-cover rounded-lg"
                  />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{club.current_reading.book.title}</h3>
                <p className="text-sm text-zinc-500">
                  {club.current_reading.book.author || 'Autor desconhecido'}
                </p>
                <Button
                  className="mt-4 bg-amber-500 hover:bg-amber-600"
                  onClick={() => setShowAnnotationForm(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Anotação
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-zinc-500 mb-4">Nenhum livro sendo lido no momento</p>
              {isAdmin && (
                <Button onClick={() => setNewReadingOpen(true)}>
                  Iniciar leitura
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Annotation Form */}
      {showAnnotationForm && club.current_reading && (
        <AnnotationForm
          bookId={club.current_reading.book_id}
          clubId={id}
          onSubmit={handleCreateAnnotation}
          onCancel={() => setShowAnnotationForm(false)}
        />
      )}

      {/* Annotations */}
      {annotations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Anotações do clube</h2>
          {annotations.map((annotation) => (
            <AnnotationCard
              key={annotation.id}
              annotation={annotation}
              currentUserId={currentUserId}
              onReact={(emoji) => handleReact(annotation.id, emoji)}
            />
          ))}
        </div>
      )}

      {/* Club Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ReadingChallenge clubId={id} />
        {club.current_reading && (
          <QuotesList bookId={club.current_reading.book_id} book={club.current_reading.book} />
        )}
      </div>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurações do Clube</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-zinc-500 mb-2">Link de convite</p>
              <div className="flex gap-2">
                <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg px-3 py-3 text-sm truncate">
                  {typeof window !== 'undefined' ? `${window.location.origin}/invite/${club.invite_code}` : `/invite/${club.invite_code}`}
                </div>
                <Button variant="outline" size="icon" onClick={handleCopyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-zinc-400 mt-2">Compartilhe este link para convidar pessoas - funciona mesmo para quem não tem conta</p>
            </div>

            {isAdmin && (
              <div>
                <p className="text-sm text-zinc-500 mb-2">Gerenciar leitura</p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSettingsOpen(false)
                    setNewReadingOpen(true)
                  }}
                >
                  {club.current_reading ? 'Trocar livro' : 'Iniciar leitura'}
                </Button>
              </div>
            )}

            <div className="pt-4 border-t">
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleLeaveClub}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair do clube
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Reading Dialog */}
      <Dialog open={newReadingOpen} onOpenChange={setNewReadingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Iniciar nova leitura</DialogTitle>
            <DialogDescription>
              Busque um livro para o clube ler juntos
            </DialogDescription>
          </DialogHeader>

          <BookSearch
            onSelect={handleStartReading}
            placeholder="Buscar livro..."
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
