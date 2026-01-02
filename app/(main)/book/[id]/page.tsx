'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UserAvatar } from '@/components/user-avatar'
import { AnnotationCard } from '@/components/annotation-card'
import { AnnotationForm } from '@/components/annotation-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Loader2, ChevronDown, Plus, ArrowLeft } from 'lucide-react'
import type { Book, UserBook, BookStatus, Profile, Annotation, Reaction, Reply } from '@/lib/types'
import { BOOK_STATUS_LABELS } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Image from 'next/image'
import Link from 'next/link'

type AnnotationWithDetails = Annotation & {
  user: Profile
  reactions: Reaction[]
  replies: (Reply & { user: Profile })[]
  book: Book
}

export default function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [book, setBook] = useState<Book | null>(null)
  const [userBook, setUserBook] = useState<UserBook | null>(null)
  const [annotations, setAnnotations] = useState<AnnotationWithDetails[]>([])
  const [clubAnnotations, setClubAnnotations] = useState<AnnotationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string>()
  const [showAnnotationForm, setShowAnnotationForm] = useState(false)
  const supabase = createClient()

  const fetchBook = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUserId(user.id)

    // Fetch book
    const { data: bookData } = await supabase
      .from('leitura_books')
      .select('*')
      .eq('id', id)
      .single()

    if (!bookData) {
      router.push('/shelf')
      return
    }
    setBook(bookData)

    // Fetch user's relationship with this book
    const { data: userBookData } = await supabase
      .from('leitura_user_books')
      .select('*')
      .eq('user_id', user.id)
      .eq('book_id', id)
      .single()

    setUserBook(userBookData)

    // Fetch user's annotations for this book
    const { data: myAnnotations } = await supabase
      .from('leitura_annotations')
      .select(`
        *,
        user:leitura_profiles(*),
        book:leitura_books(*),
        reactions:leitura_reactions(*),
        replies:leitura_replies(*, user:leitura_profiles(*))
      `)
      .eq('book_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    setAnnotations(myAnnotations as AnnotationWithDetails[] || [])

    // Get user's clubs
    const { data: memberships } = await supabase
      .from('leitura_club_members')
      .select('club_id')
      .eq('user_id', user.id)

    const clubIds = memberships?.map(m => m.club_id) || []

    // Fetch club annotations for this book (excluding user's own)
    if (clubIds.length > 0) {
      const { data: clubAnns } = await supabase
        .from('leitura_annotations')
        .select(`
          *,
          user:leitura_profiles(*),
          book:leitura_books(*),
          reactions:leitura_reactions(*),
          replies:leitura_replies(*, user:leitura_profiles(*))
        `)
        .eq('book_id', id)
        .neq('user_id', user.id)
        .in('club_id', clubIds)
        .order('created_at', { ascending: false })

      setClubAnnotations(clubAnns as AnnotationWithDetails[] || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchBook()
  }, [id, supabase])

  const handleStatusChange = async (status: BookStatus) => {
    if (!currentUserId || !book) return

    const updates: Partial<UserBook> = { status }
    if (status === 'reading') {
      updates.started_at = new Date().toISOString().split('T')[0]
    } else if (status === 'read') {
      updates.finished_at = new Date().toISOString().split('T')[0]
    }

    if (userBook) {
      // Update existing
      await supabase
        .from('leitura_user_books')
        .update(updates)
        .eq('user_id', currentUserId)
        .eq('book_id', book.id)
    } else {
      // Create new
      await supabase
        .from('leitura_user_books')
        .insert({
          user_id: currentUserId,
          book_id: book.id,
          ...updates,
        })
    }

    toast.success('Status atualizado!')
    fetchBook()
  }

  const handleRatingChange = async (rating: number) => {
    if (!currentUserId || !book) return

    if (userBook) {
      await supabase
        .from('leitura_user_books')
        .update({ rating })
        .eq('user_id', currentUserId)
        .eq('book_id', book.id)
    } else {
      await supabase
        .from('leitura_user_books')
        .insert({
          user_id: currentUserId,
          book_id: book.id,
          status: 'read',
          rating,
        })
    }

    fetchBook()
  }

  const handleCreateAnnotation = async (data: {
    content: string
    page_number?: number
    chapter?: string
    is_spoiler: boolean
  }) => {
    if (!currentUserId || !book) return

    await supabase.from('leitura_annotations').insert({
      user_id: currentUserId,
      book_id: book.id,
      ...data,
    })

    toast.success('Anotação criada!')
    setShowAnnotationForm(false)
    fetchBook()
  }

  const handleReact = async (annotationId: string, emoji: '❤️' | '💡' | '😂' | '🤔') => {
    if (!currentUserId) return

    const allAnnotations = [...annotations, ...clubAnnotations]
    const annotation = allAnnotations.find(a => a.id === annotationId)
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

    fetchBook()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  if (!book) return null

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      {/* Book Header */}
      <div className="flex gap-6">
        <div className="relative w-32 h-48 bg-zinc-100 dark:bg-zinc-800 rounded-lg shrink-0">
          {book.cover_url && (
            <Image
              src={book.cover_url}
              alt={book.title}
              fill
              className="object-cover rounded-lg"
            />
          )}
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-2xl font-bold">{book.title}</h1>
            <p className="text-zinc-500">
              {book.author || 'Autor desconhecido'}
              {book.year_published && ` • ${book.year_published}`}
            </p>
            {book.pages && (
              <p className="text-sm text-zinc-400">{book.pages} páginas</p>
            )}
          </div>

          {/* Status */}
          <div>
            <p className="text-sm text-zinc-500 mb-1">Meu status</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="justify-between">
                  {userBook ? BOOK_STATUS_LABELS[userBook.status] : 'Não na estante'}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {(Object.keys(BOOK_STATUS_LABELS) as BookStatus[]).map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => handleStatusChange(status)}
                  >
                    {BOOK_STATUS_LABELS[status]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Rating */}
          <div>
            <p className="text-sm text-zinc-500 mb-1">Avaliação</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRatingChange(star)}
                  className={cn(
                    'text-2xl transition-colors',
                    star <= (userBook?.rating || 0)
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

      {/* Add Annotation */}
      <Button
        className="w-full bg-amber-500 hover:bg-amber-600"
        onClick={() => setShowAnnotationForm(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Nova Anotação
      </Button>

      {showAnnotationForm && (
        <AnnotationForm
          bookId={book.id}
          onSubmit={handleCreateAnnotation}
          onCancel={() => setShowAnnotationForm(false)}
        />
      )}

      {/* My Annotations */}
      {annotations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Minhas Anotações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {annotations.map((annotation) => (
              <AnnotationCard
                key={annotation.id}
                annotation={annotation}
                currentUserId={currentUserId}
                onReact={(emoji) => handleReact(annotation.id, emoji)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Club Annotations */}
      {clubAnnotations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Anotações dos Clubes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {clubAnnotations.map((annotation) => (
              <AnnotationCard
                key={annotation.id}
                annotation={annotation}
                currentUserId={currentUserId}
                onReact={(emoji) => handleReact(annotation.id, emoji)}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
